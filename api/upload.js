import { endpoint, fail, jsonBody, send } from '../lib/http.js';
import { perfectCorpFiles } from '../lib/perfect-corp-files.js';

export default endpoint('POST', async (req, res) => {
  const body = await jsonBody(req);
  if (!Array.isArray(body.files) || body.files.length !== 2) fail(400, 'Provide person and apparel image metadata.');
  const files = body.files.map((file, index) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.content_type)) fail(400, 'Use JPG, PNG or WEBP images.');
    if (!Number.isInteger(file.file_size) || file.file_size < 1 || file.file_size > 10 * 1024 * 1024) fail(400, 'Each image must be between 1 byte and 10 MB.');
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.content_type];
    return { content_type: file.content_type, file_size: file.file_size, file_name: `${index === 0 ? 'person' : 'apparel'}.${extension}` };
  });
  const data = await perfectCorpFiles({ files });
  if (!Array.isArray(data.files) || data.files.length !== 2) fail(502, 'Invalid upload instructions from Perfect Corp.');
  const prepared = files.map(file => {
    const item = data.files.find(value => value.file_name === file.file_name);
    if (!item || typeof item.file_id !== 'string' || !Array.isArray(item.requests) || item.requests.length !== 1) fail(502, 'Invalid upload instructions from Perfect Corp.');
    const instruction = item.requests[0];
    let url;
    try { url = new URL(instruction.url); } catch { fail(502, 'Invalid image upload URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || instruction.method !== 'PUT') fail(502, 'Invalid image upload instructions.');
    return { file_id: item.file_id, requests: [{ method: 'PUT', url: url.href, headers: instruction.headers || {} }] };
  });
  send(res, 200, { files: prepared });
});
