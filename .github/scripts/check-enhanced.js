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
assert.ok(!/ip rule add|ip route replace|rmnet[0-9]|net\\.ipv4\\.ip_forward/.test(limits),
  'hotspot limits must not change cellular/policy routing');
assert.ok(html.includes('vm-limit-fields') || js.includes('vm-limit-fields'), 'per-device limit UI missing');

// Validate Magisk update metadata against the source version before publish.
const prop = fs.readFileSync('module.prop', 'utf8');
const meta = Object.fromEntries(prop.split(/\\r?\\n/).filter(x => /^[a-zA-Z][a-zA-Z0-9_]*=/.test(x))
  .map(x => {const idx=x.indexOf('='); return [x.slice(0,idx),x.slice(idx+1)];}));
const manifest = JSON.parse(fs.readFileSync('update.json', 'utf8'));
assert.equal(manifest.version, meta.version, 'update manifest version must match module.prop');
assert.equal(String(manifest.versionCode), meta.versionCode, 'update versionCode must match module.prop');
assert.match(meta.updateJson, /^https:\/\//, 'Magisk update URL must be HTTPS');
assert.ok(manifest.zipUrl.includes(meta.version.split(' ')[0]), 'ZIP must target this release version');
assert.ok(manifest.zipUrl.includes('-universal.zip'), 'Magisk updater must use a cross-architecture ZIP');

console.log('V2Ray-Magic dashboard, quota guards, game routing and update manifest tests passed');
