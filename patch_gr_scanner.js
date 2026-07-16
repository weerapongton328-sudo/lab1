const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `                          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
                            <table className="w-full text-left border-collapse text-sm">`;

const replacement = `                          <div className="mb-4">
                            <div className="relative max-w-sm">
                              <input
                                autoFocus
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-sm"
                                placeholder="สแกนบาร์โค้ดเพื่อรับของ..."
                                value={grSearchPoNumber}
                                onChange={(e) => setGrSearchPoNumber(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const term = convertThaiToEngKeyboard(e.currentTarget.value).trim().toLowerCase();
                                    if (!term) return;
                                    
                                    // Find unit by barcode
                                    let matchedUnitId = null;
                                    for (const p of productsList) {
                                      const u = p.units?.find((u: any) => u.barcode === term);
                                      if (u) {
                                        matchedUnitId = u.id;
                                        break;
                                      }
                                    }
                                    
                                    if (matchedUnitId) {
                                      const existingIndex = grItems.findIndex(i => i.productUnitId === matchedUnitId);
                                      if (existingIndex > -1) {
                                        const newItems = [...grItems];
                                        newItems[existingIndex].receivedQuantity += 1;
                                        setGrItems(newItems);
                                        showToast(\`นับเพิ่ม 1 ชิ้นแล้ว\`, "success");
                                      } else {
                                        playErrorBeep();
                                        showToast("สินค้านี้ไม่ได้อยู่ในใบสั่งซื้อ PO", "warning");
                                      }
                                    } else {
                                      playErrorBeep();
                                      showToast("ไม่พบสินค้าจากบาร์โค้ดนี้ในระบบ", "warning");
                                    }
                                    setGrSearchPoNumber("");
                                  }
                                }}
                              />
                              <Search className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                          </div>
                          
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
                            <table className="w-full text-left border-collapse text-sm">`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched GR barcode scanner logic");
} else {
    console.log("Not found");
}
