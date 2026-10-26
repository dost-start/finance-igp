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

const REFERENCE_LABEL = /(?:ref(?:erence)?|trace|txn|transaction|confirmation)\s*(?:no\.?|number|num\.?|id|code|#)?\s*[:.#-]?\s*(.*)$/i;

// Bank and e-wallet reference numbers always contain digits and are long (GCash: 13 digits). A word
// that merely follows the label ("Tara", "History") is not one, so it is rejected and the receipt is
// reported as not fully read instead of producing a false mismatch.
const MIN_LABELLED_REFERENCE = 8;

function cleanReference(raw: string): string | null {
  const m = /^[A-Za-z0-9][A-Za-z0-9\- ]{2,38}/.exec(raw.trim());
  if (!m) return null;
  const value = m[0].trim().replace(/\s+/g, " ");
  // Every space-separated piece must hold a digit: "8012 345 678 901" and "GT-9988-7766" pass, "Send Money -100" does not.
  const allPiecesHaveDigits = value.split(" ").every((piece) => /\d/.test(piece));
  return allPiecesHaveDigits && normalizeReference(value).length >= MIN_LABELLED_REFERENCE ? value : null;
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
    const here = cleanReference(m[1]);
    if (here) return here;
    const next = lines[i + 1] ? cleanReference(lines[i + 1]) : null;
    if (next) return next;
  }
  return null;
}
