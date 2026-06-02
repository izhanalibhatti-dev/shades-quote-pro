import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  PackageOpen,
  Percent,
  RotateCcw,
  Ruler,
  Sliders,
  User2,
  Download,
  IdCard,
} from "lucide-react";
import { useQuote } from "@/components/QuoteContext";
import {
  ExtrasSelector,
  FabricSelector,
  ProductSelector,
  QuoteSummary,
} from "@/components/QuoteCalculator";
import QuotePreview from "@/components/QuotePreview";
import QuoteTypeTabs from "@/components/QuoteTypeTabs";
import { extras, fabrics, suppliers } from "@/data/catalog";
import {
  PRESET_SIZES,
  ROOM_TYPES,
  computePricing,
  defaultQuote,
  savePreparedBy,
} from "@/lib/quote-types";

export const Route = createFileRoute("/_app/quote")({
  head: () => ({ meta: [{ title: "Create Quote - Shades & Space" }] }),
  component: CreateQuote,
});

function CreateQuote() {
  const { quote, setQuote, resetQuote, addRecent } = useQuote();
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const pricing = useMemo(() => computePricing(quote), [quote]);
  const blindTypeOptions = useMemo(() => {
    const productTypes = new Map<string, string>();
    suppliers.forEach((supplier) => {
      supplier.productTypes.forEach((productType) => {
        if (!productTypes.has(productType.id)) {
          productTypes.set(productType.id, productType.name);
        }
      });
    });
    return [...productTypes].map(([value, label]) => ({ value, label }));
  }, []);
  const availableFabrics = fabrics.filter(
    (fabric) => fabric.productTypeId === quote.product.productTypeId,
  );
  const fabricNameCounts = availableFabrics.reduce<Record<string, number>>((counts, fabric) => {
    const key = fabric.name.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const supplierNameById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));

  const exportPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: 680,
        style: {
          width: "680px",
          maxWidth: "680px",
          margin: "0",
        },
      });
      const link = document.createElement("a");
      const safeName = (quote.customer.fullName || "customer").replace(/[^a-z0-9-_]+/gi, "_");
      link.download = `${quote.meta.ref}-${safeName}.png`;
      link.href = dataUrl;
      link.click();
      addRecent({
        ref: quote.meta.ref,
        name: quote.customer.fullName,
        total: pricing.finalTotal,
        at: Date.now(),
      });
      toast.success("Quote exported", { description: "Saved to your downloads." });
    } catch (e) {
      console.error(e);
      toast.error("Export failed", { description: "Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const onReset = () => {
    resetQuote();
    toast.message("New quote started", { description: "All fields cleared." });
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <QuoteTypeTabs />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            New quotation
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Create quote</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={exportPng}
            disabled={exporting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export PNG"}
          </motion.button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* FORM */}
        <div className="space-y-6">
          <Card
            icon={<IdCard className="h-4 w-4" />}
            title="Prepared by"
            subtitle="Who is creating this quote, shown on the exported PNG"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Your name"
                value={quote.preparedBy.name}
                onChange={(v) => {
                  const next = { ...quote.preparedBy, name: v };
                  setQuote((q) => ({ ...q, preparedBy: next }));
                  savePreparedBy(next);
                }}
              />
              <Input
                label="Role"
                value={quote.preparedBy.role}
                onChange={(v) => {
                  const next = { ...quote.preparedBy, role: v };
                  setQuote((q) => ({ ...q, preparedBy: next }));
                  savePreparedBy(next);
                }}
              />
              <Input
                label="Phone"
                type="tel"
                value={quote.preparedBy.phone}
                onChange={(v) => {
                  const next = { ...quote.preparedBy, phone: v };
                  setQuote((q) => ({ ...q, preparedBy: next }));
                  savePreparedBy(next);
                }}
              />
              <Input
                label="Email"
                type="email"
                value={quote.preparedBy.email}
                onChange={(v) => {
                  const next = { ...quote.preparedBy, email: v };
                  setQuote((q) => ({ ...q, preparedBy: next }));
                  savePreparedBy(next);
                }}
              />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Saved on this device only. Pre-fills every new quote you create here.
            </p>
          </Card>

          <Card
            icon={<User2 className="h-4 w-4" />}
            title="Customer details"
            subtitle="Captured on the quote document"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full name"
                value={quote.customer.fullName}
                onChange={(v) =>
                  setQuote((q) => ({ ...q, customer: { ...q.customer, fullName: v } }))
                }
              />
              <Input
                label="Phone number"
                type="tel"
                value={quote.customer.phone}
                onChange={(v) => setQuote((q) => ({ ...q, customer: { ...q.customer, phone: v } }))}
              />
              <Input
                label="Email address"
                type="email"
                value={quote.customer.email}
                onChange={(v) => setQuote((q) => ({ ...q, customer: { ...q.customer, email: v } }))}
              />
              <Input
                label="Postcode"
                value={quote.customer.postcode}
                onChange={(v) =>
                  setQuote((q) => ({ ...q, customer: { ...q.customer, postcode: v } }))
                }
              />
              <div className="sm:col-span-2">
                <Input
                  label="Full address"
                  value={quote.customer.address}
                  onChange={(v) =>
                    setQuote((q) => ({ ...q, customer: { ...q.customer, address: v } }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Additional notes"
                  value={quote.customer.notes}
                  onChange={(v) =>
                    setQuote((q) => ({ ...q, customer: { ...q.customer, notes: v } }))
                  }
                />
              </div>
            </div>
          </Card>

          <Card
            icon={<PackageOpen className="h-4 w-4" />}
            title="Product details"
            subtitle="Blind type and fabric selection"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ProductSelector
                value={quote.product.productTypeId}
                onChange={(productTypeId) => {
                  const fabric = fabrics.find((item) => item.productTypeId === productTypeId);
                  setQuote((q) => ({
                    ...q,
                    product: {
                      ...q.product,
                      supplierId: fabric?.supplierId ?? q.product.supplierId,
                      productTypeId,
                      fabricId: fabric?.id ?? "",
                    },
                  }));
                }}
                options={blindTypeOptions}
              />
              <FabricSelector
                value={quote.product.fabricId}
                onChange={(fabricId) => {
                  const fabric = fabrics.find((item) => item.id === fabricId);
                  setQuote((q) => ({
                    ...q,
                    product: {
                      ...q.product,
                      supplierId: fabric?.supplierId ?? q.product.supplierId,
                      productTypeId: fabric?.productTypeId ?? q.product.productTypeId,
                      fabricId,
                    },
                  }));
                }}
                options={availableFabrics.map((fabric) => ({
                  value: fabric.id,
                  label:
                    fabricNameCounts[fabric.name.trim().toLowerCase()] > 1
                      ? `${fabric.name} - ${supplierNameById.get(fabric.supplierId) ?? fabric.supplierId}`
                      : fabric.name,
                }))}
              />
              <Select
                label="Room"
                value={quote.product.room}
                onChange={(v) =>
                  setQuote((q) => ({
                    ...q,
                    product: { ...q.product, room: v as typeof q.product.room },
                  }))
                }
                options={ROOM_TYPES.map((r) => ({ value: r, label: r }))}
              />
              <Select
                label="Mount type"
                value={quote.product.mount}
                onChange={(v) =>
                  setQuote((q) => ({
                    ...q,
                    product: { ...q.product, mount: v as typeof q.product.mount },
                  }))
                }
                options={["Inside Recess", "Outside Recess", "Ceiling", "Face Fix"].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
              <Select
                label="Chain side"
                value={quote.product.chainSide}
                onChange={(v) =>
                  setQuote((q) => ({
                    ...q,
                    product: { ...q.product, chainSide: v as "Left" | "Right" },
                  }))
                }
                options={[
                  { value: "Left", label: "Left" },
                  { value: "Right", label: "Right" },
                ]}
              />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Supplier and band are controlled by the fabric data file and applied automatically.
              Current supplier:{" "}
              <span className="font-semibold text-foreground">{pricing.supplierName}</span>. Band:{" "}
              <span className="font-semibold text-foreground">{pricing.band}</span>
            </p>
          </Card>

          <Card
            icon={<Ruler className="h-4 w-4" />}
            title="Measurements"
            subtitle="Preset or fully custom, tailored to the window"
          >
            {/* Mode toggle */}
            <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 text-sm">
              {(["preset", "custom"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setQuote((q) => ({ ...q, size: { ...q.size, mode: m } }))}
                  className={`relative rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
                    quote.size.mode === m
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {quote.size.mode === m && (
                    <motion.span
                      layoutId="size-mode-pill"
                      className="absolute inset-0 -z-10 rounded-lg bg-background luxe-shadow"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  {m === "preset" ? "Preset sizes" : "Custom size"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {quote.size.mode === "preset" ? (
                <motion.div
                  key="preset"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                >
                  {PRESET_SIZES.map((p) => {
                    const active = quote.size.presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setQuote((q) => ({
                            ...q,
                            size: {
                              ...q.size,
                              presetId: p.id,
                              widthMm: p.widthMm,
                              heightMm: p.heightMm,
                            },
                          }))
                        }
                        className={`group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-foreground/60 bg-foreground/[0.04] luxe-shadow"
                            : "border-border bg-card hover:border-foreground/30"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Preset
                        </div>
                        <div className="text-sm font-semibold tracking-tight">{p.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {((p.widthMm / 1000) * (p.heightMm / 1000)).toFixed(2)} m²
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <p className="text-xs text-muted-foreground">
                    Custom sizing lets you create perfectly tailored blinds based on the exact
                    window measurements taken on site.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <NumberInput
                      label="Width (mm)"
                      value={quote.size.widthMm}
                      step={10}
                      onChange={(v) => setQuote((q) => ({ ...q, size: { ...q.size, widthMm: v } }))}
                    />
                    <NumberInput
                      label="Height (mm)"
                      value={quote.size.heightMm}
                      step={10}
                      onChange={(v) =>
                        setQuote((q) => ({ ...q, size: { ...q.size, heightMm: v } }))
                      }
                    />
                    <NumberInput
                      label="Quantity"
                      value={quote.size.quantity}
                      min={1}
                      onChange={(v) =>
                        setQuote((q) => ({ ...q, size: { ...q.size, quantity: Math.max(1, v) } }))
                      }
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live area preview */}
            <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-transparent p-4 sm:grid-cols-3">
              <Stat label="Width" value={`${quote.size.widthMm} mm`} />
              <Stat label="Height" value={`${quote.size.heightMm} mm`} />
              <Stat
                label="Table size"
                value={`${pricing.roundedWidthMm} x ${pricing.roundedHeightMm} mm`}
                highlight
              />
            </div>
          </Card>

          <Card
            icon={<Sliders className="h-4 w-4" />}
            title="Extras"
            subtitle="Optional upgrades and additional parts"
          >
            <ExtrasSelector
              extras={extras}
              selected={quote.extras}
              onChange={(selected) => setQuote((q) => ({ ...q, extras: selected }))}
            />
          </Card>

          <Card
            icon={<Percent className="h-4 w-4" />}
            title="Pricing"
            subtitle="Trade cost, fixed labour, VAT and final total"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberInput
                label="Labour (£)"
                value={quote.pricing.labourCost ?? 0}
                step={5}
                onChange={(v) =>
                  setQuote((q) => ({
                    ...q,
                    pricing: { ...q.pricing, labourCost: Math.max(0, v) },
                  }))
                }
              />
              <NumberInput
                label="Discount (£)"
                value={quote.pricing.discount}
                step={5}
                onChange={(v) =>
                  setQuote((q) => ({ ...q, pricing: { ...q.pricing, discount: Math.max(0, v) } }))
                }
              />
              <NumberInput
                label="VAT (%)"
                value={Math.round(quote.pricing.vatRate * 100)}
                step={1}
                onChange={(v) =>
                  setQuote((q) => ({
                    ...q,
                    pricing: { ...q.pricing, vatRate: Math.max(0, Math.min(100, v)) / 100 },
                  }))
                }
              />
            </div>

            <QuoteSummary calculation={pricing} />
          </Card>
        </div>

        {/* LIVE PREVIEW */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sliders className="h-3 w-3" /> Live preview
          </div>
          <div className="flex justify-center rounded-3xl border border-border bg-gradient-to-br from-muted/30 to-transparent p-4 luxe-shadow sm:p-6">
            <QuotePreview ref={previewRef} quote={quote} />
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Updates instantly · Exports as a high-resolution PNG ·{" "}
            {defaultQuote().meta.ref.slice(0, 4)} branding
          </p>
        </div>
      </div>
    </div>
  );
}

/* --------- Reusable bits --------- */

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 luxe-shadow">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            {icon}
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11.5px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-border bg-background px-3.5 pr-9 text-sm text-foreground transition-all focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground tabular-nums transition-all focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${highlight ? "border-foreground/20 bg-background" : "border-border bg-background/60"}`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-semibold tabular-nums tracking-tight ${highlight ? "text-lg" : "text-base"}`}
      >
        {value}
      </div>
    </div>
  );
}
