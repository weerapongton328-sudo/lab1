const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `    const currentMemberForDisplay = completedOrderReceipt 
      ? membersList.find(m => m.id === completedOrderReceipt.memberId)
      : (cart.length > 0 ? selectedMember : (lastCompletedDisplayOrderRef.current ? membersList.find(m => m.id === lastCompletedDisplayOrderRef.current.memberId) : null));`;

const replace1 = `    const currentMemberForDisplay = completedOrderReceipt 
      ? membersList.find(m => m.id === completedOrderReceipt.memberId)
      : (selectedMember || (lastCompletedDisplayOrderRef.current ? membersList.find(m => m.id === lastCompletedDisplayOrderRef.current.memberId) : null));`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log('patched currentMemberForDisplay');
} else {
    console.log('target1 not found');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
