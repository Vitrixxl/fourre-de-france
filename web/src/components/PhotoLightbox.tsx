import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Team } from "../api";
import TeamAvatar from "./TeamAvatar";

export interface LightboxPhoto {
  url: string;
  team: Team;
  caption: string;
}

interface Props {
  photo: LightboxPhoto | null;
  onClose: () => void;
}

export default function PhotoLightbox({ photo, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = photo !== null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {photo && (
        <figure className="lightbox__body" style={{ ["--team" as string]: photo.team.color }}>
          <button className="lightbox__close" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>
          <img src={photo.url} alt={photo.caption} />
          <figcaption>
            <TeamAvatar team={photo.team} size={36} />
            <span>
              <strong>{photo.team.members.join(" & ")}</strong>
              <span>{photo.caption}</span>
            </span>
          </figcaption>
        </figure>
      )}
    </dialog>
  );
}
