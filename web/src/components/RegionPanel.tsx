import type { Region, Team } from "../api";
import { MapPinned, X, Zap } from "lucide-react";
import TeamAvatar from "./TeamAvatar";

interface Props {
  region: Region;
  team: Team;
  smasher?: Team;
  busy?: boolean;
  onSmash: () => void;
  onUnsmash: () => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function RegionPanel({ region, team, smasher, busy, onSmash, onUnsmash, onClose }: Props) {
  const mine = smasher?.id === team.id;
  return (
    <section className="panel" aria-live="polite">
      <button className="panel__close" onClick={onClose} aria-label="Fermer">
        <X size={22} />
      </button>
      <div className="panel__head">
        {smasher ? <TeamAvatar team={smasher} size={56} /> : <span className="panel__placeholder"><MapPinned size={30} strokeWidth={2} /></span>}
        <div>
          <h2 className="panel__title">{region.name}</h2>
          <p className="panel__status">
            {smasher
              ? `Smashée par ${smasher.name}${region.smashed_at ? ` · ${formatDate(region.smashed_at)}` : ""}`
              : "Pas encore smashée… à vous de jouer !"}
          </p>
        </div>
      </div>
      <div className="panel__actions">
        {mine ? (
          <button className="btn btn--ghost" onClick={onUnsmash} disabled={busy}>
            Oups, annuler
          </button>
        ) : (
          <button className="btn btn--smash" onClick={onSmash} disabled={busy}>
            Smashed <Zap size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  );
}
