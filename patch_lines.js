const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const lines = code.split('\n');

const replaceStr = `                            <SearchableSelect
                              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-full"
                              placeholder="-- ค้นหาและเลือกยูนิตสินค้า --"
                              value={promoFormProductUnitId}
                              onChange={(val) => setPromoFormProductUnitId(val)}
                              options={productsList.flatMap((p) => 
                                (p.units || []).map((u: any) => ({
                                  value: u.id.toString(),
                                  label: \`\${p.name} [\${u.unitName}] - \${parseFloat(u.retailPrice).toFixed(2)} ฿\`,
                                  searchText: u.barcode || ""
                                }))
                              )}
                            />`;

// Replace lines 14232 to 14246 (0-indexed: 14231 to 14245)
lines.splice(14231, 15, replaceStr);

fs.writeFileSync('LabPos-main/src/App.tsx', lines.join('\n'));
console.log('patched lines 14232-14246');
