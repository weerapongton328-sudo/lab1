const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const lines = code.split('\n');

const replaceStr = `                              <SearchableSelect
                                className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-full"
                                placeholder="-- ค้นหาและเลือกยูนิตของแถมฟรี --"
                                value={promoFormFreeUnitId}
                                onChange={(val) => setPromoFormFreeUnitId(val)}
                                options={productsList.flatMap((p) => 
                                  (p.units || []).map((u: any) => ({
                                    value: u.id.toString(),
                                    label: \`\${p.name} [\${u.unitName}] - \${parseFloat(u.retailPrice).toFixed(2)} ฿\`,
                                    searchText: u.barcode || ""
                                  }))
                                )}
                              />`;

lines.splice(14331, 16, replaceStr);

fs.writeFileSync('LabPos-main/src/App.tsx', lines.join('\n'));
console.log('patched promo 3');
