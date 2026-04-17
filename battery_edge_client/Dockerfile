# syntax=docker/dockerfile:1
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM rust:1.75-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /src

# Cache dependencies before copying source.
COPY Cargo.toml Cargo.lock* ./
RUN mkdir -p src && echo "fn main(){}" > src/main.rs && cargo build --release 2>/dev/null || true

COPY src ./src
RUN touch src/main.rs && cargo build --release

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN addgroup -S vpp && adduser -S vpp -G vpp
USER vpp

COPY --from=builder /src/target/release/battery-edge-client /usr/local/bin/battery-edge-client

ENV BATTERY_ID=""
ENV MQTT_HOST="vernemq"
ENV MQTT_PORT="1883"
ENV BATTERY_CAPACITY_KW=""
ENV RUST_LOG="info"

ENTRYPOINT ["battery-edge-client"]
