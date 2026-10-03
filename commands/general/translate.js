const { EmbedBuilder } = require('discord.js');

// Uses LibreTranslate — completely free, no API key needed for the public instance.
// If the public instance is slow, you can self-host or use another free endpoint.
const LIBRE_URL = 'https://libretranslate.com/translate';

// Common language shortcuts so players don't need to type full codes
const LANG_ALIASES = {
  english: 'en', english: 'en', en: 'en',
  hindi:   'hi', hi: 'hi',
  spanish: 'es', es: 'es',
  french:  'fr', fr: 'fr',
  arabic:  'ar', ar: 'ar',
  portuguese: 'pt', pt: 'pt',
  russian: 'ru', ru: 'ru',
  japanese:'ja', ja: 'ja',
  korean:  'ko', ko: 'ko',
  chinese: 'zh', zh: 'zh',
  german:  'de', de: 'de',
  italian: 'it', it: 'it',
  turkish: 'tr', tr: 'tr',
  indonesian: 'id', id: 'id',
  tagalog: 'tl', tl: 'tl',
  thai:    'th', th: 'th',
};

const LANG_NAMES = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  ar: 'Arabic',  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
  ko: 'Korean',  zh: 'Chinese', de: 'German', it: 'Italian',
  tr: 'Turkish', id: 'Indonesian', tl: 'Tagalog', th: 'Thai',
};

module.exports = {
  name: 'translate',
  aliases: ['tr', 'tl'],
  description: 'Translate text to another language.',

  async execute({ message, args, prefix }) {
    // Usage: c translate <lang> <text>
    // Example: c translate hindi Hello everyone!
    if (!args[0]) {
      return message.reply(
        `**Usage:** \`${prefix}translate <language> <text>\`\n` +
        `**Example:** \`${prefix}translate hindi Hello everyone!\`\n\n` +
        `**Supported languages:** English, Hindi, Spanish, French, Arabic, Portuguese, ` +
        `Russian, Japanese, Korean, Chinese, German, Italian, Turkish, Indonesian, Tagalog, Thai`
      );
    }

    const langInput  = args[0].toLowerCase();
    const targetLang = LANG_ALIASES[langInput];
    if (!targetLang) {
      return message.reply(
        `❌ Unknown language: \`${args[0]}\`\n` +
        `Try: English, Hindi, Spanish, French, Arabic, Portuguese, Russian, Japanese, Korean, Chinese`
      );
    }

    const text = args.slice(1).join(' ').trim();
    if (!text) return message.reply(`Please provide text to translate after the language.`);
    if (text.length > 500) return message.reply(`❌ Text too long. Maximum 500 characters.`);

    // Detect source language automatically
    let translated, detectedLang;
    try {
      const response = await fetch(LIBRE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text' }),
        signal:  AbortSignal.timeout(8000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);
      translated   = data.translatedText;
      detectedLang = data.detectedLanguage?.language || 'auto';
    } catch (err) {
      console.error('[translate]', err.message);
      return message.reply(
        `❌ Translation failed — the service may be temporarily busy.\n` +
        `Try again in a moment.`
      );
    }

    const sourceName = LANG_NAMES[detectedLang] || detectedLang.toUpperCase();
    const targetName = LANG_NAMES[targetLang]   || targetLang.toUpperCase();

    const embed = new EmbedBuilder()
      .setColor(0x5DADE2)
      .setTitle('🌐 Translation')
      .addFields(
        { name: `📝 Original (${sourceName})`, value: text,        inline: false },
        { name: `✅ ${targetName}`,             value: translated,  inline: false }
      )
      .setFooter({ text: 'Powered by LibreTranslate • Free & open source' });

    await message.reply({ embeds: [embed] });
  }
};
