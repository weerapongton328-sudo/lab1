const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `    storePromptpayNumber,
    storePromptpayName,
    storePromptpayQrUrl
  ]);`;

const replace1 = `    storePromptpayNumber,
    storePromptpayName,
    storePromptpayQrUrl,
    selectedMember,
    membersList
  ]);`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log('patched deps');
} else {
    console.log('target1 not found');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
