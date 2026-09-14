# ---- front ---------------------------------------------------------------
FROM oven/bun:1 AS web
WORKDIR /web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
COPY web/ ./
RUN bun run build

# ---- api -----------------------------------------------------------------
FROM rust:1-bookworm AS api
WORKDIR /api
# Limit parallelism: a full-speed release build exhausts the 4 GB of the Raspberry Pi.
ENV CARGO_BUILD_JOBS=2
# Cache dependencies in their own layer.
COPY api/Cargo.toml api/Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release && rm -rf src
COPY api/src ./src
RUN touch src/main.rs && cargo build --release

# ---- runtime -------------------------------------------------------------
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=api /api/target/release/fourre-de-france-api /usr/local/bin/fourre-de-france-api
COPY --from=web /web/dist /app/static
ENV DATA_DIR=/data \
    STATIC_DIR=/app/static \
    PORT=8080 \
    RUST_LOG=info
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fs http://localhost:8080/api/health || exit 1
CMD ["fourre-de-france-api"]
