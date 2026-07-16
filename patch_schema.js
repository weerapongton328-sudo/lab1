const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/db/schema.ts', 'utf8');
code = code.replace(
  "alertSoundUrl: text('alert_sound_url'),",
  "alertSoundUrl: text('alert_sound_url'),\n  enableNotFoundAudio: boolean('enable_not_found_audio').notNull().default(true),"
);
fs.writeFileSync('LabPos-main/src/db/schema.ts', code);
