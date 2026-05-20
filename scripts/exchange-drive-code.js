// Load .env from project root
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { google } = require('googleapis');

const code = process.argv[2];

if (!code) {
  console.error('Usage: node scripts/exchange-drive-code.js <AUTHORIZATION_CODE>');
  process.exit(1);
}

const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('GOOGLE_DRIVE_OAUTH_CLIENT_ID and GOOGLE_DRIVE_OAUTH_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');

oauth2.getToken(code).then(({ tokens }) => {
  console.log('\n=== REFRESH TOKEN ===');
  console.log(tokens.refresh_token);
  console.log('=====================\n');
  console.log('Add this to your .env as:');
  console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
});
