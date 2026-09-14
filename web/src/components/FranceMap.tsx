import { MAP_VIEWBOX, REGIONS } from "../data/regions";
import type { Region, Team } from "../api";
import { Zap } from "lucide-react";
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

export default function FranceMap({ regions, teams, selected, onSelect }: Props) {
  return (
    <div className="map" onClick={() => onSelect(null)}>
      <svg
        className="map__svg"
        viewBox={MAP_VIEWBOX}
        role="listbox"
        aria-label="Carte des régions de France"
      >
        <defs>
          <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#7a5c8a" floodOpacity="0.28" />
          </filter>
        </defs>
        {REGIONS.map((shape) => {
          const region = regions.get(shape.code);
          const team = region?.smashed_by != null ? teams.get(region.smashed_by) : undefined;
          const isSelected = selected === shape.code;
          return (
            <path
              key={shape.code}
              d={shape.d}
              className={`region ${isSelected ? "region--selected" : ""} ${team ? "region--smashed" : ""}`}
              style={{ fill: team ? team.color : PASTELS[shape.code], ["--cx" as string]: `${shape.cx}px`, ["--cy" as string]: `${shape.cy}px` }}
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
        {selected && (
          <path
            d={REGIONS.find((r) => r.code === selected)!.d}
            className="region-outline"
            filter="url(#lift)"
          />
        )}
      </svg>

      {REGIONS.map((shape) => {
        const region = regions.get(shape.code);
        const team = region?.smashed_by != null ? teams.get(region.smashed_by) : undefined;
        if (!team) return null;
        return (
          <div
            key={shape.code}
            className="map__pin"
            style={{ left: `${(shape.cx / SIZE) * 100}%`, top: `${(shape.cy / SIZE) * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(shape.code);
            }}
          >
            <TeamAvatar team={team} size={40} title={`${shape.name} — ${team.name}`} />
            <span className="map__pin-boom" aria-hidden><Zap size={14} strokeWidth={2.5} /></span>
          </div>
        );
      })}
    </div>
  );
}
