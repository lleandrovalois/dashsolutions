const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // Cabeçalhos CORS e Segurança
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let reqUrl = decodeURI(req.url.split('?')[0]);

    // API Endpoint: Salvar Tema de Cores do CMS
    if (req.method === 'POST' && reqUrl === '/api/save-theme') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 500000) { // 500KB max
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const themeData = JSON.parse(body);
                if (!themeData || typeof themeData !== 'object' || !themeData.primaryColor) {
                    throw new Error('Objeto de tema inválido (requer primaryColor)');
                }
                themeData.updatedAt = new Date().toISOString();
                const themeFilePath = path.join(BASE_DIR, 'theme.json');
                fs.writeFileSync(themeFilePath, JSON.stringify(themeData, null, 2), 'utf-8');
                console.log(`[CMS] Tema salvo com sucesso em theme.json:`, themeData.preset || 'custom', themeData.primaryColor);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, theme: themeData }));
            } catch (err) {
                console.error('[CMS] Erro ao salvar tema:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API Endpoint: Salvar Portfólio (Serviços e Soluções)
    if (req.method === 'POST' && reqUrl === '/api/save-portfolio') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 2000000) { // 2MB max
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const servicesData = JSON.parse(body);
                if (!Array.isArray(servicesData)) {
                    throw new Error('Dados de portfólio inválidos (deve ser um array de serviços)');
                }
                const portfolioFilePath = path.join(BASE_DIR, 'portfolio.json');
                fs.writeFileSync(portfolioFilePath, JSON.stringify(servicesData, null, 2), 'utf-8');
                console.log(`[CMS] Portfólio salvo com sucesso em portfolio.json (${servicesData.length} itens)`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, count: servicesData.length }));
            } catch (err) {
                console.error('[CMS] Erro ao salvar portfólio:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API Endpoint: Salvar Conteúdo Geral do Site (Hero, Sobre, Métricas, Framework, Contato, etc.)
    if (req.method === 'POST' && reqUrl === '/api/save-content') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5000000) { // 5MB max (permite imagens em base64 do carrossel)
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const contentData = JSON.parse(body);
                if (!contentData || typeof contentData !== 'object') {
                    throw new Error('Dados de conteúdo inválidos (deve ser um objeto)');
                }
                contentData.updatedAt = new Date().toISOString();
                const contentFilePath = path.join(BASE_DIR, 'content.json');
                fs.writeFileSync(contentFilePath, JSON.stringify(contentData, null, 2), 'utf-8');
                console.log(`[CMS] Conteúdo geral do site salvo com sucesso em content.json`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('[CMS] Erro ao salvar conteúdo do site:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (reqUrl === '/') {
        reqUrl = '/index.html';
    }

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(BASE_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (!path.extname(filePath)) {
                const indexPath = path.join(BASE_DIR, 'index.html');
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
                fs.createReadStream(indexPath).pipe(res);
                return;
            }
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - Arquivo não encontrado');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Para arquivos JSON do CMS, garante que nunca sejam cacheados pelo navegador
        const isDynamicJson = ['theme.json', 'portfolio.json', 'content.json'].includes(path.basename(filePath));
        const cacheControl = isDynamicJson
            ? 'no-cache, no-store, must-revalidate'
            : 'no-cache';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': cacheControl
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  Dash Solutions - Website Corporativo & CMS`);
    console.log(`  Servidor rodando em: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});
