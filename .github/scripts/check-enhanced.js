'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('webroot/index.html', 'utf8');
const js = fs.readFileSync('webroot/enhanced.js', 'utf8');
const shell = fs.readFileSync('hotspot_manager.sh', 'utf8');
for (const key of ['vm-down-speed', 'vm-up-speed', 'vm-game-mode', 'vm-hotspot-clients', 'vm-refresh-hotspot']) {
  assert.ok(html.includes('id="' + key + '"'), 'missing UI field: ' + key);
}
for (const asset of ['enhanced.css', 'enhanced.js']) {
  assert.ok(html.includes(asset), 'asset not loaded: ' + asset);
}
assert.ok(js.includes('hotspot_manager.sh'), 'hotspot UI disconnected from root helper');
assert.ok(shell.includes('-i "$iface" -j "$CHAIN"'), 'hotspot controls must match AP ingress interface');
assert.ok(!shell.includes('rmnet'), 'hotspot helper must never manipulate mobile interfaces');
assert.ok(shell.includes('valid_ip'), 'untrusted client address must be validated');

// Verify that the optional game profile ONLY bypasses the upstream's own
// UDP/443 block and never a custom/user rule.
const ctx = vm.createContext({console, URL, URLSearchParams});
vm.runInContext(fs.readFileSync('webroot/helper.js', 'utf8'), ctx, {filename: 'helper.js'});
const input = [
  {remarks:'阻断udp443', enabled:true, port:'443', network:'udp', outboundTag:'block'},
  {remarks:'my custom block', enabled:true, port:'443', network:'udp', outboundTag:'block'},
  {remarks:'proxy games', enabled:true, port:'1234', network:'udp', outboundTag:'proxy'}
];
ctx.testRoutingInput = input;
const off = vm.runInContext('_buildCustomRoutingRules(testRoutingInput, {}, false)', ctx);
const on  = vm.runInContext('_buildCustomRoutingRules(testRoutingInput, {}, true)', ctx);
assert.equal(off.length, 3);
assert.equal(on.length, 2);
assert.equal(on.filter(x => x.outboundTag === 'block').length, 1);
assert.ok(on.some(x => x.port === '1234'));

// The optional limits must stay anchored to AP FORWARD only and never touch
// kernel global forwarding, mobile interface policy routes or occupied qdiscs.
const limits = fs.readFileSync('hotspot_limits.sh', 'utf8');
assert.ok(limits.includes('-i "$ap" -j "$CHAIN"'), 'quota uplink AP ingress scope missing');
assert.ok(limits.includes('-o "$ap" -j "$CHAIN"'), 'quota downlink AP egress scope missing');
assert.ok(limits.includes('quota2 --name'), 'per-client kernel quota support missing');
assert.ok(limits.includes('existing qdisc owned by Android'), 'qdisc safety check missing');
assert.ok(!/ip rule add|ip route replace|rmnet[0-9]|net\.ipv4\.ip_forward/.test(limits),
  'hotspot limits must not change cellular/policy routing');
assert.ok(html.includes('vm-limit-fields') || js.includes('vm-limit-fields'), 'per-device limit UI missing');

// Validate Magisk update metadata against the source version before publish.
const prop = fs.readFileSync('module.prop', 'utf8');
const meta = Object.fromEntries(prop.split(/\r?\n/).filter(x => /^[a-zA-Z][a-zA-Z0-9_]*=/.test(x))
  .map(x => {const idx=x.indexOf('='); return [x.slice(0,idx),x.slice(idx+1)];}));
