import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultProjectQuote, defaultQuote, type QuoteState } from "@/lib/quote-types";
import type { ProjectQuote } from "@/types/ProjectQuote";
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
  project: ProjectQuote;
  setProject: React.Dispatch<React.SetStateAction<ProjectQuote>>;
  resetProject: () => void;
  blindsProject: ProjectQuote;
  setBlindsProject: React.Dispatch<React.SetStateAction<ProjectQuote>>;
  resetBlindsProject: () => void;
  wardrobeProject: ProjectQuote;
  setWardrobeProject: React.Dispatch<React.SetStateAction<ProjectQuote>>;
  resetWardrobeProject: () => void;
}

const Ctx = createContext<QuoteContextValue | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<QuoteState>(() => defaultQuote());
  const [recent, setRecent] = useState<RecentExport[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeQuoteState>(() => emptyWardrobeQuote());
  const [project, setProject] = useState<ProjectQuote>(() => defaultProjectQuote());
  const [blindsProject, setBlindsProject] = useState<ProjectQuote>(() => defaultProjectQuote());
  const [wardrobeProject, setWardrobeProject] = useState<ProjectQuote>(() => defaultProjectQuote());

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
      project,
      setProject,
      resetProject: () => setProject(defaultProjectQuote()),
      blindsProject,
      setBlindsProject,
      resetBlindsProject: () => setBlindsProject(defaultProjectQuote()),
      wardrobeProject,
      setWardrobeProject,
      resetWardrobeProject: () => setWardrobeProject(defaultProjectQuote()),
    }),
    [blindsProject, project, quote, recent, wardrobe, wardrobeProject],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuote() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useQuote must be used inside QuoteProvider");
  return v;
}
