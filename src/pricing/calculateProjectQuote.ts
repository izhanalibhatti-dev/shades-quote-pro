import type { ProjectQuote, ProjectQuoteTotals } from "@/types/ProjectQuote";

export function calculateProjectQuote(project: ProjectQuote): ProjectQuoteTotals {
  const areaTotals = project.areas.map((area) => {
    const subtotal = area.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxableSubtotal = area.items
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.lineTotal, 0);
    const nonTaxableSubtotal = subtotal - taxableSubtotal;

    return {
      areaId: area.id,
      subtotal: roundMoney(subtotal),
      taxableSubtotal: roundMoney(taxableSubtotal),
      nonTaxableSubtotal: roundMoney(nonTaxableSubtotal),
    };
  });

  const subtotal = roundMoney(areaTotals.reduce((sum, area) => sum + area.subtotal, 0));
  const taxableBeforeDiscount = areaTotals.reduce((sum, area) => sum + area.taxableSubtotal, 0);
  const discount = Math.min(Math.max(0, project.discount || 0), taxableBeforeDiscount);
  const taxableSubtotal = roundMoney(Math.max(0, taxableBeforeDiscount - discount));
  const nonTaxableSubtotal = roundMoney(
    areaTotals.reduce((sum, area) => sum + area.nonTaxableSubtotal, 0),
  );
  const vat = roundMoney(taxableSubtotal * (project.vatRate || 0));
  const total = roundMoney(taxableSubtotal + vat + nonTaxableSubtotal);

  return {
    areaTotals,
    subtotal,
    discount,
    taxableSubtotal,
    nonTaxableSubtotal,
    vat,
    total,
  };
}

function roundMoney(value: number) {
  return +value.toFixed(2);
}
