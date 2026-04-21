// Smoke test for the Gmail Dot Generator email integration.
// Run with:
//   node --env-file=.env.local scripts/smoke-email.mjs
// or:
//   node scripts/smoke-email.mjs   (env vars already exported)
//
// Sends a realistic sample email via AgentMail to confirm sendResultsEmail works end-to-end.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendResultsEmail } from '../email-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fallback loader for .env.local if the user didn't pass --env-file.
// Only populates keys that aren't already in process.env.
function loadEnvLocal() {
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

loadEnvLocal();

const RECIPIENT = 'micahberkley@gmail.com';
const baseEmail = '[SMOKE TEST] micah.berkley@gmail.com';
const mode = 'all';

// Realistic sample of Gmail dot variations (the real generator produces these
// by inserting dots into the local part). 15 entries keeps the email compact.
const variations = [
  'micahberkley@gmail.com',
  'm.icahberkley@gmail.com',
  'mi.cahberkley@gmail.com',
  'mic.ahberkley@gmail.com',
  'mica.hberkley@gmail.com',
  'micah.berkley@gmail.com',
  'micahb.erkley@gmail.com',
  'micahbe.rkley@gmail.com',
  'micahber.kley@gmail.com',
  'micahberk.ley@gmail.com',
  'micahberkl.ey@gmail.com',
  'micahberkle.y@gmail.com',
  'm.i.c.a.h.berkley@gmail.com',
  'micah.b.e.r.k.l.e.y@gmail.com',
  'm.icah.berkley@gmail.com',
];

async function main() {
  console.log('[smoke-email] Sending test email...');
  console.log('[smoke-email] Recipient    :', RECIPIENT);
  console.log('[smoke-email] Base email   :', baseEmail);
  console.log('[smoke-email] Mode         :', mode);
  console.log('[smoke-email] Variations   :', variations.length);
  console.log('[smoke-email] Inbox ID     :', process.env.AGENTMAIL_INBOX_ID || '(default: iexcelagent@agentmail.to)');
  console.log('[smoke-email] API key set  :', Boolean(process.env.AGENTMAIL_API_KEY));

  const response = await sendResultsEmail({
    to: RECIPIENT,
    baseEmail,
    mode,
    variations,
  });

  console.log('[smoke-email] Response     :', response);
  console.log('[smoke-email] Success.');
}

main().catch((err) => {
  console.error('[smoke-email] FAILED:', err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
