export function roundHeight(heightMm: number, availableHeights: number[]): number {
  const sorted = [...availableHeights].sort((a, b) => a - b);
  const match = sorted.find((candidate) => heightMm <= candidate);
  if (match == null && sorted.length === 0) {
    throw new Error(`No height price is available for ${heightMm}mm.`);
  }
  return match ?? sorted[sorted.length - 1];
}
