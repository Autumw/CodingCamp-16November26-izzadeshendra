// Feature: todo-life-dashboard, Property 1/3/4/8

/**
 * Property-based tests for TodoWidget data layer.
 * Tests Properties 1, 3, 4, and 8 from the design document.
 *
 * Run: .\node.exe tests\todo.property.test.js
 * Requires: fast-check (npm install fast-check --save-dev)
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.9, 3.10, 3.13
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Pure implementations extracted from js/app.js (IIFEs not usable in Node
// without a DOM, so the logic is re-declared here for testing purposes).
// These must stay in sync with the implementations in js/app.js.
// ---------------------------------------------------------------------------

/**
 * Simulates TodoWidget._sync(): serialises tasks array to JSON.
 * In the real app this calls Utils.storage.set("tdl_tasks", tasks).
 * @param {Array} tasks
 * @returns {string}  JSON string
 */
function syncTasks(tasks) {
  return JSON.stringify(tasks);
}

/**
 * Simulates TodoWidget._load(): parses the JSON string back to an array.
 * In the real app this is Utils.storage.get("tdl_tasks") which calls JSON.parse.
 * @param {string} json
 * @returns {Array}
 */
function loadTasks(json) {
  return JSON.parse(json);
}

/**
 * Re-declaration of TodoWidget._add() validation logic for property testing.
 * Returns the mutated tasks array and any error message set.
 * The real app writes to a closure-scoped `tasks` array and calls showError();
 * here we return { tasks, errorMessage } so callers can assert on both.
 *
 * @param {Array}  tasks  Current in-memory task list (mutated in place on success)
 * @param {string} title  Raw title from the user
 * @returns {{ tasks: Array, errorMessage: string }}
 */
function addTask(tasks, title) {
  var trimmed = title.trim();
  var errorMessage = '';

  if (trimmed.length === 0) {
    errorMessage = 'Task title cannot be empty.';
    return { tasks, errorMessage };
  }

  if (trimmed.length > 200) {
    errorMessage = 'Task title must be 200 characters or fewer.';
    return { tasks, errorMessage };
  }

  if (tasks.length >= 100) {
    errorMessage = 'Maximum task limit of 100 reached.';
    return { tasks, errorMessage };
  }

  tasks.push({
    id:        Date.now().toString(),
    title:     trimmed,
    completed: false,
    createdAt: Date.now()
  });

  return { tasks, errorMessage };
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
// Property 1: Task localStorage round-trip
// **Validates: Requirements 3.9, 3.10**
//
// For any array of valid Task objects serialised via _sync() and parsed back
// via _load(), the result must be structurally identical to the original —
// same id, title, completed, and createdAt values in the same order.
// ---------------------------------------------------------------------------

console.log('\nProperty 1 — Task localStorage round-trip');

run('serialise-then-parse produces an array structurally equal to the original', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id:        fc.string(),
          title:     fc.string({ minLength: 1, maxLength: 200 }),
          completed: fc.boolean(),
          createdAt: fc.integer()
        })
      ),
      (tasks) => {
        const json   = syncTasks(tasks);
        const parsed = loadTasks(json);

        // Must be an array of the same length
        if (!Array.isArray(parsed)) {
          throw new Error('Parsed result is not an array');
        }
        if (parsed.length !== tasks.length) {
          throw new Error(
            `Length mismatch: original=${tasks.length}, parsed=${parsed.length}`
          );
        }

        // Every field on every element must match exactly
        for (let i = 0; i < tasks.length; i++) {
          const orig = tasks[i];
          const got  = parsed[i];

          if (got.id !== orig.id) {
            throw new Error(`tasks[${i}].id mismatch: expected "${orig.id}", got "${got.id}"`);
          }
          if (got.title !== orig.title) {
            throw new Error(
              `tasks[${i}].title mismatch: expected "${orig.title}", got "${got.title}"`
            );
          }
          if (got.completed !== orig.completed) {
            throw new Error(
              `tasks[${i}].completed mismatch: expected ${orig.completed}, got ${got.completed}`
            );
          }
          if (got.createdAt !== orig.createdAt) {
            throw new Error(
              `tasks[${i}].createdAt mismatch: expected ${orig.createdAt}, got ${got.createdAt}`
            );
          }
        }

        return true;
      }
    ),
    { numRuns: 100 }
  );
});

