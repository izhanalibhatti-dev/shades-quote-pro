import { forwardRef } from "react";
import Logo from "@/components/Logo";
import { createTranslator, getIntlLocale, useI18n, type LocaleCode } from "@/lib/i18n";
import { formatGBP } from "@/lib/quote-types";
import { calculateProjectQuote } from "@/pricing/calculateProjectQuote";
import type { ProjectQuote, ProjectQuoteItem } from "@/types/ProjectQuote";

const ProjectQuotePreview = forwardRef<
  HTMLDivElement,
  { project: ProjectQuote; scopeLabel?: string; forceLocale?: LocaleCode }
>(function ProjectQuotePreview({ project, scopeLabel, forceLocale }, ref) {
  const totals = calculateProjectQuote(project);
  const ctx = useI18n();
  const { locale, t } = forceLocale ? createTranslator(forceLocale) : ctx;
  const date = new Date(project.date);
  const dateLocale = getIntlLocale(locale);

  return (
    <div
      ref={ref}
      className="w-full max-w-[760px] overflow-hidden rounded-2xl bg-white text-[#1a1d2b]"
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <div
        className="px-10 pt-9 pb-7"
        style={{
          background:
            "linear-gradient(135deg, #f7f4ee 0%, #ffffff 62%), radial-gradient(80% 100% at 100% 0%, rgba(31,41,55,0.06), transparent 60%)",
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <Logo className="h-12 w-auto" />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#6b7280]">
              {t("tabs.project")}
            </div>
            <div className="mt-0.5 text-[15px] font-semibold tracking-tight">{project.ref}</div>
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

      <div className="grid grid-cols-2 gap-8 px-10 py-7">
        <Block label={t("quote.preparedFor")}>
          <div className="text-[14px] font-semibold tracking-tight">
            {project.customer.fullName || "N/A"}
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-[#4b5563]">
            {project.customer.address || "N/A"}
            {project.customer.postcode ? `, ${project.customer.postcode}` : ""}
          </div>
          <div className="mt-2 text-[12px] text-[#4b5563]">
            {project.customer.phone || ""}
            {project.customer.phone && project.customer.email ? " · " : ""}
            {project.customer.email || ""}
          </div>
        </Block>
        <Block label={t("quote.scope")}>
          <div className="text-[14px] font-semibold tracking-tight">
            {project.areas.length} area{project.areas.length === 1 ? "" : "s"}
          </div>
          <div className="mt-1 text-[12.5px] text-[#4b5563]">
            {scopeLabel ?? t("project.scope")}
          </div>
        </Block>
      </div>

      <div className="mx-10 h-px bg-[#ece8df]" />

      <div className="space-y-7 px-10 py-7">
        {project.areas.map((area) => {
          return (
            <section key={area.id}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">
                    {t("quote.area")}
                  </div>
                  <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight">{area.name}</h2>
                  {area.notes && <p className="mt-1 text-[11.5px] text-[#6b7280]">{area.notes}</p>}
                </div>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-y border-[#ece8df] text-[10px] uppercase tracking-[0.14em] text-[#6b7280]">
                    <th className="py-2 text-left font-medium">{t("quote.item")}</th>
                    <th className="py-2 text-left font-medium">{t("quote.detailsColumn")}</th>
                    <th className="py-2 text-right font-medium">{t("quote.qty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {area.items.length === 0 ? (
                    <tr>
                      <td className="py-3 text-[#9ca3af]" colSpan={3}>
                        {t("status.noItems")}
                      </td>
                    </tr>
                  ) : (
                    area.items.map((item) => (
                      <tr key={item.id} className="border-b border-[#f4efe6]">
                        <td className="py-3 pr-3 align-top">
                          <div className="font-medium">{item.title}</div>
                          <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[#9ca3af]">
                            {labelForType(item.type, t)}
                          </div>
                        </td>
                        <td className="py-3 pr-3 align-top text-[#4b5563]">
                          <ItemDetails item={item} t={t} />
                        </td>
                        <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-6 px-10 pb-8">
        <div className="min-w-0 text-[11.5px] leading-relaxed text-[#6b7280]">
          {project.notes ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">
                {t("quote.notes")}
              </div>
              <p className="mt-1.5 max-w-full break-words text-[#4b5563]">{project.notes}</p>
            </>
          ) : (
            <p>{t("quote.validity")}</p>
          )}
        </div>
        <div className="min-w-0 rounded-xl bg-[#faf7f1] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#6b7280]">
              {t("quote.total")}
            </span>
            <span className="text-[20px] font-semibold tracking-tight tabular-nums">
              {formatGBP(totals.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#ece8df] px-10 py-6">
        <div className="grid grid-cols-2 gap-8">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">
              {t("quote.preparedBy")}
            </div>
            <div className="mt-1.5 text-[13px] font-semibold tracking-tight">
              {project.preparedBy.name || "N/A"}
            </div>
            <div className="break-words text-[11px] text-[#6b7280]">
              {project.preparedBy.role}
              {project.preparedBy.role && (project.preparedBy.phone || project.preparedBy.email)
                ? " · "
                : ""}
              {project.preparedBy.phone}
              {project.preparedBy.phone && project.preparedBy.email ? " · " : ""}
              {project.preparedBy.email}
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
            <div className="mt-1.5 text-[13px] font-semibold tracking-tight">
              {project.customer.fullName || "N/A"}
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

function ItemDetails({ item, t }: { item: ProjectQuoteItem; t: ReturnType<typeof useI18n>["t"] }) {
  if (item.type === "blind") {
    const p = item.calculation;
    return (
      <div>
        <div>
          {item.description || `${p.widthMm} x ${p.heightMm}mm`}
          {p.extras.length > 0
            ? ` · ${p.extras.length} extra${p.extras.length === 1 ? "" : "s"}`
            : ""}
        </div>
      </div>
    );
  }

  if (item.type === "wardrobe") {
    const line = item.wardrobeLine;
    return (
      <>
        {line.widthMm && line.heightMm ? `${line.widthMm} x ${line.heightMm}mm · ` : ""}
        {line.addons.length > 0
          ? ` · ${line.addons.length} add-on${line.addons.length === 1 ? "" : "s"}`
          : ""}
      </>
    );
  }

  return (
    <>
      {item.description ||
        item.notes ||
        (item.taxable ? t("field.taxable") : t("field.nonTaxable"))}
    </>
  );
}

function labelForType(type: ProjectQuoteItem["type"], t: ReturnType<typeof useI18n>["t"]) {
  switch (type) {
    case "blind":
      return t("item.blindShort");
    case "wardrobe":
      return t("item.wardrobeShort");
    case "accessory":
      return t("item.accessoryShort");
    case "labour":
      return t("item.labourShort");
    case "manual":
      return t("item.manualShort");
  }
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af]">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default ProjectQuotePreview;
