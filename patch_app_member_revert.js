const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 bg-transparent z-10">
          
          {/* Global Member Info Banner */}
          {customerDisplayData.memberInfo && customerDisplayData.status !== "completed" && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex justify-between items-center shadow-sm shrink-0 mx-2 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-full border border-indigo-200/60 shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-indigo-800 tracking-widest uppercase bg-indigo-100/50 inline-block px-2 py-0.5 rounded-full mb-0.5">สมาชิกลูกค้า (MEMBER)</h4>
                  <p className="text-xl md:text-2xl font-black text-indigo-950 leading-none">{customerDisplayData.memberInfo.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-indigo-100/50 inline-block px-2 py-0.5 rounded-full mb-0.5">แต้มสะสมทั้งหมด (POINTS)</p>
                <p className="text-2xl md:text-3xl font-black font-mono text-indigo-600 tracking-tighter leading-none">
                  {parseFloat(customerDisplayData.memberInfo.points || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}<span className="text-sm font-sans font-bold text-indigo-700 ml-1.5 tracking-normal">แต้ม</span>
                </p>
              </div>
            </div>
          )}`;

const replace1 = `        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-transparent z-10">`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log('reverted global member banner');
} else {
    console.log('target1 not found');
}

const target2 = `                </div>

                {/* PromptPay QR Code - separate card but with extremely tight negative margin to bring it very close to the total due card (เอากรอบขึ้นมาใกล้กรอบ รวมเงิน) */}`;

const replace2 = `                </div>

                {customerDisplayData.memberInfo && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col justify-center shadow-sm shrink-0 md:-mt-4 relative overflow-hidden">
                    <div className="absolute top-[-30%] right-[-10%] w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex justify-between items-center border-b border-indigo-200/60 pb-2 mb-2">
                      <span className="font-bold text-indigo-800 flex items-center gap-1.5 text-sm">
                        <Users className="w-5 h-5 text-indigo-600" />
                        สมาชิกลูกค้า (Member)
                      </span>
                      <span className="font-bold text-indigo-950 text-sm">{customerDisplayData.memberInfo.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-600">เบอร์โทร:</span>
                      <span className="font-mono font-semibold text-slate-700">{customerDisplayData.memberInfo.phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1.5">
                      <span className="text-indigo-600">แต้มสะสมปัจจุบัน:</span>
                      <span className="font-mono font-black text-indigo-700 text-sm">{customerDisplayData.memberInfo.points.toLocaleString()} <span className="text-[10px] font-sans font-normal">แต้ม</span></span>
                    </div>
                  </div>
                )}

                {/* PromptPay QR Code - separate card but with extremely tight negative margin to bring it very close to the total due card (เอากรอบขึ้นมาใกล้กรอบ รวมเงิน) */}`;

if (code.includes(target2)) {
    code = code.replace(target2, replace2);
    console.log('restored right-column member info');
} else {
    console.log('target2 not found');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
