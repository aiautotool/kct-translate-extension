import { getSettings, getCachedTranslation, setCachedTranslation, addHistory, saveVocabulary, toggleFavorite } from './storage.js';
import { translateText, explainWithOpenAI } from './translate.js';
import { cleanText, detectLanguage } from './utils.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'kct-translate', title: 'KCT Translate', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'kct-speak', title: 'Speak selected text', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'kct-save', title: 'Save to vocabulary', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'kct-google', title: 'Search Google', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'kct-cambridge', title: 'Search Cambridge Dictionary', contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = cleanText(info.selectionText || '');
  if (!text || !tab?.id) return;
  const settings = await getSettings();
  if (settings.extensionEnabled === false) return;
  if (info.menuItemId === 'kct-translate') {
    chrome.tabs.sendMessage(tab.id, { type: 'KCT_SHOW_TRANSLATION', text });
  }
  if (info.menuItemId === 'kct-speak') {
    chrome.tabs.sendMessage(tab.id, { type: 'KCT_SPEAK', text, lang: detectLanguage(text) });
  }
  if (info.menuItemId === 'kct-save') {
    const result = await translateWithCache(text, settings);
    await saveVocabulary(result);
  }
  if (info.menuItemId === 'kct-google') {
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(text)}` });
  }
  if (info.menuItemId === 'kct-cambridge') {
    chrome.tabs.create({ url: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(text)}` });
  }
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'translate-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const settings = await getSettings();
  if (settings.extensionEnabled === false) return;
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'KCT_TRANSLATE_CURRENT_SELECTION' });
});

async function translateWithCache(text, settings) {
  const sourceLang = detectLanguage(text);
  const cached = settings.enableCache ? await getCachedTranslation(text, sourceLang, settings.targetLang) : null;
  if (cached) return { ...cached, fromCache: true };
  const result = await translateText({ text, sourceLang, targetLang: settings.targetLang, provider: settings.provider });
  if (settings.enableCache) await setCachedTranslation(result);
  await addHistory(result);
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const settings = await getSettings();
    if (message.type === 'KCT_EXTENSION_STATUS_CHANGED') {
      sendResponse({ ok: true });
      return;
    }
    if (settings.extensionEnabled === false && ['KCT_TRANSLATE','KCT_SAVE_VOCABULARY','KCT_AI_EXPLAIN'].includes(message.type)) {
      sendResponse({ ok: false, error: 'Extension đang tạm dừng.' });
      return;
    }
    if (message.type === 'KCT_TRANSLATE') {
      const result = await translateWithCache(message.text, settings);
      sendResponse({ ok: true, data: result });
      return;
    }
    if (message.type === 'KCT_SAVE_VOCABULARY') {
      const item = await saveVocabulary(message.item);
      sendResponse({ ok: true, data: item });
      return;
    }
    if (message.type === 'KCT_TOGGLE_FAVORITE') {
      const item = await toggleFavorite(message.text);
      sendResponse({ ok: true, data: item });
      return;
    }
    if (message.type === 'KCT_AI_EXPLAIN') {
      const text = cleanText(message.text);
      const result = await explainWithOpenAI({ text, translation: message.translation, sourceLang: detectLanguage(text), apiKey: settings.openaiApiKey, model: settings.openaiModel });
      sendResponse({ ok: true, data: result });
      return;
    }
    sendResponse({ ok: false, error: 'Unknown message type' });
  })().catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
