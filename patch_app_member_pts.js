const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

code = code.replace(/selectedMember\.points/g, "parseFloat(selectedMember.points)");
// Need to be careful because there are `parseFloat(parseFloat(selectedMember.points))` if we just replace blindly. Let's just fix the Modal.

fs.writeFileSync('patch_app_member_pts.js', code);
