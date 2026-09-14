export interface Team {
  id: number;
  name: string;
  color: string;
  members: string[];
  photo_url: string | null;
}

export interface Region {
  code: string;
  name: string;
  smashed_by: number | null;
  smashed_at: string | null;
}

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
  smash: (code: string, teamId: number) =>
    request<Region>(`/api/regions/${code}/smash`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ team_id: teamId }),
    }),
  unsmash: (code: string) =>
    request<Region>(`/api/regions/${code}/smash`, { method: "DELETE" }),
  uploadPhoto: (teamId: number, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return request<Team>(`/api/teams/${teamId}/photo`, { method: "POST", body: form });
  },
};
