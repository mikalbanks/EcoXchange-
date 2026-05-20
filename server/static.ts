import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const HASHED_ASSET_RE = /\.(js|css|woff2?|png|svg|ico|jpg|jpeg|webp|avif)$/i;
const NEVER_CACHE = "no-cache, no-store, must-revalidate";
const FOREVER_CACHE = "public, max-age=31536000, immutable";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.get(["/sw.js", "/manifest.webmanifest", "/registerSW.js"], (_req, res, next) => {
    res.set("Cache-Control", NEVER_CACHE);
    next();
  });

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`) || HASHED_ASSET_RE.test(filePath)) {
          res.setHeader("Cache-Control", FOREVER_CACHE);
        } else if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.webmanifest")) {
          res.setHeader("Cache-Control", NEVER_CACHE);
        }
      },
    }),
  );

  app.use("/{*path}", (_req, res) => {
    res.set("Cache-Control", NEVER_CACHE);
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
