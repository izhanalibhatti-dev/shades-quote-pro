import { formatGBP } from "@/lib/quote-types";
import type { QuoteCalculation } from "@/types/Quote";

export function QuoteSummary({ calculation }: { calculation: QuoteCalculation }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-transparent">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-4">
        <Mini label="Base" value={formatGBP(calculation.basePrice)} />
        <Mini label="Extras" value={formatGBP(calculation.extrasTotal)} />
        <Mini label="Trade" value={formatGBP(calculation.tradePrice)} />
        <Mini label="Labour" value={formatGBP(calculation.labourCost)} />
        <Mini label="Taxable" value={formatGBP(calculation.taxableSubtotal)} />
        <Mini
          label={`VAT (${Math.round(calculation.vatRate * 100)}%)`}
          value={formatGBP(calculation.vat)}
        />
        <Mini label="Band" value={calculation.band} />
        <Mini
          label="Table size"
          value={`${calculation.roundedWidthMm} x ${calculation.roundedHeightMm}mm`}
        />
      </div>
      <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        {calculation.pricingReferenceNote}
      </div>
      <div className="flex items-baseline justify-between border-t border-border bg-foreground/[0.03] px-5 py-4">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Final total
        </span>
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {formatGBP(calculation.finalTotal)}
        </span>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
