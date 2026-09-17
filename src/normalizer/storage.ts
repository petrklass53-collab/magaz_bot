export function detectStorage(input: string): string | null {
  const match = input.match(/\b(\d{2,4})\s*(?:gb|гб|гбайт|g)(?![a-zа-я])/iu);
  if (!match?.[1]) return null;
  const size = Number(match[1]);
  if (![32, 64, 128, 256, 512, 1024, 2048].includes(size)) return null;
  return `${size}GB`;
}

export function detectRam(input: string): string | null {
  const match = input.match(/(?:ram|озу)\s*[:\-]?\s*(\d{1,3})\s*(?:gb|гб)?(?![a-zа-я])/iu);
  return match?.[1] ? `${Number(match[1])}GB` : null;
}
