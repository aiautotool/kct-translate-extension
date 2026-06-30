(() => {
  const ROOT_ID = 'kct-translate-shadow-root';
  const DEFAULT_CONTENT_SETTINGS = {
    extensionEnabled: true,
    enablePopup: true,
    enableDoubleClick: true,
    voiceRate: 'normal'
  };

  let currentText = '';
  let currentResult = null;
  let hideTimer = null;
  let selectionCheckTimer = null;
  let translatingText = '';
  let savedSelectionRange = null;
  let savedSelectionText = '';

  function cleanText(text = '') { return String(text).replace(/\s+/g, ' ').trim(); }

  function saveCurrentSelection() {
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;
    const text = cleanText(selection.toString() || '');
    if (!text) return;
    savedSelectionRange = selection.getRangeAt(0).cloneRange();
    savedSelectionText = text;
  }

  function restoreSavedSelection() {
    if (!savedSelectionRange) return false;
    const selection = window.getSelection?.();
    if (!selection) return false;
    try {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRange.cloneRange());
      return true;
    } catch (_) {
      return false;
    }
  }

  function getSelectionText() {
    const liveText = cleanText(window.getSelection?.().toString() || '');
    return liveText || savedSelectionText || '';
  }

  function getSelectionRect() {
    const selection = window.getSelection?.();
    let range = null;
    if (selection && selection.rangeCount > 0 && cleanText(selection.toString() || '')) {
      range = selection.getRangeAt(0);
    } else if (savedSelectionRange) {
      range = savedSelectionRange;
    }
    if (!range) return null;
    const rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;
    return rect;
  }

  async function getContentSettings() {
    try {
      const data = await chrome.storage.local.get(['settings']);
      return { ...DEFAULT_CONTENT_SETTINGS, ...(data.settings || {}) };
    } catch (_) {
      return DEFAULT_CONTENT_SETTINGS;
    }
  }

  function rateValue(mode = 'normal') {
    const map = { slow: 0.65, normal: 1, fast: 1.35 };
    return map[mode] || Number(mode) || 1;
  }

  function isPopupVisible() {
    const host = document.getElementById(ROOT_ID);
    const wrap = host?.shadowRoot?.querySelector('.wrap');
    return !!wrap && !wrap.classList.contains('hidden');
  }

  function ensureRoot() {
    let host = document.getElementById(ROOT_ID);
    if (host) return host.shadowRoot;
    host = document.createElement('div');
    host.id = ROOT_ID;
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
        .wrap{position:fixed;min-width:280px;max-width:400px;background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 22px 70px rgba(15,23,42,.24);overflow:hidden;animation:kctIn .12s ease-out}
        @keyframes kctIn{from{opacity:.4;transform:translateY(4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .top{padding:14px 14px 10px;background:linear-gradient(135deg,#f0fdf4,#eff6ff);border-bottom:1px solid #e5e7eb}
        .text{font-size:16px;font-weight:800;line-height:1.35;max-height:86px;overflow:auto;word-break:break-word;padding-right:20px}
        .lang{font-size:12px;color:#64748b;margin-top:6px}
        .body{padding:12px 14px}
        .translation{font-size:15px;line-height:1.45;color:#0f172a;white-space:pre-wrap;word-break:break-word}
        .loading{color:#64748b}.error{color:#dc2626}
        .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .btn{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:7px 10px;font-size:13px;cursor:pointer;color:#0f172a;line-height:1}
        .btn:hover{background:#f8fafc}.primary{background:#16a34a;color:#fff;border-color:#16a34a}.primary:hover{background:#15803d}
        .close{position:absolute;right:9px;top:8px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#64748b}
        .speed{width:100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;padding-top:10px;border-top:1px dashed #e5e7eb}
        .speed-title{width:100%;font-size:12px;color:#64748b;margin-bottom:-2px}
        .explain{margin-top:10px;padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;font-size:13px;line-height:1.45;white-space:pre-wrap;max-height:180px;overflow:auto}.hidden{display:none}
      </style>
      <div class="wrap hidden" part="wrap">
        <button class="close" title="Close">×</button>
        <div class="top"><div class="text"></div><div class="lang"></div></div>
        <div class="body"><div class="translation loading">Đang dịch...</div><div class="actions"></div><div class="explain hidden"></div></div>
      </div>`;
    shadow.querySelector('.close').addEventListener('click', hidePopup);
    const wrap = shadow.querySelector('.wrap');
    const keepSelection = event => {
      event.preventDefault();
      event.stopPropagation();
      restoreSavedSelection();
    };
    wrap.addEventListener('pointerdown', keepSelection, true);
    wrap.addEventListener('mousedown', keepSelection, true);
    wrap.addEventListener('mouseup', event => { event.preventDefault(); event.stopPropagation(); restoreSavedSelection(); }, true);
    wrap.addEventListener('click', event => { event.stopPropagation(); restoreSavedSelection(); }, true);
    shadow.querySelector('.wrap').addEventListener('mouseenter', () => clearTimeout(hideTimer));
    shadow.querySelector('.wrap').addEventListener('mouseleave', scheduleHideIfNoSelection);
    return shadow;
  }

  function placePopup(rect) {
    const shadow = ensureRoot();
    const wrap = shadow.querySelector('.wrap');
    wrap.classList.remove('hidden');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(400, Math.max(280, wrap.offsetWidth || 320));
    const height = wrap.offsetHeight || 240;
    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.bottom + 10;
    if (left < 8) left = 8;
    if (left + width > vw - 8) left = vw - width - 8;
    if (top + height > vh - 8) top = Math.max(8, rect.top - height - 10);
    wrap.style.left = `${left}px`;
    wrap.style.top = `${top}px`;
  }

  function hidePopup() {
    clearTimeout(hideTimer);
    translatingText = '';
    const shadow = ensureRoot();
    shadow.querySelector('.wrap').classList.add('hidden');
    window.speechSynthesis?.cancel?.();
  }

  function scheduleHideIfNoSelection(delay = 120) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const liveText = cleanText(window.getSelection?.().toString() || '');
      if (!liveText && !savedSelectionText) hidePopup();
    }, delay);
  }

  function speak(text, lang = 'en-US', speed = 'normal') {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const map = { en: 'en-US', vi: 'vi-VN', ja: 'ja-JP', ko: 'ko-KR', ru: 'ru-RU', 'zh-CN': 'zh-CN' };
    utterance.lang = map[lang] || lang || 'en-US';
    utterance.rate = rateValue(speed);
    window.speechSynthesis.speak(utterance);
  }

  function renderLoading(text, rect) {
    currentText = text;
    currentResult = null;
    const shadow = ensureRoot();
    shadow.querySelector('.text').textContent = text;
    shadow.querySelector('.lang').textContent = 'Đang nhận diện ngôn ngữ...';
    shadow.querySelector('.translation').className = 'translation loading';
    shadow.querySelector('.translation').textContent = 'Đang dịch...';
    shadow.querySelector('.actions').innerHTML = '';
    shadow.querySelector('.explain').className = 'explain hidden';
    placePopup(rect || { left: 20, right: 20, top: 60, bottom: 80, width: 0, height: 0 });
  }

  async function renderResult(result) {
    currentResult = result;
    const settings = await getContentSettings();
    const defaultSpeed = settings.voiceRate || 'normal';
    const shadow = ensureRoot();
    shadow.querySelector('.lang').textContent = `${result.sourceLang || 'auto'} → ${result.targetLang || 'vi'}${result.fromCache ? ' · cache' : ''}`;
    shadow.querySelector('.translation').className = 'translation';
    shadow.querySelector('.translation').textContent = `🇻🇳 ${result.translatedText || ''}`;
    const actions = shadow.querySelector('.actions');
    actions.innerHTML = '';

    const buttons = [
      [`🔊 Original`, () => speak(result.text, result.sourceLang, defaultSpeed)],
      [`🔊 Vietnamese`, () => speak(result.translatedText, 'vi', defaultSpeed)],
      ['⭐ Save', () => saveWord()],
      ['📋 Copy', () => navigator.clipboard?.writeText(result.translatedText || result.text)],
      ['AI', () => explain()],
      ['↗ Full', () => window.open(`https://translate.google.com/?sl=auto&tl=vi&text=${encodeURIComponent(result.text)}&op=translate`, '_blank')]
    ];
    for (const [label, fn] of buttons) addButton(actions, label, fn, label === '⭐ Save');

    const speedBox = document.createElement('div');
    speedBox.className = 'speed';
    speedBox.innerHTML = '<div class="speed-title">Tốc độ đọc</div>';
    addButton(speedBox, '🐢 Gốc chậm', () => speak(result.text, result.sourceLang, 'slow'));
    addButton(speedBox, '⚡ Gốc nhanh', () => speak(result.text, result.sourceLang, 'fast'));
    addButton(speedBox, '🐢 Việt chậm', () => speak(result.translatedText, 'vi', 'slow'));
    addButton(speedBox, '⚡ Việt nhanh', () => speak(result.translatedText, 'vi', 'fast'));
    actions.appendChild(speedBox);
  }

  function addButton(parent, label, fn, primary = false) {
    const btn = document.createElement('button');
    btn.className = primary ? 'btn primary' : 'btn';
    btn.textContent = label;
    btn.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); restoreSavedSelection(); });
    btn.addEventListener('mousedown', event => { event.preventDefault(); event.stopPropagation(); restoreSavedSelection(); });
    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      restoreSavedSelection();
      fn();
      setTimeout(restoreSavedSelection, 0);
    });
    parent.appendChild(btn);
  }

  function renderError(message) {
    const shadow = ensureRoot();
    shadow.querySelector('.translation').className = 'translation error';
    shadow.querySelector('.translation').textContent = message || 'Không dịch được. Vui lòng thử lại.';
  }

  async function translateSelection(text, rect, force = false) {
    const settings = await getContentSettings();
    if (!force && (!settings.extensionEnabled || !settings.enablePopup)) return;
    text = cleanText(text || getSelectionText());
    if (!text) { hidePopup(); return; }
    if (text === currentText && text === translatingText && isPopupVisible()) return;
    translatingText = text;
    renderLoading(text, rect || getSelectionRect());
    const res = await chrome.runtime.sendMessage({ type: 'KCT_TRANSLATE', text });
    if (text !== translatingText) return;
    if (res?.ok) await renderResult(res.data); else renderError(res?.error);
  }

  async function saveWord() {
    if (!currentResult) return;
    const res = await chrome.runtime.sendMessage({ type: 'KCT_SAVE_VOCABULARY', item: currentResult });
    const shadow = ensureRoot();
    const translation = shadow.querySelector('.translation');
    if (res?.ok) translation.textContent = `✅ Đã lưu: ${currentResult.translatedText}`;
  }

  async function explain() {
    if (!currentResult) return;
    const shadow = ensureRoot();
    const box = shadow.querySelector('.explain');
    box.className = 'explain';
    box.textContent = 'Đang tạo giải thích AI...';
    const res = await chrome.runtime.sendMessage({ type: 'KCT_AI_EXPLAIN', text: currentResult.text, translation: currentResult.translatedText });
    box.textContent = res?.ok ? res.data : `Chưa dùng được AI Explain: ${res?.error || 'Lỗi không xác định'}`;
  }

  async function handleSelection(trigger = 'mouseup') {
    const settings = await getContentSettings();
    if (!settings.extensionEnabled || !settings.enablePopup) return;
    if (trigger === 'dblclick' && !settings.enableDoubleClick) return;
    saveCurrentSelection();
    const text = getSelectionText();
    const rect = getSelectionRect();
    if (text && rect) translateSelection(text, rect);
    else scheduleHideIfNoSelection(80);
  }

  document.addEventListener('mouseup', () => setTimeout(() => handleSelection('mouseup'), 30), true);
  document.addEventListener('dblclick', () => setTimeout(() => handleSelection('dblclick'), 40), true);

  document.addEventListener('selectionchange', () => {
    const liveText = cleanText(window.getSelection?.().toString() || '');
    if (liveText) saveCurrentSelection();
    clearTimeout(selectionCheckTimer);
    selectionCheckTimer = setTimeout(() => {
      const nowText = cleanText(window.getSelection?.().toString() || '');
      if (isPopupVisible() && !nowText && savedSelectionText) restoreSavedSelection();
      else if (isPopupVisible() && !nowText && !savedSelectionText) hidePopup();
    }, 80);
  }, true);

  document.addEventListener('pointerdown', event => {
    const host = document.getElementById(ROOT_ID);
    if (host && event.composedPath?.().includes(host)) { restoreSavedSelection(); return; }
    const liveText = cleanText(window.getSelection?.().toString() || '');
    if (isPopupVisible() && !liveText && !savedSelectionText) hidePopup();
  }, true);

  document.addEventListener('scroll', () => {
    const liveText = cleanText(window.getSelection?.().toString() || '');
    if (isPopupVisible() && !liveText && !savedSelectionText) hidePopup();
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hidePopup();
    if (isPopupVisible() && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Backspace','Delete'].includes(e.key)) scheduleHideIfNoSelection(80);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings?.newValue?.extensionEnabled === false) hidePopup();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'KCT_EXTENSION_STATUS_CHANGED' && message.enabled === false) hidePopup();
    if (message.type === 'KCT_SHOW_TRANSLATION') translateSelection(message.text, getSelectionRect(), true);
    if (message.type === 'KCT_TRANSLATE_CURRENT_SELECTION') translateSelection(getSelectionText(), getSelectionRect(), true);
    if (message.type === 'KCT_SPEAK') speak(message.text, message.lang, message.speed || 'normal');
  });
})();
