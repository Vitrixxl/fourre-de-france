import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Region, type Team } from "./api";
import FranceMap from "./components/FranceMap";
import RegionPanel from "./components/RegionPanel";
import SmashDialog from "./components/SmashDialog";
import TeamAvatar from "./components/TeamAvatar";
import TeamPicker from "./components/TeamPicker";

const TEAM_KEY = "fdf.team";

export default function App() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [teamId, setTeamId] = useState<number | null>(() => {
    const raw = localStorage.getItem(TEAM_KEY);
    return raw ? Number(raw) : null;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([api.teams(), api.regions()]);
      setTeams(t);
      setRegions(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 15_000);
    return () => window.clearInterval(id);
  }, [reload]);

  const teamMap = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);
  const regionMap = useMemo(() => new Map(regions.map((r) => [r.code, r])), [regions]);
  const team = teamId != null ? teamMap.get(teamId) : undefined;
  const selectedRegion = selected ? regionMap.get(selected) : undefined;

  const scores = useMemo(() => {
    const s = new Map<number, number>();
    for (const r of regions) if (r.smashed_by != null) s.set(r.smashed_by, (s.get(r.smashed_by) ?? 0) + 1);
    return s;
  }, [regions]);

  const pickTeam = (t: Team) => {
    localStorage.setItem(TEAM_KEY, String(t.id));
    setTeamId(t.id);
  };

  const changeTeam = () => {
    localStorage.removeItem(TEAM_KEY);
    setTeamId(null);
    setSelected(null);
  };

  const applyRegion = (r: Region) => setRegions((prev) => prev.map((x) => (x.code === r.code ? r : x)));

  const confirmSmash = async () => {
    if (!selectedRegion || !team) return;
    setBusy(true);
    try {
      applyRegion(await api.smash(selectedRegion.code, team.id));
      setDialogOpen(false);
      setBurst((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const unsmash = async () => {
    if (!selectedRegion) return;
    setBusy(true);
    try {
      applyRegion(await api.unsmash(selectedRegion.code));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!team) return;
    setBusy(true);
    try {
      const updated = await api.uploadPhoto(team.id, file);
      setTeams((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!teams) {
    return (
      <main className="loading">
        <span className="loading__spinner">💥</span>
        {error ? <p className="error">{error}</p> : <p>Chargement de la tournée…</p>}
      </main>
    );
  }

  if (!team) return <TeamPicker teams={teams} onPick={pickTeam} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1 className="title title--small">Fourre de France</h1>
          <span className="topbar__tagline">Smashez toutes les régions 💥</span>
        </div>

        <div className="scores">
          {teams.map((t) => (
            <div key={t.id} className={`score ${t.id === team.id ? "score--me" : ""}`} style={{ ["--team" as string]: t.color }}>
              <TeamAvatar team={t} size={32} />
              <span className="score__name">{t.members.join(" & ")}</span>
              <span className="score__count">{scores.get(t.id) ?? 0}</span>
            </div>
          ))}
        </div>

        <div className="topbar__me">
          <button className="chip" onClick={() => fileInput.current?.click()} title="Changer la photo de l'équipe">
            <TeamAvatar team={team} size={28} />
            <span>📸 Photo</span>
          </button>
          <button className="chip" onClick={changeTeam}>
            🔁 Changer d'équipe
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {error && (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          ⚠️ {error}
        </div>
      )}

      <main className="stage">
        <FranceMap regions={regionMap} teams={teamMap} selected={selected} onSelect={setSelected} />
        {selectedRegion && (
          <RegionPanel
            region={selectedRegion}
            team={team}
            smasher={selectedRegion.smashed_by != null ? teamMap.get(selectedRegion.smashed_by) : undefined}
            busy={busy}
            onSmash={() => setDialogOpen(true)}
            onUnsmash={unsmash}
            onClose={() => setSelected(null)}
          />
        )}
        {!selectedRegion && (
          <p className="hint">Touchez une région pour la smasher ✨</p>
        )}
      </main>

      <SmashDialog
        open={dialogOpen}
        regionName={selectedRegion?.name ?? ""}
        busy={busy}
        onYes={confirmSmash}
        onNope={() => setDialogOpen(false)}
      />

      {burst > 0 && <Confetti key={burst} />}
    </div>
  );
}

const CONFETTI = ["💥", "🎉", "✨", "💖", "🌸", "⭐", "🫶", "🍑"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        emoji: CONFETTI[i % CONFETTI.length],
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.4 + Math.random() * 1.2,
        rot: (Math.random() - 0.5) * 720,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
