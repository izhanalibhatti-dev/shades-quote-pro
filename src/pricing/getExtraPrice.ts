import type { Extra } from "@/types/Extra";
import type { ExtraLine, QuoteState, SelectedExtra } from "@/types/Quote";

export function getExtraPrice({
  extra,
  selected,
  quote,
  basePrice,
}: {
  extra: Extra;
  selected: SelectedExtra;
  quote: QuoteState;
  basePrice: number;
}): ExtraLine {
  const quantity = Math.max(1, selected.quantity || 1);
  const unitResult = getUnitPrice(extra, selected, quote, basePrice);

  return {
    id: extra.id,
    name: extra.name,
    quantity,
    unitPrice: unitResult.unitPrice,
    total: unitResult.unitPrice * quantity,
    widthMm: unitResult.widthMm,
    roundedWidthMm: unitResult.roundedWidthMm,
  };
}

function getUnitPrice(
  extra: Extra,
  selected: SelectedExtra,
  quote: QuoteState,
  basePrice: number,
): { unitPrice: number; widthMm?: number; roundedWidthMm?: number } {
  switch (extra.pricing.type) {
    case "fixed":
      return { unitPrice: extra.pricing.amount };
    case "perBlind":
      return { unitPrice: extra.pricing.amount * quote.size.quantity };
    case "perMetreWidth":
      return { unitPrice: extra.pricing.amount * (quote.size.widthMm / 1000) };
    case "percentageBase":
      return { unitPrice: basePrice * (extra.pricing.amount / 100) };
    case "fixedPlusPercentageBase":
      return { unitPrice: extra.pricing.amount + basePrice * (extra.pricing.percentage / 100) };
    case "fixedPlusWidthThreshold":
      return {
        unitPrice:
          (extra.pricing.amount +
            (quote.size.widthMm > extra.pricing.thresholdWidthMm ? extra.pricing.uplift : 0)) *
          quote.size.quantity,
      };
    case "widthTable": {
      const widthMm =
        Number.isFinite(selected.widthMm) && (selected.widthMm ?? 0) > 0
          ? selected.widthMm
          : quote.size.widthMm;
      const result = getWidthTablePrice(extra.pricing.widths, extra.pricing.prices, widthMm);
      return {
        unitPrice: result.price * quote.size.quantity,
        widthMm,
        roundedWidthMm: result.roundedWidthMm,
      };
    }
  }
}

function getWidthTablePrice(
  widths: number[],
  prices: number[],
  widthMm: number,
): { price: number; roundedWidthMm: number } {
  const min = Math.min(...widths);
  const max = Math.max(...widths);

  if (widthMm < min) {
    throw new Error(
      `Extra width ${widthMm}mm is below the minimum priced width. Available extra width range: ${min}-${max}mm.`,
    );
  }

  if (widthMm > max) {
    throw new Error(
      `Extra width ${widthMm}mm is above the maximum priced width. Available extra width range: ${min}-${max}mm.`,
    );
  }

  const index = widths.findIndex((width) => widthMm <= width);

  if (index === -1) {
    throw new Error(`No extra price is available for width ${widthMm}mm.`);
  }

  const price = prices[index];

  if (price === undefined) {
    throw new Error(`The extra price table is missing a price for width ${widths[index]}mm.`);
  }

  return { price, roundedWidthMm: widths[index] };
}
