# V2Ray-Magic

**Root-level Xray transparent proxy for Android**, with a mobile WebUI, hotspot tools and network-recovery safeguards.

[Tiếng Việt](README_vi.md) · [Releases](https://github.com/lemanhquyen20004/V2Ray-Magic/releases) · [Changelog](CHANGELOG.md) · [Report an issue](https://github.com/lemanhquyen20004/V2Ray-Magic/issues)

| Project | Details |
| --- | --- |
| Current version | **v0.0.1** (Magisk `versionCode=169`) |
| Xray-core | **v26.9.30** |
| Owner / maintainer | **[lemanhquyen20004](https://github.com/lemanhquyen20004)** |
| Android root support | Magisk, KernelSU and APatch (ROM/kernel compatibility varies) |
| CPU architectures | Android `arm64-v8a` and `x86_64` |
| License | **GPL-3.0**; upstream copyright remains with the original authors |

> **Beta software:** built and checked by GitHub Actions, **not yet verified on every real Android/MIUI device**. Back up your current configuration before installing.

## Features

### Proxy and network

- Transparent Xray TUN proxy with root-level routing, app exclusions, DNS/routing settings, node profiles and subscriptions.
- Xray configuration preflight before applying node changes; previous configuration backup and manual restore from WebUI.
- Startup rollback and process watchdog intended to prevent stale routes if Xray/TUN fails.
- Wi-Fi/mobile-network change monitoring, optional tethered-device proxy routing and read-only network diagnostics.
- Existing Xray configuration support includes VLESS, VMess, Trojan and other protocols/transports supported by the bundled core and configuration converter.

### Mobile WebUI

- Vietnamese and other upstream UI languages.
- Dashboard: current Android network-interface upload/download rates and totals. **These are interface counters, not per-node billing totals.**
- Node testing, configuration editing, logs, latency monitoring and Game Mode toggle.
- Manually refresh saved subscriptions; optionally refresh when opening WebUI after 24 hours. **It does not run a 24-hour background updater.**
- Game Mode changes the built-in UDP/443 block rule; **it does not guarantee lower ping** or include dedicated PUBG/Liên Quân kernel optimizations.

### Hotspot Manager — experimental

- Discover clients via Android's available IPv4 neighbor/ARP information.
- Block/unblock an identified hotspot client's **forwarded** Internet traffic by IP.
- Optional **session data quota** via `xt_quota2` (when supported), with usage reporting where the kernel provides counters.
- Optional **download-only speed limit** via `tc` HTB/U32 (when supported). Upload rate limiting is **not implemented**.

**Important limitations:** some ROMs use tethering offload, may not expose all clients or counters, or may not support `xt_quota2`/`tc`. IP addresses can be reassigned. Quotas may reset after restart or rule changes; this is **not** a reliable per-day or billing-grade limiter. Device blocking and network recovery must be tested on your phone.

## Install

1. Root your compatible Android device with Magisk, KernelSU or APatch.
2. **Back up** your existing `/data/adb/magic_v2ray` directory and any working proxy configuration.
3. Open the [latest release](https://github.com/lemanhquyen20004/V2Ray-Magic/releases/latest) and download:
   - **`arm64-v8a.zip`** for most current Android phones, including **Redmi Note 8T**.
   - `x86_64.zip` only for an x86_64 Android device.
   - `universal.zip` when architecture auto-selection is required (larger download).
4. In your root manager, choose **Install from storage**, select the **release ZIP** (not GitHub's “Source code” archive), and reboot.
5. Open the module WebUI through KernelSU/APatch or a supported WebUI host for Magisk, such as KsuWebUIStandalone.
6. Check **mobile data with the proxy off first**, then start Xray and test Wi-Fi ↔ 4G switching and hotspot separately.

See [the Redmi Note 8T test checklist](docs/TEST_REDMINOTE8T_VI.md) for step-by-step checks.

> The module ID intentionally remains `magic_v2ray` so an installation can update the existing module instead of creating a duplicate.

## Updates through Magisk

The public repository hosts [`update.json`](update.json), referenced by `module.prop`. When the maintainer **publishes a Release**, updates `update.json` and increments `versionCode`, Magisk may offer an **Update** action at its next update check. Install the update and reboot; you do not need to download every new ZIP manually.

- **No automatic push notification is guaranteed.** Magisk controls when it checks for updates.
- **v0.0.1 has `versionCode=169`** so devices previously running V2Ray-Magic v1.23.1 (`versionCode=168`) can still recognize it as a newer update.
- Editing source code alone does **not** publish an update; a new Release plus manifest update is needed.

## Troubleshooting

- **4G stops working:** stop Xray from WebUI, check **Network Diagnostics**, and verify Internet access. If needed, disable the module in Magisk and reboot.
- **Xray does not start:** check the configuration and the service log; use the **Restore previous Xray configuration** button if a change caused the problem.
- **Hotspot client not shown:** reconnect it and refresh the list; Android may not expose a current neighbor entry.
- **Quota or speed limit ignored:** your kernel may not support `xt_quota2` or `tc`, or tethering offload may bypass counters. Do not depend on enforcement until independently tested.
- Share diagnostic output when reporting bugs, but **remove UUIDs, subscription tokens, server passwords and other sensitive data**.

[Open a GitHub issue](https://github.com/lemanhquyen20004/V2Ray-Magic/issues) for reproducible bugs.

## Source, copyright and credits

**V2Ray-Magic is maintained and released by [lemanhquyen20004](https://github.com/lemanhquyen20004).** © 2026 lemanhquyen20004 applies to original project-owned additions and modifications. Ownership of this repository **does not transfer copyright** in upstream code or third-party dependencies.

This project derives from [Magic V2Ray](https://github.com/vincentng295/Magic_V2Ray), with credit to **HuskyDG, vincentng295 and other original contributors**, and remains distributed under the **GNU General Public License v3.0**. See [COPYRIGHT.md](COPYRIGHT.md) and [LICENSE](LICENSE).

Xray-core, the TUN helper, third-party tools and routing databases retain their applicable upstream licenses.
