import type { WardrobeCategory } from "@/types/Wardrobe";

// TODO: Replace with supplier catalogue prices (extracted from supplier PDF).
// All prices below are placeholder sample values only.
// Each category and product is structured so a real grid / per-sqm / per-metre
// price table can be dropped in without UI changes.

export const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  {
    id: "doors",
    name: "Doors",
    blurb: "Hinged wardrobe & cabinet doors",
    products: [
      {
        id: "door-standard",
        categoryId: "doors",
        name: "Standard Hinged Door",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: {
          type: "gridWxH",
          widths: [400, 500, 600, 700, 800], // TODO: real grid
          heights: [1800, 2000, 2200, 2400],
          prices: [
            [80, 95, 110, 125, 140],
            [90, 105, 120, 135, 150],
            [100, 115, 130, 145, 160],
            [110, 125, 140, 155, 170],
          ],
        },
      },
      {
        id: "door-mirror",
        categoryId: "doors",
        name: "Mirror Door",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perSqm", pricePerSqm: 220 },
      },
    ],
  },
  {
    id: "sliding-doors",
    name: "Sliding Doors",
    blurb: "Track-mounted sliding wardrobe doors",
    products: [
      {
        id: "slider-2panel",
        categoryId: "sliding-doors",
        name: "2-Panel Sliding System",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: {
          type: "gridWxH",
          widths: [1500, 1800, 2100, 2400, 2700, 3000],
          heights: [2200, 2400, 2600],
          prices: [
            [620, 720, 820, 920, 1020, 1120],
            [680, 780, 880, 980, 1080, 1180],
            [740, 840, 940, 1040, 1140, 1240],
          ],
        },
      },
      {
        id: "slider-3panel",
        categoryId: "sliding-doors",
        name: "3-Panel Sliding System",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perSqm", pricePerSqm: 260 },
      },
    ],
  },
  {
    id: "panels",
    name: "Panels / Cut & Edge",
    blurb: "Custom-cut panels with edge banding",
    products: [
      {
        id: "panel-mfc-18",
        categoryId: "panels",
        name: "MFC Panel 18mm — Cut & Edged",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perSqm", pricePerSqm: 95 },
      },
      {
        id: "panel-mdf-22",
        categoryId: "panels",
        name: "MDF Panel 22mm — Cut & Edged",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perSqm", pricePerSqm: 130 },
      },
    ],
  },
  {
    id: "worktops",
    name: "Worktops",
    blurb: "Linear worktop sections priced per metre",
    products: [
      {
        id: "worktop-laminate",
        categoryId: "worktops",
        name: "Laminate Worktop",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perMetre", pricePerMetre: 95 },
      },
      {
        id: "worktop-solid",
        categoryId: "worktops",
        name: "Solid Surface Worktop",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perMetre", pricePerMetre: 320 },
      },
    ],
  },
  {
    id: "handles",
    name: "Handles",
    blurb: "Door & drawer handles",
    products: [
      {
        id: "handle-bar-160",
        categoryId: "handles",
        name: "Bar Handle 160mm",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 8.5 },
      },
      {
        id: "handle-knob",
        categoryId: "handles",
        name: "Round Knob",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 5 },
      },
    ],
  },
  {
    id: "hinges",
    name: "Hinges",
    blurb: "Soft-close & standard hinges",
    products: [
      {
        id: "hinge-softclose",
        categoryId: "hinges",
        name: "Soft-Close Hinge",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 6 },
      },
    ],
  },
  {
    id: "drawers",
    name: "Drawers",
    blurb: "Drawer boxes & runner systems",
    products: [
      {
        id: "drawer-standard",
        categoryId: "drawers",
        name: "Standard Drawer Box",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: {
          type: "gridWxH",
          widths: [400, 500, 600, 800, 900, 1000],
          heights: [100, 150, 200, 250],
          prices: [
            [45, 52, 60, 78, 86, 94],
            [55, 62, 70, 88, 96, 104],
            [65, 72, 80, 98, 106, 114],
            [75, 82, 90, 108, 116, 124],
          ],
        },
      },
    ],
  },
  {
    id: "internal-storage",
    name: "Internal Storage",
    blurb: "Pull-outs, baskets and shelving",
    products: [
      {
        id: "pullout-shoe",
        categoryId: "internal-storage",
        name: "Pull-out Shoe Rack",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 85 },
      },
      {
        id: "tie-rack",
        categoryId: "internal-storage",
        name: "Pull-out Tie Rack",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 42 },
      },
    ],
  },
  {
    id: "led-lighting",
    name: "LED Lighting",
    blurb: "Wardrobe & cabinet LED systems",
    products: [
      {
        id: "led-strip",
        categoryId: "led-lighting",
        name: "LED Strip (per metre)",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perMetre", pricePerMetre: 22 },
      },
      {
        id: "led-driver",
        categoryId: "led-lighting",
        name: "LED Driver",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 35 },
      },
    ],
  },
  {
    id: "bedroom-accessories",
    name: "Bedroom Accessories",
    blurb: "Rails, mirrors and bedroom add-ons",
    products: [
      {
        id: "hanging-rail",
        categoryId: "bedroom-accessories",
        name: "Chrome Hanging Rail",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perMetre", pricePerMetre: 18 },
      },
    ],
  },
  {
    id: "sinks-taps",
    name: "Sinks & Taps",
    blurb: "Utility sinks and mixer taps",
    products: [
      {
        id: "sink-single",
        categoryId: "sinks-taps",
        name: "Single Bowl Sink",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 145 },
      },
      {
        id: "tap-mixer",
        categoryId: "sinks-taps",
        name: "Mixer Tap",
        supplier: "TBC",
        requiresDimensions: false,
        pricing: { type: "fixed", unitPrice: 95 },
      },
    ],
  },
  {
    id: "acoustic-panels",
    name: "Acoustic Panels",
    blurb: "Slatted acoustic wall panelling",
    products: [
      {
        id: "acoustic-oak",
        categoryId: "acoustic-panels",
        name: "Slatted Oak Acoustic Panel",
        supplier: "TBC",
        requiresDimensions: true,
        pricing: { type: "perSqm", pricePerSqm: 180 },
      },
    ],
  },
  {
    id: "misc",
    name: "Miscellaneous Accessories",
    blurb: "Manual / custom-priced line items",
    products: [
      {
        id: "misc-manual",
        categoryId: "misc",
        name: "Custom Item (manual price)",
        supplier: "TBC",
        requiresDimensions: false,
        description: "Use this when an item is not yet in the catalogue.",
        pricing: { type: "manual" },
      },
    ],
  },
];

export function findWardrobeCategory(id: string) {
  return WARDROBE_CATEGORIES.find((c) => c.id === id);
}

export function findWardrobeProduct(productId: string) {
  for (const cat of WARDROBE_CATEGORIES) {
    const p = cat.products.find((pr) => pr.id === productId);
    if (p) return { product: p, category: cat };
  }
  return null;
}
