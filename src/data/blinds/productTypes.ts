export interface BlindProductTypeDefinition {
  id: string;
  label: string;
  match: (productTypeId: string, productTypeName: string) => boolean;
  selectionLabel: "Fabric" | "Finish / Colour" | "Pricing Band";
}

function hasPrefix(productTypeId: string, prefix: string) {
  return productTypeId === prefix || productTypeId.startsWith(`${prefix}-`);
}

export const BLIND_PRODUCT_TYPES: BlindProductTypeDefinition[] = [
  {
    id: "roller",
    label: "Roller",
    selectionLabel: "Fabric",
    match: (id, name) =>
      id === "roller" || id.endsWith("-roller") || hasPrefix(id, "wb-roller") || name === "Roller",
  },
  {
    id: "vertical",
    label: "Vertical",
    selectionLabel: "Fabric",
    match: (id, name) => id.includes("vertical") || name.includes("Vertical"),
  },
  {
    id: "vision",
    label: "Vision",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-vision"),
  },
  {
    id: "pvc-rigid",
    label: "PVC Rigid",
    selectionLabel: "Finish / Colour",
    match: (id, name) => id.includes("pvc") || name.toLowerCase().includes("pvc"),
  },
  {
    id: "roman",
    label: "Roman",
    selectionLabel: "Fabric",
    match: (id, name) => hasPrefix(id, "wb-romans") || name.toLowerCase().includes("roman"),
  },
  {
    id: "aluminium-venetian",
    label: "Aluminium Venetian",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-aluminium-venetians") || hasPrefix(id, "wb-25mm-aluminium"),
  },
  {
    id: "perfect-fit-roller",
    label: "Perfect Fit Roller",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-pf-roller"),
  },
  {
    id: "perfect-fit-vision",
    label: "Perfect Fit Vision",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-pf-vision"),
  },
  {
    id: "perfect-fit-pleated-dual-control",
    label: "Perfect Fit Pleated Dual Control",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-pf-pleated-dual-control"),
  },
  {
    id: "perfect-fit-pleated-dual-blinds",
    label: "Perfect Fit Pleated Dual Blinds",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-pf-pleated-dual-blinds"),
  },
  {
    id: "perfect-fit-pleated",
    label: "Perfect Fit Pleated",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-pf-pleated"),
  },
  {
    id: "perfect-fit-aluminium",
    label: "Perfect Fit Aluminium",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-pf-aluminium") || hasPrefix(id, "wb-perfect-fit-aluminium"),
  },
  {
    id: "perfect-fit-wood",
    label: "Perfect Fit Wood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-pf-wood") || hasPrefix(id, "wb-perfect-fit-wood"),
  },
  {
    id: "perfect-fit-shutter",
    label: "Perfect Fit Shutter",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-perfect-fit-shutter"),
  },
  {
    id: "aqua-fauxwood",
    label: "Aqua Fauxwood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-aqua-fauxwood") || hasPrefix(id, "wb-aquawood-fauxwood"),
  },
  {
    id: "arena-fauxwood",
    label: "Arena Fauxwood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-arena-fauxwood"),
  },
  {
    id: "allusion",
    label: "Allusion",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-allusion"),
  },
  {
    id: "freehang-pleated",
    label: "Freehang Pleated",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-freehang-pleated"),
  },
  {
    id: "fit-to-frame-pleated",
    label: "Fit to Frame Pleated",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-fit-to-frame-pleated"),
  },
  {
    id: "three-sided-pleated",
    label: "3BS Pleated",
    selectionLabel: "Fabric",
    match: (id) => hasPrefix(id, "wb-3bs-pleated"),
  },
  {
    id: "fit-to-frame-aluminium",
    label: "Fit to Frame Aluminium",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-fit-to-frame-aluminium"),
  },
  {
    id: "nightshade",
    label: "Nightshade",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-nightshade"),
  },
  {
    id: "essence-fauxwood",
    label: "Essence Fauxwood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-essence-fauxwood"),
  },
  {
    id: "urban-fauxwood",
    label: "Urban Fauxwood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-urban-fauxwood"),
  },
  {
    id: "expressions-fauxwood",
    label: "Expressions Fauxwood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-expressions-fauxwood"),
  },
  {
    id: "sunwood-faux",
    label: "Sunwood Faux",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-sunwood-faux") || hasPrefix(id, "wb-sunwood-fauxwood"),
  },
  {
    id: "sunwood-wood",
    label: "Sunwood Wood",
    selectionLabel: "Finish / Colour",
    match: (id) => hasPrefix(id, "wb-sunwood-wood"),
  },
];

export function getBlindProductType(productTypeId: string, productTypeName: string) {
  return BLIND_PRODUCT_TYPES.find((type) => type.match(productTypeId, productTypeName));
}
