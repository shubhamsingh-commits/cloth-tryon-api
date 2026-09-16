import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../dev.mjs';

test('direct upload authorization and file-ID task creation', async t => {
  const realFetch = globalThis.fetch;
  const key = process.env.PERFECT_CORP_API_KEY;
  const origins = process.env.ALLOWED_ORIGINS;
  process.env.PERFECT_CORP_API_KEY = 'test-key';
  process.env.ALLOWED_ORIGINS = 'https://store.example';
  let calls = [];
  let badResponse = false;
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith('https://yce-api-01.makeupar.com/')) return realFetch(url, options);
    calls.push({ url, body: JSON.parse(options.body) });
    if (String(url).endsWith('/file')) {
      return Response.json({ status: 200, data: { files: badResponse ? [] : calls.at(-1).body.files.map((file, i) => ({ ...file, file_id: 'file-' + i, requests: [{ method: 'PUT', url: 'https://storage.example/' + i, headers: { 'Content-Type': file.content_type, 'Content-Length': String(file.file_size) } }] })).reverse() } });
    }
    return Response.json({ status: 200, data: { task_id: 'task-id' } });
  };
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    globalThis.fetch = realFetch;
    if (key === undefined) delete process.env.PERFECT_CORP_API_KEY; else process.env.PERFECT_CORP_API_KEY = key;
    if (origins === undefined) delete process.env.ALLOWED_ORIGINS; else process.env.ALLOWED_ORIGINS = origins;
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { Origin: 'https://store.example', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const metadata = { files: [{ content_type: 'image/jpeg', file_size: 1024 }, { content_type: 'image/png', file_size: 2048 }] };
  const preflight = await fetch(base + '/api/upload', { method: 'OPTIONS', headers: { Origin: 'https://store.example' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://store.example');
  assert.equal((await post('/api/upload', {})).status, 400);
  assert.equal((await post('/api/upload', { files: [{content_type:'image/jpeg',file_size:11000000},metadata.files[1]] })).status, 400);
  assert.equal(calls.length, 0);
  const response = await post('/api/upload', metadata);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.files[0].file_id, 'file-0');
  assert.equal(data.files[1].file_id, 'file-1');
  assert.equal(calls[0].body.files[0].file_name, 'person.jpg');
  const created = await post('/api/cloth-try-on', { src_file_id: 'file-0', ref_file_id: 'file-1' });
  assert.equal(created.status, 200);
  assert.deepEqual(calls.at(-1).body, { src_file_id: 'file-0', ref_file_id: 'file-1', garment_category: 'auto' });
  assert.equal((await post('/api/cloth-try-on', { src_file_id: 'file-0', src_file_url: 'https://example.com/a', ref_file_id: 'file-1' })).status, 400);
  badResponse = true;
  assert.equal((await post('/api/upload', metadata)).status, 502);
});
