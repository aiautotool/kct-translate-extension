let activeTab = 'history';
const $ = s => document.querySelector(s);

async function getData() {
  return chrome.storage.local.get(['history', 'vocabulary', 'settings']);
}

async function getEnabledState() {
  const { settings = {} } = await chrome.storage.local.get(['settings']);
  return settings.extensionEnabled !== false;
}

async function notifyActiveTab(enabled) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'KCT_EXTENSION_STATUS_CHANGED', enabled });
  } catch (_) {}
}

async function setEnabledState(enabled) {
  const { settings = {} } = await chrome.storage.local.get(['settings']);
  const next = { ...settings, extensionEnabled: enabled };
  await chrome.storage.local.set({ settings: next });
  await notifyActiveTab(enabled);
  renderStatus(enabled);
}

function renderStatus(enabled) {
  const card = $('#statusCard');
  const btn = $('#pauseToggle');
  const search = $('.search');
  card?.classList.toggle('paused', !enabled);
  btn?.classList.toggle('paused', !enabled);
  search?.classList.toggle('disabled', !enabled);
  $('#statusTitle').textContent = enabled ? 'Đang bật' : 'Đang tạm dừng';
  $('#statusDesc').textContent = enabled ? 'Popup dịch sẽ hiện khi bôi đen văn bản.' : 'Extension đang nghỉ, không tự hiện popup dịch.';
  btn.textContent = enabled ? 'Tạm dừng' : 'Bật lại';
}

async function translateManual() {
  const enabled = await getEnabledState();
  if (!enabled) {
    $('#manualResult').classList.remove('hidden');
    $('#manualResult').textContent = 'Extension đang tạm dừng. Bấm Bật lại để dịch.';
    return;
  }
  const text = $('#manualText').value.trim();
  if (!text) return;
  $('#manualResult').classList.remove('hidden');
  $('#manualResult').textContent = 'Đang dịch...';
  const res = await chrome.runtime.sendMessage({ type: 'KCT_TRANSLATE', text });
  $('#manualResult').innerHTML = res?.ok ? `<b>${escapeHtml(res.data.text)}</b><br>🇻🇳 ${escapeHtml(res.data.translatedText)}` : `<span class="err">${escapeHtml(res?.error || 'Lỗi')}</span>`;
  render();
}

function escapeHtml(s='') { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function speak(text, lang='en-US') { const u = new SpeechSynthesisUtterance(text); u.lang = lang; speechSynthesis.cancel(); speechSynthesis.speak(u); }

async function render() {
  const { history = [], vocabulary = [] } = await getData();
  const items = activeTab === 'history' ? history : activeTab === 'favorite' ? vocabulary.filter(i => i.favorite) : vocabulary;
  $('#list').innerHTML = items.length ? items.map(item => `
    <article class="item">
      <div class="row"><div><div class="text">${escapeHtml(item.text)}</div><div class="trans">🇻🇳 ${escapeHtml(item.translatedText || '')}</div></div></div>
      <div class="meta">${escapeHtml(item.sourceLang || 'auto')} → ${escapeHtml(item.targetLang || 'vi')} · ${item.count ? `${item.count} lần xem` : 'đã lưu'}</div>
      <div class="actions"><button data-speak="${escapeHtml(item.text)}">🔊</button><button data-save="${escapeHtml(item.text)}">⭐ Save</button><button data-copy="${escapeHtml(item.translatedText || item.text)}">Copy</button></div>
    </article>`).join('') : '<div class="item">Chưa có dữ liệu.</div>';
  document.querySelectorAll('[data-speak]').forEach(b => b.onclick = () => speak(b.dataset.speak));
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy));
  document.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
    const item = [...history, ...vocabulary].find(x => x.text === b.dataset.save);
    if (item) await chrome.runtime.sendMessage({ type: 'KCT_SAVE_VOCABULARY', item });
    render();
  });
}

$('.search button').onclick = translateManual;
$('#manualText').addEventListener('keydown', e => { if (e.key === 'Enter') translateManual(); });
document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => { document.querySelectorAll('.tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); activeTab = btn.dataset.tab; render(); });
$('#clearHistoryBtn').onclick = async () => { await chrome.storage.local.set({ history: [] }); render(); };
$('#exportBtn').onclick = async () => {
  const data = await getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'kct-translate-data.json'; a.click(); URL.revokeObjectURL(url);
};
$('#pauseToggle').onclick = async () => setEnabledState(!(await getEnabledState()));
getEnabledState().then(renderStatus);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) renderStatus(changes.settings.newValue?.extensionEnabled !== false);
});
render();
