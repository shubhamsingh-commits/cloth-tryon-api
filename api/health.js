import { endpoint, send } from '../lib/http.js';

export default endpoint('GET', async (_req, res) => {
  send(res, 200, { ok: true, service: 'cloth-tryon-api', configured: Boolean(process.env.PERFECT_CORP_API_KEY) });
});
