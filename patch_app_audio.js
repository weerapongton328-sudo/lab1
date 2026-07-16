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
    code = code.replace(/import \{ notFoundAudioB64 \} from "\.\/notFoundAudio";\n?/g, '');
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched UI");
} else {
    console.log("Not found target UI block");
}
