import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { CATEGORIES as DEFAULT_CATEGORIES, STARTER_ITEMS } from "../data/starterList";
import { UNITS, formatQty } from "../qty";
import Icon from "./Icon";
import CategoryManager from "./CategoryManager";

const UNCATEGORIZED = "_uncat";

// Anchor for "fresh" items — only items created after this animate in.
const APP_START = Date.now();

const FILTERS = [
  { id: "all", label: "הכל" },
  { id: "pending", label: "נותר" },
  { id: "done", label: "נלקחו" },
];

export default function ShoppingList({ user, listId }) {
  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [addCategory, setAddCategory] = useState("vegetables");
  const [error, setError] = useState("");
  const [synced, setSynced] = useState(false);
  const [filter, setFilter] = useState("all");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [importing, setImporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const categories = useMemo(
    () =>
      Array.isArray(list?.categories) && list.categories.length > 0
        ? list.categories
        : DEFAULT_CATEGORIES,
    [list?.categories],
  );
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const categoryOrder = useMemo(
    () => categories.map((c) => c.id),
    [categories],
  );

  useEffect(() => {
    if (!categoryById[addCategory] && categories[0]) {
      setAddCategory(categories[0].id);
    }
  }, [categoryById, addCategory, categories]);

  useEffect(() => {
    return onSnapshot(
      doc(db, "lists", listId),
      (snap) => {
        if (snap.exists()) setList({ id: snap.id, ...snap.data() });
      },
      (err) => setError(err.message),
    );
  }, [listId]);

  useEffect(() => {
    const q = query(
      collection(db, "lists", listId, "items"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setSynced(true);
      },
      (err) => {
        setError(err.message);
        setSynced(false);
      },
    );
  }, [listId]);

  async function addItem(name, category, quantity = null, unit = null) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await addDoc(collection(db, "lists", listId, "items"), {
        name: trimmed,
        category: category || null,
        quantity: quantity || null,
        unit: unit || null,
        checked: false,
        createdAt: serverTimestamp(),
        addedBy: user.uid,
        addedByName: user.displayName || "",
      });
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateItemFields(item, fields) {
    try {
      await updateDoc(doc(db, "lists", listId, "items", item.id), {
        name: fields.name?.trim() || item.name,
        category: fields.category ?? item.category ?? null,
        quantity: fields.quantity || null,
        unit: fields.unit || null,
      });
    } catch (e) {
      setError(e.message);
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setInputFocused(false);
    setAddOpen(true);
  }

  async function pickSuggestion(s) {
    setText("");
    setInputFocused(false);
    if (s.existing) {
      await toggleItem(s.existing);
    } else {
      if (s.category) setAddCategory(s.category);
      await addItem(s.name, s.category || addCategory);
    }
  }

  async function toggleItem(item) {
    try {
      await updateDoc(doc(db, "lists", listId, "items", item.id), {
        checked: !item.checked,
        checkedAt: !item.checked ? serverTimestamp() : null,
        checkedBy: !item.checked ? user.uid : null,
      });
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeItem(item) {
    try {
      await deleteDoc(doc(db, "lists", listId, "items", item.id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function clearChecked() {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    if (!confirm(`למחוק ${checked.length} פריטים מסומנים?`)) return;
    try {
      const snap = await getDocs(collection(db, "lists", listId, "items"));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        if (d.data().checked) batch.delete(d.ref);
      });
      await batch.commit();
    } catch (e) {
      setError(e.message);
    }
  }

  async function uncheckAll() {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    try {
      const batch = writeBatch(db);
      checked.forEach((it) => {
        batch.update(doc(db, "lists", listId, "items", it.id), {
          checked: false,
          checkedAt: null,
          checkedBy: null,
        });
      });
      await batch.commit();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveCategories(next) {
    try {
      await updateDoc(doc(db, "lists", listId), { categories: next });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  async function importStarter() {
    if (
      !confirm(
        `לייבא ${STARTER_ITEMS.length} פריטים בקטגוריות לתוך הרשימה הזאת?`,
      )
    )
      return;
    setImporting(true);
    setError("");
    try {
      const itemsCol = collection(db, "lists", listId, "items");
      const CHUNK = 400;
      for (let i = 0; i < STARTER_ITEMS.length; i += CHUNK) {
        const batch = writeBatch(db);
        for (const it of STARTER_ITEMS.slice(i, i + CHUNK)) {
          const ref = doc(itemsCol);
          batch.set(ref, {
            name: it.name,
            category: it.category || null,
            checked: false,
            createdAt: serverTimestamp(),
            addedBy: user.uid,
            addedByName: user.displayName || "",
          });
        }
        await batch.commit();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  function toggleCategory(catId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  const grouped = useMemo(() => {
    const byCat = {};
    for (const it of items) {
      const key = it.category || UNCATEGORIZED;
      (byCat[key] ||= []).push(it);
    }
    const orderedKeys = [
      ...categoryOrder.filter((k) => byCat[k]),
      ...Object.keys(byCat).filter(
        (k) => k !== UNCATEGORIZED && !categoryById[k],
      ),
      ...(byCat[UNCATEGORIZED] ? [UNCATEGORIZED] : []),
    ];
    return orderedKeys.map((k) => {
      const all = byCat[k];
      const visible = all.filter((it) => {
        if (filter === "pending") return !it.checked;
        if (filter === "done") return it.checked;
        return true;
      });
      const cat = categoryById[k];
      return {
        key: k,
        name: cat?.name || "📌 פריטים",
        all,
        visible,
        checkedCount: all.filter((i) => i.checked).length,
      };
    });
  }, [items, filter, categoryOrder, categoryById]);

  const total = items.length;
  const doneCount = items.filter((i) => i.checked).length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const isEmpty = items.length === 0;
  const memberCount = list?.members?.length || 1;
  // Build a unified candidate pool. Each candidate may carry an `existing`
  // reference if the same name is already on the user's list — tapping such
  // a suggestion toggles the item rather than creating a duplicate.
  const candidates = useMemo(() => {
    const onListByName = new Map();
    for (const it of items) {
      onListByName.set((it.name || "").trim(), it);
    }
    const out = [];
    const seen = new Set();
    // Starter catalog first
    for (const it of STARTER_ITEMS) {
      const key = it.name.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: it.name,
        category: it.category,
        existing: onListByName.get(key) || null,
      });
    }
    // Custom items the user added that aren't in the catalog
    for (const [key, it] of onListByName) {
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: it.name,
        category: it.category || null,
        existing: it,
      });
    }
    return out;
  }, [items]);

  const suggestions = useMemo(() => {
    const q = text.trim();
    if (q.length < 1) return [];
    const lower = q.toLowerCase();
    const startsWith = [];
    const includes = [];
    for (const c of candidates) {
      const n = c.name.toLowerCase();
      if (n.startsWith(lower)) startsWith.push(c);
      else if (n.includes(lower)) includes.push(c);
    }
    // Prioritise: not-yet-on-list (or unchecked) before checked ones.
    const score = (c) =>
      !c.existing ? 0 : c.existing.checked ? 2 : 1;
    return [...startsWith, ...includes]
      .sort((a, b) => score(a) - score(b))
      .slice(0, 8);
  }, [text, candidates]);

  const showSuggestions = inputFocused && suggestions.length > 0;

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky top stack: header + add row + filter chips */}
      <div className="sticky top-0 z-30 shadow-md">
      <header className="bg-brand text-white">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="bg-white/10 hover:bg-white/15 transition rounded-full p-2 -mr-1"
            aria-label="תפריט"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">רשימת קניות</h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[11px] text-white/70">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  synced ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>{synced ? "מסונכרן" : "מתחבר..."}</span>
              {memberCount > 1 && (
                <>
                  <span className="text-white/30">·</span>
                  <span>{memberCount} משתתפים</span>
                </>
              )}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-semibold">
                {user.displayName?.[0] || "?"}
              </div>
            )}
          </div>
        </div>

        {total > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[11px] text-white/70 mb-1">
              <span className="font-mono tabular-nums">{pct}%</span>
              <span>
                {doneCount} / {total} פריטים נלקחו
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Add row */}
      <div className="bg-cream-100 border-b border-cream-200">
        <form
          onSubmit={handleAdd}
          className="px-3 py-3 flex items-center gap-2 relative"
        >
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="הוסף"
            className="w-11 h-11 shrink-0 bg-brand-accent hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center active:scale-95 transition shadow-card"
          >
            <Icon name="plus" size={22} strokeWidth={2.5} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 150)}
            placeholder="הוסף מוצר חדש..."
            enterKeyHint="done"
            autoComplete="off"
            className="flex-1 min-w-0 bg-white border border-stone-200 rounded-xl px-4 h-11 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-base placeholder:text-stone-400 transition"
          />
          {showSuggestions && (
            <Suggestions
              items={suggestions}
              onPick={pickSuggestion}
              query={text.trim()}
              categoryById={categoryById}
            />
          )}
        </form>
      </div>

      {/* Filter chips */}
      {!isEmpty && (
        <div className="bg-cream-100 px-3 py-2 flex gap-2 border-b border-cream-200/60">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                filter === f.id
                  ? "bg-brand text-white shadow-card"
                  : "bg-white text-stone-600 hover:text-brand"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      </div>{/* /sticky stack */}

      {error && (
        <div className="m-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* List body */}
      <div className="px-3 py-3 flex-1 space-y-4">
        {isEmpty ? (
          <EmptyState
            importing={importing}
            onImport={importStarter}
            count={STARTER_ITEMS.length}
          />
        ) : (
          grouped.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            if (group.visible.length === 0 && filter !== "all") return null;
            const allChecked =
              group.checkedCount === group.all.length &&
              group.all.length > 0;
            return (
              <section key={group.key}>
                <button
                  onClick={() => toggleCategory(group.key)}
                  className="w-full flex items-center gap-3 px-1 py-1.5 group"
                >
                  <Icon
                    name="chevronDown"
                    size={16}
                    className={`text-stone-400 transition-transform shrink-0 ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                  <span className="flex-1 text-right font-semibold text-brand text-[15px] tracking-tight">
                    {group.name}
                  </span>
                  <span
                    className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                      allChecked
                        ? "bg-brand-100 text-brand"
                        : "bg-stone-200/60 text-stone-600"
                    }`}
                  >
                    {group.checkedCount}/{group.all.length}
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr] mt-2"
                  }`}
                >
                  <div className="overflow-hidden min-h-0">
                    <div
                      className={`bg-white rounded-2xl border border-stone-200/70 overflow-hidden shadow-card divide-y divide-stone-100 transition-opacity duration-200 ${
                        isCollapsed ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      {group.visible.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-3">
                          אין פריטים תואמים לסינון
                        </p>
                      ) : (
                        group.visible.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => toggleItem(item)}
                            onEdit={() => setEditingItem(item)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      {menuOpen && (
        <Menu
          user={user}
          doneCount={doneCount}
          onClose={() => setMenuOpen(false)}
          onShare={() => setShareOpen(true)}
          onManageCategories={() => setCategoriesOpen(true)}
          onUncheckAll={uncheckAll}
          onClearChecked={clearChecked}
          onSignOut={() => signOut(auth)}
        />
      )}

      {categoriesOpen && (
        <CategoryManager
          categories={categories}
          defaultCategories={DEFAULT_CATEGORIES}
          onSave={saveCategories}
          onClose={() => setCategoriesOpen(false)}
        />
      )}

      {shareOpen && (
        <ShareModal
          user={user}
          listId={listId}
          onClose={() => setShareOpen(false)}
        />
      )}

      {addOpen && (
        <ItemFormModal
          title="פריט חדש"
          primaryLabel="הוסף לרשימה"
          categories={categories}
          initial={{
            name: text,
            category: addCategory,
            quantity: null,
            unit: null,
          }}
          onSave={async (fields) => {
            await addItem(
              fields.name,
              fields.category,
              fields.quantity,
              fields.unit,
            );
            if (fields.category) setAddCategory(fields.category);
            setText("");
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editingItem && (
        <ItemFormModal
          title="עריכת פריט"
          primaryLabel="שמירה"
          categories={categories}
          initial={editingItem}
          onSave={async (fields) => {
            await updateItemFields(editingItem, fields);
            setEditingItem(null);
          }}
          onDelete={async () => {
            await removeItem(editingItem);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

function ItemRow({ item, onToggle, onEdit }) {
  const [popKey, setPopKey] = useState(0);
  const prevChecked = useRef(item.checked);
  const longPressTimer = useRef(null);
  const longPressed = useRef(false);

  // Trigger a check-pop whenever the item flips to checked.
  useEffect(() => {
    if (prevChecked.current !== item.checked && item.checked) {
      setPopKey((k) => k + 1);
    }
    prevChecked.current = item.checked;
  }, [item.checked]);

  const isFresh =
    item.createdAt?.toMillis && item.createdAt.toMillis() > APP_START;

  function handleNameClick() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onToggle();
  }

  function startLongPress() {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onEdit?.();
    }, 450);
  }
  function cancelLongPress() {
    clearTimeout(longPressTimer.current);
  }

  const qtyText = formatQty(item.quantity, item.unit);

  return (
    <div
      style={{
        animation: isFresh ? "itemIn 0.22s ease-out" : undefined,
      }}
      className={`relative flex items-center gap-2 px-3 py-3 transition-colors duration-300 overflow-hidden ${
        item.checked ? "bg-stone-50/60" : "bg-white"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        aria-label="עריכה"
        className="text-stone-300 hover:text-brand active:scale-90 transition shrink-0 p-1.5 -m-1.5"
      >
        <Icon name="pencil" size={15} />
      </button>
      <button
        onClick={handleNameClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onEdit?.();
        }}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        className={`flex-1 text-right text-[15px] px-1 py-1 -my-1 transition-all duration-300 select-none ${
          item.checked
            ? "line-through text-stone-400 decoration-2"
            : "text-stone-800"
        }`}
      >
        {item.name}
      </button>
      {qtyText && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className={`shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 transition active:scale-95 ${
            item.checked
              ? "bg-stone-100 text-stone-400"
              : "bg-brand-100 text-brand"
          }`}
        >
          {qtyText}
        </button>
      )}
      <span className="relative shrink-0">
        {/* burst ring on check */}
        {popKey > 0 && (
          <span
            key={`burst-${popKey}`}
            className="absolute inset-0 rounded-md border-2 border-brand-accent pointer-events-none"
            style={{ animation: "burst 0.45s ease-out forwards" }}
          />
        )}
        <button
          key={`check-${popKey}`}
          onClick={onToggle}
          aria-label={item.checked ? "ביטול סימון" : "סימון כנקנה"}
          style={{
            animation:
              popKey > 0 ? "checkPop 0.28s ease-out" : undefined,
          }}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors duration-200 active:scale-90 ${
            item.checked
              ? "bg-brand-accent border-brand-accent text-white"
              : "border-stone-300 bg-white hover:border-brand-accent"
          }`}
        >
          {item.checked && (
            <span style={{ animation: "spinIn 0.25s ease-out" }}>
              <Icon name="check" size={14} strokeWidth={3} />
            </span>
          )}
        </button>
      </span>
    </div>
  );
}

function EmptyState({ importing, onImport, count }) {
  return (
    <div
      className="text-center py-12 px-4"
      style={{ animation: "fadeIn 0.4s ease-out" }}
    >
      <div
        className="w-16 h-16 rounded-2xl bg-brand-100 text-brand text-3xl flex items-center justify-center mx-auto mb-4"
        style={{ animation: "bob 2.6s ease-in-out infinite" }}
      >
        🛒
      </div>
      <h2 className="text-lg font-bold text-stone-800 mb-1.5">
        הרשימה ריקה
      </h2>
      <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto mb-6">
        הוסיפו פריט בשורה למעלה, או טענו רשימה מוכנה מקובצת לקטגוריות.
      </p>
      <button
        onClick={onImport}
        disabled={importing}
        className="bg-brand hover:bg-brand-light text-white rounded-xl px-5 py-3 text-sm font-semibold shadow-card active:scale-[0.97] disabled:opacity-50 transition"
      >
        {importing ? "מייבא..." : `ייבוא רשימה מוכנה (${count})`}
      </button>
    </div>
  );
}

function Menu({
  user,
  doneCount,
  onClose,
  onShare,
  onManageCategories,
  onUncheckAll,
  onClearChecked,
  onSignOut,
}) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.15s_ease-out]" />
      <div
        className="absolute top-0 inset-x-0 bg-white shadow-pop max-w-md mx-auto rounded-b-3xl overflow-hidden"
        style={{ animation: "menuDrop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4 bg-brand text-white flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/15 overflow-hidden">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1 text-right min-w-0">
            <div className="font-semibold truncate">{user.displayName}</div>
            <div className="text-xs text-white/70 truncate">{user.email}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="text-white/80 hover:text-white p-1"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="py-1">
          <MenuItem
            icon="mail"
            label="שיתוף הרשימה במייל"
            onClick={() => {
              onClose();
              onShare();
            }}
          />
          <MenuItem
            icon="folder"
            label="ניהול קטגוריות"
            onClick={() => {
              onClose();
              onManageCategories();
            }}
          />
          <MenuItem
            icon="refresh"
            label={`איפוס סימונים (${doneCount})`}
            disabled={doneCount === 0}
            onClick={() => {
              onClose();
              onUncheckAll();
            }}
          />
          <MenuItem
            icon="trash"
            label={`מחק פריטים שנלקחו (${doneCount})`}
            disabled={doneCount === 0}
            destructive
            onClick={() => {
              onClose();
              onClearChecked();
            }}
          />
          <div className="h-px bg-stone-100 my-1" />
          <MenuItem
            icon="signOut"
            label="יציאה"
            onClick={() => {
              onClose();
              onSignOut();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, disabled, destructive }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-right text-[15px] transition ${
        disabled
          ? "text-stone-300 cursor-not-allowed"
          : destructive
            ? "text-red-600 hover:bg-red-50"
            : "text-stone-700 hover:bg-stone-50"
      }`}
    >
      <Icon name={icon} size={18} />
      <span className="flex-1 text-right">{label}</span>
    </button>
  );
}

function ShareModal({ user, listId, onClose }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target || !/^[^@]+@[^@]+\.[^@]+$/.test(target)) {
      setErr("אנא הזינו כתובת מייל תקינה");
      return;
    }
    if (target === (user.email || "").toLowerCase()) {
      setErr("זו הכתובת שלך");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await setDoc(doc(db, "invites", target), {
        listId,
        fromUid: user.uid,
        fromEmail: user.email || "",
        fromName: user.displayName || "",
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.15s_ease-out]" />
      <div
        className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-pop"
        style={{ animation: "slideUp 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="text-stone-400 hover:text-stone-600 p-1 -m-1"
          >
            <Icon name="close" size={20} />
          </button>
          <div className="text-right">
            <h2 className="text-lg font-bold text-stone-800">
              שיתוף הרשימה
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              גישה מלאה — להוסיף, לסמן ולמחוק
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-5 text-right">
            <div className="rounded-xl bg-brand-100 text-brand p-4 text-sm leading-relaxed">
              ההזמנה נשלחה ל-<strong>{email}</strong>. בכניסה הבאה לאפליקציה
              הם יראו באנר ויוכלו להצטרף לרשימה.
            </div>
            <button
              onClick={onClose}
              className="bg-brand hover:bg-brand-light text-white rounded-xl px-4 py-3 w-full font-semibold mt-4 transition"
            >
              סגירה
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3 text-right">
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoFocus
              className="w-full bg-cream-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-base placeholder:text-stone-400 transition"
            />
            {err && <p className="text-red-600 text-xs">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-stone-200 text-stone-700 rounded-xl py-3 font-medium hover:bg-stone-50 transition"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="flex-1 bg-brand hover:bg-brand-light text-white rounded-xl py-3 font-semibold disabled:opacity-50 transition"
              >
                {busy ? "שולח..." : "שליחת הזמנה"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Suggestions({ items, onPick, query, categoryById }) {
  const lower = query.toLowerCase();
  return (
    <div
      className="absolute top-full inset-x-3 mt-1 z-30 bg-white rounded-2xl shadow-pop border border-stone-200/70 overflow-hidden divide-y divide-stone-100 max-h-[60vh] overflow-y-auto"
      style={{ animation: "menuDrop 0.18s ease-out both" }}
    >
      {items.map((s, i) => {
        const cat = categoryById[s.category];
        const emoji = cat ? cat.name.split(" ")[0] : "📌";
        const onList = !!s.existing;
        const isChecked = onList && s.existing.checked;
        return (
          <button
            key={`${s.name}-${i}`}
            type="button"
            // onMouseDown fires before input blur, so the tap registers
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(s);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition active:bg-stone-100 ${
              isChecked ? "bg-stone-50/70" : "bg-white hover:bg-stone-50"
            }`}
          >
            <span className="text-xl leading-none shrink-0">{emoji}</span>
            <span
              className={`flex-1 text-right text-[15px] ${
                isChecked
                  ? "line-through text-stone-400"
                  : "text-stone-800"
              }`}
            >
              {highlight(s.name, lower)}
            </span>
            {onList ? (
              <span
                className={`text-[11px] shrink-0 px-2 py-0.5 rounded-full ${
                  isChecked
                    ? "bg-stone-100 text-stone-500"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isChecked ? "סומן" : "ברשימה"}
              </span>
            ) : (
              <span className="text-[11px] shrink-0 px-2 py-0.5 rounded-full bg-brand-100 text-brand font-semibold">
                + הוסף
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="text-[11px] font-semibold text-stone-500 mb-1.5 text-right">
      {children}
    </div>
  );
}

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-100 text-brand rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function QtyControls({ qty, unit, setQty, setUnit, step }) {
  return (
    <>
      <div className="px-5 pt-1 flex justify-center">
        <div className="inline-flex items-stretch bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-card">
          <button
            type="button"
            onClick={() => step(-1)}
            className="w-11 h-11 flex items-center justify-center text-xl text-stone-600 hover:bg-stone-50 active:bg-stone-100 transition"
            aria-label="הפחת 1"
          >
            −
          </button>
          <input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-16 h-11 text-lg font-semibold text-center bg-transparent border-x border-stone-200 outline-none focus:bg-cream-50"
            min="0"
            step="any"
          />
          <button
            type="button"
            onClick={() => step(1)}
            className="w-11 h-11 flex items-center justify-center text-xl text-stone-600 hover:bg-stone-50 active:bg-stone-100 transition"
            aria-label="הוסף 1"
          >
            +
          </button>
        </div>
      </div>
      <div className="px-5 pt-4">
        <div className="text-[11px] font-semibold text-stone-500 mb-1.5 text-right">
          יחידת מידה
        </div>
        <div className="flex flex-wrap gap-1.5">
          {UNITS.map((u) => (
            <button
              key={u.id || "_count"}
              type="button"
              onClick={() => setUnit(u.id)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition active:scale-95 ${
                unit === u.id
                  ? "bg-brand text-white"
                  : "bg-white border border-stone-200 text-stone-700 hover:border-brand"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ItemFormModal({
  title = "עריכת פריט",
  primaryLabel = "שמירה",
  categories = DEFAULT_CATEGORIES,
  initial = {},
  onSave,
  onDelete,
  onClose,
}) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || null);
  const [qty, setQty] = useState(initial.quantity || 1);
  const [unit, setUnit] = useState(initial.unit || null);

  function step(delta) {
    setQty((q) => Math.max(0, Math.round((Number(q) || 0) + delta)));
  }

  function handleSave() {
    if (!name.trim()) return;
    const numQty = Number(qty) || 0;
    // Hide unitless qty of 1 (it's the default, not worth displaying)
    const finalQty = numQty > 0 && (numQty !== 1 || unit) ? numQty : null;
    onSave({
      name,
      category,
      quantity: finalQty,
      unit: unit || null,
    });
  }

  function handleConfirmDelete() {
    if (confirm(`למחוק את "${initial.name}"?`)) onDelete?.();
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
        <div className="px-5 pt-3 pb-2 flex items-center justify-between sticky top-0 bg-white">
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <Icon name="close" size={20} />
          </button>
          <h2 className="font-bold text-stone-800">{title}</h2>
        </div>

        {/* Name */}
        <div className="px-5 pt-2">
          <Label>שם הפריט</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-cream-50 border border-stone-200 rounded-xl px-3 h-11 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-base"
          />
        </div>

        {/* Category */}
        <div className="px-5 pt-4">
          <Label>קטגוריה</Label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition active:scale-95 ${
                  category === c.id
                    ? "bg-brand text-white"
                    : "bg-white border border-stone-200 text-stone-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="pt-4">
          <div className="px-5">
            <Label>כמות</Label>
          </div>
          <QtyControls
            qty={qty}
            unit={unit}
            setQty={setQty}
            setUnit={setUnit}
            step={step}
          />
        </div>

        {/* Actions */}
        <div className="px-5 pt-6 space-y-2">
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
              disabled={!name.trim()}
              className="flex-1 bg-brand hover:bg-brand-light disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition"
            >
              {primaryLabel}
            </button>
          </div>
          {onDelete && (
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-medium transition"
          >
            <Icon name="trash" size={16} />
            מחיקת הפריט
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
