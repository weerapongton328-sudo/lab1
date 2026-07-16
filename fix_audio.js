const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/notFoundAudio.ts', 'utf8');
code = code.replace(/\n/g, ''); // strip all newlines
code = code.replace("export const notFoundAudioB64 = 'data:audio/mp3;base64,", "export const notFoundAudioB64 = 'data:audio/mp3;base64,"); // ensure no space
// wait, we can just replace newlines then make sure it has a semicolon.
fs.writeFileSync('LabPos-main/src/notFoundAudio.ts', code);
