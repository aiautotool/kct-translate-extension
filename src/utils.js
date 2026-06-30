export const DEFAULT_SETTINGS = {
  extensionEnabled: true,
  targetLang: 'vi',
  provider: 'google',
  enablePopup: true,
  enableDoubleClick: true,
  enableCache: true,
  enableAiExplain: false,
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  voiceRate: 'normal'
};

export function cleanText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

export function isLikelySentence(text = '') {
  const t = cleanText(text);
  return t.split(' ').length > 4 || /[.!?。！？]/.test(t);
}

export function detectLanguage(text = '') {
  const value = cleanText(text);
  if (!value) return 'auto';
  if (/[\u4E00-\u9FFF]/.test(value)) return 'zh-CN';
  if (/[\u3040-\u30ff]/.test(value)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(value)) return 'ko';
  if (/[\u0400-\u04FF]/.test(value)) return 'ru';
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(value)) return 'vi';
  if (/^[\x00-\x7F]+$/.test(value)) return 'en';
  return 'auto';
}

export function langLabel(code = 'auto') {
  const map = {
    auto: 'Auto', en: 'English', vi: 'Vietnamese', ja: 'Japanese', ko: 'Korean', ru: 'Russian',
    'zh-CN': 'Chinese', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian', th: 'Thai'
  };
  return map[code] || code;
}

export function makeId(prefix = 'kct') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cacheKey(text, sourceLang, targetLang) {
  return btoa(unescape(encodeURIComponent(`${sourceLang}|${targetLang}|${cleanText(text).toLowerCase()}`))).slice(0, 120);
}

export function nowIso() {
  return new Date().toISOString();
}
