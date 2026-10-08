#!/system/bin/sh
# V2Ray-Magic Hotspot Manager. Operates ONLY on recognized tether interfaces.
# Never changes mobile interfaces, policy routes, DNS or the default FORWARD policy.
set -u
IP=/system/bin/ip
IPTABLES=/system/bin/iptables
DATA=/data/adb/magic_v2ray
BLOCKS="$DATA/hotspot_blocklist.txt"
CHAIN=MV2R_HOTSPOT_CTL
ACTION="${1:-list}"

valid_ip() {
    printf '%s\n' "$1" | awk -F. '
      NF != 4 { exit 1 }
      {
        for (i=1; i<=4; i++) {
          if ($i !~ /^[0-9]+$/ || length($i)>3 || $i+0>255) exit 1
        }
        exit 0
      }'
}
valid_iface() {
    case "$1" in
        ap[0-9]*|swlan[0-9]*|softap[0-9]*|wlan[1-9]*|tether[0-9]*) return 0 ;;
        *) return 1 ;;
    esac
}
# Only recognize AP-like names WITH a private IPv4 address. wlan0 is deliberately
# excluded to avoid ever blocking users on the phone's ordinary Wi-Fi uplink.
detect_iface() {
    "$IP" -o -4 addr show 2>/dev/null | awk '
      {
        iface=$2; sub(/@.*/, "", iface);
        if (iface ~ /^(ap[0-9]+|swlan[0-9]+|softap[0-9]+|wlan[1-9][0-9]*|tether[0-9]+)$/ &&
            $4 ~ /^(192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|10\.)/) {
            print iface
            exit
        }
      }'
}
client_rows() {
    iface="$1"
    "$IP" -4 neigh show dev "$iface" 2>/dev/null | awk '
      {
        mac=""; for (i=1;i<NF;i++) if ($i=="lladdr") mac=$(i+1);
        if (mac!="" && $1 ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) {
          print $1 " " mac
        }
      }'
}
blocked() {
    [ -f "$BLOCKS" ] && grep -Fqx "$1" "$BLOCKS"
}
known_client() {
    client_rows "$1" | awk -v ip="$2" '$1==ip { found=1 } END {exit !found}'
}
apply_rules() {
    iface=$(detect_iface)
    [ -n "$iface" ] && valid_iface "$iface" || {
        echo "NO_HOTSPOT"
        return 0
    }
    "$IPTABLES" -t filter -N "$CHAIN" 2>/dev/null || :
    "$IPTABLES" -t filter -F "$CHAIN" || return 1
    if ! "$IPTABLES" -t filter -C FORWARD -i "$iface" -j "$CHAIN" 2>/dev/null; then
        "$IPTABLES" -t filter -I FORWARD 1 -i "$iface" -j "$CHAIN" || return 1
    fi
    if [ -f "$BLOCKS" ]; then
        while IFS= read -r ipaddr; do
            valid_ip "$ipaddr" || continue
            # Even persisted addresses only apply to frames arriving from AP.
            "$IPTABLES" -t filter -A "$CHAIN" -s "$ipaddr" -j REJECT || return 1
        done < "$BLOCKS"
    fi
    echo "APPLIED $iface"
}
cleanup_rules() {
    # Remove only our own interface-scoped jumps, not generic FORWARD entries.
    for iface in ap0 ap1 ap2 wlan1 wlan2 wlan3 swlan0 swlan1 softap0 softap1 tether0 tether1; do
        while "$IPTABLES" -t filter -D FORWARD -i "$iface" -j "$CHAIN" 2>/dev/null; do :; done
    done
    "$IPTABLES" -t filter -F "$CHAIN" 2>/dev/null || :
    "$IPTABLES" -t filter -X "$CHAIN" 2>/dev/null || :
}
case "$ACTION" in
    list)
        iface=$(detect_iface)
        if [ -z "$iface" ] || ! valid_iface "$iface"; then
            echo "STATUS NO_HOTSPOT"
            exit 0
        fi
        echo "STATUS $iface"
        client_rows "$iface" | while read -r ipaddr mac; do
            if blocked "$ipaddr"; then flag=blocked; else flag=allowed; fi
            printf 'CLIENT %s %s %s\n' "$ipaddr" "$mac" "$flag"
        done
        ;;
    block)
        ipaddr="${2:-}"
        valid_ip "$ipaddr" || { echo "invalid IP" >&2; exit 2; }
        iface=$(detect_iface)
        [ -n "$iface" ] && known_client "$iface" "$ipaddr" || {
            echo "IP is not an identified hotspot client" >&2; exit 2;
        }
        mkdir -p "$DATA"; chmod 700 "$DATA"
        touch "$BLOCKS"; chmod 600 "$BLOCKS"
        blocked "$ipaddr" || printf '%s\n' "$ipaddr" >> "$BLOCKS"
        apply_rules
        ;;
    unblock)
        ipaddr="${2:-}"
        valid_ip "$ipaddr" || { echo "invalid IP" >&2; exit 2; }
        [ -f "$BLOCKS" ] || exit 0
        awk -v ip="$ipaddr" '$0!=ip' "$BLOCKS" > "$BLOCKS.tmp" || exit 1
        mv -f "$BLOCKS.tmp" "$BLOCKS"
        chmod 600 "$BLOCKS"
        apply_rules
        ;;
    apply) apply_rules ;;
    cleanup) cleanup_rules ;;
    *)
        echo "Usage: $0 {list|block IP|unblock IP|apply|cleanup}" >&2
        exit 2
        ;;
esac
