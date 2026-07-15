const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetPromo1 = `                          ) : (
                            <select
                              required
                              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                              value={promoFormProductUnitId}
                              onChange={(e) => setPromoFormProductUnitId(e.target.value)}
                            >
                              <option value="">-- เลือกยูนิตสินค้า --</option>
                              {productsList.flatMap((p) => 
                                 (p.units || []).map((u: any) => (
                                  <option key={u.id} value={u.id}>
                                    {p.name} [{u.unitName}] (บาร์โค้ด: {u.barcode}) - {parseFloat(u.retailPrice).toFixed(2)} บาท
                                  </option>
                                ))
                              )}
                            </select>
                          )}`;

const replacePromo1 = `                          ) : (
                            <SearchableSelect
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
                            />
                          )}`;

if (code.includes(targetPromo1)) {
    code = code.replace(targetPromo1, replacePromo1);
    console.log('patched promo 1');
} else {
    console.log('promo 1 not found');
}
fs.writeFileSync('LabPos-main/src/App.tsx', code);
