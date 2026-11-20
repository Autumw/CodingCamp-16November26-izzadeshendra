// Feature: todo-life-dashboard, Property 2/5/6

/**
 * Property-based tests for QuickLinksWidget data layer.
 * Tests Properties 2, 5, and 6 from the design document.
 *
 * Run: .\node.exe tests\links.property.test.js
 * Requires: fast-check (npm install fast-check --save-dev)
 *
 * Validates: Requirements 4.1, 4.3, 4.6, 4.7, 4.8
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Pure implementations extracted from js/app.js (IIFEs not usable in Node
// without a DOM, so the logic is re-declared here for testing purposes).
// These must stay in sync with the implementations in js/app.js.
// ---------------------------------------------------------------------------

/**
 * Simulates QuickLinksWidget._sync(): serialises links array to JSON.
 * In the real app this calls Utils.storage.set("tdl_links", links).
 * @param {Array} links
 * @returns {string}  JSON string
 */
function syncLinks(links) {
  return JSON.stringify(links);
}

/**
 * Simulates QuickLinksWidget._load(): parses the JSON string back to an array.
 * In the real app this is Utils.storage.get("tdl_links") which calls JSON.parse.
 * @param {string} json
 * @returns {Array}
 */
function loadLinks(json) {
  return JSON.parse(json);
}

/**
 * Re-declaration of QuickLinksWidget._add() validation logic for property testing.
 * Returns the mutated links array and any error message set.
 * The real app writes to a closure-scoped `links` array and calls showError();
 * here we return { links, errorMessage } so callers can assert on both.
 *
 * @param {Array}  links  Current in-memory links list (mutated in place on success)
 * @param {string} label  Raw label from the user
 * @param {string} url    Raw URL from the user
 * @returns {{ links: Array, errorMessage: string }}
 */
function addLink(links, label, url) {
  var trimmedLabel = label.trim();
  var trimmedUrl   = url.trim();
  var errorMessage = '';

  if (trimmedLabel.length === 0) {
    errorMessage = 'Link label cannot be empty.';
    return { links, errorMessage };
  }

  if (trimmedLabel.length > 50) {
    errorMessage = 'Link label must be 50 characters or fewer.';
    return { links, errorMessage };
  }

  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    errorMessage = 'URL must start with http:// or https://.';
    return { links, errorMessage };
  }

  if (links.length >= 20) {
    errorMessage = 'Maximum of 20 links allowed.';
    return { links, errorMessage };
  }

  links.push({
    id:    Date.now().toString(),
    label: trimmedLabel,
    url:   trimmedUrl
  });

  return { links, errorMessage };
}

// ---------------------------------------------------------------------------
// Test runner (lightweight, no external test framework besides fc)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message || err}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Property 2: Quick-link localStorage round-trip
// **Validates: Requirements 4.6, 4.7**
//
// For any array of valid QuickLink objects serialised via _sync() and parsed
// back via _load(), the result must be structurally identical to the original
// — same id, label, and url values in the same order.
// ---------------------------------------------------------------------------

console.log('\nProperty 2 — Quick-link localStorage round-trip');

run('serialise-then-parse produces an array structurally equal to the original', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id:    fc.string(),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          url:   fc.constantFrom('http://a.com', 'https://b.org')
        })
      ),
      (links) => {
        const json   = syncLinks(links);
        const parsed = loadLinks(json);

        if (!Array.isArray(parsed)) {
          throw new Error('Parsed result is not an array');
        }
        if (parsed.length !== links.length) {
          throw new Error(
            `Length mismatch: original=${links.length}, parsed=${parsed.length}`
          );
        }

        for (let i = 0; i < links.length; i++) {
          const orig = links[i];
          const got  = parsed[i];

          if (got.id !== orig.id) {
            throw new Error(
              `links[${i}].id mismatch: expected "${orig.id}", got "${got.id}"`
            );
          }
          if (got.label !== orig.label) {
            throw new Error(
              `links[${i}].label mismatch: expected "${orig.label}", got "${got.label}"`
            );
          }
          if (got.url !== orig.url) {
            throw new Error(
              `links[${i}].url mismatch: expected "${orig.url}", got "${got.url}"`
            );
          }
        }

        return true;
      }
    ),
    { numRuns: 100 }
  );
});

