/* Todo Life Dashboard — app.js
   Five IIFE modules: Utils, GreetingWidget, TimerWidget, TodoWidget,
   QuickLinksWidget. Each module is implemented in later tasks; only stubs
   are provided here (Task 1). */

/* ─── Utils ─────────────────────────────────────────────────────────────────── */
var Utils = (function () {
  /* Shared helpers: date formatting, greeting, storage wrapper, XSS escape. */

  var DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

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

  /**
   * localStorage wrapper — get/set with JSON serialisation.
   * get returns null on missing key or parse error.
   * set swallows QuotaExceededError and any other storage error silently.
   */
  var storage = {
    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* swallow QuotaExceededError and any other storage errors */
      }
    }
  };

  /**
   * Escapes HTML special characters to prevent XSS.
   * Replaces &, <, >, ", and ' with their HTML entity equivalents.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    formatTime:  formatTime,
    formatDate:  formatDate,
    getGreeting: getGreeting,
    storage:     storage,
    escapeHtml:  escapeHtml
  };
})();

/* ─── GreetingWidget ────────────────────────────────────────────────────────── */
var GreetingWidget = (function () {
  /* Renders time, date, and greeting; runs a 1-minute tick loop aligned to
     the top of each wall-clock minute to avoid cumulative drift. */

  /**
   * Reads the current time and writes to the three greeting DOM elements.
   */
  function tick() {
    var now = new Date();
    var timeEl     = document.getElementById('greeting-time');
    var dateEl     = document.getElementById('greeting-date');
    var greetingEl = document.getElementById('greeting-text');
    if (timeEl)     timeEl.textContent     = Utils.formatTime(now);
    if (dateEl)     dateEl.textContent     = Utils.formatDate(now);
    if (greetingEl) greetingEl.textContent = Utils.getGreeting(now.getHours());
  }

  return {
    /**
     * Renders immediately, then schedules ticks aligned to the top of each
     * minute: one setTimeout to the next minute boundary, then setInterval
     * at exactly 60 000 ms for all subsequent ticks.
     */
    init: function () {
      // Render immediately on call.
      tick();

      // Calculate milliseconds remaining until the top of the next minute.
      var now = new Date();
      var msToNextMinute = 60000 - (now.getMilliseconds() + now.getSeconds() * 1000) % 60000;

      setTimeout(function () {
        tick();
        setInterval(tick, 60000);
      }, msToNextMinute);
    }
  };
})();

