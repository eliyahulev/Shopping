import Icon from "./Icon";

export default function EmojiPicker({
  value,
  onChange,
  suggested = [],
  ariaLabel = "בחירת אייקון",
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label={ariaLabel}
        className="w-full appearance-none bg-cream-50 border border-stone-200 rounded-xl pr-3 pl-8 h-11 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-xl text-center cursor-pointer"
      >
        <option value="">—</option>
        {suggested.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-stone-400">
        <Icon name="chevronDown" size={14} />
      </span>
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
