import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) throw new Error("X_REPLIT_TOKEN not found");

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=github",
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
  ).then((r) => r.json()).then((d) => d.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error("GitHub not connected");
  return accessToken;
}

const IGNORE_LOCAL = new Set([
  "node_modules", ".git", "dist", ".cache", ".local", ".config",
  "scripts", "attached_assets", ".upm", ".replit", "replit.nix",
  "generated-icon.png", ".gitignore", "replit.md",
]);

function collectLocalFiles(dir: string, base: string): Map<string, string> {
  const results = new Map<string, string>();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_LOCAL.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? path.join(base, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const sub = collectLocalFiles(fullPath, relPath);
      sub.forEach((v, k) => results.set(k, v));
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 500000) continue;
        const buf = fs.readFileSync(fullPath);
        if (buf.includes(0)) continue;
        results.set(relPath, buf.toString("utf-8"));
      } catch {}
    }
  }
  return results;
}

async function getRepoTree(octokit: Octokit, owner: string, repo: string): Promise<{ path: string; sha: string; type: string }[]> {
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: "heads/main" });
  const commitSha = ref.object.sha;
  const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: commitSha });
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: commit.tree.sha, recursive: "true" });
  return tree.tree.filter((t) => t.type === "blob").map((t) => ({ path: t.path!, sha: t.sha!, type: t.type! }));
}

async function getFileContent(octokit: Octokit, owner: string, repo: string, sha: string): Promise<string> {
  const { data } = await octokit.git.getBlob({ owner, repo, file_sha: sha });
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function main() {
  console.log("Getting GitHub access token...");
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });

  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  const repo = "ecoxchange-platform";
  console.log(`Authenticated as: ${owner}`);

  console.log("Fetching repo file tree...");
  const repoFiles = await getRepoTree(octokit, owner, repo);
  console.log(`Found ${repoFiles.length} files in repo.`);

  console.log("Collecting local files...");
  const localFiles = collectLocalFiles("/home/runner/workspace", "");
  console.log(`Found ${localFiles.size} local files.`);

  const repoFilePaths = new Set(repoFiles.map((f) => f.path));
  const localFilePaths = new Set(localFiles.keys());

  const newFiles = repoFiles.filter((f) => !localFilePaths.has(f.path));
  const deletedFiles = [...localFilePaths].filter((f) => !repoFilePaths.has(f));
  const commonFiles = repoFiles.filter((f) => localFilePaths.has(f.path));

  console.log(`\nNew files in repo (not local): ${newFiles.length}`);
  console.log(`Deleted from repo (still local): ${deletedFiles.length}`);
  console.log(`Common files to check: ${commonFiles.length}`);

  const modifiedFiles: { path: string; sha: string }[] = [];
  const BATCH = 10;

  console.log("\nChecking for modifications...");
  for (let i = 0; i < commonFiles.length; i += BATCH) {
    const batch = commonFiles.slice(i, i + BATCH);
    const contents = await Promise.all(
      batch.map(async (f) => {
        const content = await getFileContent(octokit, owner, repo, f.sha);
        return { path: f.path, content, sha: f.sha };
      })
    );
    for (const { path: fPath, content } of contents) {
      const localContent = localFiles.get(fPath);
      if (localContent !== content) {
        modifiedFiles.push({ path: fPath, sha: "" });
        console.log(`  MODIFIED: ${fPath}`);
      }
    }
    process.stdout.write(`  Checked ${Math.min(i + BATCH, commonFiles.length)}/${commonFiles.length}\r`);
  }
  console.log();

  if (newFiles.length === 0 && modifiedFiles.length === 0 && deletedFiles.length === 0) {
    console.log("\nNo changes detected. Local codebase is up to date!");
    return;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`New files: ${newFiles.length}`);
  newFiles.forEach((f) => console.log(`  + ${f.path}`));
  console.log(`Modified files: ${modifiedFiles.length}`);
  modifiedFiles.forEach((f) => console.log(`  ~ ${f.path}`));
  console.log(`Deleted files: ${deletedFiles.length}`);
  deletedFiles.forEach((f) => console.log(`  - ${f}`));

  console.log("\nApplying changes...");

  for (const f of newFiles) {
    const content = await getFileContent(octokit, owner, repo, f.sha);
    const fullPath = path.join("/home/runner/workspace", f.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Created: ${f.path}`);
  }

  for (const f of commonFiles) {
    const localContent = localFiles.get(f.path);
    const remoteContent = await getFileContent(octokit, owner, repo, f.sha);
    if (localContent !== remoteContent) {
      const fullPath = path.join("/home/runner/workspace", f.path);
      fs.writeFileSync(fullPath, remoteContent, "utf-8");
      console.log(`  Updated: ${f.path}`);
    }
  }

  for (const f of deletedFiles) {
    const fullPath = path.join("/home/runner/workspace", f);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  Deleted: ${f}`);
    }
  }

  console.log("\nDone! All changes applied.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
