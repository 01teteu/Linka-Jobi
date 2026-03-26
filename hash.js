const fs = require('fs');
const crypto = require('crypto');

const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  if (content.trim() !== '') {
    const hash = crypto.createHash('sha256').update(content).digest('base64');
    console.log(`'sha256-${hash}'`);
  }
}
