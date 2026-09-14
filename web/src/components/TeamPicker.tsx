import type { Team } from "../api";
import TeamAvatar from "./TeamAvatar";

interface Props {
  teams: Team[];
  onPick: (team: Team) => void;
}

const EMOJIS = ["🌸", "🌊", "🍑", "🍀"];

export default function TeamPicker({ teams, onPick }: Props) {
  return (
    <main className="picker">
      <header className="picker__header">
        <span className="picker__badge">💥 Édition 2026</span>
        <h1 className="title">Fourre de France</h1>
        <p className="subtitle">Choisissez votre équipe pour commencer la tournée.</p>
      </header>

      <div className="picker__grid">
        {teams.map((team, i) => (
          <button
            key={team.id}
            className="team-card"
            style={{ ["--team" as string]: team.color }}
            onClick={() => onPick(team)}
          >
            <span className="team-card__emoji">{EMOJIS[i % EMOJIS.length]}</span>
            <TeamAvatar team={team} size={96} className="team-card__avatar" />
            <span className="team-card__label">Équipe {team.id}</span>
            <span className="team-card__names">{team.members.join(" & ")}</span>
            <span className="team-card__cta">C'est nous !</span>
          </button>
        ))}
      </div>
    </main>
  );
}
