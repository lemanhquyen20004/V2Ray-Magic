#!/system/bin/sh
# Optional hotspot policy, disabled until the user sets a limit.
# This helper edits only AP-scoped FORWARD rules; never mobile routing.
MODDIR=$(dirname "$0")
IPT=/system/bin/iptables
POLICY=/data/adb/magic_v2ray/hotspot_limits.txt
CHAIN=MV2R_HS_LIMIT
TC=/system/bin/tc
ACTION=$1
[ -n "$ACTION" ] || ACTION=list
valid_ip() {
    printf '%s\n' "$1" | awk -F. '
        NF != 4 {exit 1}
        {for(i=1;i<=4;i++) if($i!~/^[0-9]+$/ || length($i)>3 || $i+0>255) exit 1}'
}
valid_int() {
    case "$1" in ''|*[!0-9]*) return 1 ;; esac
    [ "$1" -ge "$2" ] && [ "$1" -le "$3" ]
}
ap_iface() {
    sh "$MODDIR/hotspot_manager.sh" list |
        awk '$1=="STATUS" && $2!="NO_HOTSPOT" {print $2; exit}'
}
is_client() {
    sh "$MODDIR/hotspot_manager.sh" list |
        awk -v ip="$1" '$1=="CLIENT" && $2==ip {ok=1} END{exit !ok}'
}
init_file() {
    mkdir -p /data/adb/magic_v2ray || return 1
    chmod 700 /data/adb/magic_v2ray
    touch "$POLICY" || return 1
    chmod 600 "$POLICY"
}
get_policy() {
    awk -v ip="$1" '$1==ip {print $2, $3; yes=1; exit} END {if(!yes) print "0 0"}' "$POLICY"
}
save_policy() {
    awk -v ip="$1" '$1!=ip' "$POLICY" > "$POLICY.tmp" || return 1
    if [ "$2" -gt 0 ] || [ "$3" -gt 0 ]; then
        printf '%s %s %s\n' "$1" "$2" "$3" >> "$POLICY.tmp"
    fi
    mv -f "$POLICY.tmp" "$POLICY"
    chmod 600 "$POLICY"
}
own_qdisc() {
    "$TC" qdisc show dev "$1" 2>/dev/null | grep -q 'htb 5a1:'
}
clear_qdisc() {
    [ -x "$TC" ] && own_qdisc "$1" && "$TC" qdisc del dev "$1" root 2>/dev/null || :
}
cleanup() {
    for ap in ap0 ap1 ap2 ap3 wlan1 wlan2 wlan3 swlan0 swlan1 softap0 softap1 tether0 tether1; do
        while "$IPT" -t filter -D FORWARD -i "$ap" -j "$CHAIN" 2>/dev/null; do :; done
        while "$IPT" -t filter -D FORWARD -o "$ap" -j "$CHAIN" 2>/dev/null; do :; done
        clear_qdisc "$ap"
    done
    "$IPT" -t filter -F "$CHAIN" 2>/dev/null || :
    "$IPT" -t filter -X "$CHAIN" 2>/dev/null || :
}
shape_downlink() {
    ap=$1
    [ -x "$TC" ] || { echo "RATE_UNSUPPORTED:tc absent" >&2; return 0; }
    number=$(awk '$3>0 {n++} END{print n+0}' "$POLICY")
    [ "$number" -gt 0 ] || { clear_qdisc "$ap"; return 0; }
    if ! own_qdisc "$ap"; then
        current=$("$TC" qdisc show dev "$ap" 2>/dev/null)
        case "$current" in *'qdisc noqueue '*|'') : ;; *)
            echo "RATE_UNSUPPORTED:existing qdisc owned by Android" >&2; return 0 ;;
        esac
        "$TC" qdisc add dev "$ap" root handle 5a1: htb default 1 2>/dev/null ||
            { echo "RATE_UNSUPPORTED:HTB not supported" >&2; return 0; }
    fi
    "$TC" class replace dev "$ap" parent 5a1: classid 5a1:1 htb rate 1000mbit ceil 1000mbit 2>/dev/null || :
    while read -r ip quota rate; do
        valid_ip "$ip" || continue
        valid_int "$rate" 1 1000000 || continue
        class=$(printf '%s\n' "$ip" | awk -F. '{print 1000+(($3*251+$4)%59000)}')
        "$TC" class replace dev "$ap" parent 5a1: classid "5a1:$class" htb rate "$rate"kbit ceil "$rate"kbit 2>/dev/null || continue
        "$TC" filter replace dev "$ap" protocol ip parent 5a1: prio "$class" u32 match ip dst "$ip/32" flowid "5a1:$class" 2>/dev/null || :
    done < "$POLICY"
}
apply_rules() {
    init_file || return 1
    ap=$(ap_iface)
    if [ -z "$ap" ]; then cleanup; echo NO_HOTSPOT; return 0; fi
    "$IPT" -t filter -N "$CHAIN" 2>/dev/null || :
    "$IPT" -t filter -F "$CHAIN" || return 1
    while read -r ip quota rate; do
        valid_ip "$ip" || continue
        valid_int "$quota" 1 1048576 || continue
        bytes=$(awk -v mb="$quota" 'BEGIN{printf "%.0f", mb*1048576}')
        # Android xt_quota2 permits short names (kernel field is 15 chars).
        # Eight hex digits preserve all four IPv4 octets without collisions.
        name=$(printf '%s\n' "$ip" | awk -F. '{printf "v%02x%02x%02x%02x",$1,$2,$3,$4}')
        # A single named quota must be shared across upload/download.
        # Never use different names here: that silently grants two quotas.
        counter_name="mv2r_$name"
        if "$IPT" -t filter -A "$CHAIN" -s "$ip" -m quota2 --name "$counter_name" --quota "$bytes" -j RETURN 2>/dev/null; then
            "$IPT" -t filter -A "$CHAIN" -s "$ip" -j REJECT || return 1
            # Share the SAME named counter across uploads and downloads.
            # Count on both AP ingress and AP egress, without affecting 4G.
            if "$IPT" -t filter -A "$CHAIN" -d "$ip" -m quota2 --name "$counter_name" --quota "$bytes" -j RETURN 2>/dev/null; then
                "$IPT" -t filter -A "$CHAIN" -d "$ip" -j REJECT || return 1
            fi
        else
            echo "QUOTA_UNSUPPORTED:$ip" >&2
        fi
    done < "$POLICY"
    "$IPT" -t filter -C FORWARD -i "$ap" -j "$CHAIN" 2>/dev/null ||
        "$IPT" -t filter -I FORWARD 1 -i "$ap" -j "$CHAIN" || return 1
    "$IPT" -t filter -C FORWARD -o "$ap" -j "$CHAIN" 2>/dev/null ||
        "$IPT" -t filter -I FORWARD 1 -o "$ap" -j "$CHAIN" || return 1
    shape_downlink "$ap"
    echo "APPLIED $ap"
}
case "$ACTION" in
    set-quota|set-speed|clear)
        init_file || exit 1
        ip=$2
        valid_ip "$ip" || { echo "Invalid IP" >&2; exit 2; }
        if [ "$ACTION" != clear ]; then
            is_client "$ip" || { echo "Hotspot client is not identifiable" >&2; exit 2; }
        fi
        desired=$3
        old=$(get_policy "$ip")
        quota=$(printf '%s\n' "$old" | cut -d ' ' -f1)
        rate=$(printf '%s\n' "$old" | cut -d ' ' -f2)
        case "$ACTION" in
            set-quota) quota=$desired; valid_int "$quota" 0 1048576 || exit 2 ;;
            set-speed) rate=$desired; valid_int "$rate" 0 1000000 || exit 2 ;;
            clear) quota=0; rate=0 ;;
        esac
        save_policy "$ip" "$quota" "$rate" && apply_rules ;;
    list)
        init_file || exit 1
        while read -r ip quota rate; do
            if valid_ip "$ip"; then
        printf 'LIMIT %s %s %s\n' "$ip" "$quota" "$rate"
        if [ "$quota" -gt 0 ]; then
          short=$(printf '%s\n' "$ip" | awk -F. '{printf "v%02x%02x%02x%02x",$1,$2,$3,$4}')
          if [ -r "/proc/net/xt_quota/mv2r_$short" ]; then
            remaining=$(cat "/proc/net/xt_quota/mv2r_$short" 2>/dev/null | tr -cd '0-9')
            if valid_int "$remaining" 0 1099511627776; then
              used=$(awk -v cap="$quota" -v remain="$remaining" 'BEGIN{v=cap*1048576-remain; printf "%.0f", v>0?v:0}')
              printf 'USAGE %s %s\n' "$ip" "$used"
            fi
          fi
        fi
      fi
        done < "$POLICY" ;;
    apply) apply_rules ;;
    cleanup) cleanup ;;
    *) echo "usage: $0 {list|apply|cleanup|set-quota IP MiB|set-speed IP kbit|clear IP}" >&2; exit 2 ;;
esac
