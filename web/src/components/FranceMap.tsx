import { Flame } from "lucide-react";
import Peach from "./Peach";
import { MAP_VIEWBOX, REGIONS } from "../data/regions";
import type { Region, Team } from "../api";
import TeamAvatar from "./TeamAvatar";

interface Props {
  regions: Map<string, Region>;
  teams: Map<number, Team>;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

// Pastel palette, one hue per region so the map stays readable before any smash.
const PASTELS: Record<string, string> = {
  "11": "#ffd6e0",
  "24": "#fff1b8",
  "27": "#d9f0d1",
  "28": "#cde7ff",
  "32": "#e8d8ff",
  "44": "#ffe3c7",
  "52": "#c8f2ec",
  "53": "#ffd9f3",
  "75": "#e4f4c2",
  "76": "#ffe0d1",
  "84": "#d6e4ff",
  "93": "#fff5c2",
  "94": "#d4f5e4",
};

const SIZE = 600;
const PIN = 40;
const PIN_GAP = 6;

function patternId(ids: number[]): string {
  return `shared-${ids.join("-")}`;
}

export default function FranceMap({ regions, teams, selected, onSelect }: Props) {
  // Every combination of teams that currently shares a region gets a striped pattern.
  const combos = new Map<string, Team[]>();
  for (const r of regions.values()) {
    if (r.smashes.length < 2) continue;
    const ts = r.smashes.map((s) => teams.get(s.team_id)).filter((t): t is Team => !!t);
    const key = patternId(ts.map((t) => t.id));
    combos.set(key, ts);
  }

  return (
    <div className="map" onClick={() => onSelect(null)}>
      <svg className="map__svg" viewBox={MAP_VIEWBOX} role="listbox" aria-label="Carte des régions de France">
        <defs>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#7a5c8a" floodOpacity="0.28" />
          </filter>
          {[...combos.entries()].map(([id, ts]) => (
            <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
              {ts.map((t, i) => (
                <rect key={t.id} x={(16 / ts.length) * i} y="0" width={16 / ts.length} height="16" fill={t.color} />
              ))}
            </pattern>
          ))}
        </defs>

        {REGIONS.map((shape) => {
          const region = regions.get(shape.code);
          const smashers = (region?.smashes ?? []).map((s) => teams.get(s.team_id)).filter((t): t is Team => !!t);
          const isSelected = selected === shape.code;
          const fill =
            smashers.length === 0
              ? PASTELS[shape.code]
              : smashers.length === 1
                ? smashers[0].color
                : `url(#${patternId(smashers.map((t) => t.id))})`;
          return (
            <path
              key={shape.code}
              d={shape.d}
              className={`region ${isSelected ? "region--selected" : ""} ${smashers.length ? "region--smashed" : ""}`}
              style={{ fill }}
              role="option"
              aria-selected={isSelected}
              aria-label={shape.name}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : shape.code);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(isSelected ? null : shape.code);
                }
              }}
            >
              <title>{shape.name}</title>
            </path>
          );
        })}
        {selected && <path d={REGIONS.find((r) => r.code === selected)!.d} className="region-outline" filter="url(#lift)" />}
      </svg>

      {REGIONS.map((shape) => {
        const region = regions.get(shape.code);
        if (!region || region.smashes.length === 0) return null;
        const n = region.smashes.length;
        const total = n * PIN + (n - 1) * PIN_GAP;
        return (
          <div
            key={shape.code}
            className="map__pins"
            style={{ left: `${(shape.cx / SIZE) * 100}%`, top: `${(shape.cy / SIZE) * 100}%`, width: total }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(shape.code);
            }}
          >
            {region.smashes.map((s) => {
              const team = teams.get(s.team_id);
              if (!team) return null;
              const butt = s.level === 2;
              return (
                <div key={s.team_id} className={`map__pin ${butt ? "map__pin--butt" : ""}`}>
                  <TeamAvatar team={team} size={PIN} title={`${shape.name} — ${team.name}${butt ? " (butt smashed)" : ""}`} />
                  <span className={`map__pin-boom ${butt ? "map__pin-boom--butt" : ""}`} aria-hidden>
                    {butt ? <Peach size={14} /> : <Flame size={14} strokeWidth={2.5} />}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
