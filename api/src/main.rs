mod db;

use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Connection>>,
    uploads_dir: PathBuf,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

type ApiError = (StatusCode, Json<ErrorBody>);

fn err(status: StatusCode, msg: impl Into<String>) -> ApiError {
    (status, Json(ErrorBody { error: msg.into() }))
}

fn internal(e: impl std::fmt::Display) -> ApiError {
    tracing::error!("internal error: {e}");
    err(StatusCode::INTERNAL_SERVER_ERROR, "internal error")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=info".into()),
        )
        .init();

    let data_dir = PathBuf::from(std::env::var("DATA_DIR").unwrap_or_else(|_| "./data".into()));
    let uploads_dir = data_dir.join("uploads");
    std::fs::create_dir_all(&uploads_dir).expect("cannot create data dir");

    let conn = Connection::open(data_dir.join("fourre.db")).expect("cannot open sqlite db");
    db::init(&conn).expect("cannot init schema");

    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        uploads_dir: uploads_dir.clone(),
    };

    let api = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/teams", get(list_teams))
        .route("/teams/:id/photo", post(upload_photo))
        .route("/regions", get(list_regions))
        .route("/regions/:code/smash", post(smash_region))
        .route("/regions/:code/smash/:team_id", axum::routing::delete(unsmash_region))
        .route("/regions/:code/smash/:team_id/photo", post(upload_smash_photo))
        .with_state(state);

    let static_dir = PathBuf::from(std::env::var("STATIC_DIR").unwrap_or_else(|_| "../web/dist".into()));
    let spa = ServeDir::new(&static_dir).fallback(ServeFile::new(static_dir.join("index.html")));

    let app = Router::new()
        .nest("/api", api)
        .nest_service("/uploads", ServeDir::new(uploads_dir))
        .fallback_service(spa)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Fourre de France API listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.expect("cannot bind");
    axum::serve(listener, app).await.expect("server error");
}

async fn list_teams(State(s): State<AppState>) -> Result<Json<Vec<db::Team>>, ApiError> {
    let conn = s.db.lock().map_err(internal)?;
    db::list_teams(&conn).map(Json).map_err(internal)
}

async fn list_regions(State(s): State<AppState>) -> Result<Json<Vec<db::Region>>, ApiError> {
    let conn = s.db.lock().map_err(internal)?;
    db::list_regions(&conn).map(Json).map_err(internal)
}

#[derive(Deserialize)]
struct SmashBody {
    team_id: i64,
    /// 1 = smashed (default), 2 = butt smashed
    #[serde(default = "default_level")]
    level: i64,
}

fn default_level() -> i64 {
    1
}

async fn smash_region(
    State(s): State<AppState>,
    Path(code): Path<String>,
    Json(body): Json<SmashBody>,
) -> Result<Json<db::Region>, ApiError> {
    let conn = s.db.lock().map_err(internal)?;
    if db::get_region(&conn, &code).map_err(internal)?.is_none() {
        return Err(err(StatusCode::NOT_FOUND, "unknown region"));
    }
    if !db::team_exists(&conn, body.team_id).map_err(internal)? {
        return Err(err(StatusCode::BAD_REQUEST, "unknown team"));
    }
    if !(1..=2).contains(&body.level) {
        return Err(err(StatusCode::BAD_REQUEST, "level must be 1 (smashed) or 2 (butt smashed)"));
    }
    db::smash(&conn, &code, body.team_id, body.level).map_err(internal)?;
    let region = db::get_region(&conn, &code).map_err(internal)?.expect("just upserted");
    Ok(Json(region))
}

async fn unsmash_region(
    State(s): State<AppState>,
    Path((code, team_id)): Path<(String, i64)>,
) -> Result<Json<db::Region>, ApiError> {
    let conn = s.db.lock().map_err(internal)?;
    let Some(_) = db::get_region(&conn, &code).map_err(internal)? else {
        return Err(err(StatusCode::NOT_FOUND, "unknown region"));
    };
    db::unsmash(&conn, &code, team_id).map_err(internal)?;
    let region = db::get_region(&conn, &code).map_err(internal)?.expect("exists");
    Ok(Json(region))
}

/// Reads the `photo` field of a multipart upload and stores it under `uploads_dir`.
/// Returns the stored file name.
async fn save_photo(uploads_dir: &std::path::Path, prefix: &str, mut multipart: Multipart) -> Result<String, ApiError> {
    let mut saved: Option<String> = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| err(StatusCode::BAD_REQUEST, e.to_string()))?
    {
        if field.name() != Some("photo") {
            continue;
        }
        let ext = match field.content_type() {
            Some("image/png") => "png",
            Some("image/jpeg") => "jpg",
            Some("image/webp") => "webp",
            Some("image/gif") => "gif",
            _ => return Err(err(StatusCode::BAD_REQUEST, "photo must be png, jpeg, webp or gif")),
        };
        let bytes = field
            .bytes()
            .await
            .map_err(|e| err(StatusCode::BAD_REQUEST, e.to_string()))?;
        if bytes.len() > 8 * 1024 * 1024 {
            return Err(err(StatusCode::PAYLOAD_TOO_LARGE, "photo larger than 8 MiB"));
        }
        let filename = format!("{prefix}-{}.{ext}", chrono::Utc::now().timestamp_millis());
        tokio::fs::write(uploads_dir.join(&filename), &bytes)
            .await
            .map_err(internal)?;
        saved = Some(filename);
    }

    saved.ok_or_else(|| err(StatusCode::BAD_REQUEST, "missing multipart field 'photo'"))
}

async fn upload_photo(
    State(s): State<AppState>,
    Path(id): Path<i64>,
    multipart: Multipart,
) -> Result<impl IntoResponse, ApiError> {
    {
        let conn = s.db.lock().map_err(internal)?;
        if !db::team_exists(&conn, id).map_err(internal)? {
            return Err(err(StatusCode::NOT_FOUND, "unknown team"));
        }
    }
    let filename = save_photo(&s.uploads_dir, &format!("team-{id}"), multipart).await?;

    let conn = s.db.lock().map_err(internal)?;
    db::set_team_photo(&conn, id, &filename).map_err(internal)?;
    let teams = db::list_teams(&conn).map_err(internal)?;
    let team = teams.into_iter().find(|t| t.id == id).expect("exists");
    Ok(Json(team))
}

async fn upload_smash_photo(
    State(s): State<AppState>,
    Path((code, team_id)): Path<(String, i64)>,
    multipart: Multipart,
) -> Result<Json<db::Region>, ApiError> {
    {
        let conn = s.db.lock().map_err(internal)?;
        if !db::smash_exists(&conn, &code, team_id).map_err(internal)? {
            return Err(err(StatusCode::NOT_FOUND, "this team has not smashed this region"));
        }
    }
    let filename = save_photo(&s.uploads_dir, &format!("smash-{code}-{team_id}"), multipart).await?;

    let conn = s.db.lock().map_err(internal)?;
    db::set_smash_photo(&conn, &code, team_id, &filename).map_err(internal)?;
    let region = db::get_region(&conn, &code).map_err(internal)?.expect("exists");
    Ok(Json(region))
}
