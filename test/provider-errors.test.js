import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perfectCorp } from '../lib/perfect-corp.js';

test('provider errors include useful diagnostics without credentials or image URLs', async t => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.PERFECT_CORP_API_KEY;
  process.env.PERFECT_CORP_API_KEY = 'secret-test-key';
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.PERFECT_CORP_API_KEY;
    else process.env.PERFECT_CORP_API_KEY = originalKey;
  });
  globalThis.fetch = async () => Response.json({
    error_code: 'InvalidParameter',
    error: 'Cannot download https://private.example/photo?token=secret secret-test-key',
    debug: 'must-not-expose'
  }, { status: 400 });
  await assert.rejects(perfectCorp('', {}), error => {
    assert.equal(error.status, 502);
    assert.match(error.message, /InvalidParameter/);
    assert.match(error.message, /Cannot download/);
    assert.doesNotMatch(error.message, /secret|private\.example|must-not-expose/);
    return true;
  });
  globalThis.fetch = async () => Response.json({ status: 429, message: 'Too many requests' });
  await assert.rejects(perfectCorp('', {}), { status: 429, message: 'Perfect Corp request failed (429). Too many requests' });
  globalThis.fetch = async () => new Response('<html>Bad gateway</html>', { status: 502 });
  await assert.rejects(perfectCorp('', {}), { status: 502, message: 'Perfect Corp returned a non-JSON response (HTTP 502).' });
  globalThis.fetch = async () => Response.json(null);
  await assert.rejects(perfectCorp('', {}), { status: 502, message: 'Invalid response from Perfect Corp.' });
});
