// Wardrobe / Doors / Accessories quote types.
// Kept fully separate from the blinds quote system.

export type WardrobeCategoryId =
  | "doors"
  | "sliding-doors"
  | "panels"
  | "worktops"
  | "handles"
  | "hinges"
  | "drawers"
  | "internal-storage"
  | "led-lighting"
  | "bedroom-accessories"
  | "sinks-taps"
  | "acoustic-panels"
  | "misc";

/**
 * Pricing strategies the wardrobe engine understands.
 *
 * - `fixed`        : flat per-unit price.
 * - `perSqm`       : price per m² calculated from width x height.
 * - `gridWxH`      : grid lookup by width and height (mm). Rounds up to the
 *                    next available band on both axes.
 * - `perMetre`     : price per linear metre of width.
 * - `manual`       : staff enters the unit price directly (override only).
 */
export type WardrobePricingMode =
  | { type: "fixed"; unitPrice: number }
  | { type: "perSqm"; pricePerSqm: number }
  | {
      type: "gridWxH";
      widths: number[]; // mm, ascending
      heights: number[]; // mm, ascending
      // prices[heightIndex][widthIndex] — null = unavailable cell.
      prices: (number | null)[][];
    }
  | { type: "perMetre"; pricePerMetre: number }
  | { type: "manual" };

export interface WardrobeProduct {
  id: string;
  categoryId: WardrobeCategoryId;
  name: string;
  /** Free-form supplier / range label shown in the UI. */
  supplier?: string;
  /** Whether width/height inputs (mm) should be shown. */
  requiresDimensions: boolean;
  /** Optional product-level notes shown as helper text. */
  description?: string;
  pricing: WardrobePricingMode;
}

export interface WardrobeCategory {
  id: WardrobeCategoryId;
  name: string;
  /** Short subtitle shown under the category name. */
  blurb: string;
  products: WardrobeProduct[];
}

/**
 * Optional add-on / extra applied to a single line item.
 * Either a fixed amount or a percentage surcharge of the line subtotal.
 */
export interface WardrobeAddon {
  id: string;
  name: string;
  kind: "fixed" | "percent";
  amount: number;
}

export interface WardrobeLineItem {
  id: string; // local uuid
  categoryId: WardrobeCategoryId;
  productId: string;
  productName: string; // snapshot at add-time
  categoryName: string; // snapshot at add-time
  widthMm?: number;
  heightMm?: number;
  quantity: number;
  /** Manual price override per unit. When set, supersedes calculated price. */
  manualUnitPrice?: number;
  addons: WardrobeAddon[];
  notes?: string;
  // Cached calculation at the time of add/update — kept so the summary does
 // not need to re-resolve the catalogue for stale items.
  calc: WardrobeLineCalc;
}

export interface WardrobeLineCalc {
  unitPrice: number;
  basePrice: number; // unitPrice * quantity
  addonsTotal: number;
  lineTotal: number; // basePrice + addonsTotal
  warning?: string;
}

export interface WardrobeQuoteTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export interface WardrobeQuoteState {
  items: WardrobeLineItem[];
  vatRate: number; // e.g. 0.2
  discount: number; // £ off subtotal
  notes: string;
}

export function emptyWardrobeQuote(): WardrobeQuoteState {
  return { items: [], vatRate: 0.2, discount: 0, notes: "" };
}