run('order of tasks is preserved through the round-trip', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id:        fc.string(),
          title:     fc.string({ minLength: 1, maxLength: 200 }),
          completed: fc.boolean(),
          createdAt: fc.integer()
        }),
        { minLength: 1 }
      ),
      (tasks) => {
        const parsed = loadTasks(syncTasks(tasks));
        // Check that id sequence is preserved (id is the unique identity key)
        for (let i = 0; i < tasks.length; i++) {
          if (parsed[i].id !== tasks[i].id) {
            throw new Error(
              `Order broken at index ${i}: expected id="${tasks[i].id}", got "${parsed[i].id}"`
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
// Property 3: Whitespace and empty titles are always rejected
// **Validates: Requirements 3.1, 3.2**
//
// For any string composed entirely of whitespace characters (space, tab,
// newline, etc.) or the empty string, _add() must reject the input, leave
// the tasks array unchanged (length 0), and set a non-empty error message.
// ---------------------------------------------------------------------------

console.log('\nProperty 3 — Whitespace and empty titles are always rejected');

run('all-whitespace or empty title is rejected and tasks array stays empty', () => {
  fc.assert(
    fc.property(
      fc.stringMatching(/^\s*$/),
      (title) => {
        const tasks = [];
        const result = addTask(tasks, title);

        if (result.tasks.length !== 0) {
          throw new Error(
            `Expected tasks to remain empty, but got length ${result.tasks.length} ` +
            `for title "${JSON.stringify(title)}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

run('all-whitespace or empty title always produces a non-empty error message', () => {
  fc.assert(
    fc.property(
      fc.stringMatching(/^\s*$/),
      (title) => {
        const tasks = [];
        const result = addTask(tasks, title);

        if (!result.errorMessage || result.errorMessage.trim().length === 0) {
          throw new Error(
            `Expected a non-empty error message for title "${JSON.stringify(title)}", ` +
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
// Property 4: Task list never exceeds the 100-item cap
// **Validates: Requirements 3.13**
//
// For any add attempted against a list that already holds exactly 100 tasks,
// the operation must be rejected and the list length must remain exactly 100,
// regardless of the title content.
// ---------------------------------------------------------------------------

console.log('\nProperty 4 — Task list never exceeds the 100-item cap');

/**
 * Builds a tasks array pre-filled with exactly `count` stub items.
 * @param {number} count
 * @returns {Array}
 */
function makeTaskList(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id:        String(i),
      title:     'Task ' + i,
      completed: false,
      createdAt: i
    });
  }
  return list;
}

run('adding to a 100-item list always leaves the list at length 100', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 200 }),
      (title) => {
        const tasks = makeTaskList(100);
        const result = addTask(tasks, title);

        if (result.tasks.length !== 100) {
          throw new Error(
            `Expected tasks length to remain 100 after add, ` +
            `but got ${result.tasks.length} for title "${title}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

run('adding to a 100-item list always produces a non-empty error message', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 200 }),
      (title) => {
        const tasks = makeTaskList(100);
        const result = addTask(tasks, title);

        if (!result.errorMessage || result.errorMessage.trim().length === 0) {
          throw new Error(
            `Expected a non-empty error message when list is full, ` +
            `but got "${result.errorMessage}" for title "${title}"`
          );
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 8: Toggle-complete is an involution
// **Validates: Requirements 3.3, 3.4**
//
// For any task with an arbitrary initial `completed` value, applying
// _toggleComplete twice must restore the task's `completed` field to its
// original value.  The toggle logic is pure (flip the boolean) and is
// re-declared inline here because the IIFE module in app.js requires a DOM.
// ---------------------------------------------------------------------------

console.log('\nProperty 8 — Toggle-complete is an involution');

/**
 * Pure re-declaration of TodoWidget._toggleComplete() logic.
 * Receives a single task object and returns a new object with the
 * `completed` flag flipped.
 *
 * @param {{ id: string, title: string, completed: boolean, createdAt: number }} task
 * @returns {{ id: string, title: string, completed: boolean, createdAt: number }}
 */
function toggleComplete(task) {
  return Object.assign({}, task, { completed: !task.completed });
}

run('double-toggle always restores the original completed state', () => {
  fc.assert(
    fc.property(
      fc.boolean(),
      (initialValue) => {
        const task = { id: '1', title: 'test', completed: initialValue, createdAt: 0 };

        const afterFirst  = toggleComplete(task);
        const afterSecond = toggleComplete(afterFirst);

        // Single toggle must flip
        if (afterFirst.completed !== !initialValue) {
          throw new Error(
            `After first toggle: expected completed=${!initialValue}, ` +
            `got ${afterFirst.completed} (initial was ${initialValue})`
          );
        }

        // Double toggle must restore original
        if (afterSecond.completed !== initialValue) {
          throw new Error(
            `After second toggle: expected completed=${initialValue}, ` +
            `got ${afterSecond.completed} (initial was ${initialValue})`
          );
        }

        // Other fields must remain unchanged
        if (afterSecond.id !== task.id || afterSecond.title !== task.title ||
            afterSecond.createdAt !== task.createdAt) {
          throw new Error(
            'Double-toggle mutated fields other than completed: ' +
            JSON.stringify(afterSecond)
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
