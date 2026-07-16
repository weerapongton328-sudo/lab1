const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `export const convertThaiToEngKeyboard = (input: string): string => {
  if (!input) return "";
  
  // Only apply conversion if the input contains at least one Thai character (including Thai digits/symbols)
  // OR if it consists purely of symbols that the Thai keyboard produces when typing English numbers/symbols 
  // (such as /, -, +, ", (, ), ?) to prevent mapping English characters when typing normally in English.
  const hasThai = /[ก-๙]/.test(input) || /^[\\/\\-\\+"()? \\t\\n\\r]+$/.test(input);
  if (!hasThai) {
    return input;
  }`;

const replacement = `export const convertThaiToEngKeyboard = (input: string, forceConvert: boolean = false): string => {
  if (!input) return "";
  
  // If forceConvert is true, we always apply the mapping. This is useful for barcode scanners 
  // where we know the input should strictly be English alphanumeric and we want to prevent Thai layout issues.
  const hasThai = /[ก-๙]/.test(input) || /^[\\/\\-\\+"()? \\t\\n\\r]+$/.test(input);
  if (!hasThai && !forceConvert) {
    return input;
  }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched convert function signature");
} else {
    console.log("Could not find target block");
}
