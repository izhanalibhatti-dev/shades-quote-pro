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
  const unitPrice = getUnitPrice(extra, quote, basePrice);

  return {
    id: extra.id,
    name: extra.name,
    quantity,
    unitPrice,
    total: unitPrice * quantity,
  };
}

function getUnitPrice(extra: Extra, quote: QuoteState, basePrice: number): number {
  switch (extra.pricing.type) {
    case "fixed":
      return extra.pricing.amount;
    case "perBlind":
      return extra.pricing.amount * quote.size.quantity;
    case "perMetreWidth":
      return extra.pricing.amount * (quote.size.widthMm / 1000);
    case "percentageBase":
      return basePrice * (extra.pricing.amount / 100);
    case "fixedPlusPercentageBase":
      return extra.pricing.amount + basePrice * (extra.pricing.percentage / 100);
    case "fixedPlusWidthThreshold":
      return (
        (extra.pricing.amount +
          (quote.size.widthMm > extra.pricing.thresholdWidthMm ? extra.pricing.uplift : 0)) *
        quote.size.quantity
      );
    case "widthTable":
      return (
        getWidthTablePrice(extra.pricing.widths, extra.pricing.prices, quote.size.widthMm) *
        quote.size.quantity
      );
  }
}

function getWidthTablePrice(widths: number[], prices: number[], widthMm: number): number {
  const index = widths.findIndex((width) => widthMm <= width);

  if (index === -1) {
    throw new Error(`No extra price is available for width ${widthMm}mm.`);
  }

  const price = prices[index];

  if (price === undefined) {
    throw new Error(`The extra price table is missing a price for width ${widths[index]}mm.`);
  }

  return price;
}
