import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const pagesDir = path.join(repoRoot, "dist", "github-pages");
const basePath = normalizeBasePath(
  process.argv[2] ?? process.env.GITHUB_PAGES_BASE_PATH ?? process.env.VITE_BASE_PATH ?? "",
);

await mkdir(pagesDir, { recursive: true });

const assets = await readdir(path.join(pagesDir, "assets"));
const entryScript = assets
  .filter((file) => /^github-pages-entry-[\w-]+\.js$/.test(file))
  .sort()
  .at(-1);
const stylesheet = assets.find((file) => /^styles-[\w-]+\.css$/.test(file));

if (!entryScript) {
  throw new Error("Could not find GitHub Pages SPA entry asset in dist/github-pages/assets.");
}

const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shades & Space - Quote Studio</title>
    <meta
      name="description"
      content="Internal quote generator for Shades & Space: luxury blinds, shutters and window dressings."
    />
    ${stylesheet ? `<link rel="stylesheet" href="${assetHref(basePath, stylesheet)}" />` : ""}
    <script type="module" crossorigin src="${assetHref(basePath, entryScript)}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

await writeFile(path.join(pagesDir, "index.html"), html);
await writeFile(path.join(pagesDir, "404.html"), html);
await writeFile(path.join(pagesDir, ".nojekyll"), "");

console.log(
  `GitHub Pages artifact ready: dist/github-pages (${packageJson.name}, basePath=${basePath || "/"})`,
);

function normalizeBasePath(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function assetHref(basePath, filename) {
  return `${basePath}/assets/${filename}`;
}
