/** Formatting helpers that preserve the legacy UI's units. */

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Fraction (0..1) -> "12.34%" */
export function percentFromFraction(value: number): string {
  return (value * 100).toFixed(2) + "%";
}

/** Percentage (0..100) -> "12.34%" */
export function percent(value: number): string {
  return value.toFixed(2) + "%";
}

/** Signed adjustment points -> "+2.5 points" / "-1.00 points" */
export function signedPoints(points: number): string {
  const sign = points > 0 ? "+" : "";
  return sign + points.toFixed(2) + " points";
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Fallback source -> Indonesian note shown in the legacy result header. */
export function fallbackNote(source: string | null): string | null {
  switch (source) {
    case "MAP_YEAR_PLAYSTYLE":
      return "Komposisi historis tidak ditemukan, menampilkan rekomendasi dengan playstyle serupa pada map dan tahun yang sama.";
    case "MAP_YEAR":
      return "Komposisi historis tidak ditemukan, menampilkan rekomendasi pada map dan tahun yang sama.";
    case "MAP":
      return "Komposisi historis tidak ditemukan, menampilkan rekomendasi pada map yang sama.";
    case "GLOBAL":
      return "Komposisi historis tidak ditemukan, menampilkan rekomendasi global.";
    default:
      return null;
  }
}
