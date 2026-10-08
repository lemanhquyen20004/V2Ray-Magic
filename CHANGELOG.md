# V2Ray-Magic change log

## v0.0.6 (2026-10-08) — Box-style manager foundation

- Add `v2magic.tool`: a unified POSIX shell controller for start/stop/restart/status, DIRECT recovery, diagnostics, log access, Xray config check and TCP endpoint testing.
- Add a mobile-first **Box Manager** tab for service control, installed core inventory and on-demand logs.
- Separate **TCP endpoint delay** and **HTTP-through-Xray delay** on each node. They measure different network operations and must not be compared as identical ping measurements.
- Reduce node test concurrency from 10 to 4 and remove blocking full-screen overlays from batch/single HTTP and IP tests to improve scrolling on older MIUI devices.
- Preserve existing TUN/iptables implementation with **Xray as the only active core**. sing-box, Mihomo, V2Fly and Hysteria2 appear as unsupported placeholders, not launchable alternatives; avoid switching to an untested core and breaking mobile data.
- Add CI regression tests for CLI argument validation, safe core selection, WebUI wiring and Magisk installer payload.
- Keep the existing module ID and private profiles to support updates without reinstalling.

**Pending:** full multi-core TUN backends, true per-core subscription config conversion and direct device-level 4G/Wi-Fi testing. This release does not claim those are complete.


## v0.0.5 (2026-10-08) — restore LTE/Wi-Fi and redesigned dashboard

- Preserve Android/netd IPv6 when V2Ray-Magic IPv6 proxy is disabled, rather than installing global IPv6 DROP/REJECT.
- Remove unscoped tether DNS DNAT that could hijack ordinary Wi-Fi and block Internet.
- Stop modifying cellular/Wi-Fi rp_filter and global system IPv4/IPv6 forwarding.
- Disable the destructive Mobile IP Hunter telephony restart.
- Add one-tap **Khôi phục 4G / Wi-Fi** with an independent emergency DIRECT rules-cleanup script; invoke it on core startup/reload failure, Stop and uninstall.
- Fresh installs/upgrades start in **safe direct mode** (autostart disabled until explicitly reenabled through WebUI).
- Add midnight-blue, cyan/purple glass dashboard with real live network graph, donut chart, responsive sidebar and existing proxy controls.
- Schedule automatic installer ZIP deletion **only** when the original download path is exposed under Android Downloads and its SHA256 still matches; Magisk staging copies are not the original download.
- Add CI regression checks for global route/DNS safety, dashboard wiring and scoped installer cleanup.
- **Not yet tested on Redmi Note 8T**: report diagnostic output after verifying 4G and Wi-Fi with Xray disabled and enabled.


## v0.0.4 (2026-10-08) — fix Xray config test rejecting every node

- Fix the temporary validation filename: `config.v2.json.pending` was rejected because Xray's default format detection uses the last file extension. The new candidate is `config.v2.pending.json`.
- Call Xray with `run -test -format=json -c` to explicitly set the JSON format.
- Capture validator diagnostics into a root-owned `config-validation.log` and display the last lines on failure instead of an opaque rejection message.
- Do **not** overwrite the previous working configuration when an actual validation error occurs.
- Add a simulated WebUI command-construction regression test to CI.
- Keep module ID, user profiles and existing configurations unchanged.
- **Device test required:** if an individual VLESS/Reality/WS/TLS node is still rejected after upgrading, inspect the specific Xray error displayed in the new toast.


## v0.0.3 (2026-10-08) — Xray Start freeze fix

- Fix broken root control acknowledgment IDs: use the shell PID `$` in both the reply filename and FIFO command so Start/Reload no longer wait 30 seconds for a nonexistent response.
- Remove the full-screen loading overlay from the Start button; restore the Start control after completion or a 20-second UI timeout, even when the root WebUI bridge hangs.
- Avoid unnecessary Netfilter reapplication and full Xray restart when the user only wants to start the service.
- Display a useful error if the root service fails and keep the WebUI scrollable.
- Add CI regression checks for the exact FIFO PID token and non-blocking Start interaction.
- The update preserves module ID and existing private configuration. Actual MIUI/Redmi Note 8T behavior still requires a phone-side test.


## v0.0.2 (2026-10-08) — Magisk installation hotfix

- Fix ARM64 installation failing with "Missing or empty after extraction: bin/curl".
- Bundle Android curl for each architecture from vvb2060/curl-android v8.18.0 official release APK.
- Require Xray, xhuskydg_helper and curl for every architecture before ZIP creation.
- CI unpacks each ZIP using Magisk's `unzip -j` extraction pattern and verifies the three binaries, including ARM64/x86-64 ELF validation.
- Preserve existing module ID and GPL-3.0 attribution.


## v0.0.1 (2026-10-08) — new maintainer version series

- Start the V2Ray-Magic version series at **v0.0.1**, owned and maintained by **lemanhquyen20004**.
- Magisk versionCode is **169**, deliberately higher than v1.23.1's 168 to preserve automatic update detection.
- Preserve the upstream GPL-3.0 license and the original contributors' copyright notices.
- No routing/kernel behavior changes versus V2Ray-Magic v1.23.1.


## v1.23.1 (2026-10-08) — public Magisk updates and fail-open patch

- Public GitHub repository and verified Magisk update JSON.
- Fix hotspot quota: both upload and download share a single named kernel counter.
- Add real FIFO command result acknowledgement; no more false success on failed Xray start/reload.
- Validate candidate config with Xray, retain previous config, and offer manual restore in WebUI.
- Check policy table 100, TUN and iptables mark chain before committing to proxy routing.
- New read-only network diagnostics for Android, plus mobile-responsive UI refinements.
- Add device test plan for Redmi Note 8T, Android 11.
- Limitations: per-device quota/rate depend on MIUI kernel, no persistent daily limits or verified upstream rate shaping.


## v1.23.0 (2026-10-08) — optional hotspot limits

- Opt-in hotspot quota using xt_quota2 and AP-only downlink shaping using tc HTB/u32.
- Per-device controls for MiB/session and kbit/s, with kernel support warnings.
- Reapply hotspot policies on tether-interface transitions without changing cellular interfaces.
- Magisk update manifest (public repository required).
- No two-way rate limiting, persistent daily quota, hardware offload verification or on-device integration test yet.

## v1.22.0 (2026-10-08) — safe networking & WebUI beta

- Preflight Xray configuration before start/reload and clean failed TUN startup.
- Add low-frequency crash watchdog to prevent stale routing after process death.
- New Vietnamese dashboard showing live physical-interface traffic and speeds.
- Hotspot Manager: safe interface detection, per-IP block/unblock and removal during stop/uninstall.
- Opt-in Game Mode: suppress only the upstream built-in block of UDP/443, not user-defined blocks.
- Optional 24-hour subscription check upon WebUI open; manual bulk reload.
- New integrity tests and Android shell/packaging CI checks.
- Per-device speed and data limits are intentionally **not yet available**; require device/kernel verification.

## v1.21.1 (2026-10-08) — reliability patch

- Fix root controller's mismatched config path.
- Add Xray/TUN startup fail-safe and restore network parameters when stopping.
- Clean residual bypass chains, plaintext-VLESS protections, and tether DNS rules on uninstall.
- Download routing databases during CI builds instead of storing large binary blobs in Git.
- Preserve upstream GPL-3.0 licensing and credit.

## Upstream

Derived from Magic V2Ray by HuskyDG and vincentng295: https://github.com/vincentng295/Magic_V2Ray
