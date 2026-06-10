import { useMemo, useState, type ReactNode } from "react";
import { Search, Check } from "lucide-react";

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
    ids: [
      "roman",
      "allusion",
      "perfect-fit-shutter",
    ],
  },
  {
    title: "Pleated",
    ids: ["perfect-fit-pleated", "freehang-pleated"],
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

  return (
    <div className="md:col-span-2">
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
          {selectedLabel ? (
            <span className="ml-2 normal-case tracking-normal text-foreground/70">
              · {selectedLabel}
            </span>
          ) : null}
        </span>
        <div className="relative w-full max-w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blind types…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            aria-label="Search blind types"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card/30 p-3">
        {filtered.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No blind types match “{query}”.
          </div>
        ) : (
          filtered.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.title}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((option) => {
                  const selected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange(option.value)}
                      aria-pressed={selected}
                      className={`group relative flex h-[112px] flex-col items-center justify-between gap-1.5 rounded-xl border px-2 py-2.5 text-center transition ${
                        selected
                          ? "border-foreground/40 bg-foreground text-background shadow-sm"
                          : "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-accent/40"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/15">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <span className="flex h-12 w-full items-center justify-center">
                        {renderGraphic(option.value)}
                      </span>
                      <span className="line-clamp-2 w-full text-[11px] font-semibold leading-tight">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}