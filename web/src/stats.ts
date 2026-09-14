import { POINTS, type Region, type Team } from "./api";

export interface TeamStats {
  smashed: number;
  buttSmashed: number;
  points: number;
  regions: { code: string; name: string; level: 1 | 2 }[];
}

export function statsFor(team: Team, regions: Region[]): TeamStats {
  const stats: TeamStats = { smashed: 0, buttSmashed: 0, points: 0, regions: [] };
  for (const r of regions) {
    const s = r.smashes.find((x) => x.team_id === team.id);
    if (!s) continue;
    if (s.level === 2) stats.buttSmashed += 1;
    else stats.smashed += 1;
    stats.points += POINTS[s.level];
    stats.regions.push({ code: r.code, name: r.name, level: s.level });
  }
  return stats;
}
