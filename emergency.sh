#!/system/bin/sh
# V2Ray-Magic emergency DIRECT recovery for stuck mobile/Wi-Fi traffic.
# No network reset, DNS flush, airplane mode, or telephony process killing.
# This script touches only the known V2Ray-Magic Netfilter chains/routes.
MODDIR=${0%/*}
DATA=/data/adb/magic_v2ray
RUN=/dev/sysctl_stubs/run
IP=/system/bin/ip
IPT=/system/bin/iptables
IP6=/system/bin/ip6tables
TUN=xraytun0
drop_rule() {
    tool=$1; shift
    # Bound retries: a broken mock/kernel must never freeze the UI.
    count=0
    while [ "$count" -lt 80 ] && "$tool" "$@" >/dev/null 2>&1; do
        count=$((count+1))
    done
}
drop_chain() {
    tool=$1 table=$2 parent=$3 chain=$4
    drop_rule "$tool" -t "$table" -D "$parent" -j "$chain"
    "$tool" -t "$table" -F "$chain" >/dev/null 2>&1 || :
    "$tool" -t "$table" -X "$chain" >/dev/null 2>&1 || :
}
# Never resume a broken tunnel without the user explicitly starting it.
rm -f "$DATA/enabled"
# Both module-scoped client managers are deliberately cleaned first.
[ -f "$MODDIR/hotspot_limits.sh" ] && sh "$MODDIR/hotspot_limits.sh" cleanup >/dev/null 2>&1 || :
[ -f "$MODDIR/hotspot_manager.sh" ] && sh "$MODDIR/hotspot_manager.sh" cleanup >/dev/null 2>&1 || :
for tool in "$IPT" "$IP6"; do
    drop_chain "$tool" mangle OUTPUT XRAY_MARK
    drop_chain "$tool" mangle PREROUTING HOTSPOT_PREROUTING
    drop_chain "$tool" mangle FORWARD HOTSPOT_FORWARD
    drop_chain "$tool" filter FORWARD HOTSPOT_FORWARD
    drop_rule "$tool" -D FORWARD -i "$TUN" -j ACCEPT
    drop_rule "$tool" -D FORWARD -o "$TUN" -j ACCEPT
done
# Older versions also installed individually named NAT chains.
drop_chain "$IPT" nat PREROUTING MV2R_DNS
drop_chain "$IPT" nat PREROUTING MV2R_GATEWAY
drop_rule "$IPT" -t mangle -D FORWARD -o "$TUN" -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350
drop_rule "$IPT" -D OUTPUT -p tcp --dport 808 -d 127.17.1.3 -m owner --uid-owner 9999-2147483647 -j REJECT --reject-with tcp-reset
drop_rule "$IPT" -D OUTPUT -p tcp --dport 80 -d 127.18.0.0/16 -m owner --uid-owner 9999-2147483647 -j REJECT --reject-with tcp-reset
# Remove the legacy unscoped hotspot DNS hijacks for every destination that
# older V2Ray-Magic installers added. Never flush the rest of Android's NAT.
for cidr in 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 \
    172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 \
    192.168.0.0/16 198.51.100.0/24 203.0.113.0/24 \
    224.0.0.0/4 240.0.0.0/4 255.255.255.255/32; do
    drop_rule "$IPT" -t nat -D PREROUTING ! -i "$TUN" -d "$cidr" -p udp --dport 53 -j DNAT --to 1.1.1.1
done
# Delete priorities reserved by old releases. Only V2Ray-Magic used these
# values on supported firmware; never flush Android's global rule table.
for family in -4 -6; do
    for pref in 1010 5000 5010 5020 5025 5030 6000; do
        attempt=0
        while [ "$attempt" -lt 80 ] && "$IP" "$family" rule del pref "$pref" >/dev/null 2>&1; do
            attempt=$((attempt+1))
        done
    done
    "$IP" "$family" route del default dev "$TUN" table 100 >/dev/null 2>&1 || :
done
# Restore sysctls recorded by the service, if the same boot retained them.
snapshot="$RUN/sysctl.bak"
if [ -f "$snapshot" ]; then
    while read -r setting value; do
        case "$setting" in
            /proc/sys/net/ipv4/ip_forward|/proc/sys/net/ipv6/conf/all/forwarding|/proc/sys/net/ipv6/conf/default/forwarding|/proc/sys/net/ipv4/conf/*/rp_filter)
                [ -w "$setting" ] && printf '%s\n' "$value" > "$setting" 2>/dev/null || : ;;
        esac
    done < "$snapshot"
    rm -f "$snapshot"
fi
echo "DIRECT_RECOVERY_COMPLETE"
