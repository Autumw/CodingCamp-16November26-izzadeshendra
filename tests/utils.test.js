// Feature: todo-life-dashboard, Unit Tests for Utils

/**
 * Unit tests for Utils module (formatTime, formatDate, getGreeting).
 *
 * Run: node tests/utils.test.js
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Pure implementations extracted from js/app.js (IIFEs not usable in Node
// without a DOM, so the logic is re-declared here for testing purposes).
// These must stay in sync with the implementations in js/app.js.
// ---------------------------------------------------------------------------

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday'
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns the current time as "HH:MM" (24-hour, zero-padded).
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  var hh = String(date.getHours()).padStart(2, '0');
  var mm = String(date.getMinutes()).padStart(2, '0');
  return hh + ':' + mm;
}

/**
 * Returns the date as "Weekday, DD Month YYYY" using full English names.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  var weekday = DAYS[date.getDay()];
  var day     = String(date.getDate()).padStart(2, '0');
  var month   = MONTHS[date.getMonth()];
  var year    = date.getFullYear();
  return weekday + ', ' + day + ' ' + month + ' ' + year;
}

/**
 * Returns the appropriate time-of-day greeting for the given hour (0–23).
 * Morning: 05–11, Afternoon: 12–17, Evening: 18–23 and 00–04.
 * @param {number} hour  Integer in [0, 23]
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ---------------------------------------------------------------------------
// Lightweight test runner
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
// formatTime — Validates: Requirement 1.1
// ---------------------------------------------------------------------------

console.log('\nformatTime');

run('midnight (00:00) is formatted correctly', () => {
  const result = formatTime(new Date(2025, 0, 1, 0, 0));
  assert.strictEqual(result, '00:00');
});

run('noon (12:00) is formatted correctly', () => {
  const result = formatTime(new Date(2025, 0, 1, 12, 0));
  assert.strictEqual(result, '12:00');
});

// ---------------------------------------------------------------------------
// formatDate — Validates: Requirement 1.2
// ---------------------------------------------------------------------------

console.log('\nformatDate');

// Monday 16 June 2025
run('Monday 16 June 2025 produces the correct weekday and month name', () => {
  const result = formatDate(new Date(2025, 5, 16)); // month is 0-indexed: 5 = June
  assert.strictEqual(result, 'Monday, 16 June 2025');
});

// ---------------------------------------------------------------------------
// getGreeting — Validates: Requirements 1.3, 1.4, 1.5
// ---------------------------------------------------------------------------

console.log('\ngetGreeting');

run('hour 5 (early morning boundary) returns "Good Morning"', () => {
  assert.strictEqual(getGreeting(5), 'Good Morning');
});

run('hour 12 (noon) returns "Good Afternoon"', () => {
  assert.strictEqual(getGreeting(12), 'Good Afternoon');
});

run('hour 18 (evening boundary) returns "Good Evening"', () => {
  assert.strictEqual(getGreeting(18), 'Good Evening');
});

run('hour 0 (midnight) returns "Good Evening"', () => {
  assert.strictEqual(getGreeting(0), 'Good Evening');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
