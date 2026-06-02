import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultQuote, type QuoteState } from "@/lib/quote-types";
import { emptyWardrobeQuote, type WardrobeQuoteState } from "@/types/Wardrobe";

export interface RecentExport {
  ref: string;
  name: string;
  total: number;
  at: number;
}

interface QuoteContextValue {
  quote: QuoteState;
  setQuote: React.Dispatch<React.SetStateAction<QuoteState>>;
  resetQuote: () => void;
  recent: RecentExport[];
  addRecent: (r: RecentExport) => void;
  wardrobe: WardrobeQuoteState;
  setWardrobe: React.Dispatch<React.SetStateAction<WardrobeQuoteState>>;
  resetWardrobe: () => void;
}

const Ctx = createContext<QuoteContextValue | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<QuoteState>(() => defaultQuote());
  const [recent, setRecent] = useState<RecentExport[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeQuoteState>(() => emptyWardrobeQuote());

  const value = useMemo<QuoteContextValue>(
    () => ({
      quote,
      setQuote,
      resetQuote: () => setQuote(defaultQuote()),
      recent,
      addRecent: (r) => setRecent((prev) => [r, ...prev].slice(0, 8)),
      wardrobe,
      setWardrobe,
      resetWardrobe: () => setWardrobe(emptyWardrobeQuote()),
    }),
    [quote, recent, wardrobe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuote() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useQuote must be used inside QuoteProvider");
  return v;
}
