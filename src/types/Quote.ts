export interface SelectedExtra {
  id: string;
  quantity: number;
  widthMm?: number;
}

export type BlindMount = "Exact" | "Recess";

export interface QuoteState {
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    postcode: string;
    notes: string;
  };
  product: {
    supplierId: string;
    productTypeId: string;
    fabricId: string;
    colour?: string;
    frameColour?: string;
    useCompanyDiscountedPrice?: boolean;
    room: string;
    mount: BlindMount;
    chainSide: "Left" | "Right";
  };
  size: {
    mode: "preset" | "custom";
    presetId: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
  };
  extras: SelectedExtra[];
  pricing: {
    labourCost: number;
    discount: number;
    vatRate: number;
  };
  meta: {
    ref: string;
    date: string;
  };
  preparedBy: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
}

export interface ExtraLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  widthMm?: number;
  roundedWidthMm?: number;
}

export interface QuoteCalculation {
  supplierName: string;
  productTypeName: string;
  fabricName: string;
  band: string;
  pricingBand: string;
  pricingSource: string;
  pricingReferenceNote: string;
  priceSource: string;
  priceVariant: "list" | "companyDiscounted";
  widthMm: number;
  heightMm: number;
  roundedWidthMm: number;
  roundedHeightMm: number;
  quantity: number;
  baseUnitPrice: number;
  basePrice: number;
  extras: ExtraLine[];
  extrasTotal: number;
  tradePrice: number;
  labourCost: number;
  retailPrice: number;
  discount: number;
  taxableSubtotal: number;
  vatRate: number;
  vat: number;
  finalTotal: number;
}
