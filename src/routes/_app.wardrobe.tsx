import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  DoorOpen,
  Layers,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import QuoteTypeTabs from "@/components/QuoteTypeTabs";
import { useQuote } from "@/components/QuoteContext";
import { WARDROBE_CATEGORIES } from "@/data/wardrobe/categories";
import { calculateLine, calculateWardrobeTotals } from "@/wardrobe-pricing/calculate";
import { formatGBP } from "@/lib/quote-types";
import type {
  WardrobeAddon,
  WardrobeCategoryId,
  WardrobeLineItem,
  WardrobeProduct,
} from "@/types/Wardrobe";

export const Route = createFileRoute("/_app/wardrobe")({
  head: () => ({ meta: [{ title: "Wardrobes & Doors Quote — Shades & Space" }] }),
  component: WardrobeQuotePage,
});

interface DraftState {
  categoryId: WardrobeCategoryId;
  productId: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  manualUnitPrice?: number;
  addons: WardrobeAddon[];
  notes: string;
}

function emptyDraft(): DraftState {
  const cat = WARDROBE_CATEGORIES[0];
  return {
    categoryId: cat.id,
    productId: cat.products[0]?.id ?? "",
    widthMm: 0,
    heightMm: 0,
    quantity: 1,
    addons: [],
    notes: "",
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function WardrobeQuotePage() {
  const { wardrobe, setWardrobe, resetWardrobe } = useQuote();
  const [draft, setDraft] = useState<DraftState>(() => emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const totals = useMemo(() => calculateWardrobeTotals(wardrobe), [wardrobe]);

  const category = WARDROBE_CATEGORIES.find((c) => c.id === draft.categoryId)!;
  const product: WardrobeProduct | undefined = category.products.find(
    (p) => p.id === draft.productId,
  );

  const liveCalc = useMemo(() => {
    if (!product) return null;
    return calculateLine(product, {
      widthMm: draft.widthMm,
      heightMm: draft.heightMm,
      quantity: draft.quantity,
      manualUnitPrice: draft.manualUnitPrice,
      addons: draft.addons,
    });
  }, [product, draft]);

  const canAdd =
    !!product &&
    draft.quantity >= 1 &&
    (!product.requiresDimensions || (draft.widthMm > 0 && draft.heightMm > 0)) &&
    (product.pricing.type !== "manual" ||
      (draft.manualUnitPrice != null && draft.manualUnitPrice > 0));

  const onCategoryChange = (id: WardrobeCategoryId) => {
    const c = WARDROBE_CATEGORIES.find((x) => x.id === id)!;
    setDraft((d) => ({
      ...d,
      categoryId: id,
      productId: c.products[0]?.id ?? "",
      manualUnitPrice: undefined,
    }));
  };

  const beginEdit = (line: WardrobeLineItem) => {
    setEditingId(line.id);
    setDraft({
      categoryId: line.categoryId,
      productId: line.productId,
      widthMm: line.widthMm ?? 0,
      heightMm: line.heightMm ?? 0,
      quantity: line.quantity,
      manualUnitPrice: line.manualUnitPrice,
      addons: line.addons,
      notes: line.notes ?? "",
    });
  };

  const clearDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const commitDraft = () => {
    if (!product || !liveCalc) return;
    const line: WardrobeLineItem = {
      id: editingId ?? uid(),
      categoryId: draft.categoryId,
      productId: draft.productId,
      productName: product.name,
      categoryName: category.name,
      widthMm: product.requiresDimensions ? draft.widthMm : undefined,
      heightMm: product.requiresDimensions ? draft.heightMm : undefined,
      quantity: draft.quantity,
      manualUnitPrice: draft.manualUnitPrice,
      addons: draft.addons,
      notes: draft.notes || undefined,
      calc: liveCalc,
    };
    setWardrobe((w) => {
      const items = editingId
        ? w.items.map((i) => (i.id === editingId ? line : i))
        : [...w.items, line];
      return { ...w, items };
    });
    toast.success(editingId ? "Item updated" : "Item added to quote");
    clearDraft();
  };

  const removeItem = (id: string) => {
    setWardrobe((w) => ({ ...w, items: w.items.filter((i) => i.id !== id) }));
  };

  const onReset = () => {
    resetWardrobe();
    clearDraft();
    toast.message("Wardrobe quote cleared");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <QuoteTypeTabs />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            New quotation
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Wardrobes &amp; Doors
          </h1>
        </div>
        <button
          onClick={onReset}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Add / edit form */}
        <section className="rounded-3xl border border-border bg-card p-6 luxe-shadow">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <PackagePlus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                {editingId ? "Edit line item" : "Add line item"}
              </h2>
              <p className="text-[11.5px] text-muted-foreground">
                Choose a category, then a product. Pricing data is placeholder until the supplier
                catalogue is loaded.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              value={draft.categoryId}
              onChange={(v) => onCategoryChange(v as WardrobeCategoryId)}
              options={WARDROBE_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Product"
              value={draft.productId}
              onChange={(v) => setDraft((d) => ({ ...d, productId: v, manualUnitPrice: undefined }))}
              options={category.products.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>

          {product?.description && (
            <p className="mt-2 text-[11px] text-muted-foreground">{product.description}</p>
          )}

          {product?.requiresDimensions && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <NumberInput
                label="Width (mm)"
                value={draft.widthMm}
                step={10}
                onChange={(v) => setDraft((d) => ({ ...d, widthMm: Math.max(0, v) }))}
              />
              <NumberInput
                label="Height (mm)"
                value={draft.heightMm}
                step={10}
                onChange={(v) => setDraft((d) => ({ ...d, heightMm: Math.max(0, v) }))}
              />
              <NumberInput
                label="Quantity"
                value={draft.quantity}
                min={1}
                onChange={(v) => setDraft((d) => ({ ...d, quantity: Math.max(1, v) }))}
              />
            </div>
          )}

          {!product?.requiresDimensions && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberInput
                label="Quantity"
                value={draft.quantity}
                min={1}
                onChange={(v) => setDraft((d) => ({ ...d, quantity: Math.max(1, v) }))}
              />
            </div>
          )}

          {/* Manual price override */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberInput
              label={
                product?.pricing.type === "manual"
                  ? "Unit price (£) — required"
                  : "Manual unit price (£) — optional override"
              }
              value={draft.manualUnitPrice ?? 0}
              step={1}
              onChange={(v) =>
                setDraft((d) => ({ ...d, manualUnitPrice: v > 0 ? v : undefined }))
              }
            />
          </div>

          {/* Add-ons */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Add-ons / surcharges
              </span>
              <button
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    addons: [
                      ...d.addons,
                      { id: uid(), name: "", kind: "fixed", amount: 0 },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {draft.addons.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No add-ons.</p>
              )}
              {draft.addons.map((a, idx) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_110px_110px_auto] items-center gap-2"
                >
                  <input
                    placeholder="Name"
                    value={a.name}
                    onChange={(e) =>
                      setDraft((d) => {
                        const next = [...d.addons];
                        next[idx] = { ...next[idx], name: e.target.value };
                        return { ...d, addons: next };
                      })
                    }
                    className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
                  />
                  <select
                    value={a.kind}
                    onChange={(e) =>
                      setDraft((d) => {
                        const next = [...d.addons];
                        next[idx] = {
                          ...next[idx],
                          kind: e.target.value as "fixed" | "percent",
                        };
                        return { ...d, addons: next };
                      })
                    }
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value="fixed">£ fixed</option>
                    <option value="percent">% of base</option>
                  </select>
                  <input
                    type="number"
                    value={a.amount}
                    onChange={(e) =>
                      setDraft((d) => {
                        const next = [...d.addons];
                        next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 };
                        return { ...d, addons: next };
                      })
                    }
                    className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm tabular-nums"
                  />
                  <button
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        addons: d.addons.filter((x) => x.id !== a.id),
                      }))
                    }
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Notes (line item)
              </span>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
            </label>
          </div>

          {/* Live calc */}
          {liveCalc && (
            <div className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-transparent p-4">
              {liveCalc.warning ? (
                <div className="flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{liveCalc.warning}</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Unit" value={formatGBP(liveCalc.unitPrice)} />
                  <Stat label="Add-ons" value={formatGBP(liveCalc.addonsTotal)} />
                  <Stat label="Line total" value={formatGBP(liveCalc.lineTotal)} highlight />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            {editingId && (
              <button
                onClick={clearDraft}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!canAdd}
              onClick={commitDraft}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {editingId ? "Save changes" : "Add to quote"}
            </motion.button>
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-3xl border border-border bg-card p-6 luxe-shadow">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Quote summary</h2>
              <p className="text-[11.5px] text-muted-foreground">
                {wardrobe.items.length} line item{wardrobe.items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {wardrobe.items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center"
              >
                <DoorOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No items yet</p>
                <p className="text-[11.5px] text-muted-foreground">
                  Use the form to add doors, panels, handles and accessories.
                </p>
              </motion.div>
            ) : (
              <ul className="space-y-2.5">
                {wardrobe.items.map((line) => (
                  <motion.li
                    key={line.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {line.categoryName}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-semibold tracking-tight">
                          {line.productName}
                        </div>
                        <div className="mt-1 text-[11.5px] text-muted-foreground">
                          {line.widthMm && line.heightMm
                            ? `${line.widthMm} × ${line.heightMm} mm · `
                            : ""}
                          Qty {line.quantity} · Unit {formatGBP(line.calc.unitPrice)}
                          {line.addons.length > 0
                            ? ` · +${line.addons.length} add-on${line.addons.length === 1 ? "" : "s"}`
                            : ""}
                        </div>
                        {line.notes && (
                          <div className="mt-1 text-[11px] italic text-muted-foreground">
                            “{line.notes}”
                          </div>
                        )}
                        {line.calc.warning && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {line.calc.warning}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm font-semibold tabular-nums">
                          {formatGBP(line.calc.lineTotal)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => beginEdit(line)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(line.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </AnimatePresence>

          {/* Totals */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <NumberInput
              label="Discount (£)"
              value={wardrobe.discount}
              step={5}
              onChange={(v) => setWardrobe((w) => ({ ...w, discount: Math.max(0, v) }))}
            />
            <NumberInput
              label="VAT (%)"
              value={Math.round(wardrobe.vatRate * 100)}
              step={1}
              onChange={(v) =>
                setWardrobe((w) => ({
                  ...w,
                  vatRate: Math.max(0, Math.min(100, v)) / 100,
                }))
              }
            />
          </div>

          <div className="mt-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Quote notes
              </span>
              <textarea
                rows={2}
                value={wardrobe.notes}
                onChange={(e) => setWardrobe((w) => ({ ...w, notes: e.target.value }))}
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-foreground/[0.04] p-5">
            <Row k="Subtotal (after discount)" v={formatGBP(totals.subtotal)} />
            <Row k={`VAT (${Math.round(wardrobe.vatRate * 100)}%)`} v={formatGBP(totals.vat)} />
            <div className="my-2 h-px bg-border" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                Total
              </span>
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatGBP(totals.total)}
              </span>
            </div>
          </div>

          <p className="mt-4 text-[10.5px] text-muted-foreground">
            Wardrobe pricing uses placeholder sample values. Supplier catalogue prices will be
            imported from the supplier PDF.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ---------- small UI bits (local to this route) ---------- */

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
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm tabular-nums focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-border bg-background px-3.5 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${highlight ? "border-foreground/20 bg-background" : "border-border bg-background/60"}`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 font-semibold tabular-nums tracking-tight ${highlight ? "text-base" : "text-sm"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-[12px]">
      <span className="text-muted-foreground">{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
