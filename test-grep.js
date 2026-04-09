import fs from 'fs';

const content = fs.readFileSync('server/routes/backlinks.js', 'utf8');
const lines = content.split('\n');

let res = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('router.get(')) {
    res.push(`${i + 1}: ${lines[i]}`);
  }
}

fs.writeFileSync('test-grep-output.txt', res.join('\n'), 'utf8');
