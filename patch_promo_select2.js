const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetPromo2 = `                                  <div className="flex gap-2">
                                    <select
                                  id="custom-set-select"
                                  className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                >
                                  <option value="">-- เลือกสินค้าที่จะเพิ่มเข้าร่วม --</option>
                                  {productsList.flatMap((p) =>
                                    (p.units || []).map((u: any) => (
                                      <option key={u.id} value={u.id}>
                                        {p.name} [{u.unitName}] (บาร์โค้ด: {u.barcode}) - {parseFloat(u.retailPrice).toFixed(2)} บาท
                                      </option>
                                    ))
                                  )}
                                </select>
                                <button
                                  type="button"
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                                  onClick={() => {
                                    const select = document.getElementById("custom-set-select") as HTMLSelectElement;
                                    const val = select.value;
                                    if (val && !promoFormCustomProductUnitIds.includes(val)) {
                                      setPromoFormCustomProductUnitIds([...promoFormCustomProductUnitIds, val]);
                                      select.value = "";
                                    }
                                  }}
                                >
                                  เพิ่ม
                                </button>
                              </div>`;

const replacePromo2 = `                                  <div className="flex gap-2">
                                    <SearchableSelect
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
                                    />
                                  </div>`;

if (code.includes(targetPromo2)) {
    code = code.replace(targetPromo2, replacePromo2);
    console.log('patched promo 2');
} else {
    console.log('promo 2 not found');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
