import type { QuoteCalculation, QuoteState } from "@/types/Quote";
import type { WardrobeLineItem } from "@/types/Wardrobe";

export type ProjectQuoteItemType = "blind" | "wardrobe" | "accessory" | "labour" | "manual";

interface ProjectQuoteItemBase {
  id: string;
  type: ProjectQuoteItemType;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxable: boolean;
  notes?: string;
}

export interface ProjectBlindItem extends ProjectQuoteItemBase {
  type: "blind";
  quote: QuoteState;
  calculation: QuoteCalculation;
}

export interface ProjectWardrobeItem extends ProjectQuoteItemBase {
  type: "wardrobe";
  wardrobeLine: WardrobeLineItem;
}

export interface ProjectAccessoryItem extends ProjectQuoteItemBase {
  type: "accessory";
  code?: string;
}

export interface ProjectLabourItem extends ProjectQuoteItemBase {
  type: "labour";
  taxable: false;
}

export interface ProjectManualItem extends ProjectQuoteItemBase {
  type: "manual";
}

export type ProjectQuoteItem =
  | ProjectBlindItem
  | ProjectWardrobeItem
  | ProjectAccessoryItem
  | ProjectLabourItem
  | ProjectManualItem;

export interface QuoteArea {
  id: string;
  name: string;
  notes?: string;
  items: ProjectQuoteItem[];
}

export interface ProjectQuote {
  id: string;
  ref: string;
  date: string;
  customer: QuoteState["customer"];
  preparedBy: QuoteState["preparedBy"];
  areas: QuoteArea[];
  notes: string;
  discount: number;
  vatRate: number;
}

export interface ProjectAreaTotal {
  areaId: string;
  subtotal: number;
  taxableSubtotal: number;
  nonTaxableSubtotal: number;
}

export interface ProjectQuoteTotals {
  areaTotals: ProjectAreaTotal[];
  subtotal: number;
  discount: number;
  taxableSubtotal: number;
  nonTaxableSubtotal: number;
  vat: number;
  total: number;
}
