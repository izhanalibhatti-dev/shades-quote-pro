import fs from "node:fs";
import path from "node:path";

const inputDir = process.argv[2] ?? "/private/tmp/wardrobe-pdf-ocr";
const outputDir = process.argv[3] ?? "/private/tmp/wardrobe-pdf-lines";

fs.mkdirSync(outputDir, { recursive: true });

for (const fileName of fs
  .readdirSync(inputDir)
  .filter((name) => name.endsWith(".tsv"))
  .sort()) {
  const rows = fs
    .readFileSync(path.join(inputDir, fileName), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [page, y, x, w, h, confidence, ...text] = line.split("\t");
      return {
        page: Number(page),
        y: Number(y),
        x: Number(x),
        w: Number(w),
        h: Number(h),
        confidence: Number(confidence),
        text: text.join("\t"),
      };
    });

  const groups = [];
  for (const row of rows.sort((a, b) => b.y - a.y || a.x - b.x)) {
    let group = groups.find((item) => Math.abs(item.y - row.y) < 0.008);
    if (!group) {
      group = { y: row.y, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }

  const lines = groups
    .sort((a, b) => b.y - a.y)
    .map((group) =>
      group.rows
        .sort((a, b) => a.x - b.x)
        .map((row) => row.text)
        .join(" | "),
    );

  fs.writeFileSync(path.join(outputDir, fileName.replace(".tsv", ".txt")), `${lines.join("\n")}\n`);
}
