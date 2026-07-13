const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `                    <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-4 mt-5">
                      <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl border border-emerald-200/30">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-bold text-emerald-900 text-sm">เคาน์เตอร์พร้อมให้บริการแล้ว</h3>
                        <p className="text-[10px] text-emerald-700 mt-0.5">โปรดนำสินค้าที่มีบาร์โค้ดมายังเคาน์เตอร์แคชเชียร์เพื่อแสกน</p>
                      </div>
                    </div>`;

const replace1 = `                    {customerDisplayData.memberInfo ? (
                      <div className="bg-indigo-50 border border-indigo-200/60 rounded-2xl p-4 flex items-center gap-4 mt-5 animate-fadeIn">
                         <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl border border-indigo-200/30">
                           <Users className="w-6 h-6 animate-pulse" />
                         </div>
                         <div>
                           <h3 className="font-bold text-indigo-900 text-sm">ยินดีต้อนรับคุณ {customerDisplayData.memberInfo.name}</h3>
                           <p className="text-[10px] text-indigo-700 mt-0.5">แต้มสะสมปัจจุบันของคุณคือ {customerDisplayData.memberInfo.points.toLocaleString()} แต้ม</p>
                         </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-4 mt-5">
                        <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl border border-emerald-200/30">
                          <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-bold text-emerald-900 text-sm">เคาน์เตอร์พร้อมให้บริการแล้ว</h3>
                          <p className="text-[10px] text-emerald-700 mt-0.5">โปรดนำสินค้าที่มีบาร์โค้ดมายังเคาน์เตอร์แคชเชียร์เพื่อแสกน</p>
                        </div>
                      </div>
                    )}`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log('patched idle ad block');
}

const target2 = `                  <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-5 flex items-center gap-4 mt-6">
                    <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-200/30">
                      <Sparkles className="w-6 h-6 animate-pulse text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-emerald-900 text-base">เคาน์เตอร์พร้อมให้บริการแล้ว</h3>
                      <p className="text-xs text-emerald-700 mt-0.5">โปรดนำสินค้าที่มีบาร์โค้ดมายังเคาน์เตอร์แคชเชียร์เพื่อทำรายการสแกนสินค้า</p>
                    </div>
                  </div>`;

const replace2 = `                  {customerDisplayData.memberInfo ? (
                    <div className="bg-indigo-50 border border-indigo-200/60 rounded-2xl p-5 flex items-center gap-4 mt-6 animate-fadeIn">
                      <div className="bg-indigo-100 text-indigo-700 p-3 rounded-xl border border-indigo-200/30">
                        <Users className="w-6 h-6 animate-pulse text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-indigo-900 text-base">ยินดีต้อนรับคุณ {customerDisplayData.memberInfo.name}</h3>
                        <p className="text-xs text-indigo-700 mt-0.5">แต้มสะสมปัจจุบันของคุณคือ {customerDisplayData.memberInfo.points.toLocaleString()} แต้ม</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-5 flex items-center gap-4 mt-6">
                      <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-200/30">
                        <Sparkles className="w-6 h-6 animate-pulse text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-emerald-900 text-base">เคาน์เตอร์พร้อมให้บริการแล้ว</h3>
                        <p className="text-xs text-emerald-700 mt-0.5">โปรดนำสินค้าที่มีบาร์โค้ดมายังเคาน์เตอร์แคชเชียร์เพื่อทำรายการสแกนสินค้า</p>
                      </div>
                    </div>
                  )}`;

if (code.includes(target2)) {
    code = code.replace(target2, replace2);
    console.log('patched idle standard block');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
