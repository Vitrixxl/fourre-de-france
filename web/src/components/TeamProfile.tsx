import { useEffect, useRef } from "react";
import { Camera, Flame, Trophy, X } from "lucide-react";
import Peach from "./Peach";
import type { Region, Team } from "../api";
import { statsFor } from "../stats";
import TeamAvatar from "./TeamAvatar";

interface Props {
  team: Team | null;
  regions: Region[];
  totalRegions: number;
  isMine: boolean;
  onChangePhoto: () => void;
  onClose: () => void;
}

export default function TeamProfile({ team, regions, totalRegions, isMine, onChangePhoto, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = team !== null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const stats = team ? statsFor(team, regions) : null;
  const done = stats ? stats.smashed + stats.buttSmashed : 0;

  return (
    <dialog
      ref={ref}
      className="dialog profile"
      style={team ? { ["--team" as string]: team.color } : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {team && stats && (
        <div className="profile__body">
          <button className="panel__close" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>

          <div className="profile__hero">
            <TeamAvatar team={team} size={180} className="profile__avatar" />
            {isMine && (
              <button className="chip profile__photo" onClick={onChangePhoto}>
                <Camera size={16} /> <span>Changer la photo</span>
              </button>
            )}
          </div>

          <span className="team-card__label">Équipe {team.id}</span>
          <h2 className="profile__name">{team.members.join(" & ")}</h2>

          <div className="profile__score">
            <Trophy size={22} strokeWidth={2.4} />
            <span className="profile__points">{stats.points}</span>
            <span className="profile__points-label">{stats.points > 1 ? "points" : "point"}</span>
          </div>

          <div className="profile__stats">
            <div className="stat">
              <span className="stat__icon stat__icon--smash"><Peach size={18} /></span>
              <span className="stat__value">{stats.smashed}</span>
              <span className="stat__label">smashées · 1 pt</span>
            </div>
            <div className="stat">
              <span className="stat__icon stat__icon--butt"><Flame size={18} strokeWidth={2.5} /></span>
              <span className="stat__value">{stats.buttSmashed}</span>
              <span className="stat__label">butt smashées · 2 pts</span>
            </div>
          </div>

          <div className="profile__progress" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={totalRegions}>
            <span style={{ width: `${(done / totalRegions) * 100}%` }} />
          </div>
          <p className="profile__progress-label">
            {done} / {totalRegions} régions cochées
          </p>

          {stats.regions.length > 0 && (
            <ul className="profile__regions">
              {stats.regions.map((r) => (
                <li key={r.code} className={r.level === 2 ? "region-chip region-chip--butt" : "region-chip"}>
                  {r.level === 2 ? <Flame size={13} strokeWidth={2.5} /> : <Peach size={13} />}
                  {r.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </dialog>
  );
}
