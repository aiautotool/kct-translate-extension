import { cleanText, detectLanguage, langLabel } from './utils.js';

async function translateGoogle(text, sourceLang, targetLang) {
  const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(targetLang)}&dt=t&dt=bd&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google translate failed: ${res.status}`);
  const data = await res.json();
  const translatedText = (data?.[0] || []).map(part => part?.[0] || '').join('').trim();
  const detectedLang = data?.[2] || sourceLang || detectLanguage(text);
  return { text, translatedText, sourceLang: detectedLang, targetLang, provider: 'google' };
}

async function translateMyMemory(text, sourceLang, targetLang) {
  const sl = sourceLang === 'auto' ? detectLanguage(text) : sourceLang;
  const langpair = `${sl === 'auto' ? 'en' : sl}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory translate failed: ${res.status}`);
  const data = await res.json();
  return { text, translatedText: data?.responseData?.translatedText || '', sourceLang: sl, targetLang, provider: 'mymemory' };
}

export async function translateText({ text, sourceLang = 'auto', targetLang = 'vi', provider = 'google' }) {
  const normalized = cleanText(text);
  if (!normalized) throw new Error('No text selected');
  const detected = sourceLang === 'auto' ? detectLanguage(normalized) : sourceLang;
  if (detected === targetLang) {
    return { text: normalized, translatedText: normalized, sourceLang: detected, targetLang, provider: 'local' };
  }
  try {
    return provider === 'mymemory'
      ? await translateMyMemory(normalized, sourceLang, targetLang)
      : await translateGoogle(normalized, sourceLang, targetLang);
  } catch (err) {
    if (provider !== 'mymemory') return translateMyMemory(normalized, sourceLang, targetLang);
    throw err;
  }
}

export async function explainWithOpenAI({ text, translation, sourceLang, apiKey, model }) {
  if (!apiKey) throw new Error('Missing OpenAI API key');
  const prompt = `Bạn là trợ lý học ngoại ngữ cho người Việt. Hãy giải thích ngắn gọn, dễ hiểu cho nội dung sau.\n\nVăn bản: ${text}\nNgôn ngữ: ${langLabel(sourceLang)}\nBản dịch: ${translation || ''}\n\nYêu cầu trả lời bằng tiếng Việt, gồm: nghĩa chính, loại từ nếu là 1 từ, ví dụ, collocation/từ liên quan nếu có, và ghi chú ngữ pháp nếu là câu.`;
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model || 'gpt-4o-mini', input: prompt })
  });
  if (!res.ok) throw new Error(`AI Explain failed: ${res.status}`);
  const data = await res.json();
  return data.output_text || data.output?.flatMap(o => o.content || []).map(c => c.text || '').join('\n') || '';
}
