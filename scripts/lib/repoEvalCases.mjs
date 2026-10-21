// Frozen pilot cases. Keep grading outside the agent's writable fixture.
export const repoEvalCases = [
  {
    id: "idempotent-concurrent-retry",
    skill: "helen-implementa",
    prompt:
      "Fix checkout.mjs so concurrent and repeated calls with the same key and amount perform exactly one charge and return the same receipt. Reject reuse of a key with a different amount. A failed charge must permit a later retry. Preserve the exported function signature. Implement and verify the behavior in this repository. Modify only checkout.mjs; preserve package.json and test.mjs. Do not install dependencies or access external services.",
    file: "checkout.mjs",
    source: `export function createCheckout(charge) {
  const receipts = new Map();
  return async function checkout(key, amount) {
    if (receipts.has(key)) return receipts.get(key);
    const receipt = await charge(amount);
    receipts.set(key, receipt);
    return receipt;
  };
}
`,
    publicTest: `import assert from 'node:assert/strict';
import { createCheckout } from './checkout.mjs';
const checkout = createCheckout(async amount => ({ amount }));
assert.deepEqual(await checkout('one', 10), { amount: 10 });
assert.deepEqual(await checkout('one', 10), { amount: 10 });
console.log('Public contract passed');
`,
    grader: `import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { createCheckout } = await import(pathToFileURL(path.join(process.argv[2], 'checkout.mjs')));
let charges = 0;
const checkout = createCheckout(async amount => { charges++; await new Promise(r => setTimeout(r, 15)); return { amount, receipt: charges }; });
const pending = Array.from({ length: 12 }, () => checkout('shared', 10));
await assert.rejects(checkout('shared', 20), 'Mismatched payload must be rejected while the original charge is pending');
const results = await Promise.all(pending);
assert.equal(charges, 1, 'Concurrent calls must charge once');
assert.ok(results.every(receipt => receipt === results[0]), 'Concurrent receipts must match');
assert.strictEqual(await checkout('shared', 10), results[0]);
assert.equal(charges, 1, 'Repeated calls must not charge');
await assert.rejects(checkout('shared', 20), 'Different payload with same key must be rejected');
assert.equal(charges, 1, 'Mismatch must not charge');
await checkout('other', 20);
assert.equal(charges, 2, 'Independent keys must remain independent');
let attempts = 0;
const retry = createCheckout(async () => { if (++attempts === 1) { await new Promise(r => setTimeout(r, 15)); throw new Error('temporary'); } return { ok: true }; });
const rejected = await Promise.allSettled([retry('retry', 10), retry('retry', 10)]);
assert.ok(rejected.every(result => result.status === 'rejected'), 'Overlapping callers must share the failed charge');
assert.equal(attempts, 1, 'Concurrent failure must not duplicate the charge');
assert.deepEqual(await retry('retry', 10), { ok: true });
assert.equal(attempts, 2, 'Failure must allow retry');
console.log('Concurrent, repeated, mismatched, independent and failed-retry outcomes passed');
`,
  },
  {
    id: "retryable-single-flight-cache",
    skill: "helen-implementa",
    prompt:
      "Fix cache.mjs so overlapping reads of the same key share one in-flight load, successfully resolved values remain cached, and a rejected load does not poison the key: a later read must retry. Different keys must remain independent. Preserve the exported function signature. Implement and verify the behavior in this repository. Modify only cache.mjs; preserve package.json and test.mjs. Do not install dependencies or access external services.",
    file: "cache.mjs",
    source: `export function createCache(load) {
  const entries = new Map();
  return async function get(key) {
    if (entries.has(key)) return entries.get(key);
    const value = await load(key);
    entries.set(key, value);
    return value;
  };
}
`,
    publicTest: `import assert from 'node:assert/strict';
import { createCache } from './cache.mjs';
const get = createCache(async key => ({ key }));
assert.deepEqual(await get('one'), { key: 'one' });
assert.deepEqual(await get('one'), { key: 'one' });
console.log('Public contract passed');
`,
    grader: `import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { createCache } = await import(pathToFileURL(path.join(process.argv[2], 'cache.mjs')));
let loads = 0;
const get = createCache(async key => { loads++; await new Promise(r => setTimeout(r, 15)); return { key, index: loads }; });
const values = await Promise.all(Array.from({ length: 12 }, () => get('one')));
assert.equal(loads, 1, 'Overlapping reads must share a load');
assert.ok(values.every(value => value === values[0]));
assert.strictEqual(await get('one'), values[0]);
await get('two');
assert.equal(loads, 2, 'Independent keys must load independently');
let attempts = 0;
const retry = createCache(async key => { if (++attempts === 1) throw new Error('temporary'); return { key }; });
const rejected = await Promise.allSettled([retry('retry'), retry('retry')]);
assert.ok(rejected.every(result => result.status === 'rejected'));
assert.equal(attempts, 1, 'Failed overlapping reads must share a load');
assert.deepEqual(await retry('retry'), { key: 'retry' });
assert.equal(attempts, 2, 'Failed key must be retryable');
console.log('Concurrent, cached, independent and failed-retry outcomes passed');
`,
  },
];

