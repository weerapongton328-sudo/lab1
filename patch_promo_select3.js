const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetPromo3 = `                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-emerald-800">สินค้าที่นำมาแถมฟรี (สินค้า Y) *</label>
                              <select
                                required={promoFormType === "buy_x_get_y"}
                                className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                value={promoFormFreeUnitId}
                                onChange={(e) => setPromoFormFreeUnitId(e.target.value)}
                              >
                                <option value="">-- เลือกยูนิตของแถมฟรี --</option>
                                {productsList.flatMap((p) => 
                                  (p.units || []).map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                      {p.name} [{u.unitName}] (บาร์โค้ด: {u.barcode})
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>`;

const replacePromo3 = `                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-emerald-800">สินค้าที่นำมาแถมฟรี (สินค้า Y) *</label>
                              <SearchableSelect
                                className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-full"
                                placeholder="-- ค้นหาและเลือกยูนิตของแถมฟรี --"
                                value={promoFormFreeUnitId}
                                onChange={(val) => setPromoFormFreeUnitId(val)}
                                options={productsList.flatMap((p) => 
                                  (p.units || []).map((u: any) => ({
                                    value: u.id.toString(),
                                    label: \`\${p.name} [\${u.unitName}] (บาร์โค้ด: \${u.barcode || '-'}) \`,
                                    searchText: u.barcode || ""
                                  }))
                                )}
                              />
                            </div>`;

if (code.includes(targetPromo3)) {
    code = code.replace(targetPromo3, replacePromo3);
    console.log('patched promo 3');
} else {
    console.log('promo 3 not found');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
