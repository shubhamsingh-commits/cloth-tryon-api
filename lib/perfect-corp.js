import { fail } from './http.js';

const baseUrl = 'https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v4';

export async function perfectCorp(path = '', body) {
  const key = process.env.PERFECT_CORP_API_KEY;
  if (!key) fail(503, 'PERFECT_CORP_API_KEY is not configured.');
  const response = await fetch(baseUrl + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000)
  });
  const payload = await response.json();
  if (!response.ok || (typeof payload.status === 'number' && payload.status >= 400)) {
    const upstreamStatus = response.ok ? payload.status : response.status;
    fail(upstreamStatus === 429 ? 429 : 502, `Perfect Corp request failed (${upstreamStatus}).`);
  }
  if (!payload.data || typeof payload.data !== 'object') fail(502, 'Invalid response from Perfect Corp.');
  return payload.data;
}
