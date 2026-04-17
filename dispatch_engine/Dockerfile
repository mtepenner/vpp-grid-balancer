# syntax=docker/dockerfile:1
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /src

# Cache module downloads before copying full source.
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /dispatch-engine ./cmd/master

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN addgroup -S vpp && adduser -S vpp -G vpp
USER vpp

COPY --from=builder /dispatch-engine /usr/local/bin/dispatch-engine

EXPOSE 8080

ENTRYPOINT ["dispatch-engine"]
