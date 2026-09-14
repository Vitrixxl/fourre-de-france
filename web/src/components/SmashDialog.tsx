import { useEffect, useMemo, useRef } from "react";
import { Flame } from "lucide-react";
import Peach from "./Peach";
import type { SmashLevel } from "../api";
import PhotoTile from "./PhotoTile";

interface Props {
  open: boolean;
  level: SmashLevel;
  regionName: string;
  photo: File | null;
  busy?: boolean;
  onPhoto: (file: File | null) => void;
  onYes: () => void;
  onNope: () => void;
}

export default function SmashDialog({ open, level, regionName, photo, busy, onPhoto, onYes, onNope }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const butt = level === 2;

  return (
    <dialog
      ref={ref}
      className={`dialog ${butt ? "dialog--butt" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onNope();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onNope();
      }}
    >
      <div className="dialog__body">
        <span className="dialog__emoji" aria-hidden>
          {butt ? <Flame size={40} strokeWidth={2.5} /> : <Peach size={40} />}
        </span>
        <h2>{butt ? "Did you butt smash here?" : "Did you smash here?"}</h2>
        <p className="dialog__region">{regionName}</p>

        <div className="dialog__photo">
          <PhotoTile
            url={preview}
            editable
            label="Ajouter une photo (optionnel)"
            onPick={onPhoto}
            onClear={() => onPhoto(null)}
          />
        </div>

        <div className="dialog__actions">
          <button className="btn btn--ghost" onClick={onNope} disabled={busy}>
            Nop
          </button>
          <button className={`btn ${butt ? "btn--butt" : "btn--primary"}`} onClick={onYes} disabled={busy} autoFocus>
            {busy ? "…" : "Yes"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
