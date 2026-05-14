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

const IGNORE = new Set([
  "node_modules", ".git", "dist", ".cache", ".local", ".config",
  "scripts", "attached_assets", ".upm", ".replit", "replit.nix",
  "generated-icon.png", ".gitignore",
]);

function collectFiles(dir: string, base: string): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 500000) continue;
        const buf = fs.readFileSync(fullPath);
        const isBinary = buf.includes(0);
        if (isBinary) continue;
        results.push({ path: relPath, content: buf.toString("base64") });
      } catch { }
    }
  }
  return results;
}

async function main() {
  console.log("Getting GitHub access token...");
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });

  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  const repoName = "ecoxchange-platform";
  const owner = user.login;

  try {
    await octokit.repos.get({ owner, repo: repoName });
    console.log(`Repository ${owner}/${repoName} already exists.`);
  } catch (e: any) {
    if (e.status === 404) {
      console.log(`Creating repository: ${owner}/${repoName}...`);
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: "EcoXchange - Digital Securities Platform for Renewable Energy",
        private: true,
        auto_init: true,
      });
      console.log("Repository created!");
      await new Promise((r) => setTimeout(r, 3000));
    } else throw e;
  }

  console.log("Collecting project files...");
  const files = collectFiles("/home/runner/workspace", "");
  console.log(`Found ${files.length} files to upload.`);

  console.log("Creating blobs...");
  const tree: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];

  const BATCH = 5;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (f) => {
        const { data } = await octokit.git.createBlob({
          owner, repo: repoName,
          content: f.content,
          encoding: "base64",
        });
        return { path: f.path, sha: data.sha };
      })
    );
    results.forEach((r) => {
      tree.push({ path: r.path, mode: "100644", type: "blob", sha: r.sha });
    });
    process.stdout.write(`  ${Math.min(i + BATCH, files.length)}/${files.length} blobs created\r`);
  }
  console.log();

  console.log("Creating tree...");
  const { data: newTree } = await octokit.git.createTree({
    owner, repo: repoName, tree,
  });

  let parentSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo: repoName, ref: "heads/main" });
    parentSha = ref.object.sha;
  } catch { }

  console.log("Creating commit...");
  const { data: commit } = await octokit.git.createCommit({
    owner, repo: repoName,
    message: "EcoXchange platform - full source code export",
    tree: newTree.sha,
    parents: parentSha ? [parentSha] : [],
  });

  try {
    await octokit.git.updateRef({
      owner, repo: repoName,
      ref: "heads/main",
      sha: commit.sha,
      force: true,
    });
  } catch {
    await octokit.git.createRef({
      owner, repo: repoName,
      ref: "refs/heads/main",
      sha: commit.sha,
    });
  }

  console.log(`\nDone! Your code is at: https://github.com/${owner}/${repoName}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
