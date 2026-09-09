const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('../src/main/config');

async function deployRules() {
  const rulesPath = path.join(__dirname, '..', 'firebase', 'database.rules.json');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  const url = `${config.firebase.databaseURL}/.settings/rules.json?auth=${config.firebase.databaseSecret}`;
  const parsedUrl = new URL(url);

  console.log(`Deploying rules to: ${parsedUrl.origin}/.settings/rules.json`);

  const req = https.request({
    hostname: parsedUrl.hostname,
    path: `${parsedUrl.pathname}${parsedUrl.search}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rulesContent)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Response: ${body}`);
      if (res.statusCode === 200) {
        console.log('✓ Firebase Security Rules deployed successfully to RTDB!');
      } else {
        console.error('✗ Failed to deploy rules:', body);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
  });

  req.write(rulesContent);
  req.end();
}

deployRules();
