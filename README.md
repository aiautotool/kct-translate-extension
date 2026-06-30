# KCT Translate

Chrome Extension Manifest V3 hỗ trợ dịch nhanh văn bản được chọn trên website sang tiếng Việt, phát âm, lưu từ vựng, lịch sử tra cứu, favorite và AI Explain.

## Tính năng chính

- Bôi đen từ/cụm từ/câu trên website để hiện popup dịch tức thì.
- Double click một từ để dịch nhanh.
- Tự nhận diện ngôn ngữ đơn giản dựa trên ký tự và dịch về tiếng Việt.
- Dịch bằng Google Translate unofficial endpoint, fallback MyMemory.
- Cache bản dịch bằng `chrome.storage.local` để tra lại nhanh.
- Phát âm văn bản gốc và tiếng Việt bằng `SpeechSynthesis API`.
- Lưu từ vựng, favorite, history.
- Context menu: Translate, Speak, Save, Search Google, Search Cambridge.
- Popup extension để xem lịch sử, từ đã lưu, favorite.
- Trang Options để cấu hình provider, OpenAI API Key, AI Explain.
- Shadow DOM popup để tránh xung đột CSS với website.

## Cài đặt local

1. Mở Chrome.
2. Vào `chrome://extensions`.
3. Bật `Developer mode`.
4. Chọn `Load unpacked`.
5. Chọn thư mục `kct-translate-extension`.
6. Mở website bất kỳ, bôi đen từ hoặc câu để test.

## Cấu hình AI Explain

1. Click icon extension.
2. Chọn Settings.
3. Nhập OpenAI API Key.
4. Bật AI Explain.
5. Bôi chọn từ/câu và bấm nút `AI` trong popup nổi.

## Cấu trúc thư mục

```text
kct-translate-extension/
├── manifest.json
├── README.md
├── assets/
│   ├── icon16.svg
│   ├── icon32.svg
│   ├── icon48.svg
│   └── icon128.svg
├── src/
│   ├── background.js
│   ├── content.js
│   ├── content.css
│   ├── storage.js
│   ├── translate.js
│   └── utils.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── options/
    ├── options.html
    ├── options.css
    └── options.js
```

## Ghi chú

- Endpoint Google Translate dùng trong bản demo là unofficial, phù hợp prototype. Khi commercial nên chuyển sang Google Cloud Translation API, DeepL hoặc backend proxy riêng.
- Không lưu API key lên server. API key đang lưu local bằng `chrome.storage.local`.
- OCR/PDF nâng cao có thể thêm ở phase sau bằng Tesseract.js hoặc PDF content script riêng.


## Version 1.0.1
- Popup tự tắt khi người dùng bỏ bôi đậm/xóa vùng chọn.
- Thêm chế độ đọc chậm/nhanh cho văn bản gốc và bản dịch tiếng Việt.
- Thêm tùy chọn tốc độ đọc mặc định trong trang Settings.
