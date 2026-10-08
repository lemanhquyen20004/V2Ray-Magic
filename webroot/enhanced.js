/* V2Ray-Magic enhancements: lightweight dashboard, game switch, hotspot clients.
 * Keep these functions separate from upstream main.js for easier maintenance.
 */
(function () {
  'use strict';
  const path = '/data/adb/modules/magic_v2ray/hotspot_manager.sh';
  let netTimer = null;
  let lastCounters = null;
  let hotspotBusy = false;

  function ui(id) { return document.getElementById(id); }
  function formatBytes(n) {
    if (!Number.isFinite(n) || n < 0) return '—';
    if (n < 1024) return Math.round(n) + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let v = n, i = -1;
    do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
    return v.toFixed(v >= 100 ? 0 : 1) + ' ' + units[i];
  }
  function refreshTrafficStats() {
    if (!ui('tab-dashboard')?.classList.contains('active') || document.hidden) return;
    execShell('cat /proc/net/dev; echo __MV2R_ROUTE__; /system/bin/ip route get 8.8.8.8', (result, stderr, errno) => {
      if (errno !== 0 || !result) return;
      const parts = result.split('__MV2R_ROUTE__');
      if (parts.length !== 2) return;
      const match = parts[1].match(/\bdev\s+([\w.:-]+)/);
      if (!match) return;
      const name = match[1];
      const row = parts[0].split('\n').find(l => l.includes(':') && l.split(':')[0].trim() === name);
      if (!row) return;
      const values = row.split(':').slice(1).join(':').trim().split(/\s+/);
      const rx = Number(values[0]), tx = Number(values[8]);
      if (!Number.isFinite(rx) || !Number.isFinite(tx)) return;
      const now = Date.now();
      ui('vm-iface').textContent = name;
      ui('vm-down-total').textContent = formatBytes(rx);
      ui('vm-up-total').textContent = formatBytes(tx);
      if (lastCounters && lastCounters.name === name && now > lastCounters.now
          && rx >= lastCounters.rx && tx >= lastCounters.tx) {
        const seconds = (now - lastCounters.now) / 1000;
        ui('vm-down-speed').textContent = formatBytes((rx - lastCounters.rx) / seconds) + '/s';
        ui('vm-up-speed').textContent = formatBytes((tx - lastCounters.tx) / seconds) + '/s';
      } else {
        ui('vm-down-speed').textContent = '—';
        ui('vm-up-speed').textContent = '—';
      }
      lastCounters = { name, rx, tx, now };
    });
  }
  function refreshTimer() {
    if (netTimer) clearInterval(netTimer);
    netTimer = null;
    if (ui('tab-dashboard')?.classList.contains('active') && !document.hidden) {
      refreshTrafficStats();
      netTimer = setInterval(refreshTrafficStats, 3000);
    }
  }
  function hotspotAction(action, ip, callback) {
    if (!['list', 'apply', 'block', 'unblock'].includes(action)) return;
    if (ip && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) return;
    execShell('sh ' + shQuote(path) + ' ' + action + (ip ? ' ' + shQuote(ip) : ''), callback);
  }
  function showHotspotMessage(message) {
    const elem = ui('vm-hotspot-hint');
    if (elem) elem.textContent = message;
  }
  function renderHotspot(output) {
    const holder = ui('vm-hotspot-clients');
    if (!holder) return;
    holder.replaceChildren();
    const lines = (output || '').trim().split('\n');
    const status = lines.find(line => line.startsWith('STATUS ')) || 'STATUS NO_HOTSPOT';
    const iface = status.slice(7).trim();
    const rows = lines.filter(line => line.startsWith('CLIENT ')).map(line => line.split(/\s+/));
    const count = rows.length;
    const active = iface !== 'NO_HOTSPOT';
    showHotspotMessage(active
      ? 'Giao diện phát Wi-Fi: ' + iface + ' · ' + count + ' thiết bị đang nhận diện'
      : 'Chưa tìm thấy giao diện Hotspot phù hợp. Hãy bật điểm phát Wi-Fi rồi làm mới.');
    if (!active || !count) {
      const p = document.createElement('p');
      p.className = 'vm-muted';
      p.textContent = active ? 'Chưa có thiết bị trong bảng ARP/neighbor của Android.' : 'Không có dữ liệu thiết bị.';
      holder.appendChild(p);
      return;
    }
    rows.forEach(row => {
      const ip = row[1], mac = row[2], isBlocked = row[3] === 'blocked';
      if (!ip || !mac || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) return;
      const item = document.createElement('div');
      item.className = 'vm-client-row';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = ip;
      const sub = document.createElement('small');
      sub.textContent = mac + ' · ' + (isBlocked ? 'Đã chặn' : 'Đang cho phép');
      details.append(title, sub);
      const toggle = document.createElement('button');
      toggle.className = 'btn btn-secondary';
      toggle.textContent = isBlocked ? 'Bỏ chặn' : 'Chặn';
      toggle.addEventListener('click', () => {
        toggle.disabled = true;
        hotspotAction(isBlocked ? 'unblock' : 'block', ip, (_out, err, code) => {
          if (code !== 0) showHotspotMessage('Không thể áp dụng: ' + (err || 'thiếu quyền/không hỗ trợ'));
          refreshHotspot();
        });
      });
      item.append(details, toggle);
      holder.appendChild(item);
    });
  }
  function refreshHotspot() {
    if (hotspotBusy) return;
    hotspotBusy = true;
    hotspotAction('apply', null, () => {
      hotspotAction('list', null, (out, err, code) => {
        hotspotBusy = false;
        if (code !== 0) {
          showHotspotMessage('Không đọc được danh sách: ' + (err || 'hãy kiểm tra module'));
          return;
        }
        renderHotspot(out);
      });
    });
  }
  // Optional profile: do not disable Xray's firewall or change any OS routes.
  // Only skip the original all-UDP/443 block rule to avoid blocking game UDP/QUIC.
  function saveGameMode() {
    const toggle = ui('vm-game-mode');
    if (!toggle) return;
    const before = advSettings.gameMode === true;
    advSettings.gameMode = toggle.checked;
    const next = utoa(JSON.stringify(advSettings));
    writeFileB64(SETTINGS_FILE, next, (_out, err, code) => {
      if (code !== 0) {
        advSettings.gameMode = before;
        toggle.checked = before;
        showToast('Không lưu được Game Mode: ' + (err || 'lỗi ghi file'), 'error');
        return;
      }
      applyActiveConfig();
      showToast(toggle.checked ? 'Đã bật Game Mode; kiểm tra độ trễ thực tế.' : 'Đã tắt Game Mode.', 'info');
    });
  }
  function reloadSavedSubscriptions() {
    const cats = Object.keys(profiles).filter(c => profiles[c] && profiles[c].url);
    if (!cats.length) return showToast('Chưa lưu đường dẫn subscription.', 'info');
    // Avoid parallel requests and root shell congestion. The original
    // reloadCategory UI still handles each subscription/notification.
    cats.slice(0, 20).forEach((cat, i) => setTimeout(() => reloadCategory(cat), i * 2500));
    showToast('Đang tải lại tối đa 20 subscription đã lưu.', 'info');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const game = ui('vm-game-mode');
    if (game) {
      // Loaded asynchronously by loadState(), therefore bind after it resolves.
      setTimeout(() => { game.checked = advSettings.gameMode === true; }, 500);
      game.addEventListener('change', saveGameMode);
    }
    ui('vm-refresh-hotspot')?.addEventListener('click', refreshHotspot);
    ui('vm-reload-subs')?.addEventListener('click', reloadSavedSubscriptions);
    ui('vm-hotspot-nav')?.addEventListener('click', refreshHotspot);
    document.addEventListener('visibilitychange', refreshTimer);
    document.querySelectorAll('.tab-menu-item').forEach(button => {
      button.addEventListener('click', () => setTimeout(refreshTimer, 50));
    });
    refreshTimer();
  });
})();
