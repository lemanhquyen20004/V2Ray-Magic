# V2Ray-Magic change log

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
