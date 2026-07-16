const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `                  {(() => {
                    const totalVal = safeParseSplitVal(splitCash) + safeParseSplitVal(splitTransfer) + safeParseSplitVal(splitWelfare);
                    const isMatch = Math.abs(totalVal - cartTotalAmount) < 0.05;
                    return (
                      <div className={\`text-[11px] text-center font-bold py-1.5 px-2.5 rounded-lg border font-sans mt-2 \${
                        isMatch 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-red-50 text-red-600 border-red-200 animate-pulse"
                      }\`}>
                        {isMatch 
                          ? "✓ ยอดเงินครบองค์รวมพร้อมเปิดบิลชำระเงิน" 
                          : \`⚠ ขาด/เกินยอดเงินจากบิล: ฿\${(cartTotalAmount - totalVal).toFixed(2)}\`}
                      </div>
                    );
                  })()}
                </div>
              )}`;

const replacement = `                  {(() => {
                    const totalVal = safeParseSplitVal(splitCash) + safeParseSplitVal(splitTransfer) + safeParseSplitVal(splitWelfare);
                    const transferVal = safeParseSplitVal(splitTransfer);
                    const isMatch = Math.abs(totalVal - cartTotalAmount) < 0.05;
                    return (
                      <>
                        <div className={\`text-[11px] text-center font-bold py-1.5 px-2.5 rounded-lg border font-sans mt-2 \${
                          isMatch 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-red-50 text-red-600 border-red-200 animate-pulse"
                        }\`}>
                          {isMatch 
                            ? "✓ ยอดเงินครบองค์รวมพร้อมเปิดบิลชำระเงิน" 
                            : \`⚠ ขาด/เกินยอดเงินจากบิล: ฿\${(cartTotalAmount - totalVal).toFixed(2)}\`}
                        </div>
                        {transferVal > 0 && storePromptpayEnabled && (
                          <div className="relative bg-white border border-slate-200 p-1 rounded-xl shadow-sm mt-2 w-full max-w-[120px] mx-auto group">
                            {storePromptpayNumber ? (
                              <img
                                src={\`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent(generatePromptPayPayload(storePromptpayNumber, transferVal))}\`}
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
                               <div className="w-full h-20 flex items-center justify-center text-slate-300 text-[10px]">ไม่มี QR</div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched Cashier Split QR");
} else {
    console.log("Not found target Split UI block");
}
