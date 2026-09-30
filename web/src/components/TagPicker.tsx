import { useMemo, useRef, useState } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import type { Tag } from "../api";

export const TAG_MAX = 30;

interface Props {
  /** Names of the tags currently attached. */
  selected: string[];
  /** Every known tag, offered as suggestions. */
  all: Tag[];
  /** Read-only when false: just the chips. */
  editable: boolean;
  disabled?: boolean;
  onAdd?: (name: string) => void;
  onRemove?: (name: string) => void;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const clean = (s: string) => s.split(/\s+/).filter(Boolean).join(" ").slice(0, TAG_MAX);

/** Tag chips plus, when editable, an input to pick an existing tag or create a new one. */
export default function TagPicker({ selected, all, editable, disabled, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const taken = useMemo(() => new Set(selected.map(fold)), [selected]);
  const q = fold(query);
  const suggestions = useMemo(
    () => all.filter((t) => !taken.has(fold(t.name)) && fold(t.name).includes(q)).slice(0, 8),
    [all, taken, q],
  );
  const name = clean(query);
  const exists = all.some((t) => fold(t.name) === q) || taken.has(q);

  const add = (n: string) => {
    if (!n || taken.has(fold(n))) return;
    onAdd?.(n);
    setQuery("");
    input.current?.focus();
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  if (!editable && selected.length === 0) return null;

  return (
    <div className="tags">
      <ul className="tags__list">
        {selected.map((n) => (
          <li key={n} className="tag">
            <TagIcon size={12} strokeWidth={2.6} />
            {n}
            {editable && (
              <button type="button" className="tag__remove" onClick={() => onRemove?.(n)} disabled={disabled} title={`Retirer « ${n} »`}>
                <X size={12} strokeWidth={2.8} />
              </button>
            )}
          </li>
        ))}
        {editable && !open && (
          <li>
            <button type="button" className="tag tag--add" onClick={() => setOpen(true)} disabled={disabled}>
              <Plus size={12} strokeWidth={2.8} /> Tag
            </button>
          </li>
        )}
      </ul>

      {editable && open && (
        <div className="tags__editor">
          <div className="tags__field">
            <input
              ref={input}
              className="tags__input"
              value={query}
              maxLength={TAG_MAX}
              placeholder="Chercher ou créer un tag…"
              autoFocus
              disabled={disabled}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const match = all.find((t) => fold(t.name) === q);
                  add(match ? match.name : name);
                } else if (e.key === "Escape") {
                  // Keep the surrounding dialog open: only close the editor.
                  e.preventDefault();
                  e.stopPropagation();
                  close();
                }
              }}
            />
            <button type="button" className="tags__close" onClick={close} title="Fermer">
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>
          <div className="tags__suggestions">
            {name && !exists && (
              <button type="button" className="tag tag--new" onClick={() => add(name)} disabled={disabled}>
                <Plus size={12} strokeWidth={2.8} /> Créer « {name} »
              </button>
            )}
            {suggestions.map((t) => (
              <button key={t.id} type="button" className="tag tag--suggestion" onClick={() => add(t.name)} disabled={disabled}>
                <TagIcon size={12} strokeWidth={2.6} /> {t.name}
              </button>
            ))}
            {!name && suggestions.length === 0 && <span className="tags__empty">Aucun tag pour l'instant, créez le premier !</span>}
          </div>
        </div>
      )}
    </div>
  );
}
