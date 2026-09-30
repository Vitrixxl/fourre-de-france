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
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Serialize, Clone)]
pub struct Smash {
    pub team_id: i64,
    /// 1 = smashed, 2 = butt smashed
    pub level: i64,
    pub smashed_at: String,
    pub photo_url: Option<String>,
    pub tags: Vec<Tag>,
}

#[derive(Serialize, Clone)]
pub struct Region {
    pub code: String,
    pub name: String,
    pub smashes: Vec<Smash>,
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
            region_code TEXT NOT NULL REFERENCES regions(code),
            team_id INTEGER NOT NULL REFERENCES teams(id),
            level INTEGER NOT NULL DEFAULT 1,
            smashed_at TEXT NOT NULL,
            photo_path TEXT,
            PRIMARY KEY (region_code, team_id)
         );",
    )?;
    migrate_smashes_v1(conn)?;
    if !has_column(conn, "smashes", "photo_path")? {
        conn.execute_batch("ALTER TABLE smashes ADD COLUMN photo_path TEXT;")?;
    }
    // Created after the smashes migration: renaming `smashes` would otherwise
    // rewrite the foreign key below to point at the dropped v1 table.
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE
         );
         CREATE TABLE IF NOT EXISTS smash_tags (
            region_code TEXT NOT NULL,
            team_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (region_code, team_id, tag_id),
            FOREIGN KEY (region_code, team_id) REFERENCES smashes(region_code, team_id) ON DELETE CASCADE
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

fn has_column(conn: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let cols = conn
        .prepare(&format!("PRAGMA table_info({table})"))?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(cols.iter().any(|c| c == column))
}

/// v1 keyed smashes by region only (one team per region) and had no level.
fn migrate_smashes_v1(conn: &Connection) -> rusqlite::Result<()> {
    if has_column(conn, "smashes", "level")? {
        return Ok(());
    }
    conn.execute_batch(
        "ALTER TABLE smashes RENAME TO smashes_v1;
         CREATE TABLE smashes (
            region_code TEXT NOT NULL REFERENCES regions(code),
            team_id INTEGER NOT NULL REFERENCES teams(id),
            level INTEGER NOT NULL DEFAULT 1,
            smashed_at TEXT NOT NULL,
            PRIMARY KEY (region_code, team_id)
         );
         INSERT INTO smashes (region_code, team_id, level, smashed_at)
            SELECT region_code, team_id, 1, smashed_at FROM smashes_v1;
         DROP TABLE smashes_v1;",
    )
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

fn smashes_for(conn: &Connection, code: &str) -> rusqlite::Result<Vec<Smash>> {
    let mut stmt = conn.prepare(
        "SELECT team_id, level, smashed_at, photo_path FROM smashes WHERE region_code = ?1 ORDER BY smashed_at",
    )?;
    let mut rows = stmt
        .query_map(params![code], |r| {
            Ok(Smash {
                team_id: r.get(0)?,
                level: r.get(1)?,
                smashed_at: r.get(2)?,
                photo_url: r.get::<_, Option<String>>(3)?.map(|p| format!("/uploads/{p}")),
                tags: Vec::new(),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let mut tags = conn.prepare(
        "SELECT t.id, t.name FROM smash_tags st JOIN tags t ON t.id = st.tag_id
         WHERE st.region_code = ?1 AND st.team_id = ?2 ORDER BY t.name COLLATE NOCASE",
    )?;
    for smash in &mut rows {
        smash.tags = tags
            .query_map(params![code, smash.team_id], |r| Ok(Tag { id: r.get(0)?, name: r.get(1)? }))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
    }
    Ok(rows)
}

pub fn list_tags(conn: &Connection) -> rusqlite::Result<Vec<Tag>> {
    let mut stmt = conn.prepare("SELECT id, name FROM tags ORDER BY name COLLATE NOCASE")?;
    let rows = stmt
        .query_map([], |r| Ok(Tag { id: r.get(0)?, name: r.get(1)? }))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

/// Returns the tag with this name (case-insensitive), creating it if needed.
pub fn get_or_create_tag(conn: &Connection, name: &str) -> rusqlite::Result<Tag> {
    conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![name])?;
    conn.query_row(
        "SELECT id, name FROM tags WHERE name = ?1",
        params![name],
        |r| Ok(Tag { id: r.get(0)?, name: r.get(1)? }),
    )
}

pub fn add_smash_tag(conn: &Connection, code: &str, team_id: i64, tag_id: i64) -> rusqlite::Result<usize> {
    conn.execute(
        "INSERT OR IGNORE INTO smash_tags (region_code, team_id, tag_id) VALUES (?1, ?2, ?3)",
        params![code, team_id, tag_id],
    )
}

pub fn remove_smash_tag(conn: &Connection, code: &str, team_id: i64, tag_id: i64) -> rusqlite::Result<usize> {
    conn.execute(
        "DELETE FROM smash_tags WHERE region_code = ?1 AND team_id = ?2 AND tag_id = ?3",
        params![code, team_id, tag_id],
    )
}

pub fn list_regions(conn: &Connection) -> rusqlite::Result<Vec<Region>> {
    let mut stmt = conn.prepare("SELECT code, name FROM regions ORDER BY name")?;
    let base = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let mut out = Vec::with_capacity(base.len());
    for (code, name) in base {
        let smashes = smashes_for(conn, &code)?;
        out.push(Region { code, name, smashes });
    }
    Ok(out)
}

pub fn get_region(conn: &Connection, code: &str) -> rusqlite::Result<Option<Region>> {
    let base = conn
        .query_row(
            "SELECT code, name FROM regions WHERE code = ?1",
            params![code],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )
        .optional()?;
    match base {
        Some((code, name)) => {
            let smashes = smashes_for(conn, &code)?;
            Ok(Some(Region { code, name, smashes }))
        }
        None => Ok(None),
    }
}

/// Upsert a team's smash on a region. `level` 1 = smashed, 2 = butt smashed.
pub fn smash(conn: &Connection, code: &str, team_id: i64, level: i64) -> rusqlite::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO smashes (region_code, team_id, level, smashed_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(region_code, team_id) DO UPDATE SET level = excluded.level",
        params![code, team_id, level, now],
    )?;
    Ok(())
}

pub fn smash_exists(conn: &Connection, code: &str, team_id: i64) -> rusqlite::Result<bool> {
    conn.query_row(
        "SELECT 1 FROM smashes WHERE region_code = ?1 AND team_id = ?2",
        params![code, team_id],
        |_| Ok(()),
    )
    .optional()
    .map(|o| o.is_some())
}

pub fn set_smash_photo(conn: &Connection, code: &str, team_id: i64, path: &str) -> rusqlite::Result<usize> {
    conn.execute(
        "UPDATE smashes SET photo_path = ?1 WHERE region_code = ?2 AND team_id = ?3",
        params![path, code, team_id],
    )
}

/// Clears the photo of a smash and returns the previous file name, if any.
pub fn clear_smash_photo(conn: &Connection, code: &str, team_id: i64) -> rusqlite::Result<Option<String>> {
    let previous: Option<String> = conn
        .query_row(
            "SELECT photo_path FROM smashes WHERE region_code = ?1 AND team_id = ?2",
            params![code, team_id],
            |r| r.get(0),
        )
        .optional()?
        .flatten();
    conn.execute(
        "UPDATE smashes SET photo_path = NULL WHERE region_code = ?1 AND team_id = ?2",
        params![code, team_id],
    )?;
    Ok(previous)
}

pub fn unsmash(conn: &Connection, code: &str, team_id: i64) -> rusqlite::Result<usize> {
    conn.execute(
        "DELETE FROM smashes WHERE region_code = ?1 AND team_id = ?2",
        params![code, team_id],
    )
}
