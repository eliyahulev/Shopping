import { useState } from "react";

export default function EmojiPicker({
  value,
  onChange,
  suggested = [],
  ariaLabel = "בחירת אייקון",
}) {
  const [custom, setCustom] = useState("");

  function applyCustom() {
    const v = custom.trim();
    if (v) {
      onChange(v);
      setCustom("");
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5"
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={!value}
        aria-label="ללא אייקון"
        className={`shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center text-stone-400 text-sm transition active:scale-95 ${
          !value
            ? "border-brand bg-brand-100 text-brand"
            : "border-stone-200 bg-white hover:border-brand"
        }`}
      >
        —
      </button>
      {suggested.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          aria-pressed={value === e}
          className={`shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl transition active:scale-95 ${
            value === e
              ? "border-brand bg-brand-100"
              : "border-stone-200 bg-white hover:border-brand"
          }`}
        >
          {e}
        </button>
      ))}
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onBlur={applyCustom}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            applyCustom();
            e.currentTarget.blur();
          }
        }}
        placeholder="✏️"
        maxLength={4}
        aria-label="הקלדת אייקון מותאם"
        className="shrink-0 w-10 h-10 rounded-xl border-2 border-dashed border-stone-300 bg-white text-center text-xl outline-none focus:border-brand"
      />
    </div>
  );
}

export const CATEGORY_EMOJIS = [
  "🥬", "🍎", "🥩", "🥛", "🥖", "🍝", "🥫", "🌶️",
  "🍪", "🥶", "🥣", "🥤", "🧴", "🧼", "👶", "🕯️",
  "📦", "🐾", "🛒", "💊",
];

export const ITEM_EMOJIS = [
  "🍅", "🥒", "🥕", "🌶️", "🧅", "🧄", "🥔", "🥑",
  "🍎", "🍌", "🍊", "🍇", "🍓", "🍉", "🥭",
  "🥩", "🍗", "🐟", "🦐",
  "🥛", "🧀", "🥚", "🧈",
  "🥖", "🥐", "🍞", "🥯",
  "🍝", "🍚", "🌾",
  "🍪", "🍫", "🍰", "🍦",
  "🥤", "☕", "🧃",
  "🧴", "🧼", "🧻", "🧂",
  "⭐", "❤️",
];
