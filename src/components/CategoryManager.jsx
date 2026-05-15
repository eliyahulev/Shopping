import { useState } from "react";
import Icon from "./Icon";
import EmojiPicker, { CATEGORY_EMOJIS } from "./EmojiPicker";

export default function CategoryManager({
  categories,
  defaultCategories,
  onSave,
  onClose,
}) {
  const [items, setItems] = useState(categories);
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [draftIcon, setDraftIcon] = useState(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const dirty = JSON.stringify(items) !== JSON.stringify(categories);

  function startEdit(c) {
    setEditingId(c.id);
    setDraftName(c.name);
    setDraftIcon(c.icon || null);
  }
  function cancelEdit() {
    setEditingId(null);
    setDraftName("");
    setDraftIcon(null);
  }
  function commitEdit() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    setItems((it) =>
      it.map((c) =>
        c.id === editingId
          ? { ...c, name: trimmed, icon: draftIcon || null }
          : c,
      ),
    );
    cancelEdit();
  }
  function remove(c) {
    if (
      !confirm(
        `למחוק את הקטגוריה "${c.name}"? פריטים שמשתייכים אליה יישארו ברשימה אך ללא קטגוריה.`,
      )
    )
      return;
    setItems((it) => it.filter((x) => x.id !== c.id));
  }
  function move(idx, delta) {
    setItems((it) => {
      const j = idx + delta;
      if (j < 0 || j >= it.length) return it;
      const next = [...it];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function addNew(e) {
    e?.preventDefault?.();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (items.some((c) => c.name === trimmed)) {
      setErr("קטגוריה בשם הזה כבר קיימת");
      return;
    }
    const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    setItems((it) => [...it, { id, name: trimmed, icon: newIcon || null }]);
    setNewName("");
    setNewIcon(null);
    setErr("");
  }
  function resetDefaults() {
    if (!confirm("לאפס לקטגוריות ברירת המחדל?")) return;
    setItems(defaultCategories);
  }
  async function handleSave() {
    setBusy(true);
    setErr("");
    try {
      await onSave(items);
      onClose();
    } catch (e) {
      setErr(e?.message || "שגיאה בשמירה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/40"
        style={{ animation: "fadeIn 0.15s ease-out" }}
      />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-md flex flex-col shadow-pop pb-6 max-h-[92vh] overflow-y-auto"
        style={{ animation: "sheetUp 0.32s cubic-bezier(0.2,0.8,0.2,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3 pb-3 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-stone-100">
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <Icon name="close" size={20} />
          </button>
          <h2 className="font-bold text-stone-800">ניהול קטגוריות</h2>
        </div>

        <form
          onSubmit={addNew}
          className="px-5 pt-4 flex items-center gap-2"
        >
          <button
            type="submit"
            disabled={!newName.trim()}
            aria-label="הוספת קטגוריה"
            className="w-11 h-11 shrink-0 bg-brand-accent hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center active:scale-95 transition shadow-card"
          >
            <Icon name="plus" size={22} strokeWidth={2.5} />
          </button>
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (err) setErr("");
            }}
            placeholder="קטגוריה חדשה"
            className="flex-1 min-w-0 bg-cream-50 border border-stone-200 rounded-xl px-3 h-11 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-base placeholder:text-stone-400 transition text-right"
          />
          <EmojiPicker
            value={newIcon}
            onChange={setNewIcon}
            suggested={CATEGORY_EMOJIS}
            ariaLabel="בחירת אייקון לקטגוריה חדשה"
            className="w-20 shrink-0"
          />
        </form>

        {err && (
          <p className="px-5 pt-2 text-red-600 text-xs text-right">{err}</p>
        )}

        <div className="px-5 pt-4 pb-2">
          <div className="text-[11px] font-semibold text-stone-500 mb-1.5 text-right">
            {items.length} קטגוריות
          </div>
          <div className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden shadow-card divide-y divide-stone-100">
            {items.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-5">
                אין קטגוריות. הוסיפו אחת בשורה למעלה.
              </p>
            ) : (
              items.map((c, idx) => {
                const editing = editingId === c.id;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-1 px-3 py-2.5 bg-white"
                  >
                    <button
                      onClick={() => remove(c)}
                      aria-label="מחיקת קטגוריה"
                      className="text-stone-300 hover:text-red-600 active:scale-90 transition shrink-0 p-1.5"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                    <div className="flex flex-col shrink-0">
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        aria-label="הזזה למעלה"
                        className="text-stone-300 hover:text-brand disabled:opacity-30 disabled:hover:text-stone-300 active:scale-90 transition leading-none"
                      >
                        <Icon name="chevronDown" size={14} className="rotate-180" />
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        aria-label="הזזה למטה"
                        className="text-stone-300 hover:text-brand disabled:opacity-30 disabled:hover:text-stone-300 active:scale-90 transition leading-none"
                      >
                        <Icon name="chevronDown" size={14} />
                      </button>
                    </div>
                    {editing ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit();
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 min-w-0 bg-cream-50 border border-brand rounded-lg px-2 h-9 outline-none focus:ring-2 focus:ring-brand/20 text-[15px] text-right"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(c)}
                        className="flex-1 text-right text-[15px] text-stone-800 px-2 py-1 truncate"
                      >
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                      </button>
                    )}
                    {editing ? (
                      <>
                        <EmojiPicker
                          value={draftIcon}
                          onChange={setDraftIcon}
                          suggested={CATEGORY_EMOJIS}
                          ariaLabel="בחירת אייקון לקטגוריה"
                          className="w-20 shrink-0"
                        />
                        <button
                          onClick={commitEdit}
                          aria-label="אישור עריכה"
                          className="text-emerald-600 hover:text-emerald-700 active:scale-90 transition shrink-0 p-1.5"
                        >
                          <Icon name="check" size={18} strokeWidth={2.5} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(c)}
                        aria-label="עריכת קטגוריה"
                        className="text-stone-300 hover:text-brand active:scale-90 transition shrink-0 p-1.5"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {defaultCategories && (
          <div className="px-5 pt-1">
            <button
              type="button"
              onClick={resetDefaults}
              className="text-xs text-stone-500 hover:text-brand underline-offset-2 hover:underline transition"
            >
              איפוס לקטגוריות ברירת מחדל
            </button>
          </div>
        )}

        <div className="px-5 pt-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-stone-200 text-stone-700 rounded-xl py-3 font-medium hover:bg-stone-50 transition"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !dirty}
              className="flex-1 bg-brand hover:bg-brand-light disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition"
            >
              {busy ? "שומר..." : "שמירה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
