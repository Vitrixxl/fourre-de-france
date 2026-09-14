import { useRef } from "react";
import { Camera, ImageOff, Plus, X } from "lucide-react";
import type { Team } from "../api";
import TeamAvatar from "./TeamAvatar";

export const PHOTO_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

interface Props {
  /** Team the tile belongs to (shown as a small avatar); optional for the dialog picker. */
  team?: Team;
  url: string | null;
  /** Whether the current user may add / replace the photo. */
  editable: boolean;
  label?: string;
  onPick?: (file: File) => void;
  onClear?: () => void;
  onOpen?: () => void;
}

/** A square photo slot: the photo itself, a "+" to import one, or an empty placeholder. */
export default function PhotoTile({ team, url, editable, label, onPick, onClear, onOpen }: Props) {
  const input = useRef<HTMLInputElement>(null);

  const picker = editable && onPick && (
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

  if (url) {
    return (
      <div className="photo-tile photo-tile--photo" style={team ? { ["--team" as string]: team.color } : undefined}>
        <button className="photo-tile__img" onClick={onOpen} title="Voir en grand">
          <img src={url} alt={label ?? "Photo"} />
        </button>
        {team && <TeamAvatar team={team} size={26} className="photo-tile__avatar" />}
        {editable && onPick && (
          <button className="photo-tile__action" onClick={() => input.current?.click()} title="Remplacer la photo">
            <Camera size={15} strokeWidth={2.4} />
          </button>
        )}
        {editable && onClear && (
          <button className="photo-tile__action photo-tile__action--clear" onClick={onClear} title="Retirer">
            <X size={15} strokeWidth={2.4} />
          </button>
        )}
        {picker}
      </div>
    );
  }

  if (editable && onPick) {
    return (
      <button className="photo-tile photo-tile--add" style={team ? { ["--team" as string]: team.color } : undefined} onClick={() => input.current?.click()}>
        <span className="photo-tile__plus">
          <Plus size={26} strokeWidth={2.6} />
        </span>
        <span className="photo-tile__label">{label ?? "Ajouter une photo"}</span>
        {team && <TeamAvatar team={team} size={26} className="photo-tile__avatar" />}
        {picker}
      </button>
    );
  }

  return (
    <div className="photo-tile photo-tile--empty" style={team ? { ["--team" as string]: team.color } : undefined}>
      <ImageOff size={22} strokeWidth={2} />
      <span className="photo-tile__label">{label ?? "Pas de photo"}</span>
      {team && <TeamAvatar team={team} size={26} className="photo-tile__avatar" />}
    </div>
  );
}
