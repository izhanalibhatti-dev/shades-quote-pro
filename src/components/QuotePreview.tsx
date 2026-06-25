import { forwardRef } from "react";
import Logo from "@/components/Logo";
import { getBlindProductType } from "@/data/blinds/productTypes";
import { getIntlLocale, useI18n } from "@/lib/i18n";
import { computePricing, formatGBP, type QuoteState } from "@/lib/quote-types";

const QuotePreview = forwardRef<HTMLDivElement, { quote: QuoteState }>(function QuotePreview(
  { quote },
  ref,
) {
  const p = computePricing(quote);
  const { locale, t, translateLabel } = useI18n();
  const date = new Date(quote.meta.date);
  const dateLocale = getIntlLocale(locale);
  const blindType = getBlindProductType(quote.product.productTypeId, p.productTypeName);
  const productLabel = blindType ? `${blindType.label} Blind` : translateLabel(p.productTypeName);

  return (
    <div
      ref={ref}
      className="w-full max-w-[680px] overflow-hidden rounded-2xl bg-white text-[#1a1d2b]"
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="px-10 pt-9 pb-7"
        style={{
          background:
            "linear-gradient(135deg, #f7f4ee 0%, #ffffff 60%), radial-gradient(80% 100% at 100% 0%, rgba(31,41,55,0.06), transparent 60%)",
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-auto" />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#6b7280]">
              {t("quote.quotation")}
            </div>
            <div className="mt-0.5 text-[15px] font-semibold tracking-tight">{quote.meta.ref}</div>
            <div className="mt-0.5 text-[11px] text-[#6b7280]">
              {date.toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#ece8df]" />

      {/* Customer + Blind */}
      <div className="grid grid-cols-2 gap-8 px-10 py-7">
        <Block label={t("quote.preparedFor")}>
          <div className="text-[14px] font-semibold tracking-tight">
            {quote.customer.fullName || "N/A"}
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-[#4b5563]">
            {quote.customer.address || "N/A"}
            {quote.customer.postcode ? `, ${quote.customer.postcode}` : ""}
          </div>
          <div className="mt-2 text-[12px] text-[#4b5563]">
            {quote.customer.phone || ""}
            {quote.customer.phone && quote.customer.email ? " · " : ""}
            {quote.customer.email || ""}
          </div>
        </Block>
        <Block label={t("quote.product")}>
          <div className="text-[14px] font-semibold tracking-tight">{productLabel}</div>
          <div className="mt-1 text-[12.5px] text-[#4b5563]">{p.supplierName}</div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] text-[#4b5563]">
            {!isInternalBandLabel(p.fabricName) && <Pair k={t("quote.fabric")} v={p.fabricName} />}
            {quote.product.colour && <Pair k="Colour" v={quote.product.colour} />}
            <Pair k={t("quote.mount")} v={quote.product.mount} />
            <Pair k={t("quote.chain")} v={quote.product.chainSide} />
          </dl>
        </Block>
      </div>

      <div className="mx-10 h-px bg-[#ece8df]" />

      {/* Specification table */}
      <div className="px-10 py-7">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#6b7280]">
          {t("quote.specification")}
        </div>
        <table className="mt-3 w-full text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.14em] text-[#6b7280]">
              <th className="pb-2 text-left font-medium">{t("quote.item")}</th>
              <th className="pb-2 text-right font-medium">W x H (mm)</th>
              <th className="pb-2 text-right font-medium">{t("quote.tableSize")}</th>
              <th className="pb-2 text-right font-medium">{t("quote.qty")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#ece8df]">
              <td className="py-3 pr-2 align-top">
                <div className="font-medium">{productLabel}</div>
                <div className="text-[11px] text-[#6b7280]">
                  {quote.product.room}
                  {!isInternalBandLabel(p.fabricName) ? ` · ${p.fabricName}` : ""}
                </div>
              </td>
              <td className="py-3 text-right tabular-nums">
                {p.widthMm} x {p.heightMm}
              </td>
              <td className="py-3 text-right tabular-nums">
                {p.roundedWidthMm} x {p.roundedHeightMm}
              </td>
              <td className="py-3 text-right tabular-nums">{quote.size.quantity}</td>
            </tr>
            {p.extras.map((extra) => (
              <tr key={extra.id} className="border-t border-[#f4efe6]">
                <td className="py-2 pr-2 align-top text-[#4b5563]">{extra.name}</td>
                <td className="py-2 text-right text-[#6b7280]">Extra</td>
                <td className="py-2 text-right text-[#6b7280]">
                  {extra.roundedWidthMm ? `${extra.roundedWidthMm}mm` : ""}
                </td>
                <td className="py-2 text-right tabular-nums">{extra.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-6 px-10 pb-8">
        <div className="min-w-0 text-[11.5px] leading-relaxed text-[#6b7280]">
          {quote.customer.notes ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">Notes</div>
              <p className="mt-1.5 max-w-full break-words text-[#4b5563]">{quote.customer.notes}</p>
            </>
          ) : (
            <p className="max-w-full">{t("quote.validity")}</p>
          )}
        </div>
        <div className="min-w-0 rounded-xl bg-[#faf7f1] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#6b7280]">
              {t("quote.total")}
            </span>
            <span className="text-[20px] font-semibold tracking-tight tabular-nums">
              {formatGBP(p.finalTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#ece8df] px-10 py-6">
        <div className="grid grid-cols-2 gap-8">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">
              {t("quote.preparedBy")}
            </div>
            <div className="mt-1.5 text-[13px] font-semibold tracking-tight text-[#1a1d2b]">
              {quote.preparedBy.name || "N/A"}
            </div>
            <div className="break-words text-[11px] text-[#6b7280]">
              {quote.preparedBy.role}
              {quote.preparedBy.role && (quote.preparedBy.phone || quote.preparedBy.email)
                ? " · "
                : ""}
              {quote.preparedBy.phone}
              {quote.preparedBy.phone && quote.preparedBy.email ? " · " : ""}
              {quote.preparedBy.email}
            </div>
            <div className="mt-5 h-px w-full bg-[#cbc4b3]" />
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">
              {t("quote.consultantSignature")}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">
              {t("quote.customer")}
            </div>
            <div className="mt-1.5 text-[13px] font-semibold tracking-tight text-[#1a1d2b]">
              {quote.customer.fullName || "N/A"}
            </div>
            <div className="text-[11px] text-[#6b7280]">&nbsp;</div>
            <div className="mt-5 h-px w-full bg-[#cbc4b3]" />
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">
              {t("quote.customerSignature")}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between text-[10.5px] text-[#9ca3af]">
          <span>shadesandspace.com</span>
          <span>{t("quote.thanks")}</span>
        </div>
      </div>
    </div>
  );
});

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-[#9ca3af]">{k}</dt>
      <dd className="text-right text-[#374151]">{v}</dd>
    </>
  );
}

function isInternalBandLabel(value: string) {
  return /^(standard|band\s+[a-z]{1,3})$/i.test(value.trim());
}

export default QuotePreview;
