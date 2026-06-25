import { extras, fabrics, priceTables, suppliers } from "@/data/catalog";
import type { QuoteCalculation, QuoteState } from "@/types/Quote";
import { findFabricBand } from "@/pricing/findFabricBand";
import { getBasePrice } from "@/pricing/getBasePrice";
import { getExtraPrice } from "@/pricing/getExtraPrice";

export function calculateQuote(quote: QuoteState): QuoteCalculation {
  const fabric = fabrics.find((item) => item.id === quote.product.fabricId);
  if (!fabric) {
    throw new Error("Selected fabric was not found.");
  }

  const supplier = suppliers.find((item) => item.id === fabric.supplierId);
  if (!supplier) {
    throw new Error("Selected fabric supplier was not found.");
  }

  const productType = supplier.productTypes.find((item) => item.id === fabric.productTypeId);
  if (!productType) {
    throw new Error("Selected fabric product type was not found for this supplier.");
  }

  const band = findFabricBand({
    fabrics,
    supplierId: fabric.supplierId,
    productTypeId: fabric.productTypeId,
    fabricId: fabric.id,
  });

  const priceTable = priceTables.find((item) => item.id === productType.priceTableId);
  if (!priceTable) {
    throw new Error(`Price table ${productType.priceTableId} was not found.`);
  }

  const normalBands = priceTable.priceVariants?.normal.bands ?? priceTable.bands;
  const companyDiscountedBands = priceTable.priceVariants?.companyDiscounted?.bands;
  if (!normalBands) {
    throw new Error(`Price table ${priceTable.id} has no normal price section.`);
  }
  const useCompanyDiscountedPrice = Boolean(
    quote.product.useCompanyDiscountedPrice && companyDiscountedBands,
  );
  const selectedPriceTable = {
    ...priceTable,
    bands: useCompanyDiscountedPrice ? companyDiscountedBands! : normalBands,
  };
  const base = getBasePrice({
    priceTable: selectedPriceTable,
    band,
    widthMm: quote.size.widthMm,
    heightMm: quote.size.heightMm,
  });
  const pricingSource =
    fabric.pricingSource ?? priceTable.priceSourceLabel ?? priceTable.source ?? supplier.name;
  const pricingCompany = fabric.supplierName ?? supplier.name;
  const pricingReferenceNote =
    fabric.pricingReferenceNote ??
    (band && band !== "Standard"
      ? `Internal pricing reference: ${pricingCompany}, Band ${band}. Pricing source: ${pricingSource}.`
      : `Internal pricing reference: ${pricingCompany}. Pricing source: ${pricingSource}.`);
  const priceVariant = useCompanyDiscountedPrice ? "companyDiscounted" : "list";

  const basePrice = base.price * quote.size.quantity;
  const selectedExtraLines = quote.extras.map((selected) => {
    const extra = extras.find((item) => item.id === selected.id);
    if (!extra) {
      throw new Error(`Selected extra ${selected.id} was not found.`);
    }
    return getExtraPrice({ extra, selected, quote, basePrice });
  });

  const extrasTotal = selectedExtraLines.reduce((sum, line) => sum + line.total, 0);
  const tradePrice = basePrice + extrasTotal;
  const discount = quote.pricing.discount ?? 0;
  const labourCost = quote.pricing.labourCost ?? 0;
  const taxableSubtotal = Math.max(0, tradePrice - discount);
  const vat = taxableSubtotal * quote.pricing.vatRate;
  const retailPrice = taxableSubtotal + labourCost;
  const finalTotal = taxableSubtotal + vat + labourCost;

  return {
    supplierName: pricingCompany,
    productTypeName: productType.name,
    fabricName: fabric.displayName ?? fabric.name,
    band,
    pricingBand: band,
    pricingSource,
    pricingReferenceNote,
    priceSource: pricingReferenceNote,
    priceVariant,
    widthMm: quote.size.widthMm,
    heightMm: quote.size.heightMm,
    roundedWidthMm: base.roundedWidthMm,
    roundedHeightMm: base.roundedHeightMm,
    quantity: quote.size.quantity,
    baseUnitPrice: base.price,
    basePrice,
    extras: selectedExtraLines,
    extrasTotal,
    tradePrice,
    labourCost,
    retailPrice,
    discount,
    taxableSubtotal,
    vatRate: quote.pricing.vatRate,
    vat,
    finalTotal,
  };
}
