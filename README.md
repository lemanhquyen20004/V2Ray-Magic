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
