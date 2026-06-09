export interface Fabric {
  id: string;
  supplierId: string;
  productTypeId: string;
  name: string;
  band: string;
  source?: string;
  displayName?: string;
  supplierName?: string;
  company?: string;
  blindType?: string;
  collection?: string;
  compatibleBlindTypes?: string[];
  pricingSource?: string;
  pricingReferenceNote?: string;
  selectionKind?: "fabric" | "finish" | "colour" | "pricingBandFallback";
  isFallback?: boolean;
  isDiscontinued?: boolean;
}
