import { useRef } from "react";
import { Camera, ImageOff, Plus, X } from "lucide-react";
import type { Team } from "../api";
import TeamAvatar from "./TeamAvatar";

export const PHOTO_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

interface Props {
  /** Team the tile belongs to (shown as a small avatar); optional for the dialog picker. */
  team?: Team;
  url: string | null;
  /** Whether the current user may add / replace / remove the photo. */
  editable: boolean;
  /** Upload in flight: dims the tile. */
  pending?: boolean;
  label?: string;
  onPick?: (file: File) => void;
  onClear?: () => void;
  onOpen?: () => void;
}

/** A square photo slot: the photo itself, a "+" to import one, or an empty placeholder. */
export default function PhotoTile({ team, url, editable, pending, label, onPick, onClear, onOpen }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const style = team ? { ["--team" as string]: team.color } : undefined;
  const canPick = editable && !!onPick;

  // The file input lives next to the clickable element, never inside it: an <input>
  // nested in a <button> swallows the change event in some browsers.
  const picker = canPick && (
    <input
      ref={input}
      type="file"
      accept={PHOTO_ACCEPT}
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
        e.target.value = "";
      }}
    />
  );

  let body;
  if (url) {
    body = (
      <>
        <button type="button" className="photo-tile__img" onClick={onOpen} title="Voir en grand" disabled={!onOpen}>
          <img src={url} alt={label ?? "Photo"} />
        </button>
        {canPick && (
          <button type="button" className="photo-tile__action" onClick={() => input.current?.click()} title="Remplacer la photo">
            <Camera size={15} strokeWidth={2.4} />
          </button>
        )}
        {editable && onClear && (
          <button type="button" className="photo-tile__action photo-tile__action--clear" onClick={onClear} title="Retirer la photo">
            <X size={15} strokeWidth={2.4} />
          </button>
        )}
      </>
    );
  } else if (canPick) {
    body = (
      <button type="button" className="photo-tile__add" onClick={() => input.current?.click()}>
        <span className="photo-tile__plus">
          <Plus size={26} strokeWidth={2.6} />
        </span>
        <span className="photo-tile__label">{label ?? "Ajouter une photo"}</span>
      </button>
    );
  } else {
    body = (
      <div className="photo-tile__empty">
        <ImageOff size={22} strokeWidth={2} />
        <span className="photo-tile__label">{label ?? "Pas de photo"}</span>
      </div>
    );
  }

  const kind = url ? "photo-tile--photo" : canPick ? "photo-tile--add" : "photo-tile--empty";
  return (
    <div className={`photo-tile ${kind} ${pending ? "photo-tile--pending" : ""}`} style={style}>
      {body}
      {team && <TeamAvatar team={team} size={26} className="photo-tile__avatar" />}
      {picker}
    </div>
  );
}
