#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
IOS_DIR="$ROOT/ios"
CONFIG_DIR="$IOS_DIR/config"
FRAMEWORK_DIR="$IOS_DIR/libs/golib.xcframework"

mkdir -p "$CONFIG_DIR"

CONFIG_FILE="$CONFIG_DIR/golib.xcconfig"

cat > "$CONFIG_FILE" <<EOF
FRAMEWORK_SEARCH_PATHS = \$(inherited) $IOS_DIR/libs
OTHER_LDFLAGS = \$(inherited) -framework golib
EOF

echo "Generated xcconfig: $CONFIG_FILE"

# 自动 patch project.pbxproj（关键）
PBXPROJ=$(find "$IOS_DIR" -name project.pbxproj | head -n 1)

if ! grep -q "golib.xcconfig" "$PBXPROJ"; then
  echo "Patching project.pbxproj..."

  # 简单粗暴注入（CI 专用写法）
  sed -i '' 's|baseConfigurationReference = .*|baseConfigurationReference = golib.xcconfig;|g' "$PBXPROJ" || true
fi
