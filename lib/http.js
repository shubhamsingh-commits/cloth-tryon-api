export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

export function endpoint(method, action) {
  return async (req, res) => {
    const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',').map(value => value.trim()).filter(Boolean);
    const origin = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (origin && !origins.includes(origin)) {
      return send(res, 403, { error: 'Origin is not allowed.' });
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', `${method}, OPTIONS`);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return send(res, 204);
    if (req.method !== method) {
      res.setHeader('Allow', `${method}, OPTIONS`);
      return send(res, 405, { error: 'Method not allowed.' });
    }
    try {
      await action(req, res);
    } catch (error) {
      const status = error.status || 502;
      send(res, status, { error: error.status ? error.message : 'Unable to contact Perfect Corp. Please retry.' });
    }
  };
}

export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

export async function jsonBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    fail(415, 'Content-Type must be application/json.');
  }
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > 32768) fail(413, 'Request body is too large.');
      chunks.push(Buffer.from(chunk));
    }
    body = Buffer.concat(chunks).toString();
  }
  if (Buffer.isBuffer(body)) body = body.toString();
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 32768) fail(413, 'Request body is too large.');
    try { body = JSON.parse(body); } catch { fail(400, 'Invalid JSON body.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Expected a JSON object.');
  return body;
}
