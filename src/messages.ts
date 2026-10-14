// Every string the user sees lives here, in Persian. Code and comments stay in
// English so the project is contributable without reading Persian; translating
// the UI means editing this one file.

export const msg = {
  noApiKey:
    "کلید API پیدا نشد. فایل ‎.env‎ را بساز (‎cp .env.example .env‎) و GOOGLE_GENERATIVE_AI_API_KEY را داخلش بگذار.",
  noFfmpeg: "ffmpeg پیدا نشد. نصبش کن: brew install ffmpeg (لینوکس: sudo apt install ffmpeg)",
  unsupportedPlatform: (p: string) =>
    `این سیستم‌عامل (${p}) هنوز پشتیبانی نمی‌شود. CONTRIBUTING.md را ببین.`,

  recording: "🎙️  در حال ضبط… برای پایان Enter بزن.",
  recordingAuto: "🎙️  در حال ضبط… وقتی ساکت شوی خودش تمام می‌شود.",
  recordingHold: "🎙️  در حال ضبط…",
  maxReached: (s: number) => `به سقف ${s} ثانیه رسید؛ ضبط تمام شد.`,
  recordFailed: (detail: string) => `ضبط انجام نشد:\n${detail}`,
  micHint: "اگر میکروفون اشتباه است: npm run dictate -- --list",

  silent: "🤫 صدایی شنیده نشد — چیزی فرستاده نشد.",
  transcribing: "⏳ در حال تبدیل به متن…",
  retrying: "🔁 دوباره با همان صدا…",
  retryingWithHint: (h: string) => `🔁 دوباره با همان صدا، با این املاها: ${h}`,
  noLastClip:
    "صدای قبلی‌ای برای تکرار نیست. (اگر DICTATE_KEEP_LAST=0 است، ‎--again‎ کار نمی‌کند.)",
  emptyResult: "مدل متنی برنگرداند.",
  apiFailed: (detail: string) => `خطا از سمت Gemini:\n${detail}`,

  copied: "✅ روی کلیپ‌بورد است.",
  noClipboardTool: "ابزار کلیپ‌بورد پیدا نشد. نصب کن: wl-clipboard (Wayland) یا xclip (X11).",
  copyFailed: (detail: string) => `کپی روی کلیپ‌بورد نشد: ${detail}`,

  devicesTitle: "میکروفون‌هایی که ffmpeg می‌بیند:",
  noDevices: "هیچ میکروفونی پیدا نشد.",

  usage: `استفاده:
  npm run dictate                  ضبط، Enter برای پایان
  npm run dictate -- --auto        وقتی ساکت شوی خودش تمام می‌شود
  npm run dictate -- --list        لیست میکروفون‌ها
  npm run dictate -- 2             استفاده از دستگاه شمارهٔ ۲
  npm run dictate -- --again       همان صدا را دوباره تبدیل کن
  npm run dictate -- --again "سیاوش، صدف"   …با املای درست`,
  badArgs: (a: string) => `آرگومان ناشناخته: ${a}`,
};
