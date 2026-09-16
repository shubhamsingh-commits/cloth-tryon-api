import { endpoint, fail, jsonBody, send } from '../lib/http.js';
import { perfectCorp } from '../lib/perfect-corp.js';

export default endpoint('POST', async (req, res) => {
  const body = await jsonBody(req);
  const input = {};
  for (const prefix of ['src', 'ref']) {
    const idField = `${prefix}_file_id`;
    const urlField = `${prefix}_file_url`;
    if (body[idField] !== undefined) {
      if (body[urlField] !== undefined) fail(400, `Provide either ${idField} or ${urlField}.`);
      if (typeof body[idField] !== 'string' || !body[idField] || body[idField].length > 2048 || /\s/.test(body[idField])) fail(400, `Invalid ${idField}.`);
      input[idField] = body[idField];
    } else {
      if (typeof body[urlField] !== 'string' || body[urlField].length > 8192) fail(400, `${urlField} must be a public HTTPS image URL.`);
      let url;
      try { url = new URL(body[urlField]); } catch { fail(400, `${urlField} must be a public HTTPS image URL.`); }
      if (url.protocol !== 'https:' || url.username || url.password) fail(400, `${urlField} must be a public HTTPS image URL.`);
      input[urlField] = url.href;
    }
  }
  input.garment_category = body.garment_category ?? 'auto';
  if (!['auto', 'full_body', 'lower_body', 'upper_body', 'shoes', 'outer'].includes(input.garment_category)) fail(400, 'Invalid garment_category.');
  const data = await perfectCorp('', input);
  if (!data.task_id) fail(502, 'Perfect Corp did not return a task ID.');
  send(res, 200, { task_id: data.task_id });
});
