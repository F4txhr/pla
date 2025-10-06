// A simple Node.js server to run Vercel-like serverless functions locally.
// This allows for development and debugging without needing the Vercel CLI.
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables from a .env.local file
import('dotenv').then(dotenv => dotenv.config({ path: '.env.local' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// A simple mock for the Vercel response object
// It mimics the methods used in the serverless functions (status, json, setHeader)
const createResMock = (res) => ({
    ...res,
    statusCode: 200,
    headers: {},
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        this.setHeader('Content-Type', 'application/json');
        res.writeHead(this.statusCode, this.headers);
        res.end(JSON.stringify(data));
    },
    setHeader(name, value) {
        this.headers[name] = value;
    },
});

const server = http.createServer(async (req, res) => {
    const urlPath = req.url.split('?')[0];

    // Route API requests to the corresponding serverless function
    if (urlPath.startsWith('/api/')) {
        const functionName = urlPath.split('/')[2];
        const functionPath = path.join(__dirname, 'api', `${functionName}.js`);

        try {
            // Check if the function file exists
            if (fs.existsSync(functionPath)) {
                // Dynamically import the function module
                const { default: handler } = await import(functionPath);
                const resMock = createResMock(res);

                // Execute the function handler
                await handler(req, resMock);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Function not found' }));
            }
        } catch (error) {
            console.error(`Error executing function ${functionName}:`, error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    } else {
        // Serve static files (HTML, CSS, JS) from the root directory
        let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code == 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('API endpoints are available under /api/');
});