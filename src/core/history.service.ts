const SPARKLINE_LEVELS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

/** Builds a compact price chart suitable for a chat message. */
export function priceSparkline(values: number[], maxPoints = 14): string | null {
  const clean = values.filter((value) => Number.isFinite(value) && value >= 0).slice(-Math.max(1, maxPoints));
  if (!clean.length) return null;

  const minimum = Math.min(...clean);
  const maximum = Math.max(...clean);
  if (minimum === maximum) return SPARKLINE_LEVELS[4]!.repeat(clean.length);

  return clean
    .map((value) => {
      const ratio = (value - minimum) / (maximum - minimum);
      const index = Math.round(ratio * (SPARKLINE_LEVELS.length - 1));
      return SPARKLINE_LEVELS[index]!;
    })
    .join("");
}
