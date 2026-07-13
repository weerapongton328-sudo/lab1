const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `                        <input
                          type="number"
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 font-sans focus:outline-none"
                          value={storePointsEarnRatio}
                          onChange={(e) => setStorePointsEarnRatio(e.target.value)}
                          placeholder="เช่น 20 (ซื้อ 20 บาท ได้ 1 แต้ม)"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-xs">`;

const replace1 = `                        <input
                          type="number"
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 font-sans focus:outline-none"
                          value={storePointsEarnRatio}
                          onChange={(e) => setStorePointsEarnRatio(e.target.value)}
                          placeholder="เช่น 20 (ซื้อ 20 บาท ได้ 1 แต้ม)"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <label className="font-bold text-slate-700 flex items-center gap-1">
                          ยอดซื้อขั้นต่ำในการใช้แต้ม (บาท)
                        </label>
                        <input
                          type="number"
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 font-sans focus:outline-none"
                          value={storeMinPurchaseForPointsRedeem}
                          onChange={(e) => setStoreMinPurchaseForPointsRedeem(e.target.value)}
                          placeholder="เช่น 100"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-xs">`;

code = code.replace(target1, replace1);

const target2 = `                        <span className="text-emerald-700 font-black">บิลนี้เพิ่ม: +{parseFloat(storePointsEarnRatio) > 0 ? Math.floor(cartTotalAmount / parseFloat(storePointsEarnRatio)) : 0} แต้ม</span>`;

const replace2 = `                        <span className="text-emerald-700 font-black">บิลนี้เพิ่ม: +{parseFloat(storePointsEarnRatio) > 0 ? (cartTotalAmount / parseFloat(storePointsEarnRatio)).toFixed(2) : 0} แต้ม</span>`;

code = code.replace(target2, replace2);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log('patched App.tsx UI');