/* ─── TimerWidget ───────────────────────────────────────────────────────────── */
var TimerWidget = (function () {
  /* 25-minute Pomodoro countdown state machine (IDLE/RUNNING/PAUSED/DONE).
     States and transitions:
       IDLE    → RUNNING  : Start click
       RUNNING → PAUSED   : Stop click
       RUNNING → DONE     : remaining reaches 0
       PAUSED  → RUNNING  : Start click
       PAUSED  → IDLE     : Reset click
       DONE    → IDLE     : Reset click                                         */

  /* ── State constants ──────────────────────────────────────────────────────── */
  var IDLE    = 'IDLE';
  var RUNNING = 'RUNNING';
  var PAUSED  = 'PAUSED';
  var DONE    = 'DONE';

  /* ── Internal state ───────────────────────────────────────────────────────── */
  var state            = IDLE;
  var remainingSeconds = 1500;   /* 25 × 60 */
  var intervalId       = null;

  /* ── Private helpers ──────────────────────────────────────────────────────── */

  /**
   * Formats a total-seconds value as a zero-padded "MM:SS" string.
   * @param {number} totalSeconds  Non-negative integer
   * @returns {string}  e.g. "25:00", "04:07"
   */
  function formatSeconds(totalSeconds) {
    var mm = Math.floor(totalSeconds / 60);
    var ss = totalSeconds % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  /**
   * Writes the current remainingSeconds value to #timer-display.
   */
  function updateDisplay() {
    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatSeconds(remainingSeconds);
    }
  }

  /**
   * Clears the active interval if one is running.
   */
  function clearCountdown() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * Applies the disabled state of #timer-reset to match current state.
   * Reset is disabled while RUNNING; enabled in all other states.
   */
  function syncResetButton() {
    var resetBtn = document.getElementById('timer-reset');
    if (!resetBtn) return;
    resetBtn.disabled = (state === RUNNING);
  }

  /**
   * Called on each 1-second tick while RUNNING.
   * Decrements remainingSeconds; transitions to DONE at 0.
   */
  function tick() {
    remainingSeconds -= 1;
    updateDisplay();

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearCountdown();
      state = DONE;
      syncResetButton();
      updateDisplay();

      /* Show session-complete notification */
      var notification = document.getElementById('timer-notification');
      if (notification) {
        notification.textContent = 'Session complete!';
      }
    }
  }

  /* ── Public transition methods ────────────────────────────────────────────── */

  /**
   * Start: IDLE → RUNNING or PAUSED → RUNNING.
   * No-op if already RUNNING.
   */
  function start() {
    if (state === RUNNING) return; /* Requirement 2.9 — ignore if already running */
    if (state !== IDLE && state !== PAUSED) return;

    state = RUNNING;
    syncResetButton();
    updateDisplay();

    intervalId = setInterval(tick, 1000);
  }

  /**
   * Stop: RUNNING → PAUSED.
   * No-op in any other state.
   */
  function stop() {
    if (state !== RUNNING) return;

    clearCountdown();
    state = PAUSED;
    syncResetButton();
    updateDisplay();
  }

  /**
   * Reset: PAUSED → IDLE or DONE → IDLE.
   * Also reachable programmatically; blocked by button.disabled while RUNNING.
   */
  function reset() {
    if (state !== PAUSED && state !== DONE) return;

    clearCountdown();
    state            = IDLE;
    remainingSeconds = 1500;
    syncResetButton();
    updateDisplay();

    /* Clear the session-complete notification */
    var notification = document.getElementById('timer-notification');
    if (notification) {
      notification.textContent = '';
    }
  }

  /* ── Init ─────────────────────────────────────────────────────────────────── */

  return {
    init: function () {
      /* Reset internal state. */
      state            = IDLE;
      remainingSeconds = 1500;
      intervalId       = null;
      syncResetButton();

      /* Set initial display to 25:00 immediately (Requirement 2.1 / 2.7). */
      updateDisplay();

      /* Wire button click listeners (Requirement 2.2–2.5). */
      var startBtn = document.getElementById('timer-start');
      var stopBtn  = document.getElementById('timer-stop');
      var resetBtn = document.getElementById('timer-reset');

      if (startBtn) startBtn.addEventListener('click', start);
      if (stopBtn)  stopBtn.addEventListener('click', stop);
      if (resetBtn) resetBtn.addEventListener('click', reset);
    },

    /* Expose transition methods so Task 4.2 can wire them to button events. */
    start: start,
    stop:  stop,
    reset: reset,

    /* Expose a read-only state accessor for testing and display (Task 4.2/4.4). */
    getState: function () { return state; },
    getRemainingSeconds: function () { return remainingSeconds; }
  };
})();

