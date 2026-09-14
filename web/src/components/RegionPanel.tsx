import { Flame, X } from "lucide-react";
import Peach from "./Peach";
import type { Region, Team } from "../api";
import type { LightboxPhoto } from "./PhotoLightbox";
import PhotoTile from "./PhotoTile";
import TeamAvatar from "./TeamAvatar";

interface Props {
  region: Region;
  team: Team;
  teams: Map<number, Team>;
  busy?: boolean;
  onSmash: () => void;
  onButtSmash: () => void;
  onDowngrade: () => void;
  onUnsmash: () => void;
  onUploadPhoto: (file: File) => void;
  onOpenPhoto: (photo: LightboxPhoto) => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function RegionPanel({ region, team, teams, busy, onSmash, onButtSmash, onDowngrade, onUnsmash, onUploadPhoto, onOpenPhoto, onClose }: Props) {
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
        <>
          <ul className="panel__smashes">
            {region.smashes.map((s) => {
              const t = teams.get(s.team_id);
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
                    {butt ? <Flame size={14} strokeWidth={2.5} /> : <Peach size={14} />}
                    {butt ? "2 pts" : "1 pt"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="panel__photos">
            {region.smashes.map((s) => {
              const t = teams.get(s.team_id);
              if (!t) return null;
              const own = t.id === team.id;
              return (
                <PhotoTile
                  key={s.team_id}
                  team={t}
                  url={s.photo_url}
                  editable={own && !busy}
                  label={own ? "Ajouter notre photo" : "Pas encore de photo"}
                  onPick={own ? onUploadPhoto : undefined}
                  onOpen={s.photo_url ? () => onOpenPhoto({ url: s.photo_url!, team: t, caption: region.name }) : undefined}
                />
              );
            })}
          </div>
        </>
      )}

      <div className="panel__actions">
        {!mine && (
          <button className="btn btn--smash" onClick={onSmash} disabled={busy}>
            Smashed <Peach size={20} />
          </button>
        )}
        {mine?.level === 1 && (
          <>
            <button className="btn btn--butt" onClick={onButtSmash} disabled={busy}>
              <span className="btn--butt__shine" aria-hidden />
              <Flame size={20} strokeWidth={2.5} /> Butt smashed
            </button>
            <button className="btn btn--ghost btn--small" onClick={onUnsmash} disabled={busy}>
              Oups, annuler
            </button>
          </>
        )}
        {mine?.level === 2 && (
          <>
            <span className="panel__done">
              <Flame size={18} strokeWidth={2.5} /> Butt smashée, bravo !
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
