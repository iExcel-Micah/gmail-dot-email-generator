import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '8080', 10);
const BASE_PATH = process.env.APP_BASE_PATH || '/';

const app = express();

// Serve static assets (gmailDots.js) from project root
const staticDir = __dirname;

// Serve at base path
app.use(BASE_PATH, express.static(staticDir, { index: false }));

// Also serve at root so relative imports work in both local and production
if (BASE_PATH !== '/') {
  app.use('/', express.static(staticDir, { index: false }));
}

// Main page — serve service-page.html for the base path
app.get(BASE_PATH, (_req, res) => {
  res.sendFile(path.join(staticDir, 'service-page.html'));
});

// Redirect bare path without trailing slash
if (BASE_PATH !== '/' && !BASE_PATH.endsWith('/')) {
  app.get(BASE_PATH + '/', (_req, res) => {
    res.sendFile(path.join(staticDir, 'service-page.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Gmail Dot Generator running on port ${PORT}`);
  console.log(`Base path: ${BASE_PATH}`);
});
