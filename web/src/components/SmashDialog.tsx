import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  regionName: string;
  busy?: boolean;
  onYes: () => void;
  onNope: () => void;
}

export default function SmashDialog({ open, regionName, busy, onYes, onNope }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        onNope();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onNope();
      }}
    >
      <div className="dialog__body">
        <span className="dialog__emoji" aria-hidden>💥</span>
        <h2>Did you smash here?</h2>
        <p className="dialog__region">{regionName}</p>
        <div className="dialog__actions">
          <button className="btn btn--ghost" onClick={onNope} disabled={busy}>
            Nop
          </button>
          <button className="btn btn--primary" onClick={onYes} disabled={busy} autoFocus>
            {busy ? "…" : "Yes"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
