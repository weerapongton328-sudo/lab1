const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `    if (storeEnableNotFoundAudio) {
      const audio = new Audio(notFoundAudioB64);
      audio.play().catch(e => console.warn("Embedded audio failed", e));
    }`;

const replacement = `    if (storeEnableNotFoundAudio) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("ไม่พบสินค้าค่ะ");
        utterance.lang = "th-TH";
        if (window.speechSynthesis.getVoices) {
          const voices = window.speechSynthesis.getVoices();
          const thaiVoice = voices.find(v => v.lang.toLowerCase().includes("th"));
          if (thaiVoice) utterance.voice = thaiVoice;
        }
        (window as any)._latestUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Restored speech synthesis.");
} else {
    console.log("Could not find the base64 audio block.");
}
