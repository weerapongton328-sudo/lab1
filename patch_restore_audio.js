const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

// 1. Add import
if (!code.includes('notFoundAudioB64')) {
    code = code.replace(
        'import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";',
        'import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";\nimport { notFoundAudioB64 } from "./notFoundAudio";'
    );
}

// 2. Replace the speechSynthesis block with the audio block
const target = `    if (storeEnableNotFoundAudio) {
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

const replacement = `    if (storeEnableNotFoundAudio) {
      const audio = new Audio(notFoundAudioB64);
      audio.play().catch(e => console.warn("Embedded audio failed", e));
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched App.tsx to use notFoundAudioB64");
} else {
    console.log("Could not find the target speechSynthesis block");
}
