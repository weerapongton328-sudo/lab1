const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

// 1. Add import
if (!code.includes('notFoundAudioB64')) {
    code = code.replace(
        'import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";',
        'import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";\nimport { notFoundAudioB64 } from "./notFoundAudio";'
    );
}

// 2. Replace state
code = code.replace(
    'const [storeAlertSoundUrl, setStoreAlertSoundUrl] = useState("");',
    'const [storeEnableNotFoundAudio, setStoreEnableNotFoundAudio] = useState(true);'
);

// 3. Replace useEffect assignment
code = code.replace(
    'setStoreAlertSoundUrl(storeSettingsData.alertSoundUrl || "");',
    'setStoreEnableNotFoundAudio(storeSettingsData.enableNotFoundAudio !== false);'
);

// 4. Replace saveSettings payload
code = code.replace(
    'alertSoundUrl: storeAlertSoundUrl,',
    'enableNotFoundAudio: storeEnableNotFoundAudio,'
);

// 5. Replace barcode submit usage
const barcodeTarget = `    // Alert if not found
    playErrorBeep();
    showToast(\`ไม่พบรหัสบาร์โค้ด "\${query}" ในระบบกรุณาลองใหม่อีกครั้ง\`, "warning");
    playThaiSpeechAlert("ไม่พบสินค้าค่ะ กรุณาลองใหม่", storeAlertSoundUrl);
    setBarcodeSearch("");`;

const barcodeReplacement = `    // Alert if not found
    playErrorBeep();
    showToast(\`ไม่พบรหัสบาร์โค้ด "\${query}" ในระบบกรุณาลองใหม่อีกครั้ง\`, "warning");
    if (storeEnableNotFoundAudio) {
      const audio = new Audio(notFoundAudioB64);
      audio.play().catch(e => console.warn("Embedded audio failed", e));
    }
    setBarcodeSearch("");`;

code = code.replace(barcodeTarget, barcodeReplacement);

// 6. Replace UI in settings tab
const uiTarget = `<div className="flex flex-col gap-1 text-xs">
                        <label className="font-bold text-slate-600">เสียงแจ้งเตือนเมื่อสแกนไม่พบสินค้า (URL หรือไฟล์)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="วางลิงก์ URL หรือกดปุ่มอัปโหลด (เว้นว่างใช้เสียงพูด)"
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 flex-1"
                            value={storeAlertSoundUrl}
                            onChange={(e) => setStoreAlertSoundUrl(e.target.value)}
                          />
                          <input 
                            type="file" 
                            accept="audio/*"
                            className="hidden" 
                            id="alertSoundUpload"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  showToast("ไฟล์เสียงต้องมีขนาดไม่เกิน 2MB", "error");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) {
                                    setStoreAlertSoundUrl(ev.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => document.getElementById('alertSoundUpload')?.click()}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold px-4 py-2 rounded-xl transition-colors border border-emerald-200"
                          >
                            อัปโหลดไฟล์
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500">หากอัปโหลดไฟล์ (.wav, .mp3) ระบบจะแปลงเป็นข้อความและเล่นเสียงนี้แทนการอ่านออกเสียงอัตโนมัติ (ไม่เกิน 2MB)</p>
                        {storeAlertSoundUrl && storeAlertSoundUrl.startsWith('data:audio') && (
                          <div className="mt-2 flex items-center gap-2">
                            <audio controls src={storeAlertSoundUrl} className="h-8 max-w-xs" />
                            <button type="button" onClick={() => setStoreAlertSoundUrl("")} className="text-rose-500 text-xs font-bold hover:underline">ลบไฟล์</button>
                          </div>
                        )}
                      </div>`;

const uiReplacement = `<div className="flex flex-col gap-1 text-xs">
                        <label className="font-bold text-slate-600">เสียงแจ้งเตือนเมื่อสแกนไม่พบสินค้า</label>
                        <div className="flex gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={storeEnableNotFoundAudio}
                              onChange={(e) => setStoreEnableNotFoundAudio(e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span className="ml-3 text-sm font-medium text-slate-700">เปิดใช้งานเสียงเตือน (ไม่พบสินค้าค่ะ)</span>
                          </label>
                        </div>
                        <p className="text-[10px] text-slate-500">ระบบจะส่งเสียง "ไม่พบสินค้าค่ะ" อัตโนมัติเมื่อใช้เครื่องสแกนบาร์โค้ดแล้วไม่พบข้อมูลในระบบ</p>
                      </div>`;

code = code.replace(uiTarget, uiReplacement);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log("Patched not found audio");
