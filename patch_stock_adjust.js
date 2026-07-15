const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetSelect = `<select
                            required
                            value={stockAdjustProductId}
                            onChange={(e) => {
                              setStockAdjustProductId(e.target.value);
                              setStockAdjustProductUnitId("");
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
                          >
                            <option value="">-- เลือกสินค้า --</option>
                            {productsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (คงเหลือปัจจุบันในระบบ: {p.stockQuantity} {p.baseUnit})
                              </option>
                            ))}
                          </select>`;

const replaceSelect = `<SearchableSelect
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
                            placeholder="-- เลือกสินค้า (ค้นหาชื่อหรือบาร์โค้ด) --"
                            value={stockAdjustProductId}
                            onChange={(val) => {
                              setStockAdjustProductId(val);
                              setStockAdjustProductUnitId("");
                            }}
                            options={productsList.map(p => ({
                              value: p.id.toString(),
                              label: \`\${p.name} (คงเหลือ: \${p.stockQuantity} \${p.baseUnit})\`,
                              searchText: p.units?.map(u => u.barcode).join(" ") || ""
                            }))}
                          />`;

if (code.includes(targetSelect)) {
    code = code.replace(targetSelect, replaceSelect);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log('patched stockAdjust select');
} else {
    console.log('target not found');
}