// Independent actual-edit holdout. Keep separate from the two frozen pilot cases.
// A readonly solution draft cannot satisfy this fixture's implementation evidence.
export const repoImplementationHoldoutCases = [
  {
    id: "immutable-safe-object-patch",
    skill: "helen-implementa",
    specialty: "implementation",
    split: "heldout",
    mode: "actual-edit",
    allowedWrites: ["patch.mjs"],
    prompt:
      "Fix patch.mjs applyChanges(input, changes). input is a JSON object; each change is {path: a nonempty array of nonempty string segments, value: JSON value}. Return an independent deep copy with changes applied in order, preserving input on success and failure. Existing intermediate path segments must be own object properties (not arrays or inherited keys); reject missing intermediate paths. New leaf keys are allowed. Reject __proto__, prototype and constructor at any segment, malformed paths, and non-array changes. An invalid later change must leave the original entirely intact. Preserve the exported signature. Modify only patch.mjs; preserve package.json and test.mjs. No dependencies, external services, or extra files. Implement and verify in this repository.",
    file: "patch.mjs",
    source: `export function applyChanges(input, changes) {
  for (const change of changes) {
    let target = input;
    for (const segment of change.path.slice(0, -1)) target = target[segment];
    target[change.path.at(-1)] = change.value;
  }
  return input;
}
`,
    publicTest: `import assert from 'node:assert/strict';
import { applyChanges } from './patch.mjs';
assert.deepEqual(applyChanges({ user: { name: 'before' } }, [{ path: ['user', 'name'], value: 'after' }]), { user: { name: 'after' } });
console.log('Public patch contract passed');
`,
    grader: `import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { applyChanges } = await import(pathToFileURL(path.join(process.argv[2], 'patch.mjs')));
const original = { user: { name: 'before', prefs: { theme: 'dark' } }, list: [1, { x: 2 }] };
const snapshot = JSON.stringify(original);
const suppliedValue = { nested: { ok: true } };
const patched = applyChanges(original, [{ path: ['user', 'name'], value: 'after' }, { path: ['user', 'extra'], value: suppliedValue }]);
assert.equal(JSON.stringify(original), snapshot, 'Successful patch must preserve input');
assert.equal(patched.user.name, 'after');
assert.deepEqual(patched.user.extra, suppliedValue);
assert.notStrictEqual(patched, original);
assert.notStrictEqual(patched.user.prefs, original.user.prefs, 'Untouched nested values must be copied');
patched.list[1].x = 5;
patched.user.extra.nested.ok = false;
assert.equal(original.list[1].x, 2);
assert.equal(suppliedValue.nested.ok, true, 'Inserted JSON values must be copied');
for (const blocked of ['__proto__', 'prototype', 'constructor']) {
  assert.throws(() => applyChanges(original, [{ path: [blocked], value: 1 }]), 'Unsafe leaf rejected');
  assert.throws(() => applyChanges(original, [{ path: [blocked, 'polluted'], value: true }]), 'Unsafe intermediate rejected');
}
for (const badPath of [[], [''], 'user.name', ['user', 0], ['missing', 'name'], ['list', '0']])
  assert.throws(() => applyChanges(original, [{ path: badPath, value: 'bad' }]), 'Malformed or absent intermediate rejected');
assert.throws(() => applyChanges(original, {}), 'Non-array change list rejected');
assert.throws(() => applyChanges(original, [{ path: ['user', 'name'], value: 'partial' }, { path: ['missing', 'leaf'], value: true }]), 'Later invalid change rejected');
assert.equal(JSON.stringify(original), snapshot, 'Invalid later change cannot partially mutate original');
const empty = applyChanges(original, []);
assert.deepEqual(empty, original);
assert.notStrictEqual(empty, original);
assert.equal({}.polluted, undefined);
console.log('Immutable success, atomic failure, deep-copy and unsafe-path outcomes passed');
`,
  },
];
