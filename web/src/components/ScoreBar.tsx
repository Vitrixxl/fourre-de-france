import { Crown, Handshake, Sparkles } from "lucide-react";
import type { Team } from "../api";
import type { TeamStats } from "../stats";
import TeamAvatar from "./TeamAvatar";

interface Props {
  teams: Team[];
  stats: Map<number, TeamStats>;
  onOpenProfile: (teamId: number) => void;
}

export default function ScoreBar({ teams, stats, onOpenProfile }: Props) {
  const points = teams.map((t) => stats.get(t.id)?.points ?? 0);
  const total = points.reduce((a, b) => a + b, 0);
  const max = Math.max(...points);
  const leaders = teams.filter((t) => (stats.get(t.id)?.points ?? 0) === max);
  const leader = leaders.length === 1 ? leaders[0] : null;
  const gap = leader ? max - Math.max(...points.filter((p) => p !== max), 0) : 0;

  return (
    <section className="scorebar" aria-label="Scores">
      <div className="scorebar__leader">
        {total === 0 ? (
          <>
            <Sparkles size={18} strokeWidth={2.4} />
            <span>Aucune région smashée… la course est ouverte !</span>
          </>
        ) : leader ? (
          <button className="scorebar__leader-btn" style={{ ["--team" as string]: leader.color }} onClick={() => onOpenProfile(leader.id)}>
            <span className="scorebar__crown"><Crown size={16} strokeWidth={2.6} /></span>
            <TeamAvatar team={leader} size={36} />
            <span className="scorebar__leader-text">
              <strong>{leader.members.join(" & ")}</strong> {leader.members.length > 1 ? "mènent" : "mène"} de {gap} {gap > 1 ? "points" : "point"}
            </span>
          </button>
        ) : (
          <>
            <Handshake size={18} strokeWidth={2.4} />
            <span>Égalité parfaite, {max} {max > 1 ? "points" : "point"} partout !</span>
          </>
        )}
      </div>

      <div className="scorebar__bar" role="img" aria-label={teams.map((t, i) => `${t.name} : ${points[i]} pts`).join(", ")}>
        {teams.map((t, i) => {
          const share = total === 0 ? 1 / teams.length : points[i] / total;
          return (
            <button
              key={t.id}
              className={`scorebar__segment ${leader?.id === t.id ? "scorebar__segment--leader" : ""}`}
              style={{ ["--team" as string]: t.color, flexGrow: Math.max(share, 0.08) }}
              onClick={() => onOpenProfile(t.id)}
              title={`${t.name} : ${points[i]} pts`}
            >
              {i === 0 && <TeamAvatar team={t} size={28} />}
              <span className="scorebar__points">{points[i]}</span>
              {i === teams.length - 1 && <TeamAvatar team={t} size={28} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
