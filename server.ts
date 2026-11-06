import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './server/api-handlers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API middleware
app.use(async (req, res, next) => {
  try {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const portNumber = Number(PORT) || 3000;
app.listen(portNumber, '0.0.0.0', () => {
  console.log(`OmniBrowser running at http://0.0.0.0:${portNumber}`);
});
