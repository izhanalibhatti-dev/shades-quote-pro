import type { PriceTable } from "@/types/PriceTable";
import { roundHeight } from "@/pricing/roundHeight";
import { roundWidth } from "@/pricing/roundWidth";

export function getBasePrice({
  priceTable,
  band,
  widthMm,
  heightMm,
}: {
  priceTable: PriceTable;
  band: string;
  widthMm: number;
  heightMm: number;
}) {
  assertDimensionInRange({
    value: widthMm,
    available: priceTable.widths,
    label: "width",
    tableName: priceTable.priceSourceLabel ?? priceTable.id,
  });
  assertDimensionInRange({
    value: heightMm,
    available: priceTable.heights,
    label: "height",
    tableName: priceTable.priceSourceLabel ?? priceTable.id,
  });

  const roundedWidthMm = roundWidth(widthMm, priceTable.widths);
  const roundedHeightMm = roundHeight(heightMm, priceTable.heights);
  const widthIndex = priceTable.widths.indexOf(roundedWidthMm);
  const heightIndex = priceTable.heights.indexOf(roundedHeightMm);
  const bandMatrix = priceTable.bands[band];

  if (!bandMatrix) {
    throw new Error(`Price table ${priceTable.id} does not contain band ${band}.`);
  }

  const price = bandMatrix[heightIndex]?.[widthIndex];

  if (typeof price !== "number") {
    throw new Error(
      `No available price for ${priceTable.id}, band ${band}, ${roundedWidthMm}mm width x ${roundedHeightMm}mm height.`,
    );
  }

  return {
    price,
    roundedWidthMm,
    roundedHeightMm,
  };
}

function assertDimensionInRange({
  value,
  available,
  label,
  tableName,
}: {
  value: number;
  available: number[];
  label: "width" | "height";
  tableName: string;
}) {
  const min = Math.min(...available);
  const max = Math.max(...available);

  if (value < min) {
    throw new Error(
      `Blind ${label} ${value}mm is below the minimum ${label} for ${tableName}. Available ${label} range: ${min}-${max}mm.`,
    );
  }

  if (value > max) {
    throw new Error(
      `Blind ${label} ${value}mm is above the maximum ${label} for ${tableName}. Available ${label} range: ${min}-${max}mm.`,
    );
  }
}
