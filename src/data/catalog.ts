import suppliersJson from "@/data/suppliers/suppliers.json";
import workbookSuppliersJson from "@/data/suppliers/workbookSuppliers.json";
import workbookFabricsJson from "@/data/fabrics/workbookFabrics.json";
import priceTablesJson from "@/data/priceTables/priceTables.json";
import workbookPriceTablesJson from "@/data/priceTables/workbookPriceTables.json";
import slatsOnlyPriceTablesJson from "@/data/priceTables/slatsOnly89mm.json";
import extrasJson from "@/data/extras/extras.json";
import type { Extra } from "@/types/Extra";
import type { Fabric } from "@/types/Fabric";
import type { PriceTable } from "@/types/PriceTable";
import type { SlatsOnlyPriceTable } from "@/types/SlatsOnlyPriceTable";
import type { Supplier } from "@/types/Supplier";

export const suppliers = [...suppliersJson, ...workbookSuppliersJson] as Supplier[];
export const fabrics = workbookFabricsJson as Fabric[];
export const priceTables = [...priceTablesJson, ...workbookPriceTablesJson] as PriceTable[];
export const slatsOnlyPriceTables = slatsOnlyPriceTablesJson as SlatsOnlyPriceTable[];
export const extras = extrasJson as Extra[];
