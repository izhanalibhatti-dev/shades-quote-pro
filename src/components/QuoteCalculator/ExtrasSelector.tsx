import type { Extra } from "@/types/Extra";
import type { SelectedExtra } from "@/types/Quote";

export function ExtrasSelector({
  extras,
  selected,
  onChange,
  blindWidthMm,
}: {
  extras: Extra[];
  selected: SelectedExtra[];
  onChange: (selected: SelectedExtra[]) => void;
  blindWidthMm?: number;
}) {
  const selectedIds = new Set(selected.map((item) => item.id));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {extras.map((extra) => {
        const checked = selectedIds.has(extra.id);
        return (
          <label
            key={extra.id}
            className={`flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
              checked
                ? "border-foreground/30 bg-foreground/[0.04]"
                : "border-border bg-background hover:border-foreground/20"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([
                    ...selected,
                    {
                      id: extra.id,
                      quantity: 1,
                      widthMm:
                        extra.pricing.type === "widthTable" && blindWidthMm
                          ? blindWidthMm
                          : undefined,
                    },
                  ]);
                } else {
                  onChange(selected.filter((item) => item.id !== extra.id));
                }
              }}
              className="h-4 w-4 rounded border-border"
            />
            <span className="min-w-0 flex-1">
              <span className="block">{extra.name}</span>
              {extra.description ? (
                <span className="block text-xs leading-5 text-muted-foreground">
                  {extra.description}
                </span>
              ) : null}
            </span>
            {checked ? (
              <span className="flex shrink-0 items-center gap-2">
                {extra.pricing.type === "widthTable" ? (
                  <input
                    type="number"
                    min={1}
                    value={
                      selected.find((item) => item.id === extra.id)?.widthMm ?? blindWidthMm ?? ""
                    }
                    onChange={(event) => {
                      const widthMm = Math.max(1, Number(event.target.value) || 0);
                      onChange(
                        selected.map((item) =>
                          item.id === extra.id ? { ...item, widthMm } : item,
                        ),
                      );
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-right text-sm"
                    aria-label={`${extra.name} width in millimetres`}
                  />
                ) : null}
                <input
                  type="number"
                  min={1}
                  value={selected.find((item) => item.id === extra.id)?.quantity ?? 1}
                  onChange={(event) => {
                    const quantity = Math.max(1, Number(event.target.value) || 1);
                    onChange(
                      selected.map((item) => (item.id === extra.id ? { ...item, quantity } : item)),
                    );
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-right text-sm"
                  aria-label={`${extra.name} quantity`}
                />
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
