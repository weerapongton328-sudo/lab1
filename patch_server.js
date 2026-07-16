const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

code = code.replace(
  "logoUrl, alertSoundUrl, receiptFooter,",
  "logoUrl, enableNotFoundAudio, receiptFooter,"
);

code = code.replace(
  "alertSoundUrl: alertSoundUrl || \"\",",
  "enableNotFoundAudio: enableNotFoundAudio !== false,"
);

fs.writeFileSync('LabPos-main/server.ts', code);
console.log("Patched server.ts settings");
