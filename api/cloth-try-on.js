import { endpoint, fail, jsonBody, send } from '../lib/http.js';
import { perfectCorp } from '../lib/perfect-corp.js';

export default endpoint('POST', async (req, res) => {
  const body = await jsonBody(req);
  const input = {};
  for (const field of ['src_file_url', 'ref_file_url']) {
    if (typeof body[field] !== 'string' || body[field].length > 8192) fail(400, `${field} must be a public HTTPS image URL.`);
    let url;
    try { url = new URL(body[field]); } catch { fail(400, `${field} must be a public HTTPS image URL.`); }
    if (url.protocol !== 'https:' || url.username || url.password) fail(400, `${field} must be a public HTTPS image URL.`);
    input[field] = url.href;
  }
  input.garment_category = body.garment_category ?? 'auto';
  if (!['auto', 'full_body', 'lower_body', 'upper_body', 'shoes', 'outer'].includes(input.garment_category)) {
    fail(400, 'Invalid garment_category.');
  }
  const data = await perfectCorp('', input);
  if (!data.task_id) fail(502, 'Perfect Corp did not return a task ID.');
  send(res, 200, { task_id: data.task_id });
});
