const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/db/schema.ts', 'utf8');

const target = `  enableBillPayment: boolean('enable_bill_payment').notNull().default(true),`;
const replace = `  enablePointSystem: boolean('enable_point_system').notNull().default(true),
  enableBillPayment: boolean('enable_bill_payment').notNull().default(true),`;

if (code.includes(target)) {
    code = code.replace(target, replace);
    console.log('patched schema');
}
fs.writeFileSync('LabPos-main/src/db/schema.ts', code);
