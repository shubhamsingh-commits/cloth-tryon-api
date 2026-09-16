import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import tryOn from './api/cloth-try-on.js';
import status from './api/cloth-try-on-status.js';
import health from './api/health.js';
import { send } from './lib/http.js';

const routes = {
  '/api/cloth-try-on': tryOn,
  '/api/cloth-try-on-status': status,
  '/api/health': health
};

export function createApp() {
  return createServer(async (req, res) => {
    try {
      const handler = routes[new URL(req.url, 'http://localhost').pathname];
      if (!handler) return send(res, 404, { error: 'Endpoint not found.' });
      await handler(req, res);
    } catch {
      if (!res.writableEnded) send(res, 500, { error: 'Internal server error.' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () => console.log(`Cloth try-on API: http://localhost:${port}/api/health`));
}
