#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${PROJECT_DIR}/build/macos"
APP_DIR="${BUILD_DIR}/EMBERBOUND.app"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"
GAME_DIR="${RESOURCES_DIR}/Game"
MODULE_CACHE="${BUILD_DIR}/module-cache"

mkdir -p "${MACOS_DIR}" "${GAME_DIR}/src" "${GAME_DIR}/assets/backgrounds" \
  "${GAME_DIR}/assets/sprites" "${MODULE_CACHE}"

xcrun --sdk macosx clang -fobjc-arc -framework Cocoa -framework WebKit \
  -target arm64-apple-macos11 \
  -fmodules-cache-path="${MODULE_CACHE}/arm64" \
  "${PROJECT_DIR}/native/macos/EmberboundApp.m" \
  -o "${BUILD_DIR}/EMBERBOUND-arm64"

xcrun --sdk macosx clang -fobjc-arc -framework Cocoa -framework WebKit \
  -target x86_64-apple-macos11 \
  -fmodules-cache-path="${MODULE_CACHE}/x86_64" \
  "${PROJECT_DIR}/native/macos/EmberboundApp.m" \
  -o "${BUILD_DIR}/EMBERBOUND-x86_64"

lipo -create \
  "${BUILD_DIR}/EMBERBOUND-arm64" \
  "${BUILD_DIR}/EMBERBOUND-x86_64" \
  -output "${MACOS_DIR}/EMBERBOUND"

cp "${PROJECT_DIR}/native/macos/Info.plist" "${CONTENTS_DIR}/Info.plist"
cp "${PROJECT_DIR}/index.html" "${PROJECT_DIR}/styles.css" "${GAME_DIR}/"
cp "${PROJECT_DIR}/src/"*.js "${GAME_DIR}/src/"
cp "${PROJECT_DIR}/assets/backgrounds/"*.png "${GAME_DIR}/assets/backgrounds/"
cp "${PROJECT_DIR}/assets/sprites/"*.png "${GAME_DIR}/assets/sprites/"

codesign --force --deep --sign - "${APP_DIR}"
echo "${APP_DIR}"
