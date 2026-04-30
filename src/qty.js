// Optional units. `null` = unitless count (rendered as "× N").
export const UNITS = [
  { id: null, label: "יחידות", short: "" },
  { id: "kg", label: "ק״ג", short: 'ק"ג' },
  { id: "g", label: "גרם", short: "גרם" },
  { id: "l", label: "ליטר", short: "ליטר" },
  { id: "ml", label: "מ״ל", short: 'מ"ל' },
];

const UNIT_MAP = {
  kg: ["kg", "קג", 'ק"ג', "ק״ג"],
  g: ["g", "גר", "גר'", "גרם"],
  l: ["l", "liter", "ל", "ל'", "ליטר"],
  ml: ["ml", "מל", 'מ"ל', "מ״ל"],
};

function detectUnit(token) {
  if (!token) return null;
  const t = token.trim().toLowerCase().replace(/[״"']/g, "");
  for (const [unit, aliases] of Object.entries(UNIT_MAP)) {
    if (aliases.some((a) => a.replace(/[״"']/g, "") === t)) return unit;
  }
  return null;
}

// Try to extract a quantity (and optional unit) from the END of `input`.
// Returns { name, quantity, unit } — when no qty is found, name is unchanged
// and quantity/unit are null.
export function parseQty(input) {
  const trimmed = (input || "").trim();
  // Patterns to try at the end:
  //   "x 3", "X3", "× 3"  → unitless count
  //   "5 ק"ג", "2.5 kg"   → with unit
  //   "5"                 → bare number, only treated as qty if there's text
  //                         before it (so "5" alone stays a name)
  const re =
    /(\s|^)(?:[xX×]\s*)?(\d+(?:[.,]\d+)?)\s*([א-תa-zA-Z"״'.]*)\s*$/u;
  const m = trimmed.match(re);
  if (!m) return { name: trimmed, quantity: null, unit: null };
  const head = trimmed.slice(0, m.index + m[1].length).trim();
  if (!head) return { name: trimmed, quantity: null, unit: null }; // bare number → keep as name
  const qty = parseFloat(m[2].replace(",", "."));
  const unitToken = m[3] || "";
  const unit = detectUnit(unitToken);
  // If a unit-like token was given but didn't match any known unit, leave as
  // part of the name (don't silently drop it).
  if (unitToken && !unit) return { name: trimmed, quantity: null, unit: null };
  return { name: head, quantity: qty, unit };
}

export function formatQty(quantity, unit) {
  if (!quantity || quantity <= 0) return "";
  const num = Number.isInteger(quantity) ? quantity : quantity.toFixed(2);
  if (!unit) {
    if (quantity === 1) return "";
    return `× ${num}`;
  }
  const def = UNITS.find((u) => u.id === unit);
  return `${num} ${def?.short || ""}`.trim();
}
