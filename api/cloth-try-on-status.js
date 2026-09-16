import { endpoint, fail, send } from '../lib/http.js';
import { perfectCorp } from '../lib/perfect-corp.js';

export default endpoint('GET', async (req, res) => {
  const id = new URL(req.url, 'http://localhost').searchParams.get('task_id');
  if (!id || !/^[a-zA-Z0-9_-]{1,256}$/.test(id)) fail(400, 'A valid task_id is required.');
  const data = await perfectCorp(`/${encodeURIComponent(id)}`);
  if (typeof data.task_status !== 'string') fail(502, 'Perfect Corp did not return a task status.');
  send(res, 200, {
    task_id: id,
    status: data.task_status,
    output_url: data.results?.url || null,
    error: data.error || null
  });
});
