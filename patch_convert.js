const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `  // Only apply conversion if the input contains at least one Thai character (including Thai digits/symbols)
  // This prevents mapping English characters like '-' to '3' when the keyboard is already in English.
  const hasThai = /[ก-๙]/.test(input);
  if (!hasThai) {
    return input;
  }`;

const replacement = `  // Only apply conversion if the input contains at least one Thai character (including Thai digits/symbols)
  // OR if it consists purely of symbols that the Thai keyboard produces when typing English numbers/symbols 
  // (such as /, -, +, ", (, ), ?) to prevent mapping English characters when typing normally in English.
  const hasThai = /[ก-๙]/.test(input) || /^[\\/\\-\\+"()? \\t\\n\\r]+$/.test(input);
  if (!hasThai) {
    return input;
  }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched conversion logic");
} else {
    console.log("Could not find target block");
}
