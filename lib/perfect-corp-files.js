import { fail } from './http.js';

export async function perfectCorpFiles(body) {
  const key = process.env.PERFECT_CORP_API_KEY;
  if (!key) fail(503, 'PERFECT_CORP_API_KEY is not configured.');
  const response = await fetch('https://yce-api-01.makeupar.com/s2s/v2.0/file', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000)
  });
  const payload = await response.json();
  if (!response.ok || (typeof payload.status === 'number' && payload.status >= 400)) {
    const status = response.ok ? payload.status : response.status;
    fail(status === 429 ? 429 : 502, `Perfect Corp image upload authorization failed (${status}).`);
  }
  if (!payload.data || typeof payload.data !== 'object') fail(502, 'Invalid response from Perfect Corp.');
  return payload.data;
}