/* ─── TodoWidget ────────────────────────────────────────────────────────────── */
var TodoWidget = (function () {
  /* Full-CRUD task manager persisted to localStorage key "tdl_tasks".
     Data model: { id: string, title: string, completed: boolean, createdAt: number }

     Task 6.1 implements: init, _add, _sync, _render (with stub handlers for
     _toggleComplete, _startEdit, _delete — implemented fully in tasks 6.3/6.5). */

  /* ── Internal state ───────────────────────────────────────────────────────── */
  var tasks = [];

  /* ── Private helpers ──────────────────────────────────────────────────────── */

  /**
   * Generates a unique task ID using crypto.randomUUID when available,
   * falling back to Date.now().toString() for older environments.
   * @returns {string}
   */
  function generateId() {
    return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();
  }

  /**
   * Shows or clears the error banner in #todo-error.
   * Pass an empty string to clear the banner.
   * @param {string} message
   */
  function showError(message) {
    var errorEl = document.getElementById('todo-error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  /* ── Stubs for future tasks ───────────────────────────────────────────────── */

  /**
   * Flips the completed flag on the task with the given id, persists, and
   * re-renders the list.
   * Requirements: 3.3, 3.4, 3.8, 3.9
   * @param {string} id
   */
  function _toggleComplete(id) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks[i].completed = !tasks[i].completed;
        break;
      }
    }
    _sync();
    _render();
  }

  /**
   * Replaces a task row with an inline edit form containing a text input
   * pre-filled with the raw title, plus Save and Cancel buttons.
   * Requirements: 3.5, 3.6
   * @param {string} id
   */
  function _startEdit(id) {
    var list = document.getElementById('todo-list');
    if (!list) return;

    var li = list.querySelector('li[data-id="' + id + '"]');
    if (!li) return;

    /* Find the raw title from memory (not from the DOM, which is HTML-escaped) */
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        task = tasks[i];
        break;
      }
    }
    if (!task) return;

    /* Build the inline edit controls */
    var input = document.createElement('input');
    input.type = 'text';
    input.value = task.title;   /* raw title — not HTML-escaped */

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function () {
      _confirmEdit(id, input.value);
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function () {
      _cancelEdit(id);
    });

    /* Replace row contents with the edit form */
    li.innerHTML = '';
    li.appendChild(input);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);

    input.focus();
  }

  /**
   * Validates the new title and, if valid, updates the task and re-renders.
   * Shows an inline error message in the row on validation failure.
   * Requirements: 3.6, 3.7, 3.12
   * @param {string} id
   * @param {string} newTitle
   */
  function _confirmEdit(id, newTitle) {
    var trimmed = newTitle.trim();

    /* Locate the row for inline error display */
    var list = document.getElementById('todo-list');
    if (!list) { _render(); return; }
    var li   = list.querySelector('li[data-id="' + id + '"]');

    function showInlineError(message) {
      if (!li) return;
      /* Remove any previous inline error in this row */
      var existing = li.querySelector('.edit-error');
      if (existing) {
        li.removeChild(existing);
      }
      var errEl = document.createElement('span');
      errEl.className = 'edit-error';
      errEl.textContent = message;
      li.appendChild(errEl);
    }

    if (trimmed.length === 0) {
      showInlineError('Title cannot be empty.');
      return;
    }

    if (trimmed.length > 200) {
      showInlineError('Title must be 200 characters or fewer.');
      return;
    }

    /* Validation passed — update in-memory state */
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks[i].title = trimmed;
        break;
      }
    }
    _sync();
    _render();
  }

  /**
   * Cancels an in-progress edit by re-rendering the list from memory,
   * which restores the original row without any mutation.
   * Requirements: 3.6
   * @param {string} id
   */
  function _cancelEdit(id) {
    _render();
  }

  /**
   * Removes the task with the given id from tasks[], persists, and
   * re-renders the list.
   * Requirements: 3.8, 3.9
   * @param {string} id
   */
  function _delete(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; });
    _sync();
    _render();
  }

  /* ── Core functions ───────────────────────────────────────────────────────── */

  /**
   * Persists the current in-memory tasks array to localStorage.
   * Errors (e.g. QuotaExceededError) are swallowed by Utils.storage.set.
   * Requirements: 3.9
   */
  function _sync() {
    Utils.storage.set('tdl_tasks', tasks);
  }

  /**
   * Performs a full re-render of #todo-list from the tasks[] array.
   * Each row:
   *   <li data-id="…">
   *     <input type="checkbox" [checked]>
   *     <span [class="completed"]>…escaped title…</span>
   *     <button>Edit</button>
   *     <button>Delete</button>
   *   </li>
   * Requirements: 3.10
   */
  function _render() {
    var list = document.getElementById('todo-list');
    if (!list) return;

    list.innerHTML = '';

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];

      /* Row container */
      var li = document.createElement('li');
      li.setAttribute('data-id', task.id);

      /* Completion checkbox */
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      /* Capture id in a closure for the event listener */
      (function (taskId) {
        checkbox.addEventListener('change', function () {
          _toggleComplete(taskId);
        });
      })(task.id);

      /* Title span — HTML-escaped to prevent XSS */
      var span = document.createElement('span');
      span.innerHTML = Utils.escapeHtml(task.title);
      if (task.completed) {
        span.classList.add('completed');
      }

      /* Edit button */
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      (function (taskId) {
        editBtn.addEventListener('click', function () {
          _startEdit(taskId);
        });
      })(task.id);

      /* Delete button */
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      (function (taskId) {
        deleteBtn.addEventListener('click', function () {
          _delete(taskId);
        });
      })(task.id);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    }
  }

  /**
   * Validates and adds a new task to the list.
   * Validation order: empty title → over-length → list full → success.
   * On success: generates id, pushes task, syncs, re-renders, clears error.
   * Requirements: 3.1, 3.2, 3.13
   * @param {string} title  Raw title string (will be trimmed internally)
   */
  function _add(title) {
    var trimmed = title.trim();

    if (trimmed.length === 0) {
      showError('Task title cannot be empty.');
      return;
    }

    if (trimmed.length > 200) {
      showError('Task title must be 200 characters or fewer.');
      return;
    }

    if (tasks.length >= 100) {
      showError('Maximum task limit of 100 reached.');
      return;
    }

    var newTask = {
      id:        generateId(),
      title:     trimmed,
      completed: false,
      createdAt: Date.now()
    };

    tasks.push(newTask);
    _sync();
    _render();
    showError('');
  }

  /* ── Init ─────────────────────────────────────────────────────────────────── */

  return {
    /**
     * Loads saved tasks from localStorage; on error shows banner and starts
     * with an empty list. Then mounts the submit handler on #todo-form.
     * Requirements: 3.10, 3.11
     */
    init: function () {
      /* Load persisted tasks (or start empty on error) */
      var saved = Utils.storage.get('tdl_tasks');
      if (Array.isArray(saved)) {
        tasks = saved;
        _render();
      } else {
        tasks = [];
        if (saved !== null) {
          /* storage.get returned something non-null but not an array —
             indicates corrupt data */
          showError('Saved tasks could not be loaded.');
        } else {
          /* null means key was absent or a parse error occurred; show banner
             only when there was actually an error. storage.get swallows errors
             and returns null for both "key missing" and "parse error", so we
             check for a raw value to distinguish the two cases. */
          try {
            var raw = localStorage.getItem('tdl_tasks');
            if (raw !== null) {
              /* Key exists but parse failed — show error banner */
              showError('Saved tasks could not be loaded.');
            }
            /* Key absent — no banner, just start empty */
          } catch (e) {
            /* localStorage itself is unavailable */
            showError('Saved tasks could not be loaded.');
          }
        }
      }

      /* Mount form submit handler */
      var form  = document.getElementById('todo-form');
      var input = document.getElementById('todo-input');
      if (form && input) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var title = input.value;
          _add(title);
          /* Clear input only on successful add (error was not set) */
          var errorEl = document.getElementById('todo-error');
          if (errorEl && errorEl.textContent === '') {
            input.value = '';
          }
        });
      }
    },

    /* Expose internal methods for testing and future task integration */
    _add:            _add,
    _sync:           _sync,
    _render:         _render,
    _toggleComplete: _toggleComplete,
    _startEdit:      _startEdit,
    _confirmEdit:    _confirmEdit,
    _cancelEdit:     _cancelEdit,
    _delete:         _delete,
    getTasks:        function () { return tasks; }
  };
})();

