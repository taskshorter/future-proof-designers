/**
 * Format Factory integer minor units using currency fraction-digit metadata.
 * Never invent commercial totals — display only.
 */

export type MoneyFormatResult =
  | { ok: true; text: string }
  | { ok: false; text: string };

function currencyFractionDigits(currency: string): number | null {
  try {
    const digits = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
    if (typeof digits !== "number" || !Number.isFinite(digits) || digits < 0) {
      return null;
    }
    return digits;
  } catch {
    return null;
  }
}

export function formatMinorUnits(
  minorUnits: number,
  currency: string,
): MoneyFormatResult {
  if (!Number.isInteger(minorUnits)) {
    return { ok: false, text: "Amount unavailable" };
  }

  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return { ok: false, text: "Amount unavailable" };
  }

  const fractionDigits = currencyFractionDigits(code);
  if (fractionDigits == null) {
    return { ok: false, text: "Amount unavailable" };
  }

  const divisor = 10 ** fractionDigits;
  const major = minorUnits / divisor;

  try {
    const text = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(major);
    return { ok: true, text };
  } catch {
    return { ok: false, text: "Amount unavailable" };
  }
}

export function formatMinorUnitsOrFallback(
  minorUnits: number,
  currency: string,
): string {
  return formatMinorUnits(minorUnits, currency).text;
}
