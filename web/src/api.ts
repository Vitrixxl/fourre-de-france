export interface Team {
  id: number;
  name: string;
  color: string;
  members: string[];
  photo_url: string | null;
}

export interface Tag {
  id: number;
  name: string;
}

/** 1 = smashed, 2 = butt smashed */
export type SmashLevel = 1 | 2;

export interface Smash {
  team_id: number;
  level: SmashLevel;
  smashed_at: string;
  photo_url: string | null;
  tags: Tag[];
}

export interface Region {
  code: string;
  name: string;
  smashes: Smash[];
}

export const POINTS: Record<SmashLevel, number> = { 1: 1, 2: 2 };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  teams: () => request<Team[]>("/api/teams"),
  regions: () => request<Region[]>("/api/regions"),
  tags: () => request<Tag[]>("/api/tags"),
  smash: (code: string, teamId: number, level: SmashLevel = 1, tags: string[] = []) =>
    request<Region>(`/api/regions/${code}/smash`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ team_id: teamId, level, tags }),
    }),
  addSmashTag: (code: string, teamId: number, name: string) =>
    request<Region>(`/api/regions/${code}/smash/${teamId}/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  removeSmashTag: (code: string, teamId: number, tagId: number) =>
    request<Region>(`/api/regions/${code}/smash/${teamId}/tags/${tagId}`, { method: "DELETE" }),
  unsmash: (code: string, teamId: number) =>
    request<Region>(`/api/regions/${code}/smash/${teamId}`, { method: "DELETE" }),
  uploadSmashPhoto: (code: string, teamId: number, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return request<Region>(`/api/regions/${code}/smash/${teamId}/photo`, { method: "POST", body: form });
  },
  deleteSmashPhoto: (code: string, teamId: number) =>
    request<Region>(`/api/regions/${code}/smash/${teamId}/photo`, { method: "DELETE" }),
  uploadPhoto: (teamId: number, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return request<Team>(`/api/teams/${teamId}/photo`, { method: "POST", body: form });
  },
};
