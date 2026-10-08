#!/system/bin/sh
# Read-only network health summary for Android WebUI. Never prints secrets.
MODDIR=${0%/*}
IP=/system/bin/ip
IPT=/system/bin/iptables
TC=/system/bin/tc
ROOTDATA=/data/adb/magic_v2ray
XRAY_TUN=xraytun0
onoff() {
    if "$@" >/dev/null 2>&1; then printf 'OK'; else printf 'NO'; fi
}
echo "V2Ray-Magic — Chẩn đoán an toàn"
echo "Ngày: $(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null)"
if [ -s "$ROOTDATA/config.v2.json" ]; then echo 'Config: present'; else echo 'Config: missing'; fi
if [ -x "$MODDIR/bin/xray" ]; then echo 'Xray binary: OK'; else echo 'Xray binary: missing'; fi
if [ -x "$MODDIR/bin/xhuskydg_helper" ]; then echo 'TUN helper: OK'; else echo 'TUN helper: missing'; fi
status=$(sh "$MODDIR/proxy_control.sh" status 2>/dev/null)
echo "Xray: ${status:-unknown}"
if "$IP" link show "$XRAY_TUN" >/dev/null 2>&1; then
    echo "TUN interface: present"
else
    echo "TUN interface: absent"
fi
route=$("$IP" -4 route show table main default 2>/dev/null | head -n 1)
case "$route" in
    '') echo "IPv4 main route: none" ;;
    *) iface=$(printf '%s\n' "$route" | awk '{for (i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}')
       echo "IPv4 uplink: ${iface:-unknown}" ;;
esac
if "$IP" rule show 2>/dev/null | grep -E '(^|[[:space:]])(lookup |table )100($|[[:space:]])' >/dev/null; then
    echo "Proxy policy route: present"
else
    echo "Proxy policy route: absent"
fi
if "$IPT" -t mangle -S XRAY_MARK >/dev/null 2>&1; then
    echo "Xray iptables chain: present"
else
    echo "Xray iptables chain: absent"
fi
if [ -d /proc/net/xt_quota ]; then
    echo "Per-client quota capability: xt_quota2 procfs present"
else
    echo "Per-client quota capability: unavailable/unknown"
fi
if [ -x "$TC" ]; then
    echo "Traffic control tool: available (kernel support still needs testing)"
else
    echo "Traffic control tool: not found"
fi
if [ -x "$MODDIR/hotspot_manager.sh" ] || [ -f "$MODDIR/hotspot_manager.sh" ]; then
    ap=$(sh "$MODDIR/hotspot_manager.sh" list 2>/dev/null | awk '$1=="STATUS" {print $2; exit}')
    case "$ap" in
        NO_HOTSPOT|'') echo "Hotspot AP: not detected" ;;
        *) echo "Hotspot AP: $ap" ;;
    esac
fi
echo "Kết luận: công cụ chỉ đọc trạng thái; không chứng minh mọi ứng dụng đã có Internet."
