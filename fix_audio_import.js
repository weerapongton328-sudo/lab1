const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');
if (!code.includes('notFoundAudioB64')) {
    code = code.replace(
        'import React, {',
        'import { notFoundAudioB64 } from "./notFoundAudio";\nimport React, {'
    );
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Import added.");
} else if (code.includes('notFoundAudioB64') && !code.includes('import { notFoundAudioB64 }')) {
    code = code.replace(
        'import React, {',
        'import { notFoundAudioB64 } from "./notFoundAudio";\nimport React, {'
    );
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Import added (already used).");
} else {
    console.log("Import already exists.");
}
