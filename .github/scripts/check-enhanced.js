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

console.log('V2Ray-Magic UI integrity and Game Mode routing tests passed');
