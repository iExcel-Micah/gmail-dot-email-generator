import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SheetService, generateLeadId } from './lib/sheetService.js';
import { validateEmail } from './lib/emailValidator.js';
import { parseGmailAddress } from './gmailDots.js';
import { sendResultsEmail } from './email-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lightweight .env.local loader (no extra dep)
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

const PORT = parseInt(process.env.PORT || '8080', 10);
const PRIMARY_BASE_PATH = process.env.APP_BASE_PATH || '/';
// Comma-separated legacy base paths we still serve for URL rename transition windows.
// Example: APP_LEGACY_BASE_PATHS=/gmail-dot-email-generator
const LEGACY_BASE_PATHS = (process.env.APP_LEGACY_BASE_PATHS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const BASE_PATHS = [...new Set([PRIMARY_BASE_PATH, ...LEGACY_BASE_PATHS])];
const BASE_PATH = PRIMARY_BASE_PATH; // kept for existing log/output references
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const TAB_NAME = process.env.GOOGLE_SHEETS_TAB || 'gmail-email-generator';

const app = express();
app.use(express.json({ limit: '2mb' }));

const staticDir = __dirname;
for (const bp of BASE_PATHS) {
  app.use(bp, express.static(staticDir, { index: false }));
}
if (!BASE_PATHS.includes('/')) {
  app.use('/', express.static(staticDir, { index: false }));
}

const sheetService = SPREADSHEET_ID
  ? new SheetService({ spreadsheetId: SPREADSHEET_ID, tabName: TAB_NAME })
  : null;

if (!sheetService) {
  console.warn('[sheets] GOOGLE_SHEETS_SPREADSHEET_ID not set — /api/log will accept but not persist.');
}

async function logRoute(req, res) {
  const {
    email,
    mode,
    variantCount,
    firstVariant,
    workspaceDomain,
    isWorkspace,
    plusTagsUsed,
    plusVariantCount,
    consent
  } = req.body || {};

  if (typeof email !== 'string' || !email) {
    return res.status(400).json({ ok: false, error: 'email required' });
  }

  // In Workspace mode we deliberately skip the Gmail-only validateEmail check
  // because the user is using a custom company domain. We still parse the
  // address to make sure it's structurally a valid email and that the local
  // part is gmail-rules-compatible (letters/numbers/dots only).
  const wsDomain = typeof workspaceDomain === 'string' ? workspaceDomain.trim().toLowerCase() : '';
  const useWorkspace = !!isWorkspace && !!wsDomain;

  if (!useWorkspace) {
    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ ok: false, error: validation.reason });
    }
  }

  const parsed = parseGmailAddress(email, useWorkspace ? { workspaceDomain: wsDomain } : undefined);
  if (!parsed) {
    return res.status(400).json({
      ok: false,
      error: useWorkspace ? 'invalid email for the supplied workspace domain' : 'invalid gmail address'
    });
  }

  const safePlusTags = Array.isArray(plusTagsUsed)
    ? plusTagsUsed.filter((t) => typeof t === 'string').slice(0, 50).join(',')
    : '';

  const record = {
    timestamp: new Date().toISOString(),
    leadId: generateLeadId(),
    inputEmail: email,
    baseLocal: parsed.baseLocal,
    domain: parsed.domain,
    plusTag: parsed.plusTag || '',
    mode: mode === 'all' ? 'all' : 'wordSplit',
    variantCount: Number.isFinite(variantCount) ? variantCount : '',
    firstVariant: typeof firstVariant === 'string' ? firstVariant : '',
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    ip: (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) || req.ip || '',
    isWorkspace: useWorkspace ? 'yes' : 'no',
    workspaceDomain: useWorkspace ? wsDomain : '',
    plusTagsUsed: safePlusTags,
    plusVariantCount: Number.isFinite(plusVariantCount) ? plusVariantCount : '',
    consent: consent ? 'yes' : 'no'
  };

  if (sheetService) {
    try {
      await sheetService.appendRow(record);
    } catch (error) {
      console.error('[sheets] append failed:', error.message);
      return res.json({ ok: true, leadId: record.leadId, logged: false });
    }
  } else {
    // Visibility: when sheets isn't configured we still want to see what
    // would have been written. Helps GDV-005 root-cause diagnosis in prod
    // logs without needing to redeploy.
    console.log('[sheets:disabled] would-log lead:', JSON.stringify(record));
  }

  res.json({ ok: true, leadId: record.leadId, logged: !!sheetService });
}

for (const bp of BASE_PATHS) {
  const route = bp === '/' ? '/api/log' : `${bp.replace(/\/$/, '')}/api/log`;
  app.post(route, logRoute);
}
if (!BASE_PATHS.includes('/')) {
  app.post('/api/log', logRoute);
}

async function sendResultsRoute(req, res) {
  const { email, baseEmail, mode, variations } = req.body || {};

  if (typeof email !== 'string' || !email) {
    return res.status(400).json({ ok: false, error: 'email required' });
  }

  const validation = validateEmail(email);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: validation.reason });
  }

  if (!Array.isArray(variations) || variations.length === 0) {
    return res.status(400).json({ ok: false, error: 'variations required' });
  }

  try {
    await sendResultsEmail({
      to: email,
      baseEmail: baseEmail || email,
      mode: mode || 'wordSplit',
      variations,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('[email] send failed:', error.message);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
}

for (const bp of BASE_PATHS) {
  const route = bp === '/' ? '/api/send-results' : `${bp.replace(/\/$/, '')}/api/send-results`;
  app.post(route, sendResultsRoute);
}
if (!BASE_PATHS.includes('/')) {
  app.post('/api/send-results', sendResultsRoute);
}

for (const bp of BASE_PATHS) {
  app.get(bp, (_req, res) => {
    res.sendFile(path.join(staticDir, 'service-page.html'));
  });
  if (bp !== '/' && !bp.endsWith('/')) {
    app.get(bp + '/', (_req, res) => {
      res.sendFile(path.join(staticDir, 'service-page.html'));
    });
  }
}

app.listen(PORT, () => {
  console.log(`Gmail Dot Generator running on port ${PORT}`);
  console.log(`Base paths: ${BASE_PATHS.join(', ')}`);
  console.log(`Sheets logging: ${sheetService ? `enabled (tab="${TAB_NAME}")` : 'DISABLED'}`);
});
