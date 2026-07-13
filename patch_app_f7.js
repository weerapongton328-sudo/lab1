const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `        case "F7":
          e.preventDefault();
          if (selectedMember && parseFloat(storePointsToDiscountRatio) > 0) {
            if (selectedMember.points > 0) {
              setRedeemPointsInput(pointsRedeemed > 0 ? pointsRedeemed.toString() : "");
              setIsRedeemPointsModalOpen(true);
            } else {
              showToast("ลูกค้าสมาชิกไม่มีแต้มให้แลกส่วนลด", "warning");
            }
          } else {
             showToast("ไม่มีลูกค้าสมาชิก หรือไม่ได้ตั้งค่าอัตราแลกแต้ม", "warning");
          }
          break;`;

const replace1 = `        case "F7":
          e.preventDefault();
          if (selectedMember && parseFloat(storePointsToDiscountRatio) > 0) {
            const minPurchase = parseFloat(storeMinPurchaseForPointsRedeem || "0");
            if (cartSubtotal < minPurchase) {
              showToast(\`ต้องมียอดซื้อขั้นต่ำ \${minPurchase} บาท เพื่อใช้แต้มสะสม\`, "warning");
            } else if (selectedMember.points > 0) {
              setRedeemPointsInput(pointsRedeemed > 0 ? pointsRedeemed.toString() : "");
              setIsRedeemPointsModalOpen(true);
            } else {
              showToast("ลูกค้าสมาชิกไม่มีแต้มให้แลกส่วนลด", "warning");
            }
          } else {
             showToast("ไม่มีลูกค้าสมาชิก หรือไม่ได้ตั้งค่าอัตราแลกแต้ม", "warning");
          }
          break;`;

if(code.includes(target1)){
    code = code.replace(target1, replace1);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log('patched F7 hotkey');
} else {
    console.log('F7 target not found');
}
