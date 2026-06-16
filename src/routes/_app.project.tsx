import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  AlertTriangle,
  Blinds,
  Check,
  Copy,
  DoorOpen,
  Download,
  FileText,
  Hammer,
  IdCard,
  Layers,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ProjectQuotePreview from "@/components/ProjectQuotePreview";
import { useQuote } from "@/components/QuoteContext";
import QuoteTypeTabs from "@/components/QuoteTypeTabs";
import { BlindTypeGroupedPicker } from "@/components/BlindTypeGroupedPicker";
import { DateField } from "@/components/DateField";
import { extras, fabrics, priceTables, suppliers } from "@/data/catalog";
import { BLIND_PRODUCT_TYPES, getBlindProductType } from "@/data/blinds/productTypes";
import { WARDROBE_CATEGORIES, WARDROBE_DOOR_ADDONS } from "@/data/wardrobe/categories";
import { defaultQuote, formatGBP, uid } from "@/lib/quote-types";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { calculateQuote } from "@/pricing/calculateQuote";
import { calculateProjectQuote } from "@/pricing/calculateProjectQuote";
import { calculateLine } from "@/wardrobe-pricing/calculate";
import type { ProjectQuote, ProjectQuoteItem, ProjectQuoteItemType } from "@/types/ProjectQuote";
import type { QuoteState, SelectedExtra } from "@/types/Quote";
import type { WardrobeAddon, WardrobeCategoryId, WardrobeProduct } from "@/types/Wardrobe";

export const Route = createFileRoute("/_app/project")({
  head: () => ({ meta: [{ title: "Project Quote - Shades & Space" }] }),
  component: () => <ProjectQuoteBuilder key="project" mode="project" />,
});

type DraftType = ProjectQuoteItemType;
type BuilderMode = "project" | "blinds" | "wardrobes";

interface DraftState {
  type: DraftType;
  blindTypeId: string;
  blindProductTypeId: string;
  blindFabricId: string;
  blindFrameColour: PerfectFitRollerFrameColour;
  blindWidthMm: number;
  blindHeightMm: number;
  blindQuantity: number;
  blindMount: "Inside Recess" | "Outside Recess" | "Ceiling" | "Face Fix";
  blindChainSide: "Left" | "Right";
  blindExtras: SelectedExtra[];
  wardrobeCategoryId: WardrobeCategoryId;
  wardrobeProductId: string;
  wardrobeWidthMm: number;
  wardrobeHeightMm: number;
  wardrobeQuantity: number;
  wardrobeManualUnitPrice?: number;
  wardrobeAddons: WardrobeAddon[];
  wardrobeColour: string;
  title: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  notes: string;
}

interface DoorColourOption {
  name: string;
  hex: string;
}

const DOOR_COLOUR_GROUPS: Record<string, DoorColourOption[]> = {
  create: [
    { name: "Frost White Supermatt", hex: "#f4f2ed" },
    { name: "Light Grey Supermatt", hex: "#c9c9c2" },
    { name: "Cashmere Supermatt", hex: "#c8b9a5" },
    { name: "Dark Grey Supermatt", hex: "#575856" },
    { name: "Black Supermatt", hex: "#171717" },
    { name: "Reed Green Supermatt", hex: "#66705d" },
    { name: "Heritage Green Supermatt", hex: "#3f5545" },
    { name: "Dust Grey Supermatt", hex: "#8b8983" },
    { name: "Indigo Supermatt", hex: "#263848" },
    { name: "Alby Blue Supermatt", hex: "#778996" },
    { name: "Ivory Gloss", hex: "#eee4cf" },
    { name: "White Gloss", hex: "#f7f7f2" },
    { name: "Light Grey Gloss", hex: "#d2d3ce" },
    { name: "Cashmere Gloss", hex: "#cbbba4" },
  ],
  serica: [
    { name: "Frost White", hex: "#f4f2ed" },
    { name: "Light Grey", hex: "#c9c9c2" },
    { name: "Dark Grey", hex: "#575856" },
    { name: "Black", hex: "#171717" },
    { name: "Cashmere", hex: "#c8b9a5" },
    { name: "Denim", hex: "#4d5d6a" },
    { name: "Alby Blue", hex: "#778996" },
    { name: "Dust Grey", hex: "#8b8983" },
    { name: "Graphite", hex: "#4a4b48" },
    { name: "Heritage Green", hex: "#3f5545" },
  ],
  vision: [
    { name: "White", hex: "#f7f7f2" },
    { name: "Light Grey", hex: "#c9c9c2" },
    { name: "Black", hex: "#151515" },
    { name: "Cream", hex: "#eee4cf" },
    { name: "Cashmere", hex: "#c8b9a5" },
    { name: "Beige Metallic", hex: "#b7aa96" },
    { name: "Stone Grey", hex: "#8f8b80" },
    { name: "Anthracite Grey", hex: "#3f4241" },
    { name: "Dark Grey", hex: "#565856" },
    { name: "Metallic Blue", hex: "#4a6075" },
    { name: "Fjord", hex: "#9caea8" },
  ],
  milano: [
    { name: "Grained Black", hex: "#1d1d1a" },
    { name: "Cross Gold", hex: "#b0986e" },
    { name: "Cross Brass", hex: "#6a6554" },
    { name: "Relief Oak Ginger", hex: "#a17345" },
    { name: "Relief Oak Pimento", hex: "#8b6044" },
    { name: "Travertin Alcamo", hex: "#b7afa1" },
    { name: "Pietra Grey", hex: "#676767" },
    { name: "Cremona Oak Cannolo", hex: "#9f835d" },
    { name: "Cremona Oak Torro", hex: "#7d624a" },
  ],
  fusionTextured: [
    { name: "Snow White", hex: "#f7f7f2" },
    { name: "Ivory", hex: "#eee4cf" },
    { name: "Cashmere", hex: "#c8b9a5" },
    { name: "Light Grey", hex: "#c9c9c2" },
    { name: "Graphite", hex: "#4a4b48" },
    { name: "Black", hex: "#171717" },
    { name: "Gold Harbor Oak", hex: "#b48d59" },
    { name: "Hazel Silverjack Oak", hex: "#9b8870" },
    { name: "Coast Evoke Oak", hex: "#9d7c54" },
    { name: "Concrete Flow", hex: "#8c8f8c" },
  ],
  fusionGloss: [
    { name: "Snow White", hex: "#f7f7f2" },
    { name: "Cool Grey", hex: "#c3c5c4" },
    { name: "Cashmere", hex: "#c8b9a5" },
    { name: "Ivory", hex: "#eee4cf" },
    { name: "Slate Grey", hex: "#626a70" },
    { name: "Black", hex: "#171717" },
  ],
};

function doorColourOptions(productId: string): DoorColourOption[] {
  if (productId === "serica-door") return DOOR_COLOUR_GROUPS.serica;
  if (productId === "vision-door") return DOOR_COLOUR_GROUPS.vision;
  if (productId === "milano-door") return DOOR_COLOUR_GROUPS.milano;
  if (productId === "fusion-textured-door") return DOOR_COLOUR_GROUPS.fusionTextured;
  if (productId === "fusion-mirror-gloss-door") return DOOR_COLOUR_GROUPS.fusionGloss;
  if (productId === "manhattan-door" || productId === "cairo-fretted-door") {
    return DOOR_COLOUR_GROUPS.create;
  }
  if (productId === "create-vinyl-door") return DOOR_COLOUR_GROUPS.create;
  return [];
}

const ITEM_TYPES: {
  type: DraftType;
  labelKey: TranslationKey;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { type: "blind", labelKey: "item.blind", icon: Blinds },
  { type: "wardrobe", labelKey: "item.wardrobe", icon: DoorOpen },
  { type: "accessory", labelKey: "item.accessory", icon: Package },
  { type: "labour", labelKey: "item.labour", icon: Hammer },
  { type: "manual", labelKey: "item.manual", icon: Pencil },
];

const OVERALL_FITTING_TITLE = "Overall Fitting Labour";
const OVERALL_FITTING_NOTE = "Whole quote fitting cost";

type BlindSelectableOption = (typeof fabrics)[number];

const PERFECT_FIT_FRAME_SURCHARGE_EXTRA_IDS = {
  "perfect-fit-roller": "perfect-fit-roller-golden-oak-mahogany-frame-surcharge",
  "perfect-fit-vision": "perfect-fit-vision-golden-oak-mahogany-frame-surcharge",
  "perfect-fit-aluminium": "perfect-fit-aluminium-golden-oak-mahogany-frame-surcharge",
  "perfect-fit-wood": "perfect-fit-wood-golden-oak-mahogany-frame-surcharge",
} as const;
const PERFECT_FIT_FRAME_SURCHARGE_IDS = Object.values(PERFECT_FIT_FRAME_SURCHARGE_EXTRA_IDS);
const PERFECT_FIT_ROLLER_FRAME_COLOURS = [
  "White",
  "Black",
  "Brown",
  "Anthracite Grey",
  "Golden Oak",
  "Mahogany",
] as const;
type PerfectFitRollerFrameColour = (typeof PERFECT_FIT_ROLLER_FRAME_COLOURS)[number];

