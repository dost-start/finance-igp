// Contact numbers are stored as typed, plus the last 4 digits for order tracking (FR05.01).
// Philippine mobiles normalize to 09XXXXXXXXX; other international numbers keep a leading +.
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("09")) return digits;
  if (digits.length === 12 && digits.startsWith("639")) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function lastFour(normalized: string): string {
  return normalized.replace(/\D/g, "").slice(-4);
}
