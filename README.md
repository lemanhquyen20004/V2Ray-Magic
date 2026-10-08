# V2Ray-Magic

**Maintainer and release owner:** [lemanhquyen20004](https://github.com/lemanhquyen20004)  
**Current release series:** v0.0.1 (versionCode 169 for compatibility with existing Magisk installs).

**Copyright:** © 2026 lemanhquyen20004 for original V2Ray-Magic modifications and contributions by this project owner. Upstream Magic V2Ray and third-party copyright remain with their respective copyright holders; this derivative stays under **GNU GPL-3.0**. See [COPYRIGHT.md](COPYRIGHT.md) and [LICENSE](LICENSE).


Fork-based maintenance of [Magic V2Ray](https://github.com/vincentng295/Magic_V2Ray) for rooted Android devices, with reliability improvements and Vietnamese notes.

> This project is derived from Magic V2Ray by HuskyDG and vincentng295. Licensed under GPL-3.0. Work-in-progress: fixes are reviewed and tested by GitHub Actions; actual mobile data / hotspot behavior must be verified on the device before everyday use.

## Focus

- Reliable start/stop and fail-safe cleanup for Xray and TUN.
- Correct config file paths throughout the root controller and WebUI.
- Preserve 4G access and restore modified kernel network parameters.
- Maintain the original WebUI, node support, and hotspot routing.

See [README_vi.md](README_vi.md) for original documentation and [CHANGELOG.md](CHANGELOG.md) for project changes.

## Installation and updates

The repository owner must switch the repo to public via GitHub Settings → General → Danger Zone → Change repository visibility. Until public, the Magisk update manifest cannot be fetched anonymously. Once public, the update manifest at `main/update.json` can serve Magisk updates. CI builds ZIP artifacts using downloaded Xray/helper/geodata dependencies. Verify mobile data, hotspot, IPv6 and stop/uninstall behavior on an Android device before regular use.

## v1.23.1 changes

- Public GitHub update manifest for Magisk (Release ZIP is universal across supported ABIs).
- A staged `config.v2.json.pending` is validated before replacing the existing configuration; `.previous` supports manual recovery.
- The root controller now awaits the daemon's actual command result rather than assuming that writing into a FIFO means success.
- Read-only Network Diagnostics tab and interactive restore action for on-device testing.
- Added mandatory route/TUN/mark-chain integrity check before keeping traffic redirected.
- Detailed **Redmi Note 8T** test checklist: [docs/TEST_REDMINOTE8T_VI.md](docs/TEST_REDMINOTE8T_VI.md).
- **Hardware validation still required.** Kernel offload and Android Netfilter implementations vary; never rely on quota as a billing limit.

## v1.23.0 features (experimental on MIUI)

- **Safe Xray controls:** preflight `xray run -test`, TUN startup rollback, and a 15-second crash watchdog that removes stale proxy routes.
- **Dashboard:** live network-interface traffic counters, rates and an opt-in game setting.
- **Hotspot Manager:** discovers current IPv4 neighbors on AP interfaces and can block/unblock *forwarded* Internet access for an IP. Android MAC/IP reporting varies; there is no guarantee every tether client is visible.
- **Game Mode:** stops applying only the upstream default UDP/443 blocking rule when turned on; does not change radio parameters or guarantee lower latency.
- **Subscriptions:** user-triggered batch reload and optional catch-up reload on WebUI launch if 24 hours have elapsed. This is not a background updater.
- **Original features remain:** Xray protocols, config editor, routing rules, DNS options and root WebUI.

### Not enabled yet

Per-device quotas and AP-downlink shaping are now **experimental, opt-in and kernel dependent**, not proven on Redmi Note 8T/MIUI. IPv6 is controlled by the existing switch and should be tested separately. A local handset test is essential before relying on tether blocking or traffic recovery.

### Get the Magisk ZIP

On GitHub, open **Actions** to download the `magic_v2ray-arm64-v8a` artifact from a successful build, or open **Releases** after a successful release workflow. Unzip the GitHub Actions artifact first; the inner V2Ray-Magic `.zip` is the flashable Magisk module.

The `updateJson` URL is configured but anonymous Magisk updates will work only after the repo owner changes visibility to Public. A private release URL is not accessible to Magisk. Future source changes belong to this repo; each must pass CI before building.

### Installation checklist

1. Back up existing `/data/adb/magic_v2ray` configs and any active module settings.
2. Install the `arm64-v8a` ZIP through Magisk; reboot.
3. Test 4G with proxy **off**, then proxy **on**, then Wi-Fi ↔ 4G handovers.
4. Check Hotspot and multiple devices before enabling IP blocking. Confirm normal connectivity after stopping Xray and rebooting.
5. Keep a recovery path in Magisk if a ROM/kernel incompatibility appears.

### Experimental per-client limits (v1.23.0)

- Per-client session quota in MiB uses iptables `xt_quota2`. Unavailable kernels **do not enforce a quota** and log QUOTA_UNSUPPORTED; data counters may reset on rule reinstall/reboot. This is not a reliable per-day billing cap.
- Optional download-only rate shaping uses `tc` HTB/U32 on the Hotspot AP interface. Upload shaping is not implemented. Unsupported or occupied qdiscs are left untouched.
- Existing AP devices are detected via the neighbor cache, which may be empty or stale. IP policies are tied to addresses, so DHCP reassignment can change who owns an address.
- A 15-second watchdog reconnects hotspot policies upon AP interface changes. Do not rely on it to guarantee zero unprotected packets during transitions.
- The GitHub Actions workflow validates POSIX shell syntax, ShellCheck, JavaScript syntax/integrity and creates ARM64, x86 and universal ZIPs. **Neither radio performance nor Android networking can be proven by GitHub CI**.
