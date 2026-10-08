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

  function limitAction(action, ip, number, callback) {
    if (!['set-quota', 'set-speed', 'clear', 'list'].includes(action)) return;
    if (action !== 'list' && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip || '')) return;
    if (action !== 'list' && action !== 'clear' && (!Number.isInteger(number) || number < 0 || number > 1048576)) return;
    const cmd = 'sh ' + shQuote('/data/adb/modules/magic_v2ray/hotspot_limits.sh') + ' ' + action
      + (ip ? ' ' + shQuote(ip) : '')
      + (action === 'set-quota' || action === 'set-speed' ? ' ' + number : '');
    execShell(cmd, callback);
  }
  function showHotspotMessage(message) {
    const elem = ui('vm-hotspot-hint');
    if (elem) elem.textContent = message;
  }
  function renderHotspot(output, limitsText) {
    const limits = new Map();
    (limitsText || '').trim().split('\n').forEach(line => {
      const m = /^LIMIT\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+)\s+(\d+)$/.exec(line);
      if (m) limits.set(m[1], {quota: Number(m[2]), rate: Number(m[3])});
      const usage = /^USAGE\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+)$/.exec(line);
      if (usage && limits.has(usage[1])) {
        limits.get(usage[1]).usedBytes = Number(usage[2]);
      }
    });
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
      const fields = document.createElement('div');
      fields.className = 'vm-limit-fields';
      const rule = limits.get(ip) || {quota: 0, rate: 0};
      if (rule.quota > 0) {
        const usageLabel = document.createElement('small');
        usageLabel.textContent = Number.isFinite(rule.usedBytes)
          ? 'Đã dùng trong phiên: ' + formatBytes(rule.usedBytes) + ' / ' + rule.quota + ' MiB'
          : 'Dung lượng đã dùng: kernel không cung cấp bộ đếm';
        details.appendChild(usageLabel);
      }
      [['Dung lượng (MiB / phiên)', 'set-quota', rule.quota, 1048576],
       ['Giới hạn tải xuống (kbit/s)', 'set-speed', rule.rate, 1000000]].forEach(([labelText, action, stored, max]) => {
        const label = document.createElement('label');
        const title = document.createElement('span');
        title.textContent = labelText;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = String(max);
        input.step = '1';
        input.value = String(stored);
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'btn btn-secondary';
        save.textContent = 'Áp dụng';
        save.addEventListener('click', () => {
          const value = Number(input.value);
          if (!Number.isInteger(value) || value < 0 || value > max) {
            showHotspotMessage('Giá trị giới hạn không hợp lệ.');
            return;
          }
          save.disabled = true;
          limitAction(action, ip, value, (out, err, code) => {
            save.disabled = false;
            if (code !== 0 || /UNSUPPORTED/.test(err || '')) {
              showHotspotMessage('Giới hạn chưa được áp dụng: ' + (err || 'lỗi hoặc kernel không hỗ trợ'));
            } else {
              showHotspotMessage('Đã cập nhật giới hạn cho ' + ip + '.');
            }
            refreshHotspot();
          });
        });
        label.append(title, input, save);
        fields.appendChild(label);
      });
      item.appendChild(fields);
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

        limitAction('list', null, null, (limitsText, err2, code2) => {
          renderHotspot(out, code2 === 0 ? limitsText : '');
          if (code2 !== 0) showHotspotMessage('Không đọc được giới hạn: ' + (err2 || 'lỗi thiết bị'));
        });
      });
    });
  }
  // Optional profile: do not disable Xray's firewall or change any OS routes.
  // Only skip the original all-UDP/443 block rule to avoid blocking game UDP/QUIC.
  // Read-only report. No proxy configuration content or server credentials.
  // Explicit user recovery; never changes network policy or restarts Xray
  // behind the user's back. Backups live under /data/adb (root-only).
  async function restorePreviousConfig() {
    const confirm = await showConfirm('Khôi phục cấu hình Xray trước đó? Cấu hình hiện tại sẽ được lưu thành config.v2.failed. Xray không tự khởi động lại.');
    if (!confirm) return;
    const backup = CONFIG_JSON + '.previous';
    const failed = CONFIG_JSON + '.failed';
    const cmd = '[ -s ' + shQuote(backup) + ' ] || { echo "Chưa có bản sao cấu hình trước." >&2; exit 2; }; ' +
      'if [ -s ' + shQuote(CONFIG_JSON) + ' ]; then ' +
      'cp -p ' + shQuote(CONFIG_JSON) + ' ' + shQuote(failed) + ' || exit 3; fi; ' +
      'cp -p ' + shQuote(backup) + ' ' + shQuote(CONFIG_JSON) +
      ' && chmod 600 ' + shQuote(CONFIG_JSON);
    execShell(cmd, (_out, err, code) => {
      if (code === 0) {
        showToast('Đã khôi phục cấu hình trước. Bạn có thể khởi động lại Xray.', 'success');
        refreshNetworkReport();
      } else {
        showToast('Khôi phục thất bại: ' + (err || 'không có file backup'), 'error');
      }
    });
  }
  function refreshNetworkReport() {
    const output = ui('vm-network-report');
    const button = ui('vm-check-network');
    if (!output || !button) return;
    button.disabled = true;
    output.textContent = 'Đang kiểm tra trạng thái mạng...';
    const diagnostic = '/data/adb/modules/magic_v2ray/diagnostic.sh';
    execShell('sh ' + shQuote(diagnostic), (out, err, code) => {
      button.disabled = false;
      output.textContent = code === 0
        ? ((out || '').trim() || 'Không có dữ liệu chẩn đoán')
        : 'Không chạy được công cụ chẩn đoán: ' + (err || 'mã lỗi ' + code);
    });
  }
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
  // Called by the original loadState callback after all saved settings are ready.
  window.enhancedStateReady = function () {
    if (ui('vm-game-mode')) ui('vm-game-mode').checked = advSettings.gameMode === true;
    if (ui('vm-auto-subs')) ui('vm-auto-subs').checked = advSettings.autoSubOnOpen === true;
    const elapsed = Date.now() - Number(advSettings.lastAutoSubCheckAt || 0);
    if (advSettings.autoSubOnOpen === true && elapsed >= 86400000) {
      advSettings.lastAutoSubCheckAt = Date.now();
      writeFileB64(SETTINGS_FILE, utoa(JSON.stringify(advSettings)), (_out, err, code) => {
        if (code === 0) reloadSavedSubscriptions();
        else showToast('Không lưu được lịch tự cập nhật: ' + (err || 'lỗi ghi file'), 'error');
      });
    }
  };
  function saveAutoSubscriptionToggle() {
    const checked = ui('vm-auto-subs')?.checked === true;
    const previous = advSettings.autoSubOnOpen === true;
    advSettings.autoSubOnOpen = checked;
    writeFileB64(SETTINGS_FILE, utoa(JSON.stringify(advSettings)), (_out, err, code) => {
      if (code !== 0) {
        advSettings.autoSubOnOpen = previous;
        ui('vm-auto-subs').checked = previous;
        showToast('Không lưu được tùy chọn cập nhật: ' + (err || 'lỗi ghi file'), 'error');
      } else {
        showToast(checked ? 'Sẽ kiểm tra subscription khi mở WebUI.' : 'Đã tắt tự cập nhật.', 'info');
      }
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    ui('vm-game-mode')?.addEventListener('change', saveGameMode);
    ui('vm-auto-subs')?.addEventListener('change', saveAutoSubscriptionToggle);
    ui('vm-refresh-hotspot')?.addEventListener('click', refreshHotspot);
    ui('vm-check-network')?.addEventListener('click', refreshNetworkReport);
    ui('vm-restore-config')?.addEventListener('click', restorePreviousConfig);
    document.querySelector('[data-tab="tab-diagnostics"]')?.addEventListener('click', refreshNetworkReport);
    ui('vm-reload-subs')?.addEventListener('click', reloadSavedSubscriptions);
    ui('vm-hotspot-nav')?.addEventListener('click', refreshHotspot);
    document.addEventListener('visibilitychange', refreshTimer);
    document.querySelectorAll('.tab-menu-item').forEach(button => {
      button.addEventListener('click', () => setTimeout(refreshTimer, 50));
    });
    refreshTimer();
  });
})();
