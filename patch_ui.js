const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `<div className="flex flex-col gap-1 text-xs sm:col-span-2">
                        <label className="font-bold text-slate-600">เสียงแจ้งเตือนเมื่อไม่พบสินค้า (ลิงก์ URL หรือ อัปโหลดไฟล์จากเครื่อง)</label>
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
                                if (file.size > 1024 * 1024 * 2) { // 2MB limit
                                  alert("ขนาดไฟล์เสียงต้องไม่เกิน 2MB เพื่อไม่ให้ระบบทำงานช้าลงครับ");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) {
                                    setStoreAlertSoundUrl(ev.target.result as string);
                                    alert("อัปโหลดไฟล์เสียงเรียบร้อย อย่าลืมกดบันทึกข้อมูลด้านล่างสุดด้วยนะครับ");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => document.getElementById('alertSoundUpload')?.click()}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap"
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

const replacement = `<div className="flex flex-col gap-1 text-xs sm:col-span-2">
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

if (code.includes(target)) {
    code = code.replace(target, replacement);
    code = code.replaceAll('setStoreAlertSoundUrl', 'setStoreEnableNotFoundAudio');
    code = code.replaceAll('storeAlertSoundUrl', 'storeEnableNotFoundAudio');
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched UI");
} else {
    console.log("Not found target UI block");
}
