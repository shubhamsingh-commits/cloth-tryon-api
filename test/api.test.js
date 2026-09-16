import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../dev.mjs';

test('HTTP routes validate requests and preserve the storefront contract', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.PERFECT_CORP_API_KEY;
  const originalOrigins = process.env.ALLOWED_ORIGINS;
  process.env.PERFECT_CORP_API_KEY = 'test-key';
  process.env.ALLOWED_ORIGINS = 'https://store.example';
  const upstreamCalls = [];
  let providerError = false;
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith('https://yce-api-01.makeupar.com/')) return originalFetch(url, options);
    upstreamCalls.push({ url, options });
    if (providerError) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ status: 200, data: options.method === 'POST'
      ? { task_id: 'task-123' }
      : { task_status: 'success', results: { url: 'https://images.example/result.jpg' }, error: null } });
  };
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.PERFECT_CORP_API_KEY;
    else process.env.PERFECT_CORP_API_KEY = originalKey;
    if (originalOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalOrigins;
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(base + '/api/cloth-try-on', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://store.example' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  assert.equal((await fetch(base + '/api/health')).status, 200);
  assert.equal((await fetch(base + '/api/cloth-try-on')).status, 405);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post({})).status, 400);
  assert.equal((await fetch(base + '/api/cloth-try-on-status')).status, 400);
  assert.equal((await fetch(base + '/api/health', { headers: { Origin: 'https://blocked.example' } })).status, 403);
  const preflight = await fetch(base + '/api/cloth-try-on', { method: 'OPTIONS', headers: { Origin: 'https://store.example' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://store.example');
  assert.equal(upstreamCalls.length, 0);

  const input = { src_file_url: 'https://images.example/person.jpg', ref_file_url: 'https://images.example/garment.jpg' };
  const created = await post(input);
  assert.equal(created.status, 200);
  assert.deepEqual(await created.json(), { task_id: 'task-123' });
  assert.deepEqual(JSON.parse(upstreamCalls[0].options.body), { ...input, garment_category: 'auto' });
  assert.equal(upstreamCalls[0].options.headers.Authorization, 'Bearer test-key');
  const result = await fetch(base + '/api/cloth-try-on-status?task_id=task-123');
  assert.deepEqual(await result.json(), { task_id: 'task-123', status: 'success', output_url: 'https://images.example/result.jpg', error: null });
  providerError = true;
  assert.equal((await post(input)).status, 502);
  delete process.env.PERFECT_CORP_API_KEY;
  assert.equal((await post(input)).status, 503);
});
