# Fourre de France 💥

Petite application de tournée : deux équipes, une carte de France pastel, et une seule
mission — smasher toutes les régions.

- **Équipe 1** : Garance & Iris
- **Équipe 2** : Ambre & Vitrice

On choisit son équipe à l'arrivée, on touche une région, on appuie sur **Smashed 💥**,
on confirme (« Did you smash here? » — *Yes* / *Nop*) et la région prend les couleurs de
l'équipe avec son avatar dessus.

## Lancer

```sh
docker compose up
```

Puis ouvrir <http://localhost:8080>. La base SQLite et les photos d'équipe vivent dans le
volume `fdf-data` (`/data` dans le conteneur).

## Stack

| Partie | Techno |
| ------ | ------ |
| API    | Rust · axum · rusqlite (SQLite embarqué) |
| Front  | React 19 · TypeScript · Vite, CSS maison (pastel) |
| Carte  | SVG généré depuis [france-geojson](https://github.com/gregoiredavid/france-geojson) (13 régions métropolitaines) |
| Déploiement | Un seul conteneur (API + front statique), `compose.yaml` à la racine |

## API

| Méthode | Route | Description |
| ------- | ----- | ----------- |
| GET | `/api/teams` | Les deux équipes (nom, membres, couleur, photo) |
| POST | `/api/teams/:id/photo` | Upload multipart (champ `photo`, png/jpeg/webp/gif ≤ 8 Mio) |
| GET | `/api/regions` | Les 13 régions et qui les a smashées |
| POST | `/api/regions/:code/smash` | `{ "team_id": 1 }` — smash (ou re-smash) une région |
| DELETE | `/api/regions/:code/smash` | Annule un smash |
| GET | `/api/health` | `ok` |

Les photos uploadées sont servies sous `/uploads/…`. Tout ce qui n'est pas `/api` ni
`/uploads` renvoie le front (SPA).

## Développement

```sh
# API (port 8080, données dans ./api/data)
cd api && cargo run

# Front (port 5173, proxy /api et /uploads vers 8080)
cd web && bun install && bun run dev
```

Variables d'environnement de l'API : `PORT` (8080), `DATA_DIR` (`./data`),
`STATIC_DIR` (`../web/dist`), `RUST_LOG`.

## Régénérer la carte

`web/src/data/regions.ts` est généré depuis `regions-version-simplifiee.geojson`
(projection Mercator, viewBox 600×600, centroïdes pour placer les avatars).
