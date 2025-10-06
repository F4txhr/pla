// A simple, dependency-free local development server to mimic Vercel's behavior.
// It serves static files and routes /api/* requests to the corresponding serverless functions.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Explicitly load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the directory name in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, './');
const API_DIR = path.join(__dirname, 'api');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  console.log(`[${new Date().toISOString()}] ${method} ${url}`);

  // Route API requests
  if (url.startsWith('/api/')) {
    const apiRoute = url.substring(5); // remove '/api/'
    const functionName = apiRoute.split('/')[0];
    // Add .js extension for dynamic import
    const functionPath = path.join(API_DIR, `${functionName}.js`);

    if (fs.existsSync(functionPath)) {
      try {
        // Use dynamic import() for ES Modules
        const module = await import(`${functionPath}?t=${Date.now()}`); // Append timestamp to bust cache
        const handler = module.default;

        // Mock Vercel's request and response objects
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          if (body) {
            try {
              req.body = JSON.parse(body);
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              return;
            }
          }

          const mockRes = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' }, // Default header
            setHeader(name, value) {
              this.headers[name] = value;
            },
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(data) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(data));
            },
            end(data) {
              res.writeHead(this.statusCode, this.headers);
              res.end(data);
            },
          };

          await handler(req, mockRes);
        });
      } catch (error) {
        console.error('Error executing serverless function:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
    return;
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, url === '/' ? 'index.html' : url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + err.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local development server running!`);
  console.log(`   You can access the application at http://localhost:${PORT}`);
  console.log('\nWatching for file changes...');
});