const manifest = JSON.parse(fs.readFileSync('update.json', 'utf8'));
assert.equal(manifest.version, meta.version, 'update manifest version must match module.prop');
assert.equal(String(manifest.versionCode), meta.versionCode, 'update versionCode must match module.prop');
assert.match(meta.updateJson, /^https:\/\//, 'Magisk update URL must be HTTPS');
assert.ok(manifest.zipUrl.includes(meta.version.split(' ')[0]), 'ZIP must target this release version');
assert.ok(manifest.zipUrl.includes('-universal.zip'), 'Magisk updater must use a cross-architecture ZIP');

// A successful FIFO write is not sufficient to prove a control operation
// succeeded. The daemon must return its real result to the UI.
const control = fs.readFileSync('proxy_control.sh', 'utf8');
const service = fs.readFileSync('service.sh', 'utf8');
assert.ok(control.includes('cmd_result.$'), 'controller must await a result for its own PID');
assert.ok(service.includes('cmd_result.$reply_id'), 'service must report result to caller');
assert.ok(service.includes('result=$?'), 'service must record nonzero command errors');
assert.ok(service.includes('reload_config)') && service.includes('restart_xray\n            return $?'),
  'reload must preserve restart failure code');

// Do not destroy a previously-working config on an invalid node/URI import.
const main = fs.readFileSync('webroot/main.js', 'utf8');
assert.ok(main.includes('function writeValidatedConfig('), 'config must be preflighted');
assert.ok(main.includes("CONFIG_JSON.replace(/\\.json$/, '.pending.json')"),
  'candidate must have a .json extension for Xray auto format recognition');
assert.ok(!main.includes("CONFIG_JSON + '.pending'"),
  'old .pending file extension breaks Xray automatic config parsing');
assert.ok(main.includes("CONFIG_JSON + '.previous'"), 'last config backup is required');
assert.ok(main.includes('run -test -format=json -c'), 'must explicitly validate JSON with Xray');
assert.ok(main.includes("tail -n 5 "), 'validator should surface actual Xray diagnostics');
assert.equal((main.match(/writeValidatedConfig\(res\.config,/g) || []).length, 2,
  'normal and professional editors must both validate');

// Execute the config-staging function under a controlled JS bridge (not root)
// to catch command construction regressions without an Android test device.
const begin = main.indexOf('function writeValidatedConfig(content, callback) {');
const finish = main.indexOf('\nfunction saveProfiles()', begin);
assert.ok(begin >= 0 && finish > begin, 'cannot isolate validation function');
let staged = '';
let rootCommand = '';
const sandbox = {
  CONFIG_JSON: '/data/adb/magic_v2ray/config.v2.json',
  DATADIR: '/data/adb/magic_v2ray',
  MODDIR: '/data/adb/modules/magic_v2ray',
  shQuote: text => "'" + String(text).replace(/'/g, "'\\''") + "'",
  writeFileB64: (path, content, cb) => {
    staged = path;
    cb('', '', 0);
  },
  execShell: (cmd, cb) => {
    rootCommand = cmd;
    cb('', '', 0);
  }
};
vm.runInNewContext(main.slice(begin, finish), sandbox);
vm.runInNewContext('writeValidatedConfig("{}", () => {});', sandbox);
assert.equal(staged, '/data/adb/magic_v2ray/config.v2.pending.json');
assert.match(rootCommand, /run -test -format=json -c/);
assert.ok(rootCommand.includes("config-validation.log"), 'validator log missing');
assert.ok(rootCommand.includes("previous config preserved"), 'error must preserve old config');

// A quota must be one shared named counter regardless of traffic direction.
assert.ok(limits.includes('-s "$ip" -m quota2 --name "$counter_name"'));
assert.ok(limits.includes('-d "$ip" -m quota2 --name "$counter_name"'));
assert.ok(limits.includes('/proc/net/xt_quota/mv2r_$short'));
const diagnostic = fs.readFileSync('diagnostic.sh', 'utf8');
assert.ok(html.includes('id="vm-network-report"'), 'diagnostic display missing');
assert.ok(diagnostic.includes('Xray binary:') && diagnostic.includes('TUN interface:'),
  'diagnostic must inspect Xray + TUN');
assert.ok(!/rm -rf|ip rule add|iptables -F|kill -9/.test(diagnostic),
  'read-only diagnosis must never mutate firewall or stop the radio');

assert.ok(service.includes('check_proxy_route_integrity()'), 'mandatory TUN/network health verifier missing');
assert.ok(service.includes('! check_proxy_route_integrity; then'),
  'start must fail open if routing integrity is lost');
assert.ok(html.includes('id="vm-restore-config"'), 'manual config recovery button missing');
assert.ok(js.includes('async function restorePreviousConfig()'),
  'manual config recovery function missing');
// Regression: v0.0.2 accidentally used a single '$' instead of '$$'.
// The PID token then wasn't numeric, the service never acknowledged Start,
// and a full-screen overlay made the WebUI appear frozen for ~30 seconds.
assert.ok(control.includes('local path="$RUN_DIR/cmd_result.$$"'), 'controller must use the shell PID');
assert.ok(control.includes('send_cmd "$1|' + '$' + '$' + '"'),
  'start/reload requests must carry the shell PID as a numeric reply ID');
assert.ok(service.includes('cmd_result.$reply_id'), 'root service must acknowledge matching reply PID');

const startSection = main.slice(main.indexOf('async function toggleService(action)'),
  main.indexOf('const extractUrisFromText'));
assert.ok(main.includes('noOverlay = false') && main.includes('if (!noOverlay) showLoading('),
  'Start must be able to skip the global touch-blocking loader');
assert.ok(startSection.includes('noOverlay: true'), 'start must not show full-screen overlay');
assert.ok(!startSection.includes('proxy_control.sh reapply'),
  'start must not reapply Netfilter rules before root service startup');
assert.ok(startSection.includes('setTimeout(() => finish(false, true), 20000)'),
  'UI must recover from a stuck root bridge');
assert.ok(startSection.includes('button.disabled = false'), 'start button must be re-enabled after error');
assert.ok(main.includes("startOnly ? 'start' : 'restart'"),
  'normal/pro config startup must support start without forcing full restart');

// Network safety regression guards: user reported loss of 4G AND Wi-Fi.
const rescue = fs.readFileSync('emergency.sh', 'utf8');
const installer = fs.readFileSync('customize.sh', 'utf8');
const cleaner = fs.readFileSync('cleanup_installer.sh', 'utf8');
const stylesheet = fs.readFileSync('webroot/enhanced.css', 'utf8');
const layout = fs.readFileSync('webroot/index.html', 'utf8');
assert.ok(rescue.includes('DIRECT_RECOVERY_COMPLETE'), 'direct recovery must be callable without Xray');
assert.ok(!rescue.includes('iptables -F') && !rescue.includes('kill -9') && !rescue.includes('airplane_mode'),
  'direct recovery must not reset Android global firewall or radio');
assert.ok(!/drop_rule\s+"\$tool"\s+-I/.test(rescue), 'direct recovery must never insert iptables rules');
assert.ok(service.includes('enable_forward() {\n    :'), 'Android, not the module, controls system forwarding');
assert.ok(service.includes('IPv6 proxy disabled: leaving Android IPv6 traffic untouched'),
  'turning off IPv6 proxy must not globally block IPv6');
assert.ok(!service.includes('kill -9 "${pid_dir##*/}"'),
  'IP hunter must not kill com.android.phone');
assert.ok(!service.includes('$iptables -t nat -I PREROUTING ! -i $TUN_NAME'),
  'global DNS hijacking also intercepts Wi-Fi and must remain disabled');
assert.ok(service.includes('sh "$MODDIR/emergency.sh"'), 'network failure paths must fail open');
assert.ok(service.includes('stop_xray() {\n    stop_apps_monitor\n    remove_mark_rule'),
  'stopped Xray must not leave fwmark255 physical routing');
assert.ok(service.includes('[ -f "$ENABLED_FLAG" ] && is_proc_running "xray"'),
  'network monitor must not install egress rules while proxy is stopped');
assert.ok(rescue.includes('rule del fwmark 255 priority 1000'),
  'emergency recovery must remove stale fwmark255 rules');
assert.ok(installer.includes('rm -f "$DATADIR/enabled"'), 'new installer must start in direct-network safe mode');
assert.ok(installer.includes('installed_zip_cleanup'), 'installer must only schedule exact-path cleanup');
assert.ok(cleaner.includes('sha256sum') && cleaner.includes('Download/*'),
  'ZIP cleanup must verify hash and scope to Downloads');
assert.ok(!cleaner.includes('*.zip"') && !cleaner.includes('rm -rf'),
  'ZIP cleanup must never delete arbitrary downloads');
assert.ok(layout.includes('id="vm-direct-recovery"') && layout.includes('id="vm-traffic-chart"'),
  'new dashboard and direct recovery controls missing');
assert.ok(js.includes('rescueDirectConnection') && js.includes('paintTrafficGraph'),
  'WebUI needs functional direct recovery and real network visualization');
assert.ok(stylesheet.includes('min-width:1120px') && stylesheet.includes('max-width:620px'),
  'dashboard must work on desktop and Redmi mobile screens');
console.log('V2Ray-Magic 4G/Wi-Fi fail-open, reactive dashboard and safe ZIP cleanup checks passed');

console.log('V2Ray-Magic control acknowledgement, config rollback staging and diagnostic checks passed');
