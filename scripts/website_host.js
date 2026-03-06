import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация сервера
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '../website/dist');

// Карта MIME-типов для корректного отображения браузером
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Маршрутизация: если запрос на корень '/', отдаем index.html
    const requestUrl = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(PUBLIC_DIR, requestUrl);
    
    // Безопасность: предотвращение выхода за пределы папки dist (Directory Traversal)
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Чтение и отправка файла
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`500 Internal Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`[SERVER] Сервер запущен.`);
    console.log(`[SERVER] Локалхост: http://localhost:${PORT}`);
    console.log(`[SERVER] Нажмите Ctrl+C для остановки.`);
});