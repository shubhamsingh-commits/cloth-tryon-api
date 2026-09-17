import { fail } from './http.js';

const baseUrl = 'https://yce-api-01.makeupar.com/s2s/v2.0';

function errorDetail(payload, key) {
  // Only expose diagnostic text, never the full provider response or request.
  const parts = [payload?.error_code, typeof payload?.error === 'string' ? payload.error : payload?.error?.message, payload?.message];
  return [...new Set(parts.filter(value => typeof value === 'string' && value.trim()))]
    .join(' — ')
    .split(key).join('[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/https?:\/\/\S+/gi, '[URL redacted]')
    .replace(/[\r\n\t]/g, ' ')
    .slice(0, 500);
}

export async function perfectCorp(path = '', body) {
  return perfectCorpRequest('/task/cloth-v4' + path, body);
}

export async function perfectCorpRequest(path, body) {
  const key = process.env.PERFECT_CORP_API_KEY;
  if (!key) fail(503, 'PERFECT_CORP_API_KEY is not configured.');
  const response = await fetch(baseUrl + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000)
  });
  let payload;
  try { payload = await response.json(); } catch {
    fail(502, `Perfect Corp returned a non-JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok || (typeof payload?.status === 'number' && payload.status >= 400)) {
    const upstreamStatus = response.ok ? payload.status : response.status;
    const detail = errorDetail(payload, key);
    fail(upstreamStatus === 429 ? 429 : 502, `Perfect Corp request failed (${upstreamStatus}).${detail ? ` ${detail}` : ''}`);
  }
  if (!payload?.data || typeof payload.data !== 'object') fail(502, 'Invalid response from Perfect Corp.');
  return payload.data;
}
