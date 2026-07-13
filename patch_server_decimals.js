const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

const target1 = `        // ลูกค้าที่ซื้อเป็นเชื่อ (credit) จะยังไม่ได้แต้ม
        if (earnRatio > 0 && paymentMethod !== "credit") {
          ptsEarned = invoiceTotal / earnRatio;
        }`;

const replace1 = `        // ลูกค้าที่ซื้อเป็นเชื่อ (credit) จะยังไม่ได้แต้ม
        if (earnRatio > 0 && paymentMethod !== "credit") {
          ptsEarned = parseFloat((invoiceTotal / earnRatio).toFixed(2));
        }`;

if(code.includes(target1)){
    code = code.replace(target1, replace1);
    console.log('patched ptsEarned 1');
}

const target2 = `      const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
      let ptsEarned = 0;
      if (earnRatio > 0) {
        ptsEarned = payAmt / earnRatio;
      }`;

const replace2 = `      const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
      let ptsEarned = 0;
      if (earnRatio > 0) {
        ptsEarned = parseFloat((payAmt / earnRatio).toFixed(2));
      }`;

if(code.includes(target2)){
    code = code.replace(target2, replace2);
    console.log('patched ptsEarned 2');
}

fs.writeFileSync('LabPos-main/server.ts', code);
