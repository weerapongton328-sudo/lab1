const fs = require('fs');
const log = fs.readFileSync('/tmp/build.log', 'utf8');
const match = log.match(/export const notFoundAudioB64 = '([^']+)';/);
if (match) {
    fs.writeFileSync('LabPos-main/src/notFoundAudio.ts', "export const notFoundAudioB64 = '" + match[1] + "';\n");
    console.log("Extracted to notFoundAudio.ts successfully! Size:", match[1].length);
} else {
    console.log("Could not find the base64 string in /tmp/build.log");
}
