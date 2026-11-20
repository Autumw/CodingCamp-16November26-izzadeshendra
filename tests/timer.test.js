// Feature: todo-life-dashboard, Unit Tests for Timer State Machine

/**
 * Unit tests for the TimerWidget state machine.
 *
 * Run: node tests/timer.test.js
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9
 *
 * The TimerWidget lives inside an IIFE and depends on DOM elements.
 * The pure state machine logic is re-declared here (kept in sync with
 * js/app.js), and a minimal DOM mock supplies the three required elements:
 *   #timer-display, #timer-notification, #timer-reset
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Minimal DOM mock
// ---------------------------------------------------------------------------

const domElements = {};

function createMockElement(id) {
  return {
    id,
    textContent: '',
    disabled: false,
  };
}

function resetDom() {
  domElements['timer-display']      = createMockElement('timer-display');
  domElements['timer-notification'] = createMockElement('timer-notification');
  domElements['timer-reset']        = createMockElement('timer-reset');
}

global.document = {
  getElementById: function (id) {
    return domElements[id] || null;
  },
};

// ---------------------------------------------------------------------------
// Pure state machine — re-declared from js/app.js TimerWidget IIFE.
// Keep these implementations in sync with the source file.
// ---------------------------------------------------------------------------

/**
 * Creates a fresh, isolated timer state machine instance.
 * Returns the public interface: { start, stop, reset, tick, getState,
 *   getRemainingSeconds, getIntervalCount }.
 */
function createTimer() {
  var IDLE    = 'IDLE';
  var RUNNING = 'RUNNING';
  var PAUSED  = 'PAUSED';
  var DONE    = 'DONE';

  var state            = IDLE;
  var remainingSeconds = 1500;
  var intervalId       = null;
  var intervalCount    = 0; // tracks how many live intervals were started

  function formatSeconds(totalSeconds) {
    var mm = Math.floor(totalSeconds / 60);
    var ss = totalSeconds % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  function updateDisplay() {
    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatSeconds(remainingSeconds);
    }
  }

  function clearCountdown() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function syncResetButton() {
    var resetBtn = document.getElementById('timer-reset');
    if (!resetBtn) return;
    resetBtn.disabled = (state === RUNNING);
  }

  function tick() {
    remainingSeconds -= 1;
    updateDisplay();

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearCountdown();
      state = DONE;
      syncResetButton();
      updateDisplay();

      var notification = document.getElementById('timer-notification');
      if (notification) {
        notification.textContent = 'Session complete!';
      }
    }
  }

  function start() {
    if (state === RUNNING) return;
    if (state !== IDLE && state !== PAUSED) return;

    state = RUNNING;
    syncResetButton();
    updateDisplay();

    // Use a fake interval so we can control ticking manually in tests.
    // We track how many times setInterval was truly called.
    intervalId = setInterval(function () { /* controlled via manual tick() */ }, 1000);
    intervalCount += 1;
  }

  function stop() {
    if (state !== RUNNING) return;
    clearCountdown();
    state = PAUSED;
    syncResetButton();
    updateDisplay();
  }

  function reset() {
    if (state !== PAUSED && state !== DONE) return;
    clearCountdown();
    state            = IDLE;
    remainingSeconds = 1500;
    syncResetButton();
    updateDisplay();

    var notification = document.getElementById('timer-notification');
    if (notification) {
      notification.textContent = '';
    }
  }

  return {
    start,
    stop,
    reset,
    tick,          // drive one countdown step manually
    getState:              function () { return state; },
    getRemainingSeconds:   function () { return remainingSeconds; },
    getIntervalCount:      function () { return intervalCount; },
  };
}

// ---------------------------------------------------------------------------
// Lightweight test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function run(name, fn) {
  resetDom(); // fresh DOM for every test
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
// Test 1 — Full transition sequence
// IDLE → RUNNING (Start) → PAUSED (Stop) → RUNNING (Start) → DONE (countdown)
// → IDLE (Reset)
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
// ---------------------------------------------------------------------------

console.log('\nFull transition sequence');

run('initial state is IDLE', () => {
  const timer = createTimer();
  assert.strictEqual(timer.getState(), 'IDLE');
  assert.strictEqual(timer.getRemainingSeconds(), 1500);
});

run('IDLE → RUNNING on start()', () => {
  const timer = createTimer();
  timer.start();
  assert.strictEqual(timer.getState(), 'RUNNING');
});

run('RUNNING → PAUSED on stop()', () => {
  const timer = createTimer();
  timer.start();
  timer.stop();
  assert.strictEqual(timer.getState(), 'PAUSED');
});

