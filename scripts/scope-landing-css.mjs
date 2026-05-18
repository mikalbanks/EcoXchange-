import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "..", "..", "web", "index.html"), "utf8");
const match = html.match(/<style>([\s\S]*?)<\/style>/);
if (!match) throw new Error("No <style> in web/index.html");

let css = match[1];
css = css.replace(/:root\s*\{/g, ".landing-page {");
css = css.replace(/^html\s*\{/m, ".landing-page {");
css = css.replace(/^body\s*\{/m, ".landing-page {");
const elementSelectors = ["a", "img", "header", "footer", "nav", "section", "h1", "h2", "h3", "p", "em", "strong"];
for (const el of elementSelectors) {
  css = css.replace(new RegExp(`(^|\\n)(${el})(\\s*[,{])`, "g"), `$1.landing-page $2$3`);
}
css = `/* Scoped from web/index.html — regenerate: node scripts/scope-landing-css.mjs */\n${css}`;

const out = path.join(root, "client", "src", "pages", "landing.css");
fs.writeFileSync(out, css, "utf8");
console.log("Wrote", out);
