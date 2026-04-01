#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

OUT_DIR="ios/libs"
NAME="golib.xcframework"

mkdir -p "$OUT_DIR"
rm -rf "$OUT_DIR/$NAME"

GIT_HASH=$(git rev-parse --short HEAD || echo "nogit")
BUILD_DATE=$(date '+%Y-%m-%d_%H:%M:%S')
cd go && pwd
gomobile init
go mod tidy && go mod download
go get golang.org/x/mobile/bind@v0.0.0-20250711185624-d5bb5ecc55c0
pwd && ls
gomobile bind \
  -target=ios \
  -o "ios/libs/$NAME" \
  -ldflags "-X feehiapp/version.GoGitHash=${GIT_HASH} -X feehiapp/version.GoBuildDate=${BUILD_DATE}" \
  feehiapp/httpserver \
  feehiapp/news \
  feehiapp/qqexmail \
  feehiapp/util \
  feehiapp/srv \
  feehiapp/version

echo "Built $OUT_DIR/$NAME"
