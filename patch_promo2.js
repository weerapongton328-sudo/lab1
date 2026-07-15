const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const lines = code.split('\n');

const replaceStr = `                                <SearchableSelect
                                  className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                  placeholder="-- ค้นหาและเลือกสินค้าที่จะเพิ่มเข้าร่วม --"
                                  value=""
                                  onChange={(val) => {
                                    if (val && !promoFormCustomProductUnitIds.includes(val)) {
                                      setPromoFormCustomProductUnitIds([...promoFormCustomProductUnitIds, val]);
                                    }
                                  }}
                                  options={productsList.flatMap((p) =>
                                    (p.units || []).map((u: any) => ({
                                      value: u.id.toString(),
                                      label: \`\${p.name} [\${u.unitName}] - \${parseFloat(u.retailPrice).toFixed(2)} ฿\`,
                                      searchText: u.barcode || ""
                                    }))
                                  )}
                                />`;

lines.splice(14157, 26, replaceStr);

fs.writeFileSync('LabPos-main/src/App.tsx', lines.join('\n'));
console.log('patched promo 2');