function isPerfectFitRollerFrameColour(value: string): value is PerfectFitRollerFrameColour {
  return PERFECT_FIT_ROLLER_FRAME_COLOURS.includes(value as PerfectFitRollerFrameColour);
}

function frameColourHasSurcharge(value: string) {
  return value === "Golden Oak" || value === "Mahogany";
}

function isPerfectFitFrameBlindType(
  blindTypeId: string,
): blindTypeId is keyof typeof PERFECT_FIT_FRAME_SURCHARGE_EXTRA_IDS {
  return blindTypeId in PERFECT_FIT_FRAME_SURCHARGE_EXTRA_IDS;
}

function withPerfectFitFrameSurcharge(
  extras: SelectedExtra[],
  blindTypeId: string,
  frameColour: PerfectFitRollerFrameColour,
) {
  const withoutFrameSurcharge = extras.filter(
    (item) => !(PERFECT_FIT_FRAME_SURCHARGE_IDS as readonly string[]).includes(item.id),
  );
  if (!isPerfectFitFrameBlindType(blindTypeId) || !frameColourHasSurcharge(frameColour)) {
    return withoutFrameSurcharge;
  }
  return [
    ...withoutFrameSurcharge,
    { id: PERFECT_FIT_FRAME_SURCHARGE_EXTRA_IDS[blindTypeId], quantity: 1 },
  ];
}

function isExtraApplicableToBlindType(
  extra: (typeof extras)[number],
  blindTypeId: string,
  includeInternal = false,
) {
  if (
    !includeInternal &&
    (PERFECT_FIT_FRAME_SURCHARGE_IDS as readonly string[]).includes(extra.id)
  ) {
    return false;
  }
  return !extra.applicableBlindTypes?.length || extra.applicableBlindTypes.includes(blindTypeId);
}

function filterExtrasForBlindType(selectedExtras: SelectedExtra[], blindTypeId: string) {
  return selectedExtras.filter((selected) => {
    const extra = extras.find((item) => item.id === selected.id);
    if (!extra) return false;
    return isExtraApplicableToBlindType(extra, blindTypeId, true);
  });
}

function extraDetail(extra: (typeof extras)[number]) {
  const details: string[] = [];
  if (extra.description) details.push(extra.description);
  switch (extra.pricing.type) {
    case "fixed":
      details.push(extra.pricing.amount === 0 ? "Free" : formatGBP(extra.pricing.amount));
      break;
    case "perBlind":
      details.push(`${formatGBP(extra.pricing.amount)} per blind`);
      break;
    case "perMetreWidth":
      details.push(`${formatGBP(extra.pricing.amount)} per metre width`);
      break;
    case "percentageBase":
      details.push(`+${extra.pricing.amount}%`);
      break;
    case "fixedPlusPercentageBase":
      details.push(`${formatGBP(extra.pricing.amount)} + ${extra.pricing.percentage}%`);
      break;
    case "fixedPlusWidthThreshold":
      details.push(
        `${formatGBP(extra.pricing.amount)} + ${formatGBP(extra.pricing.uplift)} over ${extra.pricing.thresholdWidthMm}mm`,
      );
      break;
    case "widthTable":
      details.push("Priced by extra width");
      break;
  }
  return Array.from(new Set(details)).join(" - ");
}

function getFabricBlindTypeId(fabric: BlindSelectableOption) {
  const explicit = fabric.compatibleBlindTypes?.[0];
  if (explicit) return explicit;

  const productType = suppliers
    .flatMap((supplier) => supplier.productTypes)
    .find((item) => item.id === fabric.productTypeId);
  return getBlindProductType(fabric.productTypeId, productType?.name ?? "")?.id;
}

function getOptionsForBlindType(blindTypeId: string, includeFallback = false) {
  return fabrics
    .filter((fabric) => {
      const matches = fabric.compatibleBlindTypes?.includes(blindTypeId) ?? false;
      const derivedMatch =
        !fabric.compatibleBlindTypes?.length && getFabricBlindTypeId(fabric) === blindTypeId;
      if (!matches && !derivedMatch) return false;
      return includeFallback ? true : isSelectableFabricOption(fabric);
    })
    .sort((a, b) => optionDisplayName(a).localeCompare(optionDisplayName(b)));
}

function getFallbackOptionsForBlindType(blindTypeId: string) {
  return getOptionsForBlindType(blindTypeId, true)
    .filter((fabric) => fabric.isFallback && !isSurchargePricingReference(fabric))
    .sort(
      (a, b) =>
        fallbackPriority(a) - fallbackPriority(b) ||
        optionDisplayName(a).localeCompare(optionDisplayName(b)),
    );
}

function firstOptionForBlindType(blindTypeId: string) {
  return getOptionsForBlindType(blindTypeId)[0] ?? getFallbackOptionsForBlindType(blindTypeId)[0];
}

function firstAvailableBlindType() {
  return BLIND_PRODUCT_TYPES.find(
    (blindType) =>
      getOptionsForBlindType(blindType.id).length > 0 ||
      getFallbackOptionsForBlindType(blindType.id).length > 0,
  );
}

function isBandOnlyFabricName(name: string) {
  return /^(standard|band\s+[a-z]{1,3})$/i.test(name.trim());
}

function isSelectableFabricOption(fabric: BlindSelectableOption) {
  if (fabric.isFallback || fabric.selectionKind === "pricingBandFallback") return false;

  const label = optionDisplayName(fabric).trim();
  const pricingSource = fabric.pricingSource?.trim() ?? "";
  const combined = `${label} ${pricingSource} ${fabric.productTypeId}`.toLowerCase();

  if (!label || isBandOnlyFabricName(label)) return false;
  if (/\b(additional\s+cost|surcharge|workbook|worksheet|pricing\s+table)\b/i.test(combined)) {
    return false;
  }
  if (/\bprices?\s+are\s+for\b/i.test(combined)) return false;
  if (/^[a-z]{1,3}\s*-\s*band\s+[a-z]{1,3}$/i.test(label)) return false;
  if (/^(?:pf\s+roller|perfect\s+fit\s+konnect)\s*-\s*band\s+[a-z]{1,3}$/i.test(label)) {
    return false;
  }
  if (/\bband\s+[a-z]{1,3}\b/i.test(label) && fabric.supplierName === "Workbook Pricing") {
    return false;
  }

  return true;
}

function isSurchargePricingReference(fabric: BlindSelectableOption) {
  return /\b(additional\s+cost|surcharge)\b/i.test(
    `${optionDisplayName(fabric)} ${fabric.pricingSource ?? ""} ${fabric.productTypeId}`,
  );
}

function fallbackPriority(fabric: BlindSelectableOption) {
  const source = (fabric.pricingSource ?? "").trim();
  if (source && !source.includes(",")) return 0;
  return 1;
}

function optionDisplayName(fabric: BlindSelectableOption) {
  return fabric.displayName ?? fabric.name;
}

