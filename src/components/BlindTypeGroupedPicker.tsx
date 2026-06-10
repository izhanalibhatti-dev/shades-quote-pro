import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, Check, X } from "lucide-react";

export interface BlindTypeOption {
  value: string;
  label: string;
}

interface Group {
  title: string;
  ids: string[];
}

const GROUPS: Group[] = [
  {
    title: "Roller Blinds",
    ids: ["roller", "vision", "perfect-fit-roller", "perfect-fit-vision"],
  },
  {
    title: "Vertical Blinds",
    ids: ["vertical", "pvc-rigid"],
  },
  {
    title: "Wood & Venetian",
    ids: [
      "aqua-fauxwood",
      "arena-fauxwood",
      "sunwood-faux",
      "sunwood-wood",
      "aluminium-venetian",
      "perfect-fit-aluminium",
      "perfect-fit-wood",
    ],
  },
  {
    title: "Specialist",
    ids: ["roman", "allusion", "perfect-fit-pleated", "perfect-fit-shutter"],
  },
  {
    title: "Pleated",
    ids: ["freehang-pleated"],
  },
];

export function BlindTypeGroupedPicker({
  label,
  value,
  onChange,
  options,
  renderGraphic,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: BlindTypeOption[];
  renderGraphic: (typeId: string) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => {
    const map = new Map<string, BlindTypeOption>();
    for (const opt of options) map.set(opt.value, opt);
    return map;
  }, [options]);

  const grouped = useMemo(() => {
    const assigned = new Set<string>();
    const sections = GROUPS.map((group) => {
      const items = group.ids
        .map((id) => byId.get(id))
        .filter((item): item is BlindTypeOption => Boolean(item));
      items.forEach((item) => assigned.add(item.value));
      return { title: group.title, items };
    });
    const leftovers = options.filter((opt) => !assigned.has(opt.value));
    if (leftovers.length) sections.push({ title: "Other", items: leftovers });
    return sections;
  }, [byId, options]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? grouped
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
        }))
        .filter((section) => section.items.length > 0)
    : grouped;

  const selectedLabel = byId.get(value)?.label;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 80);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="md:col-span-2">
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:border-foreground/30 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Blind Type
          </span>
          <span className="mt-1 block text-base font-semibold tracking-tight">
            {selectedLabel ?? "Select Blind Type"}
          </span>
        </span>
        <span className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          Select
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 p-0 backdrop-blur-sm sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select blind type"
            className="ml-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-background shadow-2xl sm:rounded-3xl sm:border sm:border-border"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Select Blind Type
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {selectedLabel ?? "Choose a product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close blind type selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border px-5 py-4 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search blind types..."
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  aria-label="Search blind types"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  No blind types match "{query}".
                </div>
              ) : (
                <div className="space-y-6">
                  {filtered.map((section) => (
                    <section key={section.title}>
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {section.title}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {section.items.map((option) => {
                          const selected = option.value === value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                              }}
                              aria-pressed={selected}
                              className={`group relative flex min-h-[132px] flex-col items-center justify-between gap-3 rounded-2xl border px-3 py-4 text-center transition focus:outline-none focus:ring-2 focus:ring-ring ${
                                selected
                                  ? "border-foreground/50 bg-foreground text-background shadow-sm"
                                  : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-accent/40"
                              }`}
                            >
                              {selected && (
                                <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/15">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                              <span className="flex h-16 w-full items-center justify-center">
                                {renderGraphic(option.value)}
                              </span>
                              <span className="line-clamp-2 w-full text-sm font-semibold leading-tight">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
