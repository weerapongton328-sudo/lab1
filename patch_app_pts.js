const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-emerald-800 font-semibold mb-1">แต้มสะสมที่ใช้ได้ทั้งหมด</p>
              <p className="text-3xl font-black text-emerald-600">{selectedMember.points}</p>
              <p className="text-xs text-emerald-700/70 mt-1">อัตราแลกเปลี่ยน: {storePointsToDiscountRatio} แต้ม = 1 บาท</p>
            </div>`;

const replace1 = `            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-emerald-800 font-semibold mb-1">แต้มสะสมที่ใช้ได้ทั้งหมด</p>
              <p className="text-3xl font-black text-emerald-600">{parseFloat(selectedMember.points || 0).toFixed(2)}</p>
              <p className="text-xs text-emerald-700/70 mt-1">อัตราแลกเปลี่ยน: {storePointsToDiscountRatio} แต้ม = 1 บาท</p>
            </div>`;

code = code.replace(target1, replace1);

const target2 = `                  max={selectedMember.points}
                  step={parseFloat(storePointsToDiscountRatio)}
                  className="flex-1 bg-white border-2 border-slate-200 rounded-xl py-3 px-4 text-center text-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="0"
                  value={redeemPointsInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setRedeemPointsInput("");
                    } else {
                      let num = parseInt(val, 10);
                      if (isNaN(num)) num = 0;
                      if (num < 0) num = 0;
                      if (num > selectedMember.points) num = selectedMember.points;
                      setRedeemPointsInput(num.toString());
                    }
                  }}`;

const replace2 = `                  max={parseFloat(selectedMember.points || 0)}
                  step={parseFloat(storePointsToDiscountRatio)}
                  className="flex-1 bg-white border-2 border-slate-200 rounded-xl py-3 px-4 text-center text-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="0"
                  value={redeemPointsInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setRedeemPointsInput("");
                    } else {
                      let num = parseInt(val, 10);
                      if (isNaN(num)) num = 0;
                      if (num < 0) num = 0;
                      const maxPts = parseFloat(selectedMember.points || 0);
                      if (num > maxPts) num = Math.floor(maxPts);
                      setRedeemPointsInput(num.toString());
                    }
                  }}`;

code = code.replace(target2, replace2);

const target3 = `              <input
                type="range"
                min="0"
                max={selectedMember.points}
                step={parseFloat(storePointsToDiscountRatio)}
                value={parseInt(redeemPointsInput || "0", 10)}
                onChange={(e) => {
                  setRedeemPointsInput(e.target.value);
                }}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono mt-1 px-1">
                <span>0</span>
                <span>{selectedMember.points}</span>
              </div>`;

const replace3 = `              <input
                type="range"
                min="0"
                max={parseFloat(selectedMember.points || 0)}
                step={parseFloat(storePointsToDiscountRatio)}
                value={parseInt(redeemPointsInput || "0", 10)}
                onChange={(e) => {
                  setRedeemPointsInput(parseInt(e.target.value, 10).toString());
                }}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono mt-1 px-1">
                <span>0</span>
                <span>{parseFloat(selectedMember.points || 0).toFixed(2)}</span>
              </div>`;

code = code.replace(target3, replace3);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log('patched pts UI');
