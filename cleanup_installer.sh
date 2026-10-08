#!/system/bin/sh
# Remove ONLY a successful V2Ray-Magic installer from the exact Downloads path
# recorded by the root manager. Never delete anything from a glob or tmp dirs.
DATA=/data/adb/magic_v2ray
MARKER="$DATA/installed_zip_cleanup"
[ -f "$MARKER" ] || exit 0
IFS= read -r filepath < "$MARKER"
checksum=$(sed -n '2p' "$MARKER")
case "$filepath" in
    /storage/emulated/0/Download/*|/sdcard/Download/*) : ;;
    *) rm -f "$MARKER"; exit 0 ;;
esac
base=${filepath##*/}
printf '%s\n' "$base" | grep -Eq '^magic_v2ray-v[0-9]+\.[0-9]+\.[0-9]+___Xray-core@v[0-9]+\.[0-9]+\.[0-9]+-(arm64-v8a|x86_64|universal)\.zip$' ||
    { rm -f "$MARKER"; exit 0; }
# Shared storage can be unavailable until the Android user unlocks it.
[ -f "$filepath" ] || exit 0
[ ! -L "$filepath" ] || { rm -f "$MARKER"; exit 0; }
case "$checksum" in ''|*[!0-9a-f]*) rm -f "$MARKER"; exit 0 ;; esac
actual=$(sha256sum "$filepath" 2>/dev/null | awk '{print $1}')
if [ "$actual" = "$checksum" ]; then
    rm -f -- "$filepath" || exit 1
    rm -f "$MARKER"
    echo "Installer ZIP cleaned from Downloads"
else
    # Different file at the same name: NEVER delete it.
    rm -f "$MARKER"
fi
