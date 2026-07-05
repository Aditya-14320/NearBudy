/**
 * Firestore full wipe script using Google auth via service account JWT
 * Works with Node.js v24 — no firebase-admin crypto issues
 */
import { createSign } from 'crypto';
import { readFileSync } from 'fs';

const PROJECT_ID = 'nearbudy-8e4cb';
const SERVICE_ACCOUNT_B64 = 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6Im5lYXJidWR5LThlNGNiIiwicHJpdmF0ZV9rZXlfaWQiOiI1ZGQ2M2ZiNWNhZDUxYWI2NjMyZDQ3YTg3YjdjMjUwMjkzZjZmMWZjIiwicHJpdmF0ZV9rZXkiOiItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRQ1gzZGhTVG9icENkWjNcbnZqU0FRVVBoYjlsZkNNeGRxZHlMSzkrK09teWx2Z2wzTlFiRysxYjFUU0VTSVNTYkc5cnRrUGdhUDMycHdlL2Vcbkx1S2c1UW9VZTgzT04rSFo4OEl1cjQwYnVwMTlrRDMxZlBJOTVtU3hkYm1EenBCZitHMllEYlhsSWFIMW1WREFcbkp1MVRyaUJyeDRFa3BxZEowOVlqNEkydUkxNFdSR2VhVkJ1cW9NWjB1Qm4zbTUyZkw1dXZxMjhzdEViVzhCdTBcblQ1bnlrZXhxclhBNnhLYTdkWjlJQnZMeFhMUGtETE0rdkIzVEhHeitwTFBzRFpBSzhXU21QV1FTVGZ3RnB4RVZcbkJlcFVzU1k0ZEkxRnVLUHgzR3d4MDIxZFFCVzFDSW5jNk5tbmVOOEFvZXd6VHpFNCs0MEo2WnVqTTJRVmVXb2pcblI2cDFCR3NQQWdNQkFBRUNnZ0VBQ1c1Y3RkS3NMdDM4Q1FQTTk1VXhjUTRYRVg5eUtpcWdpR1YyNTdXNi9ObHdcblVUREpEQWhCRjI5MklqdHkwcnRvTDRDSnZZeXlqWGpIc3BzL2YweVRKZVNsZ1JGOHBGa3VteXljZXh1M09zNmtcbkJLMlRZVlpKYTlYZElJMXVYTjBhd2M4ZFRsTWFsa0I3cmwvQkVPQ202bHFUd2NhUnRTYW9CQ0tCN0R1ZjV4MENcblZWRzlZMm8vdWZldnEvSDE5N0VRaWp4SUFORnMyaEJ4a0wwSFJXdWJEaW1tOWVVdTcrUU5vVkFSaVYzQXc3UVNcbjBacnc4ZVlEQlk5dzRZRHhCaG5iVjJtUHpKUFh5NitGRjgrY0s1UmVINWhEMXRPQzlQL0lHVXZOQVF1bzNNaU9cblc2UmowVm1wOFlnN1ZWLzhpOWMwSUh2Y3lkK0dJNnhjemYwQy9vN2hJUUtCZ1FER3ZMNUxXR0svemRFWVA0WnFcbmc2SVBTQ0ZpZUZXUmQ4dFEzVTV1MkRzWi85YmNOY3lUb1VWcXVWV2N2enhDNUNjNnNTbFFEZGNVaHhuT2taYmlcbmRWU0N3Z1JlOHdTTENja2ZqVUdXMDY2TmFDTGJzWG14TUpaRkpVaEJuSlI3MEJmK05wb0NpN3J4Z0ZBdUIydUtcbk5ST2pUUmErZlAzb0QzdXFKc2dlV2FyaGJ3S0JnUUREbjlOd1JZcVA5WFlncytWbW5qRENwV2lVb285bnQ2S0xcblk0NzdLK29BV0R6ekpPMUdlVWZocUp6M2FkNmpyOElOVjNIZlRyS0toL2RsODhFRC9TZUNhZzNKQU0vTHB5YmFcbnZDK2lxVDc3WTlUOUpleHRlUkUvUmpQZmp2a2xKbnBiRmtwOU95bHJZazRIL0w5dVpkZ1N1M3NoMWNvRGo3Qmhcbkg3ME5MSXNBWVFLQmdRQ1ROMDl6ZXNhenRGKzJxYUFGbVByY2ZSOFYxWFAxYlJyMERPdkQybk4xWC9vbVo4ZmlcbmVDMTIwRkZsNnBkV0tiSVJuUml3VDRCS21ZVjVhb210dVNKZ05oNk13MUpUT0cxKzdPRndPK0JxcVlCZzQ0ZjBcbnhMd2IvbkVYQVVsUXFpYUx6cUNwVUI2c05OT3dOUmpwYVVYaHl3SVZHM3Z1Z2tHbUdsSlZnVEMvQ3dLQmdIQ0ZcblBka1dKdDBuRXdzOGJuYllCclB1OEhpT0NHNWY4ZDY3SlVMVHY0VHpQQnVlNGR2blpyRWxpeVBFZ1lzbFRUamZcblUyQmVvOU9LNFlLQzhrS1pHbUNwSDhTOThzZnhIU2d6bGpLNXBzQnlhOUF3UUEyMzFYUFByWWFwZGlVb1BMaW5cbjJiQ3VsdVJ0WnZTeExHc1RxWFVjNFhaVXdoM0tTR21WRitpNzlqZ0JBb0dBRVQ2S1ArbDFLS2krM0FwQnZUZFlcblBQT1Y4d2hmMm5OQWFnT3FUQUJDd3BmazJBcnY4ckFlbmR4K3BNUFZuY3RxZm92bEpGR3FpaHFGYkdYT2hpRTU3XG5ibFVSTWRkSkJTZmpCK21lRVdBOSt5Y205Z3grbG01dHZZV3hIWTB3S2FLVEdKb1B5WldlZWszZG0vT1NuQi9ZXG5FN29GcmQxblNtL1F1YkI4Ky9PS2p4ND1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsImNsaWVudF9lbWFpbCI6ImZpcmViYXNlLWFkbWluc2RrLWZic3ZjQG5lYXJidWR5LThlNGNiLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiY2xpZW50X2lkIjoiMTA5MzU2NjM2MDI3NDc0MzgwNDMwIiwiYXV0aF91cmkiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsInRva2VuX3VyaSI6Imh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjoiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwiY2xpZW50X3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2ZpcmViYXNlLWFkbWluc2RrLWZic3ZjJTQwbmVhcmJ1ZHktOGU0Y2IuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJ1bml2ZXJzZV9kb21haW4iOiJnb29nbGVhcGlzLmNvbSJ9';

