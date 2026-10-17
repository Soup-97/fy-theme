function channel(hex: string, i: number): number {
  const c = parseInt(hex.slice(i, i + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function expand(color: string): string {
  let hex = color.replace('#', '');
  if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).replace(/./g, (c) => c + c);
  return hex.slice(0, 6);
}

export function luminance(color: string): number {
  const hex = expand(color);
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 2) + 0.0722 * channel(hex, 4);
}

/** WCAG 2 contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
