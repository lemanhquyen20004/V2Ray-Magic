'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const html = fs.readFileSync('webroot/index.html','utf8');
const main = fs.readFileSync('webroot/main.js','utf8');
const ui = fs.readFileSync('webroot/box-ui.js','utf8');
const ctl = fs.readFileSync('v2magic.tool','utf8');
const installer = fs.readFileSync('customize.sh','utf8');
const build = fs.readFileSync('build.sh','utf8');
for(const id of ['tab-box','box-running','box-core-list','box-console','box-message',
  'box-open-nodes','box-core-refresh','box-view-logs']) {
  assert.ok(html.includes('id="'+id+'"'), 'Box UI missing '+id);
}
assert.ok(html.includes('<script src="box-ui.js">'),'Box UI script not linked');
assert.ok(ui.includes("run('core list'"),'Box core status not connected');
assert.ok(ctl.includes('sh "$CTRL" "$cmd"'), 'service controller must reuse FIFO');
assert.ok(ctl.includes('sh "$MODDIR/emergency.sh"'), 'recover must restore DIRECT');
assert.ok(ctl.includes('unsupported'), 'unimplemented cores must be explicit');
assert.ok(!/exec\s+sing-box|openxtun\s+.*sing-box|exec\s+mihomo/.test(ctl),
  'never launch untested core with Xray routing');
assert.ok(ctl.includes('--connect-timeout 3 --max-time 4'), 'TCP probe must be bounded');
assert.ok(ctl.includes('valid_host "$host"'), 'TCP host validated');
assert.ok(main.includes('NODE_TEST_CONCURRENCY = 4'), 'avoid 10 parallel Xray processes');
assert.ok(main.includes('async function _execTcpNodeProbe('));
assert.ok(main.includes('HTTP ' + '$' + '{Math.round(val * 1000)}ms'), 'HTTP label missing');
assert.ok(main.includes('Đo TCP toàn bộ node'), 'category action missing');
assert.ok(main.includes('Đo TCP (máy chủ)'), 'per-node action missing');
assert.ok(installer.includes('"v2magic.tool"'), 'CLI must be extracted');
assert.ok(build.includes('    v2magic.tool'), 'ZIP must bundle CLI');
const cmd=args=>cp.spawnSync('sh',['v2magic.tool',...args],{encoding:'utf8'});
const help=cmd(['help']);
assert.equal(help.status,0);
assert.match(help.stdout,/node tcp HOST PORT/);
const unsupported=cmd(['core','use','sing-box']);
assert.equal(unsupported.status,2);
assert.match(unsupported.stderr,/only Xray/);
assert.equal(cmd(['node','tcp','bad;host','443']).status,2);
assert.equal(cmd(['node','tcp','example.com','999999']).status,2);
const allowed=cmd(['core','use','xray']);
assert.equal(allowed.status,0);
assert.equal(allowed.stdout.trim(),'xray');
console.log('Box-style CLI and TCP/HTTP probe regression tests passed');
