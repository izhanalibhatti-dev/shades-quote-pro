import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const categorySourcePath = path.join(root, "src/data/wardrobe/categories.ts");
const manifestPath = path.join(root, "src/data/wardrobe/photo-slots.json");

const source = fs.readFileSync(categorySourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const module = { exports: {} };
const sandbox = {
  exports: module.exports,
  module,
  require(id) {
    if (id === "./visuals") {
      return {
        wardrobeCategoryImage: () => undefined,
        wardrobeProductImage: () => undefined,
        wardrobeSharedImage: () => undefined,
      };
    }
    throw new Error(`Unexpected import while syncing wardrobe photos: ${id}`);
  },
};

vm.runInNewContext(compiled, sandbox, { filename: categorySourcePath });

const categories = module.exports.WARDROBE_CATEGORIES;
if (!Array.isArray(categories)) {
  throw new Error("Could not read WARDROBE_CATEGORIES from src/data/wardrobe/categories.ts");
}

const existing = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const existingSlots = [
  ...(existing.categories ?? []),
  ...(existing.products ?? []),
  ...(existing.shared ?? []),
];
const fileNameById = new Map(existingSlots.map((slot) => [slot.id, slot.fileName ?? ""]));
const sharedSlots = existing.shared ?? [];

const categorySlots = categories.map((category) => ({
  id: category.id,
  name: category.name,
  fileName: fileNameById.get(category.id) ?? "",
}));

const productSlots = categories.flatMap((category) =>
  category.products.map((product) => ({
    id: product.id,
    categoryId: category.id,
    name: product.name,
    fileName: fileNameById.get(product.id) ?? "",
  })),
);

const next = {
  note: "Edit only fileName values. Run `node scripts/sync-wardrobe-photo-slots.mjs` after changing wardrobe catalogue names.",
  categories: categorySlots,
  products: productSlots,
  shared: sharedSlots.map((slot) => ({
    id: slot.id,
    name: slot.name,
    fileName: fileNameById.get(slot.id) ?? "",
  })),
};

fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);

console.log(`Wardrobe category photo slots: ${categorySlots.length}`);
console.log(`Wardrobe product photo slots: ${productSlots.length}`);
console.log(`Shared photo slots: ${next.shared.length}`);
