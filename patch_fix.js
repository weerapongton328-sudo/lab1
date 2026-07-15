const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetUI = `                    )}
                    <div className="flex flex-col gap-1 text-xs mt-2 border-t border-slate-100 pt-3">
                        <label className="font-bold text-slate-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={storeEnableBillPayment}`;

const replaceUI = `                    </div>
                    )}
                    <div className="flex flex-col gap-1 text-xs mt-2 border-t border-slate-100 pt-3">
                        <label className="font-bold text-slate-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={storeEnableBillPayment}`;

if (code.includes(targetUI)) {
    code = code.replace(targetUI, replaceUI);
    console.log('patched braces 1');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
