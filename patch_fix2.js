const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetUI = `                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-1 flex flex-col gap-3">
                      <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                        <span className="text-emerald-600 font-extrabold text-base">฿</span>
                        <span>ตั้งค่าการชำระเงินด้วย PromptPay QR (Customer Display QR)</span>
                      </h4>`;

const replaceUI = `                        </div>
                      </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-1 flex flex-col gap-3">
                      <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                        <span className="text-emerald-600 font-extrabold text-base">฿</span>
                        <span>ตั้งค่าการชำระเงินด้วย PromptPay QR (Customer Display QR)</span>
                      </h4>`;

if (code.includes(targetUI)) {
    code = code.replace(targetUI, replaceUI);
    console.log('patched braces 2');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