const sa = JSON.parse(Buffer.from(SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
// Fix literal \n sequences in private key
const privateKey = sa.private_key.replace(/\\n/g, '\n');
const clientEmail = sa.client_email;

// ---- JWT / OAuth token helpers ----
function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sigInput = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(sigInput);
  const sig = sign.sign(privateKey, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${sigInput}.${sig}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ---- Firestore REST helpers ----
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function listCollections(token, docPath = '') {
  const url = docPath
    ? `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}:listCollectionIds`
    : `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:listCollectionIds`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await resp.json();
  return data.collectionIds || [];
}

async function listDocs(token, collPath) {
  const url = `${BASE}/${collPath}?pageSize=300`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  return (data.documents || []).map(d => d.name.split('/documents/')[1]);
}

async function deleteDoc(token, docPath) {
  const url = `${BASE}/${docPath}`;
  await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

async function deleteCollection(token, collPath) {
  const docs = await listDocs(token, collPath);
  for (const docPath of docs) {
    // Recurse into subcollections
    const subColls = await listCollections(token, docPath);
    for (const sub of subColls) {
      await deleteCollection(token, `${docPath}/${sub}`);
    }
    await deleteDoc(token, docPath);
    process.stdout.write('.');
  }
  return docs.length;
}

// ---- Auth Users helper via Identity Toolkit ----
async function deleteAllAuthUsers(token) {
  let total = 0;
  let nextPageToken;
  do {
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`;
    const body = { pageSize: 500 };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    const users = data.userInfo || [];
    for (const u of users) {
      await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: u.localId }),
      });
      process.stdout.write('u');
      total++;
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  return total;
}

// ---- Main ----
async function main() {
  console.log('\n🔐 Getting access token...');
  const token = await getAccessToken();
  console.log('✅ Access token obtained.\n');

  console.log('📋 Listing root collections...');
  const collections = await listCollections(token);
  console.log('Found:', collections);

  let totalDocs = 0;
  for (const coll of collections) {
    process.stdout.write(`\n🗑️  Wiping "${coll}" `);
    const count = await deleteCollection(token, coll);
    totalDocs += count;
    console.log(` → ${count} docs deleted.`);
  }

  console.log(`\n\n✅ Firestore wiped — ${totalDocs} documents deleted.`);

  console.log('\n👤 Deleting Firebase Auth users...');
  const usersDeleted = await deleteAllAuthUsers(token);
  console.log(`✅ ${usersDeleted} auth user(s) deleted.`);

  console.log('\n🎉 Full wipe complete! Start fresh.\n');
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
