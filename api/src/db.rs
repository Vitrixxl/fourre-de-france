use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

pub const REGIONS: &[(&str, &str)] = &[
    ("11", "Île-de-France"),
    ("24", "Centre-Val de Loire"),
    ("27", "Bourgogne-Franche-Comté"),
    ("28", "Normandie"),
    ("32", "Hauts-de-France"),
    ("44", "Grand Est"),
    ("52", "Pays de la Loire"),
    ("53", "Bretagne"),
    ("75", "Nouvelle-Aquitaine"),
    ("76", "Occitanie"),
    ("84", "Auvergne-Rhône-Alpes"),
    ("93", "Provence-Alpes-Côte d'Azur"),
    ("94", "Corse"),
];

const TEAMS: &[(i64, &str, &str, &[&str])] = &[
    (1, "Garance & Iris", "#f6a5c0", &["Garance", "Iris"]),
    (2, "Ambre & Vitrice", "#a5d8f6", &["Ambre", "Vitrice"]),
];

#[derive(Serialize, Clone)]
pub struct Team {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub members: Vec<String>,
    pub photo_url: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct Region {
    pub code: String,
    pub name: String,
    pub smashed_by: Option<i64>,
    pub smashed_at: Option<String>,
}

pub fn init(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            photo_path TEXT
         );
         CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL REFERENCES teams(id),
            name TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS regions (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS smashes (
            region_code TEXT PRIMARY KEY REFERENCES regions(code),
            team_id INTEGER NOT NULL REFERENCES teams(id),
            smashed_at TEXT NOT NULL
         );",
    )?;

    for (id, name, color, members) in TEAMS {
        conn.execute(
            "INSERT OR IGNORE INTO teams (id, name, color) VALUES (?1, ?2, ?3)",
            params![id, name, color],
        )?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM members WHERE team_id = ?1",
            params![id],
            |r| r.get(0),
        )?;
        if count == 0 {
            for m in *members {
                conn.execute(
                    "INSERT INTO members (team_id, name) VALUES (?1, ?2)",
                    params![id, m],
                )?;
            }
        }
    }
    for (code, name) in REGIONS {
        conn.execute(
            "INSERT OR IGNORE INTO regions (code, name) VALUES (?1, ?2)",
            params![code, name],
        )?;
    }
    Ok(())
}

pub fn list_teams(conn: &Connection) -> rusqlite::Result<Vec<Team>> {
    let mut stmt = conn.prepare("SELECT id, name, color, photo_path FROM teams ORDER BY id")?;
    let teams = stmt
        .query_map([], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, Option<String>>(3)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out = Vec::with_capacity(teams.len());
    for (id, name, color, photo_path) in teams {
        let mut ms = conn.prepare("SELECT name FROM members WHERE team_id = ?1 ORDER BY id")?;
        let members = ms
            .query_map(params![id], |r| r.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        out.push(Team {
            id,
            name,
            color,
            members,
            photo_url: photo_path.map(|p| format!("/uploads/{p}")),
        });
    }
    Ok(out)
}

pub fn team_exists(conn: &Connection, id: i64) -> rusqlite::Result<bool> {
    conn.query_row("SELECT 1 FROM teams WHERE id = ?1", params![id], |_| Ok(()))
        .optional()
        .map(|o| o.is_some())
}

pub fn set_team_photo(conn: &Connection, id: i64, path: &str) -> rusqlite::Result<usize> {
    conn.execute(
        "UPDATE teams SET photo_path = ?1 WHERE id = ?2",
        params![path, id],
    )
}

pub fn list_regions(conn: &Connection) -> rusqlite::Result<Vec<Region>> {
    let mut stmt = conn.prepare(
        "SELECT r.code, r.name, s.team_id, s.smashed_at
         FROM regions r LEFT JOIN smashes s ON s.region_code = r.code
         ORDER BY r.name",
    )?;
    let regions = stmt
        .query_map([], |r| {
            Ok(Region {
                code: r.get(0)?,
                name: r.get(1)?,
                smashed_by: r.get(2)?,
                smashed_at: r.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(regions)
}

pub fn get_region(conn: &Connection, code: &str) -> rusqlite::Result<Option<Region>> {
    conn.query_row(
        "SELECT r.code, r.name, s.team_id, s.smashed_at
         FROM regions r LEFT JOIN smashes s ON s.region_code = r.code
         WHERE r.code = ?1",
        params![code],
        |r| {
            Ok(Region {
                code: r.get(0)?,
                name: r.get(1)?,
                smashed_by: r.get(2)?,
                smashed_at: r.get(3)?,
            })
        },
    )
    .optional()
}

pub fn smash(conn: &Connection, code: &str, team_id: i64) -> rusqlite::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO smashes (region_code, team_id, smashed_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(region_code) DO UPDATE SET team_id = excluded.team_id, smashed_at = excluded.smashed_at",
        params![code, team_id, now],
    )?;
    Ok(())
}

pub fn unsmash(conn: &Connection, code: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM smashes WHERE region_code = ?1", params![code])
}
