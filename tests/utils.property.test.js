// Feature: todo-life-dashboard, Property 7/9/10

/**
 * Property-based tests for Utils module.
 * Tests Properties 7, 9, and 10 from the design document.
 *
 * Run: node tests/utils.property.test.js
 * Requires: fast-check (npm install fast-check --save-dev)
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

'use strict';

const fc = require('fast-check');

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
// Test runner (lightweight, no external test framework needed besides fc)
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
// Property 7: Time-of-day greeting covers all 24 hours without gaps or overlaps
// **Validates: Requirements 1.3, 1.4, 1.5**
// ---------------------------------------------------------------------------

console.log('\nProperty 7 — getGreeting covers all 24 hours without gaps or overlaps');

run('every integer hour [0–23] returns exactly one valid greeting', () => {
  const VALID_GREETINGS = new Set(['Good Morning', 'Good Afternoon', 'Good Evening']);

  fc.assert(
    fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
      const result = getGreeting(hour);
      // Must be one of the three defined strings
      if (!VALID_GREETINGS.has(result)) {
        throw new Error(
          `getGreeting(${hour}) returned "${result}", which is not a valid greeting`
        );
      }
      // Must not be falsy
      if (!result) {
        throw new Error(`getGreeting(${hour}) returned a falsy value`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('morning hours (05–11) always return "Good Morning"', () => {
  fc.assert(
    fc.property(fc.integer({ min: 5, max: 11 }), (hour) => {
      return getGreeting(hour) === 'Good Morning';
    }),
    { numRuns: 100 }
  );
});

run('afternoon hours (12–17) always return "Good Afternoon"', () => {
  fc.assert(
    fc.property(fc.integer({ min: 12, max: 17 }), (hour) => {
      return getGreeting(hour) === 'Good Afternoon';
    }),
    { numRuns: 100 }
  );
});

run('evening hours (18–23 and 00–04) always return "Good Evening"', () => {
  fc.assert(
    fc.property(
      fc.oneof(fc.integer({ min: 18, max: 23 }), fc.integer({ min: 0, max: 4 })),
      (hour) => {
        return getGreeting(hour) === 'Good Evening';
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 9: formatTime always produces a valid HH:MM string
// **Validates: Requirements 1.1**
// ---------------------------------------------------------------------------

console.log('\nProperty 9 — formatTime always produces a valid HH:MM string');

run('any Date produces a string matching /^\\d{2}:\\d{2}$/', () => {
  fc.assert(
    fc.property(fc.date(), (date) => {
      const result = formatTime(date);
      if (!/^\d{2}:\d{2}$/.test(result)) {
        throw new Error(`formatTime returned "${result}" — does not match HH:MM`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('HH part is always in [00–23]', () => {
  fc.assert(
    fc.property(fc.date(), (date) => {
      const result = formatTime(date);
      const hh = parseInt(result.split(':')[0], 10);
      if (hh < 0 || hh > 23) {
        throw new Error(`formatTime returned "${result}" — HH=${hh} is out of [00–23]`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('MM part is always in [00–59]', () => {
  fc.assert(
    fc.property(fc.date(), (date) => {
      const result = formatTime(date);
      const mm = parseInt(result.split(':')[1], 10);
      if (mm < 0 || mm > 59) {
        throw new Error(`formatTime returned "${result}" — MM=${mm} is out of [00–59]`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 10: formatDate always produces a correctly structured date string
// **Validates: Requirements 1.2**
//
// Expected format: "<Weekday>, <DD> <Month> <YYYY>"
// e.g. "Wednesday, 05 November 2025"
//
// Generator constraint: dates are restricted to years 1000–9999 so that
// getFullYear() always returns exactly four digits — the range the spec
// targets ("four-digit year"). JavaScript Date supports years beyond this
// range but the spec requirement is defined for typical calendar years.
// ---------------------------------------------------------------------------

console.log('\nProperty 10 — formatDate always produces a correctly structured date string');

const WEEKDAY_NAMES = new Set([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]);
const MONTH_NAMES = new Set([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

// Regex: full weekday name, comma+space, two-digit day, space, full month
// name, space, four-digit year
const DATE_PATTERN = /^([A-Za-z]+), (\d{2}) ([A-Za-z]+) (\d{4})$/;

// Constrain to dates within years 1000–9998 (guaranteed 4-digit year output
// in any timezone, since timezone offsets can be up to ±14 hours).
// Using year 9998 as the upper bound provides a full-year safety margin so
// that a date near Dec 31 9999 UTC never rolls over into year 10000 when
// expressed in a local timezone ahead of UTC.
const MIN_TS = new Date('1000-01-02T00:00:00.000Z').getTime(); // Jan 2 1000 — safe even UTC-14
const MAX_TS = new Date('9998-12-30T00:00:00.000Z').getTime(); // Dec 30 9998 — safe even UTC+14
const fourDigitYearDate = () =>
  fc.integer({ min: MIN_TS, max: MAX_TS }).map((ts) => new Date(ts));

run('any Date (years 1000–9999) produces a string matching "Weekday, DD Month YYYY"', () => {
  fc.assert(
    fc.property(fourDigitYearDate(), (date) => {
      const result = formatDate(date);
      if (!DATE_PATTERN.test(result)) {
        throw new Error(
          `formatDate returned "${result}" — does not match "<Weekday>, <DD> <Month> <YYYY>"`
        );
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('weekday part is always a full English day name', () => {
  fc.assert(
    fc.property(fourDigitYearDate(), (date) => {
      const result = formatDate(date);
      const match = result.match(DATE_PATTERN);
      if (!match) return false;
      const weekday = match[1];
      if (!WEEKDAY_NAMES.has(weekday)) {
        throw new Error(`formatDate returned "${result}" — "${weekday}" is not a valid weekday`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('day number is always two digits (zero-padded)', () => {
  fc.assert(
    fc.property(fourDigitYearDate(), (date) => {
      const result = formatDate(date);
      const match = result.match(DATE_PATTERN);
      if (!match) return false;
      const dd = match[2];
      if (!/^\d{2}$/.test(dd)) {
        throw new Error(`formatDate returned "${result}" — day "${dd}" is not zero-padded`);
      }
      const dayNum = parseInt(dd, 10);
      if (dayNum < 1 || dayNum > 31) {
        throw new Error(`formatDate returned "${result}" — day=${dayNum} out of [01–31]`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('month part is always a full English month name', () => {
  fc.assert(
    fc.property(fourDigitYearDate(), (date) => {
      const result = formatDate(date);
      const match = result.match(DATE_PATTERN);
      if (!match) return false;
      const month = match[3];
      if (!MONTH_NAMES.has(month)) {
        throw new Error(`formatDate returned "${result}" — "${month}" is not a valid month name`);
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('year part is always a four-digit number', () => {
  fc.assert(
    fc.property(fourDigitYearDate(), (date) => {
      const result = formatDate(date);
      const match = result.match(DATE_PATTERN);
      if (!match) return false;
      const year = match[4];
      if (!/^\d{4}$/.test(year)) {
        throw new Error(`formatDate returned "${result}" — "${year}" is not a four-digit year`);
      }
      return true;
    }),
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