run('order of links is preserved through the round-trip', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id:    fc.string(),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          url:   fc.constantFrom('http://a.com', 'https://b.org')
        }),
        { minLength: 1 }
      ),
      (links) => {
        const parsed = loadLinks(syncLinks(links));
        for (let i = 0; i < links.length; i++) {
          if (parsed[i].id !== links[i].id) {
            throw new Error(
              `Order broken at index ${i}: expected id="${links[i].id}", got "${parsed[i].id}"`
            );
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 5: Non-HTTP(S) URLs are always rejected
// **Validates: Requirements 4.3**
//
// For any URL string that does not begin with "http://" or "https://",
// _add() must reject it, leave the links array unchanged (length 0), and
// set a non-empty error message.
// ---------------------------------------------------------------------------

console.log('\nProperty 5 — Non-HTTP(S) URLs are always rejected');

run('non-http(s) URL is rejected and links array stays empty', () => {
  fc.assert(
    fc.property(
      fc.string().filter(s => !/^https?:\/\//i.test(s)),
      (url) => {
        const links = [];
        const result = addLink(links, 'test', url);

        if (result.links.length !== 0) {
          throw new Error(
            `Expected links to remain empty, but got length ${result.links.length} ` +
            `for url "${JSON.stringify(url)}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

run('non-http(s) URL always produces a non-empty error message', () => {
  fc.assert(
    fc.property(
      fc.string().filter(s => !/^https?:\/\//i.test(s)),
      (url) => {
        const links = [];
        const result = addLink(links, 'test', url);

        if (!result.errorMessage || result.errorMessage.trim().length === 0) {
          throw new Error(
            `Expected a non-empty error message for url "${JSON.stringify(url)}", ` +
            `but got "${result.errorMessage}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 6: Quick-links panel never exceeds the 20-item cap
// **Validates: Requirements 4.8**
//
// For any add attempted against a links panel that already holds exactly 20
// items, the operation must be rejected and the list length must remain
// exactly 20, regardless of the label or URL content.
// ---------------------------------------------------------------------------

console.log('\nProperty 6 — Quick-links panel never exceeds the 20-item cap');

/**
 * Builds a links array pre-filled with exactly `count` stub items.
 * @param {number} count
 * @returns {Array}
 */
function makeLinkList(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id:    String(i),
      label: 'Link ' + i,
      url:   'http://example.com/' + i
    });
  }
  return list;
}

run('adding to a 20-item list always leaves the list at length 20', () => {
  fc.assert(
    fc.property(
      fc.record({
        label: fc.string({ minLength: 1, maxLength: 50 }),
        url:   fc.constantFrom('http://a.com', 'https://b.org')
      }),
      ({ label, url }) => {
        const links = makeLinkList(20);
        const result = addLink(links, label, url);

        if (result.links.length !== 20) {
          throw new Error(
            `Expected links length to remain 20 after add, ` +
            `but got ${result.links.length} for label "${label}", url "${url}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

run('adding to a 20-item list always produces a non-empty error message', () => {
  fc.assert(
    fc.property(
      fc.record({
        label: fc.string({ minLength: 1, maxLength: 50 }),
        url:   fc.constantFrom('http://a.com', 'https://b.org')
      }),
      ({ label, url }) => {
        const links = makeLinkList(20);
        const result = addLink(links, label, url);

        if (!result.errorMessage || result.errorMessage.trim().length === 0) {
          throw new Error(
            `Expected a non-empty error message when list is full, ` +
            `but got "${result.errorMessage}" for label "${label}", url "${url}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
