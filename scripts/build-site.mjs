import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const entriesToCopy = [
  "index.html",
  "admin.html",
  "styles.css",
  "admin.css",
  "script.js",
  "admin.js",
  "messages.js",
  "site-config.js",
  "assets-manifest.js",
  "robots.txt",
  ".nojekyll",
  "assets"
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const entry of entriesToCopy) {
  const source = path.join(rootDir, entry);
  const destination = path.join(distDir, entry);
  const sourceStats = await stat(source);

  if (sourceStats.isDirectory()) {
    await cp(source, destination, { recursive: true });
  } else {
    await cp(source, destination);
  }
}

console.log(`Static build ready in ${distDir}`);
