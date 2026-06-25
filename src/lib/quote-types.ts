import { fabrics, suppliers } from "@/data/catalog";
import { calculateQuote } from "@/pricing/calculateQuote";
import type { ProjectQuote } from "@/types/ProjectQuote";
import type { QuoteCalculation, QuoteState } from "@/types/Quote";

export const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Office",
  "Dining Room",
] as const;

export const PRESET_SIZES = [
  { id: "900x1200", label: "900mm x 1200mm", widthMm: 900, heightMm: 1200 },
  { id: "1200x1500", label: "1200mm x 1500mm", widthMm: 1200, heightMm: 1500 },
  { id: "1800x2100", label: "1800mm x 2100mm", widthMm: 1800, heightMm: 2100 },
  { id: "2400x2400", label: "2400mm x 2400mm", widthMm: 2400, heightMm: 2400 },
] as const;

export type { QuoteCalculation, QuoteState };

export function defaultQuote(): QuoteState {
  const now = new Date();
  const fabric = fabrics[0];
  const supplier = suppliers.find((item) => item.id === fabric.supplierId) ?? suppliers[0];
  const productType =
    supplier.productTypes.find((item) => item.id === fabric.productTypeId) ??
    supplier.productTypes[0];
  const ref = `SAS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

  return {
    customer: { fullName: "", phone: "", email: "", address: "", postcode: "", notes: "" },
    product: {
      supplierId: supplier.id,
      productTypeId: productType.id,
      fabricId: fabric.id,
      room: "Living Room",
      mount: "Recess",
      chainSide: "Right",
    },
    size: {
      mode: "preset",
      presetId: "1800x2100",
      widthMm: 1800,
      heightMm: 2100,
      quantity: 1,
    },
    extras: [],
    pricing: { labourCost: 0, discount: 0, vatRate: 0.2 },
    meta: { ref, date: now.toISOString() },
    preparedBy: loadPreparedBy(),
  };
}

export function defaultProjectQuote(): ProjectQuote {
  const base = defaultQuote();

  return {
    id: uid(),
    ref: base.meta.ref,
    date: base.meta.date,
    customer: base.customer,
    preparedBy: base.preparedBy,
    areas: [{ id: uid(), name: "Kitchen", notes: "", items: [] }],
    notes: "",
    discount: 0,
    vatRate: 0.2,
  };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const PREPARED_BY_KEY = "sas.preparedBy";

export function loadPreparedBy(): QuoteState["preparedBy"] {
  if (typeof window === "undefined") {
    return { name: "", role: "Consultant", phone: "", email: "" };
  }
  try {
    const raw = localStorage.getItem(PREPARED_BY_KEY);
    if (raw) return { name: "", role: "Consultant", phone: "", email: "", ...JSON.parse(raw) };
  } catch (_error) {
    // Local storage can be unavailable or contain invalid legacy data.
  }
  return { name: "", role: "Consultant", phone: "", email: "" };
}

export function savePreparedBy(v: QuoteState["preparedBy"]) {
  try {
    localStorage.setItem(PREPARED_BY_KEY, JSON.stringify(v));
  } catch (_error) {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
}

export function computePricing(q: QuoteState): QuoteCalculation {
  return calculateQuote(q);
}

export function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}
