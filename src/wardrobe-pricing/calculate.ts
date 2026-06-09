import type {
  WardrobeAddon,
  WardrobeLineCalc,
  WardrobeLineItem,
  WardrobePricingMode,
  WardrobeProduct,
  WardrobeQuoteState,
  WardrobeQuoteTotals,
} from "@/types/Wardrobe";

/** Round a value up to the next available band; returns null if out of range. */
function roundUpToBand(value: number, bands: number[]): number | null {
  const sorted = [...bands].sort((a, b) => a - b);
  return sorted.find((b) => value <= b) ?? null;
}

export interface PriceResolution {
  unitPrice: number;
  warning?: string;
}

export function resolveUnitPrice(
  product: WardrobeProduct,
  opts: { widthMm?: number; heightMm?: number; manualUnitPrice?: number },
): PriceResolution {
  if (opts.manualUnitPrice != null && opts.manualUnitPrice >= 0) {
    return { unitPrice: opts.manualUnitPrice };
  }
  const mode: WardrobePricingMode = product.pricing;
  switch (mode.type) {
    case "fixed":
      return { unitPrice: mode.unitPrice };
    case "manual":
      return { unitPrice: 0, warning: "Manual price required for this item." };
    case "perSqm": {
      const w = opts.widthMm ?? 0;
      const h = opts.heightMm ?? 0;
      if (w <= 0 || h <= 0) {
        return { unitPrice: 0, warning: "Enter width and height to calculate price." };
      }
      const sqm = (w / 1000) * (h / 1000);
      const calculated = sqm * mode.pricePerSqm;
      return { unitPrice: +Math.max(mode.minimumCharge ?? 0, calculated).toFixed(2) };
    }
    case "perMetre": {
      const w = opts.widthMm ?? 0;
      if (w <= 0) {
        return { unitPrice: 0, warning: "Enter width (mm) to calculate price." };
      }
      const calculated = (w / 1000) * mode.pricePerMetre;
      return { unitPrice: +Math.max(mode.minimumCharge ?? 0, calculated).toFixed(2) };
    }
    case "gridWxH": {
      const w = opts.widthMm ?? 0;
      const h = opts.heightMm ?? 0;
      if (w <= 0 || h <= 0) {
        return { unitPrice: 0, warning: "Enter width and height to calculate price." };
      }
      const rw = roundUpToBand(w, mode.widths);
      const rh = roundUpToBand(h, mode.heights);
      if (rw == null || rh == null) {
        return {
          unitPrice: 0,
          warning: `Size ${w}x${h}mm is outside the available pricing grid.`,
        };
      }
      const wi = mode.widths.indexOf(rw);
      const hi = mode.heights.indexOf(rh);
      const price = mode.prices[hi]?.[wi];
      if (price == null) {
        return {
          unitPrice: 0,
          warning: `No price available for ${rw}x${rh}mm in this product.`,
        };
      }
      return { unitPrice: price };
    }
  }
}

export function calcAddons(addons: WardrobeAddon[], basePrice: number): number {
  return addons.reduce((sum, a) => {
    if (a.kind === "fixed") return sum + a.amount;
    return sum + basePrice * (a.amount / 100);
  }, 0);
}

export function calculateLine(
  product: WardrobeProduct,
  input: {
    widthMm?: number;
    heightMm?: number;
    quantity: number;
    manualUnitPrice?: number;
    addons: WardrobeAddon[];
  },
): WardrobeLineCalc {
  const qty = Math.max(1, input.quantity || 1);
  const { unitPrice, warning } = resolveUnitPrice(product, {
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    manualUnitPrice: input.manualUnitPrice,
  });
  const basePrice = +(unitPrice * qty).toFixed(2);
  const addonsTotal = +calcAddons(input.addons, basePrice).toFixed(2);
  const lineTotal = +(basePrice + addonsTotal).toFixed(2);
  return { unitPrice, basePrice, addonsTotal, lineTotal, warning };
}

export function calculateWardrobeTotals(state: WardrobeQuoteState): WardrobeQuoteTotals {
  const itemsSubtotal = state.items.reduce((s, i) => s + i.calc.lineTotal, 0);
  const subtotal = Math.max(0, +(itemsSubtotal - (state.discount || 0)).toFixed(2));
  const vat = +(subtotal * (state.vatRate || 0)).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);
  return { subtotal, vat, total };
}

export function rebuildLine(line: WardrobeLineItem, product: WardrobeProduct): WardrobeLineItem {
  const calc = calculateLine(product, {
    widthMm: line.widthMm,
    heightMm: line.heightMm,
    quantity: line.quantity,
    manualUnitPrice: line.manualUnitPrice,
    addons: line.addons,
  });
  return { ...line, calc };
}
