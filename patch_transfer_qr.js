const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `{paymentMethod === "transfer" && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 text-center animate-fadeIn font-sans h-full flex flex-col justify-center">
                  <p className="text-sm text-blue-800 font-semibold leading-relaxed">
                    โอนจ่ายเต็มจำนวน: <span className="font-mono text-xl font-bold block text-blue-900 mt-1">฿{cartTotalAmount.toFixed(2)}</span>
                  </p>
                  <div className="text-xs text-blue-500 mt-1">
                    กรุณาตรวจสอบสลิปโอนเงินหลังเสร็จสมบูรณ์เพื่อป้องกันการหลอกลวง
                  </div>
                </div>
              )}`;

const replacement = `{paymentMethod === "transfer" && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 text-center animate-fadeIn font-sans h-full flex flex-col items-center justify-center">
                  <p className="text-sm text-blue-800 font-semibold leading-relaxed mb-2">
                    โอนจ่ายเต็มจำนวน: <span className="font-mono text-xl font-bold block text-blue-900 mt-1">฿{cartTotalAmount.toFixed(2)}</span>
                  </p>
                  
                  {storePromptpayEnabled && (
                    <div className="relative bg-white border border-slate-200 p-2 rounded-xl shadow-sm mb-2 w-full max-w-[160px] mx-auto group">
                      {storePromptpayNumber ? (
                        <img
                          src={\`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(generatePromptPayPayload(storePromptpayNumber, cartTotalAmount))}\`}
                          alt="PromptPay QR Code"
                          className="w-full h-auto object-contain select-none rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : storePromptpayQrUrl ? (
                        <img
                          src={storePromptpayQrUrl}
                          alt="PromptPay Custom QR Code"
                          className="w-full h-auto object-contain select-none rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                         <div className="w-full h-24 flex items-center justify-center text-slate-300 text-xs">ไม่พบข้อมูล QR Code</div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-blue-500 mt-1">
                    กรุณาตรวจสอบสลิปโอนเงินหลังเสร็จสมบูรณ์เพื่อป้องกันการหลอกลวง
                  </div>
                </div>
              )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched Cashier Transfer QR");
} else {
    console.log("Not found target Transfer UI block");
}
