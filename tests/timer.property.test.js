// Feature: todo-life-dashboard, Property 11

/**
 * Property-based tests for TimerWidget formatSeconds.
 * Tests Property 11 from the design document.
 *
 * Run: node tests/timer.property.test.js
 * Requires: fast-check (npm install fast-check --save-dev)
 *
 * Validates: Requirements 2.7
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Pure implementation extracted from js/app.js TimerWidget IIFE.
// The IIFE is not usable in Node without a DOM, so the logic is re-declared
// here for testing purposes. Must stay in sync with the implementation in
// js/app.js.
// ---------------------------------------------------------------------------

/**
 * Formats a total number of seconds as a "MM:SS" string (zero-padded).
 * @param {number} totalSeconds  Integer in [0, 1500]
 * @returns {string}  e.g. "25:00", "04:07", "00:00"
 */
function formatSeconds(totalSeconds) {
  var mm = Math.floor(totalSeconds / 60);
  var ss = totalSeconds % 60;
  return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Test runner (lightweight — no external test framework needed besides fc)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log('  \u2713 ' + name);
    passed++;
  } catch (err) {
    console.error('  \u2717 ' + name);
    console.error('    ' + (err.message || err));
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Property 11: Timer display formatter always produces a valid MM:SS string
// **Validates: Requirements 2.7**
// ---------------------------------------------------------------------------

console.log('\nProperty 11 \u2014 formatSeconds always produces a valid MM:SS string');

run('any integer in [0, 1500] produces a string matching /^\\d{2}:\\d{2}$/', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1500 }), (seconds) => {
      const result = formatSeconds(seconds);
      if (!/^\d{2}:\d{2}$/.test(result)) {
        throw new Error(
          'formatSeconds(' + seconds + ') returned "' + result + '" — does not match MM:SS'
        );
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('MM part correctly represents Math.floor(seconds / 60) zero-padded to 2 digits', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1500 }), (seconds) => {
      const result = formatSeconds(seconds);
      const mmPart = result.split(':')[0];
      const expectedMM = String(Math.floor(seconds / 60)).padStart(2, '0');
      if (mmPart !== expectedMM) {
        throw new Error(
          'formatSeconds(' + seconds + ') MM="' + mmPart + '" — expected "' + expectedMM + '"'
        );
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('SS part correctly represents (seconds % 60) zero-padded to 2 digits', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1500 }), (seconds) => {
      const result = formatSeconds(seconds);
      const ssPart = result.split(':')[1];
      const expectedSS = String(seconds % 60).padStart(2, '0');
      if (ssPart !== expectedSS) {
        throw new Error(
          'formatSeconds(' + seconds + ') SS="' + ssPart + '" — expected "' + expectedSS + '"'
        );
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed\n');
if (failed > 0) {
  process.exit(1);
}
