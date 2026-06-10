import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Accessible date field combining a typed input (ISO YYYY-MM-DD) with a
 * popover calendar picker. Value is always an ISO date string.
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}) {
  const date = useMemo(() => {
    if (!value) return undefined;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-stretch gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          aria-label={label}
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Pick ${label.toLowerCase()}`}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {date ? format(date, "d MMM") : "Pick"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(next) => {
                if (next) onChange(format(next, "yyyy-MM-dd"));
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </label>
  );
}