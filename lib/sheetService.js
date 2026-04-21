import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const HEADERS = [
  'Timestamp',
  'Lead ID',
  'Input Email',
  'Base Local',
  'Domain',
  'Plus Tag',
  'Mode',
  'Variant Count',
  'First Variant',
  'User Agent',
  'IP'
];

const COLUMN_RANGE = `A:${String.fromCharCode(64 + HEADERS.length)}`;

function pad(n) {
  return n.toString().padStart(2, '0');
}

export function generateLeadId(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  const rand = Math.random().toString(36).slice(2, 8);
  return `IXL-GDG-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;
}

export class SheetService {
  constructor({ spreadsheetId, tabName }) {
    this.spreadsheetId = spreadsheetId;
    this.tabName = tabName;
    this.sheetsClient = null;
    this.headersEnsured = false;
    this.initPromise = null;
  }

  async ensureInitialized() {
    if (this.sheetsClient && this.headersEnsured) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.spreadsheetId || !this.tabName) {
        throw new Error('SheetService missing spreadsheetId or tabName');
      }

      if (!this.sheetsClient) {
        const auth = new google.auth.GoogleAuth({ scopes: SCOPES });
        const client = await auth.getClient();
        this.sheetsClient = google.sheets({ version: 'v4', auth: client });
      }

      if (!this.headersEnsured) {
        const existing = await this.sheetsClient.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.tabName}!A1:${String.fromCharCode(64 + HEADERS.length)}1`
        });

        const hasHeaders = existing.data.values && existing.data.values[0] && existing.data.values[0].length > 0;

        if (!hasHeaders) {
          await this.sheetsClient.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${this.tabName}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [HEADERS] }
          });
        }

        this.headersEnsured = true;
      }

      return true;
    })().catch((error) => {
      this.initPromise = null;
      throw error;
    });

    return this.initPromise;
  }

  async appendRow(record) {
    await this.ensureInitialized();

    const row = [
      record.timestamp || new Date().toISOString(),
      record.leadId || '',
      record.inputEmail || '',
      record.baseLocal || '',
      record.domain || '',
      record.plusTag || '',
      record.mode || '',
      record.variantCount ?? '',
      record.firstVariant || '',
      record.userAgent || '',
      record.ip || ''
    ];

    const response = await this.sheetsClient.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!${COLUMN_RANGE}`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    return response.data;
  }
}
