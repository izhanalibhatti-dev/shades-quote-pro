export type PriceCell = number | null;
export type PriceMatrix = PriceCell[][];

export interface PriceVariant {
  label: string;
  source?: string;
  bands: Record<string, PriceMatrix>;
}

export interface PriceTable {
  id: string;
  supplierId: string;
  productTypeId: string;
  year: number;
  currency: "GBP";
  source?: string;
  priceSourceLabel?: string;
  workbookSheetName?: string;
  workbookCellRange?: string;
  notes?: string;
  widthsLabel?: string;
  heightsLabel?: string;
  bandsLabel?: string;
  matrixLabel?: string;
  nullLabel?: string;
  widths: number[];
  heights: number[];
  bands?: Record<string, PriceMatrix>;
  priceVariants?: {
    normal: PriceVariant;
    companyDiscounted?: PriceVariant;
  };
}
