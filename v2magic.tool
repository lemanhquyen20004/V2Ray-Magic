#!/system/bin/sh
# Box-style command interface. The live TUN engine remains Xray until an
# alternate core has an audited, crash-safe TUN integration.
set -u
MODDIR=$(dirname "$0")
DATA=/data/adb/magic_v2ray
CTRL="$MODDIR/proxy_control.sh"
CURL="$MODDIR/bin/curl"
XRAY="$MODDIR/bin/xray"
cmd=help
if [ "$#" -gt 0 ]; then cmd=$1; shift; fi
err() { printf 'ERROR %s\n' "$*" >&2; }
core_list() {
    if [ -x "$XRAY" ]; then
        printf 'CORE xray installed active\n'
    else
        printf 'CORE xray missing inactive\n'
    fi
    for core in sing-box mihomo clash v2fly hysteria; do
        if [ -x "$MODDIR/bin/$core" ]; then
            printf 'CORE %s installed unsupported\n' "$core"
        else
            printf 'CORE %s absent unsupported\n' "$core"
        fi
    done
}
valid_host() {
    [ -n "$1" ] || return 1
    case "$1" in -*|*[!a-zA-Z0-9.:-]*) return 1 ;; esac
    [ "$(printf %s "$1" | wc -c)" -le 253 ]
}
valid_port() {
    case "$1" in ''|*[!0-9]*) return 1 ;; esac
    [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}
tcp_probe() {
    [ "$#" -eq 2 ] || { err "node tcp HOST PORT"; return 2; }
    host=$1; port=$2
    valid_host "$host" && valid_port "$port" || { err "invalid endpoint"; return 2; }
    [ -x "$CURL" ] || { err "curl binary missing"; return 1; }
    case "$host" in *:*) host="[$host]" ;; esac
    # This tests host:port TCP reachability, NOT TLS, proxy authentication
    # or game latency. Limit root shell runtime even when server holds open.
    result=$("$CURL" --noproxy '*' --connect-timeout 3 --max-time 4 \
        -s -o /dev/null -w '%{time_connect}' "telnet://$host:$port" 2>/dev/null)
    case "$result" in ''|*[!0-9.]*) err "TCP unavailable"; return 1 ;; esac
    ms=$(printf '%s\n' "$result" | awk '
        /^[0-9]+([.][0-9]+)?$/ {
            value=$1*1000
            if (value>0 && value<=4000) printf "%.0f",value
        }
    ')
    if [ -n "$ms" ] && [ "$ms" -gt 0 ]; then
        printf 'TCP_MS %s\n' "$ms"
    else
        err "TCP timeout/refused"; return 1
    fi
}
case "$cmd" in
    start|stop|restart|reload|status|reapply) sh "$CTRL" "$cmd" ;;
    recover|direct)
        sh "$CTRL" stop >/dev/null 2>&1 || :
        sh "$MODDIR/emergency.sh" ;;
    info)
        state=$(sh "$CTRL" status 2>/dev/null) || :
        [ -n "$state" ] || state=stopped
        printf 'ENGINE xray\nSTATUS %s\nCONFIG %s\nROOT_TUN xraytun0\n' "$state" "$DATA/config.v2.json" ;;
    core)
        sub=list
        if [ "$#" -gt 0 ]; then sub=$1; shift; fi
        case "$sub" in
            list) core_list ;;
            current) printf 'xray\n' ;;
            version)
                [ -x "$XRAY" ] || { err "Xray missing"; exit 1; }
                "$XRAY" version 2>/dev/null | head -n 1 ;;
            check)
                [ -s "$DATA/config.v2.json" ] || { err "config.v2.json missing"; exit 1; }
                "$XRAY" run -test -format=json -c "$DATA/config.v2.json" ;;
            use)
                if [ "$#" -eq 1 ] && [ "$1" = xray ]; then
                    printf 'xray\n'
                else
                    err "only Xray is TUN-safe in this build; core not switched"
                    exit 2
                fi ;;
            *) err "core {list|current|version|check|use xray}"; exit 2 ;;
        esac ;;
    node)
        [ "$#" -ge 1 ] || { err "node tcp HOST PORT"; exit 2; }
        sub=$1; shift
        case "$sub" in tcp) tcp_probe "$@" ;; *) err "node tcp HOST PORT"; exit 2 ;; esac ;;
    doctor) sh "$MODDIR/diagnostic.sh" ;;
    logs)
        n=80
        if [ "$#" -gt 0 ]; then n=$1; fi
        case "$n" in ''|*[!0-9]*) n=80 ;; esac
        [ "$n" -ge 1 ] && [ "$n" -le 300 ] || n=80
        for file in "$DATA/service.log" "$DATA/proxy_control.log"; do
            [ -f "$file" ] || continue
            printf '===== %s =====\n' "$file"
            tail -n "$n" "$file"
        done ;;
    help|*) printf '%s\n' "v2magic.tool {start|stop|restart|reload|status|recover|info|core list|core current|core version|core check|node tcp HOST PORT|doctor|logs [1..300]}" ;;
esac
