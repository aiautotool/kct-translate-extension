import { DEFAULT_SETTINGS, cacheKey, cleanText, makeId, nowIso } from './utils.js';

export async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

export async function setStorage(data) {
  return chrome.storage.local.set(data);
}

export async function getSettings() {
  const data = await getStorage(['settings']);
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

export async function saveSettings(settings) {
  const current = await getSettings();
  await setStorage({ settings: { ...current, ...settings } });
}

export async function getCachedTranslation(text, sourceLang, targetLang) {
  const key = cacheKey(text, sourceLang, targetLang);
  const data = await getStorage(['translationCache']);
  return data.translationCache?.[key] || null;
}

export async function setCachedTranslation(payload) {
  const key = cacheKey(payload.text, payload.sourceLang, payload.targetLang);
  const data = await getStorage(['translationCache']);
  const cache = data.translationCache || {};
  cache[key] = { ...payload, cachedAt: nowIso() };
  const entries = Object.entries(cache).slice(-500);
  await setStorage({ translationCache: Object.fromEntries(entries) });
}

export async function addHistory(item) {
  const data = await getStorage(['history']);
  const history = data.history || [];
  const text = cleanText(item.text);
  const existed = history.find(h => h.text.toLowerCase() === text.toLowerCase());
  const nextItem = existed ? { ...existed, ...item, count: (existed.count || 1) + 1, updatedAt: nowIso() } : { id: makeId('his'), ...item, text, count: 1, createdAt: nowIso(), updatedAt: nowIso() };
  const next = [nextItem, ...history.filter(h => h.id !== nextItem.id)].slice(0, 300);
  await setStorage({ history: next });
  return nextItem;
}

export async function saveVocabulary(item) {
  const data = await getStorage(['vocabulary']);
  const vocabulary = data.vocabulary || [];
  const text = cleanText(item.text);
  const existed = vocabulary.find(v => v.text.toLowerCase() === text.toLowerCase());
  const nextItem = existed ? { ...existed, ...item, savedAt: existed.savedAt, updatedAt: nowIso() } : { id: makeId('voc'), ...item, text, favorite: false, reviewCount: 0, savedAt: nowIso(), updatedAt: nowIso() };
  const next = [nextItem, ...vocabulary.filter(v => v.id !== nextItem.id)].slice(0, 1000);
  await setStorage({ vocabulary: next });
  return nextItem;
}

export async function toggleFavorite(text) {
  const data = await getStorage(['vocabulary']);
  const vocabulary = data.vocabulary || [];
  const normalized = cleanText(text).toLowerCase();
  const next = vocabulary.map(v => v.text.toLowerCase() === normalized ? { ...v, favorite: !v.favorite, updatedAt: nowIso() } : v);
  await setStorage({ vocabulary: next });
  return next.find(v => v.text.toLowerCase() === normalized);
}
