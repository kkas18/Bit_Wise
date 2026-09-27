#!/usr/bin/env bash
# Signs the Gradle release outputs of the TWA project and writes dist/:
#   dist/BitWise-<version>.apk   installable APK (zipaligned + apksigner v1–v3)
#   dist/BitWise-<version>.aab   Play Store bundle (only with the real upload key)
#   dist/assetlinks.json         Digital Asset Links for the signing certificate
#
# Signing key comes from the environment (GitHub secrets):
#   ANDROID_KEYSTORE_BASE64  base64 of the .jks/.p12 keystore
#   ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
# Without them a throw-away key is generated: the APK installs, but it can
# never be updated in place by a build signed with a different key.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/dist"
VERSION="${TWA_VERSION_NAME:-dev}"
PACKAGE="$(node -p "require('$ROOT/twa/twa-manifest.json').packageId")"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
UNSIGNED="$ROOT/android/app/build/outputs/apk/release/app-release-unsigned.apk"
BUNDLE="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"

mkdir -p "$OUT"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [[ -n "${ANDROID_KEYSTORE_BASE64:-}" ]]; then
  echo "Signing with the release key from secrets"
  echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$WORK/release.jks"
  KS="$WORK/release.jks"
  ALIAS="${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS is required}"
  export KS_PASS="${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD is required}"
  export KEY_PASS="${ANDROID_KEY_PASSWORD:-$KS_PASS}"
  OFFICIAL=1
else
  echo "::warning::No signing secrets configured — signing with a throw-away key (the APK cannot be updated in place later)."
  KS="$WORK/ephemeral.jks"
  ALIAS="ephemeral"
  export KS_PASS="ephemeral-$(date +%s)"
  export KEY_PASS="$KS_PASS"
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -alias "$ALIAS" -keyalg RSA -keysize 2048 \
    -validity 365 -storepass "$KS_PASS" -keypass "$KEY_PASS" -dname "CN=BitWise development build" >/dev/null 2>&1
  OFFICIAL=0
fi

SUFFIX=""; [[ "$OFFICIAL" == 1 ]] || SUFFIX="-unofficial"
APK="$OUT/BitWise-$VERSION$SUFFIX.apk"

"$BT/zipalign" -p -f 4 "$UNSIGNED" "$WORK/aligned.apk"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" \
  --ks-pass env:KS_PASS --key-pass env:KEY_PASS --out "$APK" "$WORK/aligned.apk"
"$BT/apksigner" verify --print-certs "$APK" | head -3
rm -f "$APK.idsig"

if [[ "$OFFICIAL" == 1 && -f "$BUNDLE" ]]; then
  cp "$BUNDLE" "$OUT/BitWise-$VERSION.aab"
  jarsigner -keystore "$KS" -storepass "$KS_PASS" -keypass "$KEY_PASS" \
    -sigalg SHA256withRSA -digestalg SHA-256 "$OUT/BitWise-$VERSION.aab" "$ALIAS" >/dev/null
fi

FP="$(keytool -list -v -keystore "$KS" -alias "$ALIAS" -storepass "$KS_PASS" 2>/dev/null \
  | awk -F': ' '/SHA256:/ {print $2; exit}' | tr -d ' ')"
cat > "$OUT/assetlinks.json" <<JSON
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "$PACKAGE",
      "sha256_cert_fingerprints": ["$FP"]
    }
  }
]
JSON

echo "official=$OFFICIAL" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "apk=$APK" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "SHA-256 fingerprint: $FP"
ls -la "$OUT"
