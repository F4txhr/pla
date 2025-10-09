// A simple Node.js server to run Vercel-like serverless functions locally.
// This allows for development and debugging without needing the Vercel CLI.
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables from a .env.local file SYNCHRONOUSLY
// This is critical to ensure they are available before any other modules are loaded.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// --- Diagnostic Logging ---
console.log("--- Environment Variables ---");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "Loaded" : "NOT LOADED");
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "Loaded" : "NOT LOADED");
console.log("--------------------------");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// A more robust mock for the Vercel response object that supports chaining.
const createResMock = (res) => {
    let statusCode = 200;
    const headers = {};

    const resMock = {
        status(code) {
            statusCode = code;
            return this; // Return the object to allow chaining
        },
        setHeader(name, value) {
            headers[name] = value;
            return this;
        },
        send(data) {
            res.writeHead(statusCode, headers);
            res.end(data);
        },
        json(data) {
            this.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode, headers);
            res.end(JSON.stringify(data));
        },
    };
    return resMock;
};

const server = http.createServer((req, res) => {
    // This is the crucial fix: we need to parse the request body for POST/PATCH requests
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        const body = Buffer.concat(chunks).toString();
        if (body) {
            try {
                req.body = JSON.parse(body);
            } catch (e) {
                req.body = body; // Fallback for non-JSON bodies
            }
        }

        const urlPath = req.url.split('?')[0];

        // Route API requests to the corresponding serverless function
        if (urlPath.startsWith('/api/')) {
            const functionName = urlPath.split('/')[2];
            const functionPath = path.join(__dirname, 'api', `${functionName}.js`);

            try {
                if (fs.existsSync(functionPath)) {
                    const { default: handler } = await import(`./api/${functionName}.js?t=${Date.now()}`); // Bust cache
                    const resMock = createResMock(res);
                    await handler(req, resMock);
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Function not found' }));
                }
            } catch (error) {
                // Enhanced error logging to get more details
                console.error(`Error executing function ${functionName}:`, error.message);
                console.error('Stack Trace:', error.stack);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error', details: error.message }));
            }
        } else {
            // Serve static files (HTML, CSS, JS)
            // Correctly handle the path by removing the leading slash from the URL path.
            const safeUrlPath = urlPath === '/' ? 'index.html' : urlPath.substring(1);
            const filePath = path.join(__dirname, safeUrlPath);
            const extname = String(path.extname(filePath)).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.txt': 'text/plain',
            };
            const contentType = mimeTypes[extname] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1>', 'utf-8');
                    } else {
                        res.writeHead(500);
                        res.end('Sorry, an error occurred: ' + error.code);
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('API endpoints are available under /api/');
});