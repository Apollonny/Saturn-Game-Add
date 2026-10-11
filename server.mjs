import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const catalogService = createRequire(import.meta.url)('./electron/steam-catalog.cjs');

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mp4':'video/mp4', '.jpg':'image/jpeg', '.png':'image/png', '.ttf':'font/ttf', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8' };

http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if(pathname==='/api/catalog'||/^\/api\/game\/[1-9]\d{0,9}$/.test(pathname)){
    try{
      const url=new URL(req.url,'http://localhost');
      const result=pathname==='/api/catalog'?await catalogService.search(Object.fromEntries(url.searchParams)):{game:await catalogService.details(pathname.split('/').pop())};
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify({ok:true,...result}));
    }catch(error){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify({ok:false,error:error.message}));}
    return;
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
  const size = fs.statSync(file).size;
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache' };
  const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (match) {
    const start = Number(match[1]); const end = Math.min(match[2] ? Number(match[2]) : size - 1, size - 1);
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range':`bytes */${size}` }).end(); return; }
    res.writeHead(206, { ...headers, 'Content-Range':`bytes ${start}-${end}/${size}`, 'Content-Length':end-start+1 });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'Content-Length':size });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  }
}).listen(port, '127.0.0.1', () => console.log(`Steam Game Add: http://127.0.0.1:${port}`));
