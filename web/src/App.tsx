import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Cherry, Flame, Flower2, Heart, PartyPopper, RefreshCw, Sparkles, Star } from "lucide-react";
import Peach from "./components/Peach";
import { api, type Region, type SmashLevel, type Team } from "./api";
import { statsFor } from "./stats";
import { REGIONS } from "./data/regions";
import FranceMap from "./components/FranceMap";
import RegionPanel from "./components/RegionPanel";
import SmashDialog from "./components/SmashDialog";
import TeamAvatar from "./components/TeamAvatar";
import TeamPicker from "./components/TeamPicker";
import TeamProfile from "./components/TeamProfile";
import ScoreBar from "./components/ScoreBar";
import PhotoLightbox, { type LightboxPhoto } from "./components/PhotoLightbox";

const TEAM_KEY = "fdf.team";

export default function App() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [teamId, setTeamId] = useState<number | null>(() => {
    // ?team=1 pre-selects a team (handy for sharing a link), otherwise the last choice.
    const raw = new URLSearchParams(location.search).get("team") ?? localStorage.getItem(TEAM_KEY);
    return raw ? Number(raw) : null;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<SmashLevel | null>(null);
  const [dialogPhoto, setDialogPhoto] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<LightboxPhoto | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ n: number; big: boolean }>({ n: 0, big: false });
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
  const profileTeam = profileId != null ? (teamMap.get(profileId) ?? null) : null;

  const stats = useMemo(() => new Map((teams ?? []).map((t) => [t.id, statsFor(t, regions)])), [teams, regions]);

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

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogPhoto(null);
  };

  const confirmSmash = () =>
    run(async () => {
      if (!selectedRegion || !team || !dialog) return;
      let region = await api.smash(selectedRegion.code, team.id, dialog);
      if (dialogPhoto) region = await api.uploadSmashPhoto(selectedRegion.code, team.id, dialogPhoto);
      applyRegion(region);
      setBurst((b) => ({ n: b.n + 1, big: dialog === 2 }));
      closeDialog();
    });

  const uploadSmashPhoto = (file: File) =>
    run(async () => {
      if (!selectedRegion || !team) return;
      applyRegion(await api.uploadSmashPhoto(selectedRegion.code, team.id, file));
    });

  const downgrade = () =>
    run(async () => {
      if (!selectedRegion || !team) return;
      applyRegion(await api.smash(selectedRegion.code, team.id, 1));
    });

  const unsmash = () =>
    run(async () => {
      if (!selectedRegion || !team) return;
      applyRegion(await api.unsmash(selectedRegion.code, team.id));
    });

  const uploadPhoto = (file: File) =>
    run(async () => {
      if (!team) return;
      const updated = await api.uploadPhoto(team.id, file);
      setTeams((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)));
    });

  if (!teams) {
    return (
      <main className="loading">
        <span className="loading__spinner">
          <Peach size={44} />
        </span>
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
          <span className="topbar__tagline">
            Smashez toutes les régions <Peach size={13} />
          </span>
        </div>

        <div className="scores">
          {teams.map((t) => {
            const s = stats.get(t.id)!;
            return (
              <button
                key={t.id}
                className={`score ${t.id === team.id ? "score--me" : ""}`}
                style={{ ["--team" as string]: t.color }}
                onClick={() => setProfileId(t.id)}
                title={`Voir le profil de ${t.name}`}
              >
                <TeamAvatar team={t} size={32} />
                <span className="score__name">{t.members.join(" & ")}</span>
                <span className="score__detail">
                  <span title="smashées · 1 pt">
                    <Peach size={12} /> {s.smashed}
                  </span>
                  <span title="butt smashées · 2 pts">
                    <Flame size={12} strokeWidth={2.5} /> {s.buttSmashed}
                  </span>
                </span>
                <span className="score__count" title="points">
                  {s.points}
                </span>
              </button>
            );
          })}
        </div>

        <div className="topbar__me">
          <button className="chip" onClick={() => fileInput.current?.click()} title="Changer la photo de l'équipe">
            <Camera size={16} /> <span className="chip__label">Photo</span>
          </button>
          <button className="chip" onClick={changeTeam}>
            <RefreshCw size={16} /> <span className="chip__label">Changer d'équipe</span>
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
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <main className="stage">
        <ScoreBar teams={teams} stats={stats} onOpenProfile={setProfileId} />
        <FranceMap regions={regionMap} teams={teamMap} selected={selected} onSelect={setSelected} />
        {selectedRegion ? (
          <RegionPanel
            region={selectedRegion}
            team={team}
            teams={teamMap}
            busy={busy}
            onSmash={() => setDialog(1)}
            onButtSmash={() => setDialog(2)}
            onDowngrade={downgrade}
            onUnsmash={unsmash}
            onUploadPhoto={uploadSmashPhoto}
            onOpenPhoto={setLightbox}
            onClose={() => setSelected(null)}
          />
        ) : (
          <p className="hint">
            Touchez une région pour la smasher <Sparkles size={16} />
          </p>
        )}
      </main>

      <SmashDialog
        open={dialog !== null}
        level={dialog ?? 1}
        regionName={selectedRegion?.name ?? ""}
        photo={dialogPhoto}
        busy={busy}
        onPhoto={setDialogPhoto}
        onYes={confirmSmash}
        onNope={closeDialog}
      />

      <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />

      <TeamProfile
        team={profileTeam}
        regions={regions}
        totalRegions={REGIONS.length}
        isMine={profileTeam?.id === team.id}
        onChangePhoto={() => fileInput.current?.click()}
        onClose={() => setProfileId(null)}
      />

      {burst.n > 0 && <Confetti key={burst.n} big={burst.big} />}
    </div>
  );
}

const CONFETTI = [Peach, PartyPopper, Sparkles, Heart, Flower2, Star, Cherry, Flame];
const CONFETTI_COLORS = ["#f28bb0", "#9cc4f2", "#f5c86e", "#8fd9b6", "#c9a7ff", "#ffb86c"];

function Confetti({ big }: { big: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: big ? 48 : 24 }, (_, i) => ({
        id: i,
        Icon: CONFETTI[i % CONFETTI.length],
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.4 + Math.random() * 1.2,
        rot: (Math.random() - 0.5) * 720,
        size: big ? 24 + Math.random() * 20 : 28,
      })),
    [big],
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
            color: p.color,
          }}
        >
          <p.Icon size={p.size} strokeWidth={2.5} />
        </span>
      ))}
    </div>
  );
}
