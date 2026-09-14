import type { Team } from "../api";

interface Props {
  team: Team;
  size?: number;
  className?: string;
  title?: string;
}

function initials(team: Team): string {
  return team.members.map((m) => m.trim().charAt(0).toUpperCase()).join("");
}

export default function TeamAvatar({ team, size = 48, className = "", title }: Props) {
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.36),
    background: team.photo_url ? undefined : team.color,
  };
  return (
    <span className={`avatar ${className}`} style={style} title={title ?? team.name}>
      {team.photo_url ? (
        <img src={team.photo_url} alt={team.name} />
      ) : (
        <span className="avatar__initials">{initials(team)}</span>
      )}
    </span>
  );
}
