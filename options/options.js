import { DEFAULT_SETTINGS } from '../src/utils.js';
import { getSettings, saveSettings } from '../src/storage.js';
const $ = s => document.querySelector(s);

async function load() {
  const settings = await getSettings();
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const el = $('#' + key);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!settings[key]; else el.value = settings[key] ?? '';
  }
}

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const settings = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const el = $('#' + key);
    if (!el) continue;
    settings[key] = el.type === 'checkbox' ? el.checked : el.value.trim();
  }
  await saveSettings(settings);
  $('#status').textContent = 'Đã lưu';
  setTimeout(() => $('#status').textContent = '', 1800);
});

$('#exportBtn').onclick = async () => {
  const data = await chrome.storage.local.get(null);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'kct-translate-backup.json'; a.click(); URL.revokeObjectURL(url);
};

$('#importFile').onchange = async e => {
  const file = e.target.files?.[0]; if (!file) return;
  const data = JSON.parse(await file.text());
  await chrome.storage.local.set(data);
  alert('Import thành công');
  load();
};

$('#resetBtn').onclick = async () => {
  if (confirm('Xóa toàn bộ dữ liệu KCT Translate?')) { await chrome.storage.local.clear(); await load(); alert('Đã reset'); }
};

load();