/* ─── QuickLinksWidget ──────────────────────────────────────────────────────── */
var QuickLinksWidget = (function () {
  /* Saved-links launcher persisted to localStorage key "tdl_links".
     Data model: { id: string, label: string, url: string }

     Task 8.1 implements: init, _add, _sync, _render (with a stub _delete
     that will be fully implemented in Task 8.3).                              */

  /* ── Internal state ───────────────────────────────────────────────────────── */
  var links = [];

  /* ── Private helpers ──────────────────────────────────────────────────────── */

  /**
   * Generates a unique link ID using crypto.randomUUID when available,
   * falling back to Date.now().toString() for older environments.
   * @returns {string}
   */
  function generateId() {
    return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();
  }

  /**
   * Shows or clears the error banner in #links-error.
   * Pass an empty string to clear the banner.
   * @param {string} message
   */
  function showError(message) {
    var errorEl = document.getElementById('links-error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  /* ── Core functions ───────────────────────────────────────────────────────── */

  /**
   * Persists the current in-memory links array to localStorage.
   * Errors (e.g. QuotaExceededError) are swallowed by Utils.storage.set.
   * Requirements: 4.6, 4.7
   */
  function _sync() {
    Utils.storage.set('tdl_links', links);
  }

  /**
   * Performs a full re-render of #quick-links-list from the links[] array.
   * Each row:
   *   <li>
   *     <a href="…" target="_blank" rel="noopener noreferrer">…escaped label…</a>
   *     <button>Delete</button>
   *   </li>
   * Requirements: 4.6, 4.7
   */
  function _render() {
    var list = document.getElementById('quick-links-list');
    if (!list) return;

    list.innerHTML = '';

    for (var i = 0; i < links.length; i++) {
      var link = links[i];

      /* Row container */
      var li = document.createElement('li');

      /* Link anchor — opens in new tab; label is HTML-escaped for XSS safety */
      var anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.innerHTML = Utils.escapeHtml(link.label);

      /* Delete button — calls _delete(id); full implementation in Task 8.3 */
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      (function (linkId) {
        deleteBtn.addEventListener('click', function () {
          _delete(linkId);
        });
      })(link.id);

      li.appendChild(anchor);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    }
  }

  /**
   * Validates and adds a new quick link to the list.
   * Validation order: empty label → over-length label → invalid URL scheme →
   *   list full → success.
   * On success: generates id, pushes link, syncs, re-renders, clears error.
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.8
   * @param {string} label  Raw label string (will be trimmed internally)
   * @param {string} url    Raw URL string (will be trimmed internally)
   */
  function _add(label, url) {
    var trimmedLabel = label.trim();
    var trimmedUrl   = url.trim();

    if (trimmedLabel.length === 0) {
      showError('Link label cannot be empty.');
      return;
    }

    if (trimmedLabel.length > 50) {
      showError('Link label must be 50 characters or fewer.');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      showError('URL must start with http:// or https://.');
      return;
    }

    if (links.length >= 20) {
      showError('Maximum of 20 links allowed.');
      return;
    }

    var newLink = {
      id:    generateId(),
      label: trimmedLabel,
      url:   trimmedUrl
    };

    links.push(newLink);
    _sync();
    _render();
    showError('');
  }

  /**
   * Stub: removes the link with the given id from links[], persists, and
   * re-renders the list.
   * Full implementation in Task 8.3.
   * Requirements: 4.5, 4.6
   * @param {string} id
   */
  function _delete(id) {
    links = links.filter(function (l) { return l.id !== id; });
    _sync();
    _render();
  }

  /* ── Init ─────────────────────────────────────────────────────────────────── */

  return {
    /**
     * Loads saved links from localStorage; on error shows banner and starts
     * with an empty list. Then mounts the submit handler on #links-form.
     * Requirements: 4.6, 4.7
     */
    init: function () {
      /* Load persisted links (or start empty on error) */
      var saved = Utils.storage.get('tdl_links');
      if (Array.isArray(saved)) {
        links = saved;
        _render();
      } else {
        links = [];
        if (saved !== null) {
          /* storage.get returned something non-null but not an array —
             indicates corrupt data */
          showError('Saved links could not be loaded.');
        } else {
          /* null means key was absent or a parse error occurred; distinguish
             the two by attempting a raw read */
          try {
            var raw = localStorage.getItem('tdl_links');
            if (raw !== null) {
              /* Key exists but parse failed — show error banner */
              showError('Saved links could not be loaded.');
            }
            /* Key absent — no banner, just start empty */
          } catch (e) {
            /* localStorage itself is unavailable */
            showError('Saved links could not be loaded.');
          }
        }
      }

      /* Mount form submit handler */
      var form       = document.getElementById('links-form');
      var labelInput = document.getElementById('links-label-input');
      var urlInput   = document.getElementById('links-url-input');
      if (form && labelInput && urlInput) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var label = labelInput.value;
          var url   = urlInput.value;
          _add(label, url);
          /* Clear inputs only on successful add (error was not set) */
          var errorEl = document.getElementById('links-error');
          if (errorEl && errorEl.textContent === '') {
            labelInput.value = '';
            urlInput.value   = '';
          }
        });
      }
    },

    /* Expose internal methods for testing and future task integration */
    _add:      _add,
    _sync:     _sync,
    _render:   _render,
    _delete:   _delete,
    getLinks:  function () { return links; }
  };
})();

/* ─── Bootstrap ─────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  GreetingWidget.init();
  TimerWidget.init();
  TodoWidget.init();
  QuickLinksWidget.init();
});
