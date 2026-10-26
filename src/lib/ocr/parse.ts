// Turns the raw text read from a receipt photo into the two things finance compares: the amount
// and the reference number. Pure text rules, no browser needed, so they can be tested alone.
// Receipts differ by bank and by app, so everything here is forgiving: it looks for labels
// ("Amount", "Reference No.") but also falls back to what the buyer typed.

export function parseCentavos(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const pesos = Number(m[1]);
  const cents = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  return pesos * 100 + cents;
}

// "135000" centavos -> "1350.00": the plain form stored in the database and sent from the browser.
export const amountField = (centavos: number): string => `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;

// Receipts are read by a camera-grade engine, so look-alike characters are treated as equal.
export function normalizeReference(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[OQD]/g, "0")
    .replace(/[IL]/g, "1");
}

const POSITIVE = /amount|total|sent|paid|transfer|payment|debited/i;
const NEGATIVE = /fee|charge|balance|available|change|tax|vat|discount|points/i;

const DECIMAL_AMOUNT = /(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?!\d)(?!\s?[AaPp][Mm])/g;
const SIGNED_AMOUNT = /(?:PHP|Php|PhP|₱|\bP)\s?(\d{1,3}(?:,\d{3})+|\d+)(?![\d.,\w])/g;

type Candidate = { centavos: number; labelled: boolean; excluded: boolean; signed: boolean };

// "-1,500.00" or "+100.00": a signed amount is a line in a transaction list, not a receipt total.
const SIGN_BEFORE = /[-+−]\s*$/;

export function amountCandidates(text: string): Candidate[] {
  const lines = text.split(/\r?\n|\|/).map((l) => l.trim());
  const out: Candidate[] = [];
  lines.forEach((line, i) => {
    const prev = i > 0 ? lines[i - 1] : "";
    // A number with two decimals (not a clock time), or a whole number right after a currency sign.
    const found = [
      ...[...line.matchAll(DECIMAL_AMOUNT)].map((m) => ({ value: m[0], at: m.index })),
      ...[...line.matchAll(SIGNED_AMOUNT)].map((m) => ({ value: m[1], at: m.index })),
    ];
    for (const { value, at } of found) {
      const centavos = parseCentavos(value);
      if (centavos === null || centavos === 0) continue;
      const before = line.slice(0, at);
      const excluded = NEGATIVE.test(before) || (NEGATIVE.test(prev) && !POSITIVE.test(before));
      const labelled = !excluded && (POSITIVE.test(before) || POSITIVE.test(prev));
      const signed = SIGN_BEFORE.test(before);
      if (!out.some((c) => c.centavos === centavos && c.labelled === labelled && c.excluded === excluded && c.signed === signed)) out.push({ centavos, labelled, excluded, signed });
    }
  });
  return out;
}

// The amount finance should see: the first value near an "Amount/Total/Sent" label, otherwise the
// only amount on the receipt, otherwise nothing (several unlabelled amounts is a guess).
export function extractAmount(text: string): number | null {
  const all = amountCandidates(text);
  // Several different signed amounts means a transaction history list: no single amount is "the" amount.
  if (new Set(all.filter((c) => c.signed).map((c) => c.centavos)).size >= 2) return null;
  const usable = all.filter((c) => !c.excluded);
  const labelled = usable.find((c) => c.labelled);
  if (labelled) return labelled.centavos;
  const distinct = [...new Set(usable.map((c) => c.centavos))];
  return distinct.length === 1 ? distinct[0] : null;
}

// Labels that introduce a reference number: Ref No., Ref. No., Reference No./Number/ID, Ref #,
// Transaction/Confirmation/Trace No. The value is whatever follows on the same line (or the next line).
const REFERENCE_LABEL = /\b(ref(?:erence)?|trace|txn|transaction|confirmation|conf)\b\.?\s*(?:(?:no|number|num|id|code)\b\.?|#)?\s*[:.#-]?\s*(.*)$/i;

// A reference is never a date or a time, so reading stops at one ("Ref No. 0046567041072 Oct 27,2026 12:33 AM").
const MONTH_WORD = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?$/i;
const DATE_LIKE = /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/;
const TIME_LIKE = /^\d{1,2}:\d{2}(:\d{2})?$/;
const AM_PM = /^(am|pm)$/i;
const isDateOrTime = (t: string): boolean => MONTH_WORD.test(t) || DATE_LIKE.test(t) || TIME_LIKE.test(t) || AM_PM.test(t);

// Bank and e-wallet references always contain digits and are long (GCash: 13 digits, GoTyme: letters
// and digits). A word that merely follows the label ("Tara", "History") is not one, so it is rejected
// and the receipt is reported as not fully read instead of producing a false mismatch. Two short
// forms exist: MariBank and InstaPay references are 6 digits, accepted only straight after a
// "Reference" or "Ref" label.
const MIN_REFERENCE = 8;
const MIN_REFERENCE_DIGITS_ONLY = 6;

function cleanReference(raw: string, labelIsReference: boolean): string | null {
  const tokens = raw.trim().split(/\s+/);
  const first = tokens[0] ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(first) || !/\d/.test(first) || isDateOrTime(first)) return null;
  const group = [first];
  // Numbers are printed in groups ("8012 345 678 901"): keep following digit groups, stop at anything else.
  if (/^\d+$/.test(first)) {
    for (const t of tokens.slice(1)) {
      if (!/^\d{3,}$/.test(t) || isDateOrTime(t)) break;
      group.push(t);
    }
  }
  const value = group.join(" ");
  const digitsOnly = /^\d+$/.test(value.replace(/\s/g, ""));
  const minimum = digitsOnly && labelIsReference ? MIN_REFERENCE_DIGITS_ONLY : MIN_REFERENCE;
  return normalizeReference(value).length >= minimum ? value : null;
}

// The reference number: the one the buyer typed if it appears anywhere on the receipt (strongest
// evidence), otherwise whatever follows a "Reference No." style label.
export function extractReference(text: string, typed?: string): string | null {
  if (typed) {
    const wanted = normalizeReference(typed);
    if (wanted.length >= 6 && normalizeReference(text).includes(wanted)) return typed.trim();
  }
  const lines = text.split(/\r?\n|\|/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const m = REFERENCE_LABEL.exec(lines[i]);
    if (!m) continue;
    const labelIsReference = /^ref/i.test(m[1]);
    const here = cleanReference(m[2], labelIsReference);
    if (here) return here;
    const next = lines[i + 1] ? cleanReference(lines[i + 1], labelIsReference) : null;
    if (next) return next;
  }
  return null;
}
