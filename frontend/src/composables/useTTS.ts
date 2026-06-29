/**
 * TTS 语音朗读 composable
 * 使用 Web Speech API (SpeechSynthesis)
 */
import { ref } from 'vue';

export function useTTS() {
  const speaking = ref(false);
  const supported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window);

  function speak(text: string, lang: string = 'zh-CN') {
    if (!supported.value) return;
    stop();

    // Clean markdown
    const cleanText = text
      .replace(/[#*_`~\[\]()]/g, '')
      .replace(/\n+/g, '。')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find a good voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.localService);
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { speaking.value = true; };
    utterance.onend = () => { speaking.value = false; };
    utterance.onerror = () => { speaking.value = false; };

    speechSynthesis.speak(utterance);
  }

  function speakEnglish(text: string) {
    speak(text, 'en-US');
  }

  function stop() {
    speechSynthesis.cancel();
    speaking.value = false;
  }

  return { speak, speakEnglish, stop, speaking, supported };
}