run('PAUSED → RUNNING on start()', () => {
  const timer = createTimer();
  timer.start();
  timer.stop();
  timer.start();
  assert.strictEqual(timer.getState(), 'RUNNING');
});

run('RUNNING → DONE when countdown reaches 0 (set remaining = 1 then tick once)', () => {
  const timer = createTimer();
  timer.start();
  // Fast-forward: set remaining to 1 second then fire one tick.
  // tick() is a private helper exposed for testing; we drive it manually.
  for (let i = 0; i < 1499; i++) timer.tick(); // 1500 - 1499 = 1
  assert.strictEqual(timer.getRemainingSeconds(), 1,
    'Expected 1 remaining second after 1499 ticks');
  timer.tick(); // this tick decrements to 0 and triggers DONE
  assert.strictEqual(timer.getState(), 'DONE');
  assert.strictEqual(timer.getRemainingSeconds(), 0);
});

run('DONE → IDLE on reset()', () => {
  const timer = createTimer();
  timer.start();
  for (let i = 0; i < 1500; i++) timer.tick();
  assert.strictEqual(timer.getState(), 'DONE');
  timer.reset();
  assert.strictEqual(timer.getState(), 'IDLE');
  assert.strictEqual(timer.getRemainingSeconds(), 1500);
});

run('notification text is set when DONE is reached', () => {
  const timer = createTimer();
  timer.start();
  for (let i = 0; i < 1500; i++) timer.tick();
  assert.strictEqual(
    domElements['timer-notification'].textContent,
    'Session complete!'
  );
});

run('notification text is cleared after Reset from DONE', () => {
  const timer = createTimer();
  timer.start();
  for (let i = 0; i < 1500; i++) timer.tick();
  timer.reset();
  assert.strictEqual(domElements['timer-notification'].textContent, '');
});

// ---------------------------------------------------------------------------
// Test 2 — Reset is blocked while RUNNING
// Validates: Requirements 2.8
// ---------------------------------------------------------------------------

console.log('\nReset blocked from RUNNING');

run('#timer-reset button is disabled while state is RUNNING', () => {
  const timer = createTimer();
  timer.start();
  assert.strictEqual(timer.getState(), 'RUNNING');
  assert.strictEqual(domElements['timer-reset'].disabled, true,
    'reset button should be disabled while RUNNING');
});

run('calling reset() while RUNNING leaves state as RUNNING', () => {
  const timer = createTimer();
  timer.start();
  const secondsBefore = timer.getRemainingSeconds();
  timer.reset(); // must be a no-op — only PAUSED or DONE may reset
  assert.strictEqual(timer.getState(), 'RUNNING');
  assert.strictEqual(timer.getRemainingSeconds(), secondsBefore);
});

run('#timer-reset button is enabled when not RUNNING (IDLE state)', () => {
  const timer = createTimer();
  // Initial state is IDLE — reset button must not be disabled.
  assert.strictEqual(domElements['timer-reset'].disabled, false);
});

// ---------------------------------------------------------------------------
// Test 3 — Reset from PAUSED works correctly
// IDLE → RUNNING → PAUSED → IDLE (Reset)
// Validates: Requirements 2.5, 2.6
// ---------------------------------------------------------------------------

console.log('\nReset from PAUSED');

run('reset() from PAUSED transitions to IDLE and restores 1500 seconds', () => {
  const timer = createTimer();
  timer.start();
  // Advance a few ticks so remaining is no longer 1500.
  for (let i = 0; i < 10; i++) timer.tick();
  timer.stop();
  assert.strictEqual(timer.getState(), 'PAUSED');

  timer.reset();
  assert.strictEqual(timer.getState(), 'IDLE');
  assert.strictEqual(timer.getRemainingSeconds(), 1500);
});

run('#timer-reset button is re-enabled after Reset from PAUSED', () => {
  const timer = createTimer();
  timer.start();
  timer.stop();
  timer.reset();
  assert.strictEqual(domElements['timer-reset'].disabled, false);
});

// ---------------------------------------------------------------------------
// Test 4 — Start while RUNNING is a no-op
// Validates: Requirement 2.9
// ---------------------------------------------------------------------------

console.log('\nStart while RUNNING is a no-op');

run('calling start() twice does not change state from RUNNING', () => {
  const timer = createTimer();
  timer.start();
  timer.start(); // second call must be a no-op
  assert.strictEqual(timer.getState(), 'RUNNING');
});

run('calling start() twice does not start a second interval', () => {
  const timer = createTimer();
  timer.start();
  const countAfterFirst = timer.getIntervalCount();
  timer.start(); // no-op — must NOT create another interval
  assert.strictEqual(timer.getIntervalCount(), countAfterFirst,
    'interval count must not increase on a redundant start() call');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