function optionLabel(
  fabric: BlindSelectableOption,
  allOptions: readonly BlindSelectableOption[] = fabrics,
) {
  const name = optionDisplayName(fabric);
  const matchingNames = allOptions.filter(
    (option) => optionDisplayName(option).trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (matchingNames.length <= 1 || fabric.isFallback) return name;

  const supplier = fabric.supplierName ?? fabric.company;
  const sameSupplierCount = matchingNames.filter(
    (option) => (option.supplierName ?? option.company) === supplier,
  ).length;
  const qualifier =
    sameSupplierCount > 1 && fabric.collection ? `${supplier}, ${fabric.collection}` : supplier;

  return qualifier ? `${name} - ${qualifier}` : name;
}

function initialDraft(): DraftState {
  const firstBlindType = firstAvailableBlindType();
  const firstFabric = firstBlindType ? firstOptionForBlindType(firstBlindType.id) : fabrics[0];
  const firstWardrobeCategory = WARDROBE_CATEGORIES[0];

  return {
    type: "blind",
    blindTypeId: firstBlindType?.id ?? getFabricBlindTypeId(firstFabric) ?? "",
    blindProductTypeId: firstFabric?.productTypeId ?? "",
    blindFabricId: firstFabric?.id ?? "",
    blindFrameColour: "White",
    blindWidthMm: 1800,
    blindHeightMm: 2100,
    blindQuantity: 1,
    blindMount: "Inside Recess",
    blindChainSide: "Right",
    blindExtras: [],
    wardrobeCategoryId: firstWardrobeCategory.id,
    wardrobeProductId: firstWardrobeCategory.products[0]?.id ?? "",
    wardrobeWidthMm: 0,
    wardrobeHeightMm: 0,
    wardrobeQuantity: 1,
    wardrobeAddons: [],
    wardrobeColour: "",
    title: "",
    code: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxable: true,
    notes: "",
  };
}

function initialDraftForMode(mode: BuilderMode): DraftState {
  const draft = initialDraft();
  if (mode === "wardrobes") {
    return { ...draft, type: "wardrobe" };
  }
  return { ...draft, type: "blind" };
}

const MODE_CONFIG = {
  project: {
    eyebrowKey: "project.eyebrow",
    titleKey: "project.title",
    exportName: "project",
    scopeKey: "project.scope",
    itemTypes: ["blind", "wardrobe", "accessory", "labour", "manual"] satisfies DraftType[],
  },
  blinds: {
    eyebrowKey: "blinds.eyebrow",
    titleKey: "blinds.title",
    exportName: "blinds",
    scopeKey: "blinds.scope",
    itemTypes: ["blind", "labour"] satisfies DraftType[],
  },
  wardrobes: {
    eyebrowKey: "wardrobes.eyebrow",
    titleKey: "wardrobes.title",
    exportName: "wardrobes",
    scopeKey: "wardrobes.scope",
    itemTypes: ["wardrobe", "accessory", "labour", "manual"] satisfies DraftType[],
  },
} as const;

export function ProjectQuoteBuilder({ mode }: { mode: BuilderMode }) {
  const context = useQuote();
  const config = MODE_CONFIG[mode];
  const { t, translateLabel } = useI18n();
  const project =
    mode === "project"
      ? context.project
      : mode === "blinds"
        ? context.blindsProject
        : context.wardrobeProject;
  const setProject =
    mode === "project"
      ? context.setProject
      : mode === "blinds"
        ? context.setBlindsProject
        : context.setWardrobeProject;
  const resetProject =
    mode === "project"
      ? context.resetProject
      : mode === "blinds"
        ? context.resetBlindsProject
        : context.resetWardrobeProject;
  const { addRecent } = context;
  const [activeAreaId, setActiveAreaId] = useState(project.areas[0]?.id ?? "");
  const [areaName, setAreaName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(() => initialDraftForMode(mode));
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const englishPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(initialDraftForMode(mode));
    setEditingItemId(null);
  }, [mode]);

  useEffect(() => {
    setActiveAreaId((current) =>
      project.areas.some((area) => area.id === current) ? current : (project.areas[0]?.id ?? ""),
    );
  }, [mode, project.areas]);

  const activeArea = project.areas.find((area) => area.id === activeAreaId) ?? project.areas[0];
  const totals = useMemo(() => calculateProjectQuote(project), [project]);
  const fittingSubtotal = useMemo(() => getFittingSubtotal(project), [project]);
  const productsSubtotal = roundMoney(totals.subtotal - fittingSubtotal);
  const overallFittingAmount = getOverallFittingItem(project)?.unitPrice ?? 0;
  const taxableBeforeDiscount = useMemo(() => getTaxableSubtotalBeforeDiscount(project), [project]);
  const discountPercent =
    taxableBeforeDiscount > 0 ? roundMoney((totals.discount / taxableBeforeDiscount) * 100) : 0;
  const setDiscountPercent = (percent: number) => {
    const nextPercent = Math.max(0, Math.min(100, percent));
    setProject((current) => {
      const currentDiscountBase = getTaxableSubtotalBeforeDiscount(current);
      return {
        ...current,
        discount: roundMoney((currentDiscountBase * nextPercent) / 100),
      };
    });
  };

  const blindTypeOptions = useMemo(() => {
    return BLIND_PRODUCT_TYPES.filter(
      (blindType) =>
        getOptionsForBlindType(blindType.id).length > 0 ||
        getFallbackOptionsForBlindType(blindType.id).length > 0,
    ).map((blindType) => ({ value: blindType.id, label: blindType.label }));
  }, []);
  const standardFabricOptions = useMemo(
    () => getOptionsForBlindType(draft.blindTypeId),
    [draft.blindTypeId],
  );
  const fallbackBandOptions = useMemo(
    () => getFallbackOptionsForBlindType(draft.blindTypeId),
    [draft.blindTypeId],
  );
  const availableBlindOptions = standardFabricOptions;
  const wardrobeCategory = WARDROBE_CATEGORIES.find(
    (category) => category.id === draft.wardrobeCategoryId,
  );
  const wardrobeProduct = wardrobeCategory?.products.find(
    (product) => product.id === draft.wardrobeProductId,
  );

  const liveResult = useMemo(() => {
    try {
      return { item: buildProjectItem(draft, project, translateLabel), error: "" };
    } catch (error) {
      return {
        item: null,
        error: error instanceof Error ? error.message : "Unable to price item.",
      };
    }
  }, [draft, project, translateLabel]);
  const liveItem = liveResult.item;
  const livePricingWarning = liveResult.error || getProjectItemWarning(liveItem);

  const addArea = () => {
    const name = areaName.trim();
    if (!name) return;
    const area = { id: uid(), name, notes: "", items: [] };
    setProject((current) => ({ ...current, areas: [...current.areas, area] }));
    setAreaName("");
    setActiveAreaId(area.id);
  };

  const removeArea = (areaId: string) => {
    setProject((current) => {
      if (current.areas.length <= 1) return current;
      const areas = current.areas.filter((area) => area.id !== areaId);
      if (activeAreaId === areaId) setActiveAreaId(areas[0]?.id ?? "");
      return { ...current, areas };
    });
  };

  const saveItem = () => {
    if (!activeArea || !liveItem) return;
    const item = { ...liveItem, id: editingItemId ?? uid() };
    setProject((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === activeArea.id
          ? {
              ...area,
              items: editingItemId
                ? area.items.map((existing) => (existing.id === editingItemId ? item : existing))
                : [...area.items, item],
            }
          : area,
      ),
    }));
    setEditingItemId(null);
    setDraft(initialDraftForMode(mode));
    toast.success(editingItemId ? t("actions.saveItem") : t("actions.addToRoom"));
  };

  const editItem = (item: ProjectQuoteItem) => {
    setEditingItemId(item.id);
    setDraft(draftFromItem(item));
  };

  const removeItem = (areaId: string, itemId: string) => {
    setProject((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId
          ? { ...area, items: area.items.filter((item) => item.id !== itemId) }
          : area,
      ),
    }));
  };

  const duplicateItem = (areaId: string, item: ProjectQuoteItem) => {
    setProject((current) => ({
      ...current,
      areas: current.areas.map((area) =>
        area.id === areaId ? { ...area, items: [...area.items, { ...item, id: uid() }] } : area,
      ),
    }));
  };

  const startFittingItem = (areaId?: string) => {
    const targetArea = project.areas.find((area) => area.id === areaId) ?? activeArea;
    if (targetArea) setActiveAreaId(targetArea.id);
    setEditingItemId(null);
    setDraft({
      ...initialDraftForMode(mode),
      type: "labour",
      title: targetArea ? `${targetArea.name} fitting labour` : "Fitting labour",
      taxable: false,
    });
  };

  const setOverallFittingCost = (amount: number) => {
    const nextAmount = roundMoney(Math.max(0, amount));
    setProject((current) => {
      const existing = getOverallFittingItem(current);

      if (nextAmount <= 0) {
        if (!existing) return current;
        return {
          ...current,
          areas: current.areas.map((area) => ({
            ...area,
            items: area.items.filter((item) => item.id !== existing.id),
          })),
        };
      }

      const item: ProjectQuoteItem = {
        id: existing?.id ?? uid(),
        type: "labour",
        title: OVERALL_FITTING_TITLE,
        description: "Whole quote fitting cost",
        quantity: 1,
        unitPrice: nextAmount,
        lineTotal: nextAmount,
        taxable: false,
        notes: OVERALL_FITTING_NOTE,
      };

      if (existing) {
        return {
          ...current,
          areas: current.areas.map((area) => ({
            ...area,
            items: area.items.map((currentItem) =>
              currentItem.id === existing.id ? item : currentItem,
            ),
          })),
        };
      }

      const targetAreaId = activeAreaId || current.areas[0]?.id;
      if (!targetAreaId) {
        return {
          ...current,
          areas: [{ id: uid(), name: "Whole quote", notes: "", items: [item] }],
        };
      }

      return {
        ...current,
        areas: current.areas.map((area) =>
          area.id === targetAreaId ? { ...area, items: [...area.items, item] } : area,
        ),
      };
    });
  };

  const exportProject = async (inEnglish = false) => {
    const node = inEnglish ? englishPreviewRef.current : previewRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: 760,
        style: { width: "760px", maxWidth: "760px", margin: "0" },
      });
      const link = document.createElement("a");
      const safeName = (project.customer.fullName || "customer").replace(/[^a-z0-9-_]+/gi, "_");
      const suffix = inEnglish ? "-en" : "";
      link.download = `${project.ref}-${safeName}-${config.exportName}${suffix}.png`;
      link.href = dataUrl;
      link.click();
      addRecent({
        ref: project.ref,
        name: project.customer.fullName,
        total: totals.total,
        at: Date.now(),
      });
      toast.success(t("actions.export"));
    } catch (error) {
      console.error(error);
      toast.error("Export failed", { description: "Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const printProject = () => {
    window.print();
  };

  const onReset = () => {
    resetProject();
    setActiveAreaId("");
    setEditingItemId(null);
    setDraft(initialDraftForMode(mode));
    toast.message(t("actions.reset"));
  };

  const allowedItemTypes = ITEM_TYPES.filter((item) =>
    (config.itemTypes as readonly DraftType[]).includes(item.type),
  );
  const activeItemType = ITEM_TYPES.find((item) => item.type === draft.type) ?? allowedItemTypes[0];
  const ActiveItemIcon = activeItemType?.icon ?? Plus;
  const activeItemTitle =
    draft.type === "blind"
      ? "Blind item"
      : draft.type === "wardrobe"
        ? "Wardrobe / door item"
        : draft.type === "accessory"
          ? "Accessory item"
          : draft.type === "labour"
            ? "Labour / fitting item"
            : "Manual item";
  const activeItemHelper =
    draft.type === "blind"
      ? "Choose the blind type, fabric or finish, dimensions and blind-only options."
      : draft.type === "wardrobe"
        ? "Choose the wardrobe or door product, dimensions and wardrobe-specific options."
        : draft.type === "accessory"
          ? "Add a standalone accessory or supplied part."
          : draft.type === "labour"
            ? "Add fitting, installation or other non-taxable labour."
            : "Add a custom line without changing product pricing.";

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <QuoteTypeTabs />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t(config.eyebrowKey)}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            {t(config.titleKey)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> {t("actions.reset")}
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => exportProject(false)}
            disabled={exporting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            {exporting ? t("actions.exporting") : t("actions.export")}
          </motion.button>
          <button
            onClick={() => exportProject(true)}
            disabled={exporting}
            title="Always renders the customer document in English"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent disabled:opacity-70"
          >
            <Download className="h-4 w-4" /> Export in English
          </button>
          <button
            onClick={printProject}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent"
          >
            <FileText className="h-4 w-4" /> {t("actions.printPdf")}
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(500px,0.86fr)]">
        <div className="space-y-6">
          <Panel icon={<IdCard className="h-4 w-4" />} title={t("quote.details")}>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label={t("quote.number")}
                value={project.ref}
                onChange={(ref) => setProject((current) => ({ ...current, ref }))}
              />
              <DateField
                label={t("quote.date")}
                value={project.date.slice(0, 10)}
                onChange={(date) =>
                  setProject((current) => ({
                    ...current,
                    date: date ? new Date(`${date}T12:00:00`).toISOString() : current.date,
                  }))
                }
              />
              <TextInput
                label={t("quote.customerName")}
                value={project.customer.fullName}
                onChange={(fullName) =>
                  setProject((current) => ({
                    ...current,
                    customer: { ...current.customer, fullName },
                  }))
                }
              />
              <TextInput
                label={t("quote.phone")}
                type="tel"
                value={project.customer.phone}
                onChange={(phone) =>
                  setProject((current) => ({
                    ...current,
                    customer: { ...current.customer, phone },
                  }))
                }
              />
              <TextInput
                label={t("quote.email")}
                type="email"
                value={project.customer.email}
                onChange={(email) =>
                  setProject((current) => ({
                    ...current,
                    customer: { ...current.customer, email },
                  }))
                }
              />
              <TextInput
                label={t("quote.postcode")}
                value={project.customer.postcode}
                onChange={(postcode) =>
                  setProject((current) => ({
                    ...current,
                    customer: { ...current.customer, postcode },
                  }))
                }
              />
              <div className="md:col-span-2">
                <TextInput
                  label={t("quote.address")}
                  value={project.customer.address}
                  onChange={(address) =>
                    setProject((current) => ({
                      ...current,
                      customer: { ...current.customer, address },
                    }))
                  }
                />
              </div>
            </div>
          </Panel>

          <Panel icon={<Layers className="h-4 w-4" />} title={t("quote.rooms")}>
            <div className="flex flex-wrap gap-2">
              {project.areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setActiveAreaId(area.id)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    activeArea?.id === area.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <TextInput label={t("quote.addRoom")} value={areaName} onChange={setAreaName} />
              <button
                onClick={addArea}
                className="mt-[21px] inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> {t("actions.addArea")}
              </button>
            </div>
            {activeArea && (
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <TextInput
                  label={t("quote.selectedArea")}
                  value={activeArea.name}
                  onChange={(name) =>
                    setProject((current) => ({
                      ...current,
                      areas: current.areas.map((area) =>
                        area.id === activeArea.id ? { ...area, name } : area,
                      ),
                    }))
                  }
                />
                <button
                  onClick={() => removeArea(activeArea.id)}
                  disabled={project.areas.length <= 1}
                  className="mt-[21px] inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> {t("actions.remove")}
                </button>
                <div className="md:col-span-2">
                  <Textarea
                    label={t("quote.areaNotes")}
                    value={activeArea.notes ?? ""}
                    onChange={(notes) =>
                      setProject((current) => ({
                        ...current,
                        areas: current.areas.map((area) =>
                          area.id === activeArea.id ? { ...area, notes } : area,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </Panel>

          <Panel
            icon={<Plus className="h-4 w-4" />}
            title={editingItemId ? t("quote.editItem") : t("quote.addItem")}
          >
            <div className="mb-5 rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <ActiveItemIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight">{activeItemTitle}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{activeItemHelper}</p>
                  </div>
                </div>
              </div>

              {allowedItemTypes.length > 1 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {allowedItemTypes.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.type}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            type: option.type,
                            taxable: option.type !== "labour",
                          }))
                        }
                        className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium ${
                          draft.type === option.type
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{t(option.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              {draft.type === "blind" && (
                <BlindDraftForm
                  draft={draft}
                  setDraft={setDraft}
                  blindTypeOptions={blindTypeOptions}
                  availableOptions={availableBlindOptions}
                  isFallbackSelection={standardFabricOptions.length === 0}
                  t={t}
                />
              )}
              {draft.type === "wardrobe" && (
                <WardrobeDraftForm
                  draft={draft}
                  setDraft={setDraft}
                  category={wardrobeCategory}
                  product={wardrobeProduct}
                  t={t}
                />
              )}
              {(draft.type === "manual" ||
                draft.type === "accessory" ||
                draft.type === "labour") && (
                <ManualDraftForm draft={draft} setDraft={setDraft} t={t} />
              )}
            </div>

            {liveItem && (
              <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <Stat label={t("quote.item")} value={liveItem.title || t("field.untitled")} />
                <Stat label={t("field.unit")} value={formatGBP(liveItem.unitPrice)} />
                <Stat
                  label={t("field.lineTotal")}
                  value={formatGBP(liveItem.lineTotal)}
                  highlight
                />
              </div>
            )}

            {livePricingWarning && (
              <div className="mt-4 flex gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">Item price needs attention</div>
                  <p className="mt-0.5 text-xs">{livePricingWarning}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {editingItemId && (
                <button
                  onClick={() => {
                    setEditingItemId(null);
                    setDraft(initialDraftForMode(mode));
                  }}
                  className="h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent"
                >
                  {t("actions.cancelEdit")}
                </button>
              )}
              <button
                onClick={saveItem}
                disabled={!activeArea || !liveItem || Boolean(livePricingWarning)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {editingItemId ? t("actions.saveItem") : t("actions.addToRoom")}
              </button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel icon={<Layers className="h-4 w-4" />} title={t("quote.summary")}>
            <div className="space-y-4">
              {project.areas.map((area) => {
                const areaTotal = totals.areaTotals.find((item) => item.areaId === area.id);
                return (
                  <section
                    key={area.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight">{area.name}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {area.items.length} item{area.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {(config.itemTypes as readonly DraftType[]).includes("labour") && (
                          <button
                            type="button"
                            onClick={() => startFittingItem(area.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-accent"
                          >
                            <Hammer className="h-3.5 w-3.5" /> Add Labour / Fitting
                          </button>
                        )}
                        <div className="text-sm font-semibold tabular-nums">
                          {formatGBP(areaTotal?.subtotal ?? 0)}
                        </div>
                      </div>
                    </div>
                    {area.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        {t("status.noItems")}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {area.items.map((item) => (
                          <li key={item.id} className="rounded-xl border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{item.title}</div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  {itemLabel(item, t)} · {t("quote.qty")} {item.quantity} ·{" "}
                                  {item.taxable ? t("field.taxable") : t("field.nonTaxable")}
                                </div>
                                {item.type === "blind" && (
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    {item.calculation.pricingReferenceNote}
                                  </div>
                                )}
                                {getProjectItemWarning(item) && (
                                  <div className="mt-2 flex gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{getProjectItemWarning(item)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <div className="text-sm font-semibold tabular-nums">
                                  {formatGBP(item.lineTotal)}
                                </div>
                                <div className="flex gap-1">
                                  <IconButton
                                    label={t("actions.edit")}
                                    onClick={() => editItem(item)}
                                    icon={<Pencil />}
                                  />
                                  <IconButton
                                    label={t("actions.duplicate")}
                                    onClick={() => duplicateItem(area.id, item)}
                                    icon={<Copy />}
                                  />
                                  <IconButton
                                    label={t("actions.remove")}
                                    onClick={() => removeItem(area.id, item.id)}
                                    icon={<Trash2 />}
                                  />
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <NumberInput
                label="Overall fitting cost (£)"
                value={overallFittingAmount}
                onChange={setOverallFittingCost}
              />
              <div>
                <NumberInput
                  label={`${t("quote.discount")} (%)`}
                  value={discountPercent}
                  step={1}
                  max={100}
                  onChange={setDiscountPercent}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[5, 10, 15, 20].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => setDiscountPercent(percent)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        Math.round(discountPercent) === percent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>
              <NumberInput
                label={`${t("quote.vat")} (%)`}
                value={Math.round(project.vatRate * 100)}
                onChange={(vat) =>
                  setProject((current) => ({
                    ...current,
                    vatRate: Math.max(0, Math.min(100, vat)) / 100,
                  }))
                }
              />
              <div className="sm:col-span-2">
                <Textarea
                  label={t("quote.notes")}
                  value={project.notes}
                  onChange={(notes) => setProject((current) => ({ ...current, notes }))}
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-foreground/[0.04] p-5">
              <TotalRow label="Products subtotal" value={formatGBP(productsSubtotal)} />
              <TotalRow label="Fitting subtotal" value={formatGBP(fittingSubtotal)} />
              <TotalRow label={t("quote.subtotal")} value={formatGBP(totals.subtotal)} />
              <TotalRow label={`${t("quote.discount")} %`} value={`${discountPercent}%`} />
              <TotalRow
                label={`${t("quote.discount")} Amount`}
                value={`- ${formatGBP(totals.discount)}`}
              />
              <TotalRow
                label={t("quote.taxableSubtotal")}
                value={formatGBP(totals.taxableSubtotal)}
              />
              <TotalRow
                label={t("quote.nonTaxable")}
                value={formatGBP(totals.nonTaxableSubtotal)}
              />
              <TotalRow
                label={`${t("quote.vat")} (${Math.round(project.vatRate * 100)}%)`}
                value={formatGBP(totals.vat)}
              />
              <div className="my-2 h-px bg-border" />
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("quote.finalTotal")}
                </span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatGBP(totals.total)}
                </span>
              </div>
            </div>
          </Panel>

          <div className="overflow-auto rounded-3xl border border-border bg-card p-4 luxe-shadow">
            <div className="mx-auto w-[760px]">
              <ProjectQuotePreview
                ref={previewRef}
                project={project}
                scopeLabel={t(config.scopeKey)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="project-print-sheet">
        <ProjectQuotePreview project={project} scopeLabel={t(config.scopeKey)} />
      </div>
      {/* Off-screen English render used for "Export in English" PNG */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "760px",
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <ProjectQuotePreview
          ref={englishPreviewRef}
          project={project}
          scopeLabel={t(config.scopeKey)}
          forceLocale="en"
        />
      </div>
    </div>
  );
}

function buildProjectItem(
  draft: DraftState,
  project: ProjectQuote,
  translateLabel: (label: string) => string,
): ProjectQuoteItem | null {
  if (draft.type === "blind") {
    const fabric = fabrics.find((item) => item.id === draft.blindFabricId);
    if (!fabric) return null;

    const quote: QuoteState = {
      ...defaultQuote(),
      customer: project.customer,
      preparedBy: project.preparedBy,
      meta: { ref: project.ref, date: project.date },
      product: {
        supplierId: fabric.supplierId,
        productTypeId: fabric.productTypeId,
        fabricId: fabric.id,
        frameColour: isPerfectFitFrameBlindType(draft.blindTypeId)
          ? draft.blindFrameColour
          : undefined,
        room: "",
        mount: draft.blindMount,
        chainSide: draft.blindChainSide,
      },
      size: {
        mode: "custom",
        presetId: "",
        widthMm: draft.blindWidthMm,
        heightMm: draft.blindHeightMm,
        quantity: Math.max(1, draft.blindQuantity),
      },
      extras: isPerfectFitFrameBlindType(draft.blindTypeId)
        ? withPerfectFitFrameSurcharge(
            filterExtrasForBlindType(draft.blindExtras, draft.blindTypeId),
            draft.blindTypeId,
            draft.blindFrameColour,
          )
        : filterExtrasForBlindType(
            draft.blindExtras.filter(
              (item) => !(PERFECT_FIT_FRAME_SURCHARGE_IDS as readonly string[]).includes(item.id),
            ),
            draft.blindTypeId,
          ),
      pricing: { labourCost: 0, discount: 0, vatRate: project.vatRate },
    };

    const calculation = calculateQuote(quote);
    const lineTotal = roundMoney(calculation.tradePrice);
    const quantity = Math.max(1, calculation.quantity);
    const blindType = BLIND_PRODUCT_TYPES.find((type) => type.id === draft.blindTypeId);
    const itemTitle = blindType
      ? `${blindType.label} Blind`
      : translateLabel(calculation.productTypeName);
    const selectionText = isBandOnlyFabricName(calculation.fabricName)
      ? calculation.pricingBand === "Standard"
        ? ""
        : `Band ${calculation.pricingBand}`
      : calculation.fabricName;

    const frameText = isPerfectFitFrameBlindType(draft.blindTypeId)
      ? `Frame: ${draft.blindFrameColour}`
      : "";
    const descriptionParts = [
      selectionText,
      frameText,
      `${calculation.widthMm} x ${calculation.heightMm}mm`,
    ].filter(Boolean);

    return {
      id: "draft",
      type: "blind",
      title: itemTitle,
      description: descriptionParts.join(" - "),
      quantity,
      unitPrice: roundMoney(lineTotal / quantity),
      lineTotal,
      taxable: true,
      notes: draft.notes || undefined,
      quote,
      calculation,
    };
  }

  if (draft.type === "wardrobe") {
    const category = WARDROBE_CATEGORIES.find((item) => item.id === draft.wardrobeCategoryId);
    const product = category?.products.find((item) => item.id === draft.wardrobeProductId);
    if (!category || !product) return null;

    const calc = calculateLine(product, {
      widthMm: draft.wardrobeWidthMm,
      heightMm: draft.wardrobeHeightMm,
      quantity: draft.wardrobeQuantity,
      manualUnitPrice: draft.wardrobeManualUnitPrice,
      addons: draft.wardrobeAddons,
    });
    const wardrobeNotes = [
      draft.wardrobeColour ? `Colour / finish: ${draft.wardrobeColour}` : "",
      draft.notes,
    ]
      .filter(Boolean)
      .join("\n");
    const wardrobeLine = {
      id: "draft",
      categoryId: category.id,
      productId: product.id,
      productName: product.name,
      categoryName: category.name,
      widthMm: product.requiresDimensions ? draft.wardrobeWidthMm : undefined,
      heightMm: product.requiresDimensions ? draft.wardrobeHeightMm : undefined,
      quantity: Math.max(1, draft.wardrobeQuantity),
      manualUnitPrice: draft.wardrobeManualUnitPrice,
      addons: draft.wardrobeAddons,
      notes: wardrobeNotes || undefined,
      calc,
    };

    return {
      id: "draft",
      type: "wardrobe",
      title: product.name,
      description: category.name,
      quantity: wardrobeLine.quantity,
      unitPrice: calc.unitPrice,
      lineTotal: calc.lineTotal,
      taxable: true,
      notes: wardrobeNotes || undefined,
      wardrobeLine,
    };
  }

  const quantity = Math.max(1, draft.quantity);
  const unitPrice = Math.max(0, draft.unitPrice);
  const lineTotal = roundMoney(quantity * unitPrice);
  const title =
    draft.title.trim() ||
    (draft.type === "labour"
      ? "Fitting labour"
      : draft.type === "accessory"
        ? "Accessory"
        : "Manual item");

  if (lineTotal <= 0 || !title) return null;

  return {
    id: "draft",
    type: draft.type,
    title,
    code: draft.type === "accessory" ? draft.code.trim() || undefined : undefined,
    description: draft.description.trim() || undefined,
    quantity,
    unitPrice,
    lineTotal,
    taxable: draft.type === "labour" ? false : draft.taxable,
    notes: draft.notes || undefined,
  } as ProjectQuoteItem;
}

function getFittingSubtotal(project: ProjectQuote) {
  return roundMoney(
    project.areas.reduce(
      (sum, area) =>
        sum +
        area.items
          .filter((item) => item.type === "labour")
          .reduce((itemSum, item) => itemSum + item.lineTotal, 0),
      0,
    ),
  );
}

function getTaxableSubtotalBeforeDiscount(project: ProjectQuote) {
  return roundMoney(
    project.areas.reduce(
      (sum, area) =>
        sum +
        area.items
          .filter((item) => item.taxable)
          .reduce((itemSum, item) => itemSum + item.lineTotal, 0),
      0,
    ),
  );
}

function getOverallFittingItem(project: ProjectQuote) {
  return project.areas
    .flatMap((area) => area.items)
    .find(
      (item) =>
        item.type === "labour" &&
        item.title === OVERALL_FITTING_TITLE &&
        item.notes === OVERALL_FITTING_NOTE,
    );
}

function getProjectItemWarning(item: ProjectQuoteItem | null) {
  if (!item || item.type !== "wardrobe") return null;
  return (
    item.wardrobeLine.calc.warning ??
    (item.lineTotal <= 0
      ? "No wardrobe price is mapped for this selection. Enter a verified manual unit price before adding it."
      : null)
  );
}

function draftFromItem(item: ProjectQuoteItem): DraftState {
  const draft = initialDraft();

  if (item.type === "blind") {
    const productTypeName =
      suppliers
        .flatMap((supplier) => supplier.productTypes)
        .find((productType) => productType.id === item.quote.product.productTypeId)?.name ?? "";
    const blindType = getBlindProductType(item.quote.product.productTypeId, productTypeName);
    const savedFrameColour = item.quote.product.frameColour;
    return {
      ...draft,
      type: "blind",
      blindTypeId: blindType?.id ?? "",
      blindProductTypeId: item.quote.product.productTypeId,
      blindFabricId: item.quote.product.fabricId,
      blindFrameColour:
        savedFrameColour && isPerfectFitRollerFrameColour(savedFrameColour)
          ? savedFrameColour
          : "White",
      blindWidthMm: item.quote.size.widthMm,
      blindHeightMm: item.quote.size.heightMm,
      blindQuantity: item.quote.size.quantity,
      blindMount: item.quote.product.mount,
      blindChainSide: item.quote.product.chainSide,
      blindExtras: item.quote.extras,
      notes: item.notes ?? "",
    };
  }

  if (item.type === "wardrobe") {
    const line = item.wardrobeLine;
    return {
      ...draft,
      type: "wardrobe",
      wardrobeCategoryId: line.categoryId,
      wardrobeProductId: line.productId,
      wardrobeWidthMm: line.widthMm ?? 0,
      wardrobeHeightMm: line.heightMm ?? 0,
      wardrobeQuantity: line.quantity,
      wardrobeManualUnitPrice: line.manualUnitPrice,
      wardrobeAddons: line.addons,
      wardrobeColour: "",
      notes: line.notes ?? "",
    };
  }

  return {
    ...draft,
    type: item.type,
    title: item.title,
    code: item.type === "accessory" ? (item.code ?? "") : "",
    description: item.description ?? "",
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxable: item.taxable,
    notes: item.notes ?? "",
  };
}

function BlindDraftForm({
  draft,
  setDraft,
  blindTypeOptions,
  availableOptions,
  isFallbackSelection,
  t,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  blindTypeOptions: { value: string; label: string }[];
  availableOptions: typeof fabrics;
  isFallbackSelection: boolean;
  t: (key: TranslationKey) => string;
}) {
  const hasOnlyStandardPlaceholder =
    availableOptions.length === 1 && availableOptions[0]?.name.trim().toLowerCase() === "standard";
  const selectionLabel = "Fabric / Finish / Colour";
  const visibleExtras = extras.filter((extra) =>
    isExtraApplicableToBlindType(extra, draft.blindTypeId),
  );
  const handleBlindTypeChange = (blindTypeId: string) => {
    const fabric = firstOptionForBlindType(blindTypeId);
    setDraft((current) => ({
      ...current,
      blindTypeId,
      blindProductTypeId: fabric?.productTypeId ?? "",
      blindFabricId: fabric?.id ?? "",
      blindFrameColour: isPerfectFitFrameBlindType(blindTypeId)
        ? current.blindFrameColour
        : "White",
      blindExtras: isPerfectFitFrameBlindType(blindTypeId)
        ? withPerfectFitFrameSurcharge(
            filterExtrasForBlindType(current.blindExtras, blindTypeId),
            blindTypeId,
            current.blindFrameColour,
          )
        : filterExtrasForBlindType(
            current.blindExtras.filter(
              (item) => !(PERFECT_FIT_FRAME_SURCHARGE_IDS as readonly string[]).includes(item.id),
            ),
            blindTypeId,
          ),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <BlindTypeGroupedPicker
          label={t("field.blindType")}
          value={draft.blindTypeId}
          onChange={handleBlindTypeChange}
          options={blindTypeOptions}
          renderGraphic={(typeId) => <BlindTypeGraphic typeId={typeId} />}
        />
        {availableOptions.length > 0 && !hasOnlyStandardPlaceholder && (
          <SelectInput
            label={selectionLabel}
            value={draft.blindFabricId}
            onChange={(blindFabricId) => {
              const fabric = fabrics.find((item) => item.id === blindFabricId);
              setDraft((current) => ({
                ...current,
                blindFabricId,
                blindProductTypeId: fabric?.productTypeId ?? current.blindProductTypeId,
              }));
            }}
            options={availableOptions.map((fabric) => ({
              value: fabric.id,
              label: optionLabel(fabric, availableOptions),
            }))}
          />
        )}
        {isPerfectFitFrameBlindType(draft.blindTypeId) && (
          <SelectInput
            label="Frame Colour"
            value={draft.blindFrameColour}
            onChange={(blindFrameColour) => {
              const nextFrameColour = isPerfectFitRollerFrameColour(blindFrameColour)
                ? blindFrameColour
                : "White";
              setDraft((current) => ({
                ...current,
                blindFrameColour: nextFrameColour,
                blindExtras: withPerfectFitFrameSurcharge(
                  current.blindExtras,
                  current.blindTypeId,
                  nextFrameColour,
                ),
              }));
            }}
            options={PERFECT_FIT_ROLLER_FRAME_COLOURS.map((value) => ({ value, label: value }))}
          />
        )}
        {isFallbackSelection && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-muted-foreground md:col-span-2">
            No fabric/colour list was found for this blind type. Select the pricing band shown in
            the workbook.
          </div>
        )}
        {draft.blindFabricId && (
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground md:col-span-2">
            {fabrics.find((item) => item.id === draft.blindFabricId)?.pricingReferenceNote ??
              "Internal pricing reference will appear here after a fabric or finish is selected."}
          </div>
        )}
        <NumberInput
          label={t("field.width")}
          value={draft.blindWidthMm}
          step={10}
          onChange={(blindWidthMm) =>
            setDraft((current) => ({ ...current, blindWidthMm: Math.max(0, blindWidthMm) }))
          }
        />
        <NumberInput
          label={t("field.height")}
          value={draft.blindHeightMm}
          step={10}
          onChange={(blindHeightMm) =>
            setDraft((current) => ({ ...current, blindHeightMm: Math.max(0, blindHeightMm) }))
          }
        />
        <NumberInput
          label={t("field.quantity")}
          value={draft.blindQuantity}
          min={1}
          onChange={(blindQuantity) =>
            setDraft((current) => ({ ...current, blindQuantity: Math.max(1, blindQuantity) }))
          }
        />
        <SelectInput
          label={t("field.mount")}
          value={draft.blindMount}
          onChange={(blindMount) =>
            setDraft((current) => ({
              ...current,
              blindMount: blindMount as DraftState["blindMount"],
            }))
          }
          options={["Inside Recess", "Outside Recess", "Ceiling", "Face Fix"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectInput
          label={t("field.chainSide")}
          value={draft.blindChainSide}
          onChange={(blindChainSide) =>
            setDraft((current) => ({
              ...current,
              blindChainSide: blindChainSide as DraftState["blindChainSide"],
            }))
          }
          options={["Right", "Left"].map((value) => ({ value, label: value }))}
        />
      </div>
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t("field.blindExtras")}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {visibleExtras.map((extra) => {
            const selected = draft.blindExtras.find((item) => item.id === extra.id);
            return (
              <label
                key={extra.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate">{extra.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {extraDetail(extra)}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      blindExtras: event.target.checked
                        ? [
                            ...current.blindExtras,
                            {
                              id: extra.id,
                              quantity: 1,
                              widthMm:
                                extra.pricing.type === "widthTable"
                                  ? current.blindWidthMm
                                  : undefined,
                            },
                          ]
                        : current.blindExtras.filter((item) => item.id !== extra.id),
                    }))
                  }
                />
                {selected && extra.pricing.type === "widthTable" ? (
                  <input
                    type="number"
                    min={1}
                    value={selected.widthMm ?? draft.blindWidthMm}
                    onChange={(event) => {
                      const widthMm = Math.max(1, Number(event.target.value) || 0);
                      setDraft((current) => ({
                        ...current,
                        blindExtras: current.blindExtras.map((item) =>
                          item.id === extra.id ? { ...item, widthMm } : item,
                        ),
                      }));
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-right text-xs tabular-nums"
                    aria-label={`${extra.name} width in millimetres`}
                  />
                ) : null}
              </label>
            );
          })}
        </div>
      </div>
      <Textarea
        label={t("field.notes")}
        value={draft.notes}
        onChange={(notes) => setDraft((current) => ({ ...current, notes }))}
      />
    </div>
  );
}

function WardrobeDraftForm({
  draft,
  setDraft,
  category,
  product,
  t,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  category?: (typeof WARDROBE_CATEGORIES)[number];
  product?: WardrobeProduct;
  t: (key: TranslationKey) => string;
}) {
  const doorColours = product && category?.id === "doors" ? doorColourOptions(product.id) : [];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <WardrobeCategoryPicker
          label={t("field.category")}
          value={draft.wardrobeCategoryId}
          onChange={(wardrobeCategoryId) => {
            const nextCategory = WARDROBE_CATEGORIES.find((item) => item.id === wardrobeCategoryId);
            setDraft((current) => ({
              ...current,
              wardrobeCategoryId: wardrobeCategoryId as WardrobeCategoryId,
              wardrobeProductId: nextCategory?.products[0]?.id ?? "",
              wardrobeManualUnitPrice: undefined,
              wardrobeAddons: wardrobeCategoryId === "doors" ? current.wardrobeAddons : [],
            }));
          }}
        />
        <WardrobeProductPicker
          label={t("field.product")}
          value={draft.wardrobeProductId}
          products={category?.products ?? []}
          fallbackImageSrc={category?.id === "doors" ? undefined : category?.imageSrc}
          onChange={(wardrobeProductId) =>
            setDraft((current) => ({
              ...current,
              wardrobeProductId,
              wardrobeManualUnitPrice: undefined,
              wardrobeAddons: category?.id === "doors" ? current.wardrobeAddons : [],
              wardrobeColour: "",
            }))
          }
        />
        {(product?.imageSrc ?? (category?.id === "doors" ? undefined : category?.imageSrc)) && (
          <div className="overflow-hidden rounded-2xl border border-border bg-background md:col-span-2">
            <img
              src={product?.imageSrc ?? category?.imageSrc}
              alt={`${product?.name ?? category?.name} catalogue reference`}
              className="h-52 w-full object-cover sm:h-64"
              loading="lazy"
            />
          </div>
        )}
        {product?.requiresDimensions && (
          <>
            <NumberInput
              label={t("field.width")}
              value={draft.wardrobeWidthMm}
              step={10}
              onChange={(wardrobeWidthMm) =>
                setDraft((current) => ({
                  ...current,
                  wardrobeWidthMm: Math.max(0, wardrobeWidthMm),
                }))
              }
            />
            <NumberInput
              label={t("field.height")}
              value={draft.wardrobeHeightMm}
              step={10}
              onChange={(wardrobeHeightMm) =>
                setDraft((current) => ({
                  ...current,
                  wardrobeHeightMm: Math.max(0, wardrobeHeightMm),
                }))
              }
            />
          </>
        )}
        <NumberInput
          label={t("field.quantity")}
          value={draft.wardrobeQuantity}
          min={1}
          onChange={(wardrobeQuantity) =>
            setDraft((current) => ({
              ...current,
              wardrobeQuantity: Math.max(1, wardrobeQuantity),
            }))
          }
        />
        <NumberInput
          label={
            product?.pricing.type === "manual" ? t("field.unitPrice") : t("field.priceOverride")
          }
          value={draft.wardrobeManualUnitPrice ?? 0}
          onChange={(wardrobeManualUnitPrice) =>
            setDraft((current) => ({
              ...current,
              wardrobeManualUnitPrice:
                wardrobeManualUnitPrice > 0 ? wardrobeManualUnitPrice : undefined,
            }))
          }
        />
      </div>
      {product?.description && (
        <p className="text-[11px] text-muted-foreground">{product.description}</p>
      )}
      {doorColours.length > 0 && (
        <DoorColourPicker
          value={draft.wardrobeColour}
          options={doorColours}
          onChange={(wardrobeColour) =>
            setDraft((current) => ({
              ...current,
              wardrobeColour: current.wardrobeColour === wardrobeColour ? "" : wardrobeColour,
            }))
          }
        />
      )}
      {category?.id === "doors" && (
        <div>
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Door surcharges
          </span>
          <div className="grid gap-2 md:grid-cols-2">
            {WARDROBE_DOOR_ADDONS.map((addon) => {
              const selected = draft.wardrobeAddons.some((item) => item.id === addon.id);
              const amount = addon.amount > 0 ? `+${addon.amount}%` : `${addon.amount}%`;
              return (
                <label
                  key={addon.id}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        wardrobeAddons: event.target.checked
                          ? [...current.wardrobeAddons, addon]
                          : current.wardrobeAddons.filter((item) => item.id !== addon.id),
                      }))
                    }
                  />
                  <span className="min-w-0 flex-1">{addon.name}</span>
                  <span className="text-xs text-muted-foreground">{amount}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <Textarea
        label={t("field.notes")}
        value={draft.notes}
        onChange={(notes) => setDraft((current) => ({ ...current, notes }))}
      />
    </div>
  );
}

function WardrobeCategoryPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: WardrobeCategoryId;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = WARDROBE_CATEGORIES.find((category) => category.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? WARDROBE_CATEGORIES.filter((category) => category.name.toLowerCase().includes(q))
    : WARDROBE_CATEGORIES;

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
    <div>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2 text-left text-sm transition hover:border-foreground/30 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{selected?.name ?? "Select category"}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {selected?.blurb ?? "Choose a wardrobe category"}
          </span>
        </span>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          View
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
            aria-label="Select wardrobe category"
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-background shadow-2xl sm:rounded-3xl sm:border sm:border-border"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Select Category
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {selected?.name ?? "Choose a category"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close wardrobe category selector"
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
                  placeholder="Search wardrobe categories..."
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  aria-label="Search wardrobe categories"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((category) => {
                  const isSelected = category.id === value;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        onChange(category.id);
                        setOpen(false);
                      }}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden rounded-2xl border text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${
                        isSelected
                          ? "border-foreground/50 bg-foreground text-background shadow-sm"
                          : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-accent/40"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      {category.imageSrc ? (
                        <img
                          src={category.imageSrc}
                          alt=""
                          className="h-36 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center bg-muted/50 px-4 text-center text-xs text-muted-foreground">
                          Catalogue category
                        </div>
                      )}
                      <div className="p-3">
                        <div className="line-clamp-2 text-sm font-semibold leading-tight">
                          {category.name}
                        </div>
                        <div
                          className={`mt-1 line-clamp-2 text-xs ${
                            isSelected ? "text-background/70" : "text-muted-foreground"
                          }`}
                        >
                          {category.blurb}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DoorColourPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: DoorColourOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Door colour / finish
      </span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {options.map((option) => {
          const selected = option.name === value;
          return (
            <button
              key={option.name}
              type="button"
              onClick={() => onChange(option.name)}
              aria-pressed={selected}
              className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ring ${
                selected
                  ? "border-foreground/60 bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/30 hover:bg-accent/30"
              }`}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-border shadow-inner"
                style={{ backgroundColor: option.hex }}
              />
              <span className="min-w-0 flex-1 leading-tight">{option.name}</span>
              {selected && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WardrobeProductPicker({
  label,
  value,
  products,
  fallbackImageSrc,
  onChange,
}: {
  label: string;
  value: string;
  products: WardrobeProduct[];
  fallbackImageSrc?: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = products.find((product) => product.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter((product) => product.name.toLowerCase().includes(q))
    : products;

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
    <div>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2 text-left text-sm transition hover:border-foreground/30 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{selected?.name ?? "Select product"}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {(selected?.imageSrc ?? fallbackImageSrc)
              ? "Visual reference available"
              : "Catalogue product"}
          </span>
        </span>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          View
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
            aria-label="Select wardrobe product"
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-background shadow-2xl sm:rounded-3xl sm:border sm:border-border"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Select Product
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {selected?.name ?? "Choose a wardrobe product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close wardrobe product selector"
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
                  placeholder="Search wardrobe products..."
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  aria-label="Search wardrobe products"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  No wardrobe products match "{query}".
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((product) => {
                    const isSelected = product.id === value;
                    const imageSrc = product.imageSrc ?? fallbackImageSrc;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          onChange(product.id);
                          setOpen(false);
                        }}
                        aria-pressed={isSelected}
                        className={`group relative overflow-hidden rounded-2xl border text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${
                          isSelected
                            ? "border-foreground/50 bg-foreground text-background shadow-sm"
                            : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-accent/40"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt=""
                            className="h-36 w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-36 items-center justify-center bg-muted/50 px-4 text-center text-xs text-muted-foreground">
                            Catalogue item
                          </div>
                        )}
                        <div className="p-3">
                          <div className="line-clamp-2 text-sm font-semibold leading-tight">
                            {product.name}
                          </div>
                          {product.description && (
                            <div
                              className={`mt-1 line-clamp-2 text-xs ${
                                isSelected ? "text-background/70" : "text-muted-foreground"
                              }`}
                            >
                              {product.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualDraftForm({
  draft,
  setDraft,
  t,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TextInput
        label={draft.type === "labour" ? t("field.labourName") : t("field.itemName")}
        value={draft.title}
        onChange={(title) => setDraft((current) => ({ ...current, title }))}
      />
      {draft.type === "accessory" && (
        <TextInput
          label={t("field.code")}
          value={draft.code}
          onChange={(code) => setDraft((current) => ({ ...current, code }))}
        />
      )}
      <NumberInput
        label={t("field.quantity")}
        value={draft.quantity}
        min={1}
        onChange={(quantity) =>
          setDraft((current) => ({ ...current, quantity: Math.max(1, quantity) }))
        }
      />
      <NumberInput
        label={t("field.unitPrice")}
        value={draft.unitPrice}
        onChange={(unitPrice) =>
          setDraft((current) => ({ ...current, unitPrice: Math.max(0, unitPrice) }))
        }
      />
      {draft.type !== "labour" && (
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm md:mt-[21px]">
          <input
            type="checkbox"
            checked={draft.taxable}
            onChange={(event) =>
              setDraft((current) => ({ ...current, taxable: event.target.checked }))
            }
          />
          {t("field.includeVat")}
        </label>
      )}
      <div className="md:col-span-2">
        <Textarea
          label={t("field.description")}
          value={draft.description}
          onChange={(description) => setDraft((current) => ({ ...current, description }))}
        />
      </div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 luxe-shadow">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [textValue, setTextValue] = useState(() => formatInputNumber(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setTextValue(formatInputNumber(value));
    }
  }, [value]);

  const commitValue = (raw: string) => {
    const parsed = Number(raw);
    const next = Number.isFinite(parsed) ? clampNumber(parsed, min, max) : min;
    setTextValue(formatInputNumber(next));
    onChange(next);
  };

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={textValue}
        data-step={step}
        onChange={(event) => {
          const next = event.target.value;
          if (!/^\d*\.?\d*$/.test(next)) return;
          setTextValue(next);
          if (next === "" || next === ".") return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) {
            onChange(clampNumber(parsed, min, max));
          }
        }}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commitValue(textValue);
        }}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm tabular-nums focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}

function clampNumber(value: number, min: number, max?: number) {
  return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, value));
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : String(roundMoney(value));
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BlindTypePicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="md:col-span-2">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex h-[126px] min-w-[150px] flex-col items-center justify-between gap-2 rounded-xl border px-3 py-3 text-center transition ${
                selected
                  ? "border-foreground/40 bg-foreground text-background shadow-sm"
                  : "border-border bg-background text-foreground hover:border-foreground/30"
              }`}
            >
              <span className="flex h-16 w-full items-center justify-center">
                <BlindTypeGraphic typeId={option.value} />
              </span>
              <span className="flex min-h-8 w-full items-center justify-center text-balance text-xs font-semibold leading-tight">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BlindTypeGraphic({ typeId }: { typeId: string }) {
  const stroke = "currentColor";
  const fill = "currentColor";
  const frame = (
    <rect
      x="10"
      y="6"
      width="60"
      height="52"
      rx="1.5"
      fill="none"
      stroke={stroke}
      strokeWidth="3"
    />
  );

  if (typeId.includes("vertical") || typeId === "pvc-rigid") {
    return (
      <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
        {frame}
        <rect x="18" y="12" width="44" height="4" rx="1" fill={fill} />
        {Array.from({ length: 7 }).map((_, index) => {
          const x = 17 + index * 6;
          return (
            <path
              key={index}
              d={`M${x} 16 h4 v35 l-4 3 z`}
              fill="none"
              stroke={stroke}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    );
  }

  if (typeId.includes("venetian") || typeId.includes("fauxwood") || typeId.includes("sunwood")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
        {frame}
        <rect x="14" y="11" width="50" height="5" rx="1" fill={fill} />
        {Array.from({ length: 8 }).map((_, index) => (
          <rect
            key={index}
            x="16"
            y={20 + index * 4}
            width="48"
            height="2.4"
            rx="1.2"
            fill={fill}
          />
        ))}
        <path d="M66 13 v35" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="66" cy="51" rx="3" ry="6" fill={fill} />
      </svg>
    );
  }

  if (typeId.includes("pleated")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
        {frame}
        <rect x="16" y="11" width="48" height="4" rx="1" fill={fill} />
        {Array.from({ length: 9 }).map((_, index) => (
          <path
            key={index}
            d={`M18 ${18 + index * 3.6} h44 l-3 2.2 h-38 z`}
            fill="none"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        ))}
        <rect x="18" y="48" width="44" height="7" fill="none" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }

  if (typeId.includes("vision") || typeId === "allusion") {
    return (
      <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
        {frame}
        <rect
          x="16"
          y="11"
          width="48"
          height="5"
          rx="1"
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
        />
        {Array.from({ length: 5 }).map((_, index) => (
          <g key={index}>
            <rect x="18" y={20 + index * 7} width="44" height="4" fill={fill} />
            <rect
              x="18"
              y={24 + index * 7}
              width="44"
              height="3"
              fill="none"
              stroke={stroke}
              strokeWidth="1.4"
            />
          </g>
        ))}
      </svg>
    );
  }

  if (typeId.includes("shutter")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
        {frame}
        <rect x="17" y="13" width="46" height="38" fill="none" stroke={stroke} strokeWidth="2.4" />
        {Array.from({ length: 5 }).map((_, index) => (
          <path
            key={index}
            d={`M20 ${20 + index * 6} h40`}
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        <path d="M40 13 v38" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }

  if (typeId === "roman") {
    return (
      <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
        {frame}
        <rect x="18" y="11" width="44" height="4" rx="1" fill={fill} />
        <path d="M19 16 h42 l-2 9 h-38 z" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M21 25 h38 l-2 8 h-34 z" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M23 33 h34 l-2 8 h-30 z" fill="none" stroke={stroke} strokeWidth="2" />
        <rect x="23" y="41" width="34" height="13" fill="none" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 80 64" className="h-16 w-20">
      {frame}
      <rect
        x="18"
        y="11"
        width="44"
        height="6"
        rx="3"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
      />
      <rect x="20" y="18" width="40" height="34" fill="none" stroke={stroke} strokeWidth="2.6" />
      <rect x="19" y="51" width="42" height="4" rx="1" fill={fill} />
    </svg>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-xl border px-3 py-2 ${
        highlight ? "border-foreground/20 bg-background" : "border-border bg-background/60"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums tracking-tight">
        {value}
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
    >
      <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
    </button>
  );
}

function itemLabel(item: ProjectQuoteItem, t: (key: TranslationKey) => string) {
  switch (item.type) {
    case "blind":
      return item.description || t("item.blindShort");
    case "wardrobe":
      return item.wardrobeLine.categoryName;
    case "accessory":
      return item.code ? `${t("item.accessoryShort")} ${item.code}` : t("item.accessoryShort");
    case "labour":
      return t("item.labourShort");
    case "manual":
      return t("item.manualShort");
  }
}

function roundMoney(value: number) {
  return +value.toFixed(2);
}
