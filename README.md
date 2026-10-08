# V2Ray-Magic

Fork-based maintenance of [Magic V2Ray](https://github.com/vincentng295/Magic_V2Ray) for rooted Android devices, with reliability improvements and Vietnamese notes.

> This project is derived from Magic V2Ray by HuskyDG and vincentng295. Licensed under GPL-3.0. Work-in-progress: fixes are reviewed and tested by GitHub Actions; actual mobile data / hotspot behavior must be verified on the device before everyday use.

## Focus

- Reliable start/stop and fail-safe cleanup for Xray and TUN.
- Correct config file paths throughout the root controller and WebUI.
- Preserve 4G access and restore modified kernel network parameters.
- Maintain the original WebUI, node support, and hotspot routing.

See [README_vi.md](README_vi.md) for original documentation and [CHANGELOG.md](CHANGELOG.md) for project changes.

## Installation and updates

The GitHub repository is private; Magisk cannot fetch a private raw.githubusercontent.com update manifest without authentication. Auto-update is intentionally disabled for now. CI builds ZIP artifacts using downloaded Xray/helper/geodata dependencies. Verify mobile data, hotspot, IPv6 and stop/uninstall behavior on an Android device before regular use.

## v1.22.0 features (experimental on MIUI)

- **Safe Xray controls:** preflight `xray run -test`, TUN startup rollback, and a 15-second crash watchdog that removes stale proxy routes.
- **Dashboard:** live network-interface traffic counters, rates and an opt-in game setting.
- **Hotspot Manager:** discovers current IPv4 neighbors on AP interfaces and can block/unblock *forwarded* Internet access for an IP. Android MAC/IP reporting varies; there is no guarantee every tether client is visible.
- **Game Mode:** stops applying only the upstream default UDP/443 blocking rule when turned on; does not change radio parameters or guarantee lower latency.
- **Subscriptions:** user-triggered batch reload and optional catch-up reload on WebUI launch if 24 hours have elapsed. This is not a background updater.
- **Original features remain:** Xray protocols, config editor, routing rules, DNS options and root WebUI.

### Not enabled yet

Per-device bandwidth and data quotas are **not implemented** pending validation of `tc`/Netfilter support on Redmi Note 8T/MIUI. IPv6 is controlled by the existing switch and should be tested separately. A local handset test is essential before relying on tether blocking or traffic recovery.

### Get the Magisk ZIP

On GitHub, open **Actions** to download the `magic_v2ray-arm64-v8a` artifact from a successful build, or open **Releases** after a successful release workflow. Unzip the GitHub Actions artifact first; the inner V2Ray-Magic `.zip` is the flashable Magisk module.

The repo is private, so `updateJson` has deliberately been disabled. Magisk's standard unauthenticated updater cannot fetch a private release URL. Future source changes belong to this repo; each must pass CI before building.

### Installation checklist

1. Back up existing `/data/adb/magic_v2ray` configs and any active module settings.
2. Install the `arm64-v8a` ZIP through Magisk; reboot.
3. Test 4G with proxy **off**, then proxy **on**, then Wi-Fi ↔ 4G handovers.
4. Check Hotspot and multiple devices before enabling IP blocking. Confirm normal connectivity after stopping Xray and rebooting.
5. Keep a recovery path in Magisk if a ROM/kernel incompatibility appears.
