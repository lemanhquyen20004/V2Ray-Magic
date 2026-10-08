/* Box-style control panel for V2Ray-Magic, with safe Xray-only TUN policy.
 * No alternative core will be launched until its own TUN routing integration
 * is implemented and tested on Android. No subscriptions or passwords logged.
 */
(function () {
  'use strict';
  const CLI = '/data/adb/modules/magic_v2ray/v2magic.tool';
  let busy = false;
  let refreshInterval = null;
  const el = id => document.getElementById(id);
  const active = () => Boolean(el('tab-box') && el('tab-box').classList.contains('active'));
  function run(args, cb) {
    // Only literal actions from this file; never insert a subscription URI.
    execShell('sh ' + shQuote(CLI) + ' ' + args, cb);
  }
  function statusText(message, failure) {
    if (el('box-message')) {
      el('box-message').textContent = message;
      el('box-message').dataset.error = failure ? 'true' : 'false';
    }
  }
  function refresh() {
    if (!active() || busy) return;
    run('info', (out, err, code) => {
      if (!active()) return;
      if (code !== 0) {
        statusText('Không đọc được trạng thái: ' + (err || 'hãy kiểm tra root'), true);
        return;
      }
      const lines = Object.fromEntries((out || '').split('\n').map(line => {
        const i = line.indexOf(' ');
        return i > 0 ? [line.slice(0, i), line.slice(i + 1)] : ['', ''];
      }));
      const running = lines.STATUS === 'running';
      if (el('box-running')) {
        el('box-running').textContent = running ? 'Đang chạy' : lines.STATUS === 'crashed' ? 'Xray đã lỗi' : 'Đã dừng';
        el('box-running').dataset.state = lines.STATUS || 'stopped';
      }
      if (el('box-engine')) el('box-engine').textContent = lines.ENGINE || 'xray';
      if (el('box-config')) el('box-config').textContent = lines.CONFIG || '—';
      if (el('box-mode')) el('box-mode').textContent = running ? 'TUN · Root proxy' : 'DIRECT (dự kiến)';
    });
  }
  function command(action) {
    if (busy || !['start', 'stop', 'restart', 'recover', 'core check'].includes(action)) return;
    if (action === 'start' || action === 'restart') {
      // The main Dashboard generates/stages the latest selected node.
      // Direct CLI assumes config.v2.json is already available.
      statusText('Đang thực hiện ' + action + ' với cấu hình đã lưu…', false);
    }
    busy = true;
    el('tab-box')?.querySelectorAll('button[data-box-action]').forEach(b => { b.disabled = true; });
    let done = false;
    const timeout = setTimeout(() => complete('', 'Xray phản hồi quá lâu; mở Chẩn đoán mạng.', 1), 35000);
    function complete(out, err, code) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      busy = false;
      el('tab-box')?.querySelectorAll('button[data-box-action]').forEach(b => { b.disabled = false; });
      statusText(code === 0 ? 'Thực hiện thành công: ' + action
        : 'Không thực hiện được ' + action + ': ' + (err || out || 'xem log Xray'), code !== 0);
      refresh();
      if (typeof updateStatusDisplay === 'function') updateStatusDisplay();
    }
    run(action, complete);
  }
  function readCores() {
    run('core list', (out, err, code) => {
      const list = el('box-core-list');
      if (!list) return;
      list.replaceChildren();
      if (code !== 0) {
        const p = document.createElement('p'); p.textContent = err || 'Không tải được core'; list.appendChild(p); return;
      }
      (out || '').split('\n').filter(x => x.startsWith('CORE ')).forEach(line => {
        const fields = line.trim().split(/\s+/);
        if (fields.length < 4) return;
        const row = document.createElement('div');
        row.className = 'box-core-row';
        const name = document.createElement('strong');
        name.textContent = fields[1];
        const msg = document.createElement('span');
        msg.textContent = fields[3] === 'active' ? 'Đang hỗ trợ TUN' :
          fields[2] === 'installed' ? 'Đã có binary · chưa hỗ trợ TUN' : 'Chưa tích hợp TUN';
        const tag = document.createElement('span');
        tag.className = 'box-core-tag';
        tag.textContent = fields[3] === 'active' ? 'Active' : 'Chưa chọn được';
        row.append(name, msg, tag);
        list.appendChild(row);
      });
    });
  }
  function loadLogs() {
    run('logs 70', (out, err, code) => {
      if (el('box-console')) {
        el('box-console').textContent = code === 0 ? (out || 'Chưa có log') : 'Lỗi: ' + (err || 'Không đọc được');
      }
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    el('tab-box')?.querySelectorAll('button[data-box-action]').forEach(button => {
      button.addEventListener('click', () => command(button.dataset.boxAction));
    });
    el('box-core-refresh')?.addEventListener('click', readCores);
    el('box-view-logs')?.addEventListener('click', loadLogs);
    el('box-open-nodes')?.addEventListener('click', () => {
      if (typeof switchTab === 'function') switchTab('tab-dashboard');
    });
    const nav = document.querySelector('[data-tab="tab-box"]');
    nav?.addEventListener('click', () => { setTimeout(() => { refresh(); readCores(); }, 80); });
    refreshInterval = setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  });
})();
