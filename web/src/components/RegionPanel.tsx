import { Flame, X } from "lucide-react";
import type { Region, Team } from "../api";
import type { LightboxPhoto } from "./PhotoLightbox";
import Peach from "./Peach";
import PhotoTile from "./PhotoTile";
import TeamAvatar from "./TeamAvatar";

export interface PhotoPreview {
  code: string;
  teamId: number;
  url: string;
}

interface Props {
  region: Region;
  team: Team;
  teams: Team[];
  preview: PhotoPreview | null;
  busy?: boolean;
  onSmash: () => void;
  onButtSmash: () => void;
  onDowngrade: () => void;
  onUnsmash: () => void;
  onUploadPhoto: (file: File) => void;
  onDeletePhoto: () => void;
  onOpenPhoto: (photo: LightboxPhoto) => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function RegionPanel({ region, team, teams, preview, busy, onSmash, onButtSmash, onDowngrade, onUnsmash, onUploadPhoto, onDeletePhoto, onOpenPhoto, onClose }: Props) {
  const mine = region.smashes.find((s) => s.team_id === team.id);

  return (
    <section className="panel" aria-live="polite">
      <button className="panel__close" onClick={onClose} aria-label="Fermer">
        <X size={22} />
      </button>

      <h2 className="panel__title">{region.name}</h2>

      {region.smashes.length === 0 ? (
        <p className="panel__status">Pas encore smashée… à vous de jouer !</p>
      ) : (
        <ul className="panel__smashes">
          {region.smashes.map((s) => {
            const t = teams.find((x) => x.id === s.team_id);
            if (!t) return null;
            const butt = s.level === 2;
            return (
              <li key={s.team_id} className={`smash-row ${butt ? "smash-row--butt" : ""}`} style={{ ["--team" as string]: t.color }}>
                <TeamAvatar team={t} size={40} />
                <span className="smash-row__text">
                  <strong>{t.members.join(" & ")}</strong>
                  <span>
                    {butt ? "Butt smashée" : "Smashée"} · {formatDate(s.smashed_at)}
                  </span>
                </span>
                <span className={`smash-row__badge ${butt ? "smash-row__badge--butt" : ""}`} title={butt ? "Butt smashed · 2 pts" : "Smashed · 1 pt"}>
                  {butt ? <Peach size={14} /> : <Flame size={14} strokeWidth={2.5} />}
                  {butt ? "2 pts" : "1 pt"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Always two slots, one per team, so the layout never jumps. */}
      <div className="panel__photos">
        {teams.map((t) => {
          const smash = region.smashes.find((s) => s.team_id === t.id);
          const own = t.id === team.id;
          const pending = preview && preview.code === region.code && preview.teamId === t.id ? preview.url : null;
          const url = pending ?? smash?.photo_url ?? null;
          const editable = own && !!smash && !busy;
          return (
            <PhotoTile
              key={t.id}
              team={t}
              url={url}
              editable={editable}
              pending={!!pending}
              label={!smash ? (own ? "Smashez d'abord la région" : "Pas encore smashée") : own ? "Ajouter notre photo" : "Pas encore de photo"}
              onPick={editable ? onUploadPhoto : undefined}
              onClear={editable && smash?.photo_url ? onDeletePhoto : undefined}
              onOpen={url ? () => onOpenPhoto({ url, team: t, caption: region.name }) : undefined}
            />
          );
        })}
      </div>

      <div className="panel__actions">
        {!mine && (
          <>
            <button className="btn btn--smash" onClick={onSmash} disabled={busy}>
              Smashed <Flame size={20} strokeWidth={2.5} />
            </button>
            <button className="btn btn--butt" onClick={onButtSmash} disabled={busy}>
              <span className="btn--butt__shine" aria-hidden />
              Butt smashed <Peach size={22} />
            </button>
          </>
        )}
        {mine?.level === 1 && (
          <>
            <button className="btn btn--butt" onClick={onButtSmash} disabled={busy}>
              <span className="btn--butt__shine" aria-hidden />
              Butt smashed <Peach size={22} />
            </button>
            <button className="btn btn--ghost btn--small" onClick={onUnsmash} disabled={busy}>
              Oups, annuler
            </button>
          </>
        )}
        {mine?.level === 2 && (
          <>
            <span className="panel__done">
              <Peach size={20} /> Butt smashée, bravo !
            </span>
            <button className="btn btn--ghost btn--small" onClick={onDowngrade} disabled={busy}>
              Juste smashée
            </button>
            <button className="btn btn--ghost btn--small" onClick={onUnsmash} disabled={busy}>
              Annuler
            </button>
          </>
        )}
      </div>
    </section>
  );
}
