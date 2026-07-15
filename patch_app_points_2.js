const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetUI = `                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-1">`;
const replaceUI = `                    <div className="flex flex-col gap-1 text-xs mt-2 border-t border-slate-100 pt-3">
                      <label className="font-bold text-slate-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={storeEnablePointSystem}
                          onChange={(e) => setStoreEnablePointSystem(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        เปิดใช้งานระบบสะสมแต้ม (Point System)
                      </label>
                    </div>
                    
                    {storeEnablePointSystem && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-1">`;

if (code.includes(targetUI)) {
    code = code.replace(targetUI, replaceUI);
    console.log('patched UI 1');
}

const targetUIEnd = `                      <div className="flex flex-col gap-1 text-xs mt-2 border-t border-slate-100 pt-3">
                        <label className="font-bold text-slate-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={storeEnableBillPayment}`;

const replaceUIEnd = `                    )}
                    <div className="flex flex-col gap-1 text-xs mt-2 border-t border-slate-100 pt-3">
                        <label className="font-bold text-slate-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={storeEnableBillPayment}`;

if (code.includes(targetUIEnd)) {
    code = code.replace(targetUIEnd, replaceUIEnd);
    console.log('patched UI 2');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
