const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

const target1 = `      let ptsEarned = 0;
      const ptsRedeemed = pointsRedeemed ? parseInt(pointsRedeemed) : 0;
      if (activeMember) {
        if (ptsRedeemed > activeMember.points) {
          throw new Error(\`คะแนนสมาชิกสะสมไม่พอ! มีอยู่ \${activeMember.points} คะแนน ต้องการแลก \${ptsRedeemed} คะแนน\`);
        }
        
        // Calculate points earned from ratio
        const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
        // ลูกค้าที่ซื้อเป็นเชื่อ (credit) จะยังไม่ได้แต้ม
        if (earnRatio > 0 && paymentMethod !== "credit") {
          ptsEarned = Math.floor(invoiceTotal / earnRatio);
        }
        
        const finalPtsBalance = activeMember.points - ptsRedeemed + ptsEarned;`;

const replace1 = `      let ptsEarned = 0;
      const ptsRedeemed = pointsRedeemed ? parseInt(pointsRedeemed) : 0;
      if (activeMember) {
        const currentPoints = parseFloat(activeMember.points?.toString() || "0");
        if (ptsRedeemed > currentPoints) {
          throw new Error(\`คะแนนสมาชิกสะสมไม่พอ! มีอยู่ \${currentPoints.toFixed(2)} คะแนน ต้องการแลก \${ptsRedeemed} คะแนน\`);
        }
        
        // Calculate points earned from ratio
        const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
        // ลูกค้าที่ซื้อเป็นเชื่อ (credit) จะยังไม่ได้แต้ม
        if (earnRatio > 0 && paymentMethod !== "credit") {
          ptsEarned = invoiceTotal / earnRatio;
        }
        
        const finalPtsBalance = currentPoints - ptsRedeemed + ptsEarned;`;

code = code.replace(target1, replace1);

const target2 = `      const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
      let ptsEarned = 0;
      if (earnRatio > 0) {
        ptsEarned = Math.floor(payAmt / earnRatio);
      }
      
      const newPts = (debRec.points || 0) + ptsEarned;`;

const replace2 = `      const earnRatio = parseFloat(settingsList[0]?.pointsEarnRatio || "20");
      let ptsEarned = 0;
      if (earnRatio > 0) {
        ptsEarned = payAmt / earnRatio;
      }
      
      const currentPts = parseFloat(debRec.points?.toString() || "0");
      const newPts = currentPts + ptsEarned;`;

code = code.replace(target2, replace2);

fs.writeFileSync('LabPos-main/server.ts', code);
console.log('patched checkout points calculation in server.ts');
