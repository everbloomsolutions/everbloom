const fs = require('fs');
const path = process.argv[2];
let code = fs.readFileSync(path, 'utf8');
const insert = "console.log('BULL BUILDQUEUE', JSON.stringify({name: options.name, redis: options.redis}));\n";
if (!code.includes('BULL BUILDQUEUE')) {
  code = code.replace('function buildQueue(options) {', 'function buildQueue(options) {\n' + insert);
  fs.writeFileSync(path, code);
  console.log('patched', path);
} else {
  console.log('already patched');
}
