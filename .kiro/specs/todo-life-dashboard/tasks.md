# Implementation Plan: Todo Life Dashboard

## Overview

Build a self-contained, three-file web application (index.html, css/styles.css, js/app.js) with six IIFE modules wired together at `DOMContentLoaded`. Each phase below delivers a working slice — Utils first, then each widget, then integration and testing.

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - Create `index.html` with the page shell, widget markup sections (`#greeting`, `#timer`, `#todo`, `#quick-links`), a `#theme-toggle` button in the page header, and `<link>`/`<script>` tags pointing to `css/styles.css` and `js/app.js`
  - Add a minimal inline `<script>` in `<head>` that reads `localStorage.getItem("tdl_theme")` synchronously and sets `document.documentElement.setAttribute("data-theme", ...)` before any CSS is applied (flash prevention); fall back to `"light"` on error
  - Create `css/styles.css` with a grid layout that places the four widgets in visually distinct containers with margins/borders; declare all colour and surface values as CSS custom properties on `:root` with a `[data-theme="dark"]` override block
  - Create `js/app.js` with empty IIFE stubs for `Utils`, `ThemeWidget`, `GreetingWidget`, `TimerWidget`, `TodoWidget`, and `QuickLinksWidget`, plus a `DOMContentLoaded` handler that calls each `init()`
  - _Requirements: 5.1, 5.2, 5.3, 6.5, 8.5_

- [x] 2. Implement the Utils module
  - [x] 2.1 Implement `Utils.formatTime`, `Utils.formatDate`, `Utils.getGreeting`, and `Utils.formatGreeting`
    - `formatTime(date)` → `"HH:MM"` (24-hour, zero-padded)
    - `formatDate(date)` → `"Weekday, DD Month YYYY"` using full English names
    - `getGreeting(hour)` → `"Good Morning"` (05–11), `"Good Afternoon"` (12–17), `"Good Evening"` (18–23 and 00–04)
    - `formatGreeting(hour, name)` → `"[Greeting], [Name]"` when name is non-empty after trim; `"[Greeting]"` otherwise
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.2_

  - [x] 2.2 Implement `Utils.storage` and `Utils.escapeHtml`
    - `Utils.storage.get(key)` → parsed JSON or `null`; swallows parse errors
    - `Utils.storage.set(key, value)` → serialises and writes; swallows `QuotaExceededError`
    - `Utils.escapeHtml(str)` → replaces `<`, `>`, `&`, `"`, `'` with HTML entities
    - _Requirements: 3.9, 3.10, 4.6, 4.7, 5.4_

  - [x]* 2.3 Write property tests for Utils (Properties 7, 9, 10)
    - **Property 7: Time-of-day greeting covers all 24 hours without gaps or overlaps** — generator: `fc.integer({min:0, max:23})`
    - **Property 9: `formatTime` always produces a valid HH:MM string** — generator: `fc.date()`
    - **Property 10: `formatDate` always produces a correctly structured date string** — generator: `fc.date()`
    - Use fast-check; minimum 100 iterations per property
    - File comment: `// Feature: todo-life-dashboard, Property 7/9/10`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x]* 2.4 Write unit tests for Utils
    - `formatTime` formats midnight as `"00:00"` and noon as `"12:00"`
    - `formatDate` outputs correct weekday and month name for a known date
    - `getGreeting` returns correct string for hour 5, 12, 18, and 0
    - `formatGreeting(8, "Alex")` returns `"Good Morning, Alex"`
    - `formatGreeting(8, "")` returns `"Good Morning"` (no trailing comma or space)
    - `formatGreeting(8, "   ")` returns `"Good Morning"` (whitespace-only name treated as absent)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.2_

- [x] 3. Implement the Greeting Widget (time/date/greeting display)
  - [x] 3.1 Implement `GreetingWidget.init()` for time, date, and greeting display
    - Render time (`#greeting-time`), date (`#greeting-date`), and greeting (`#greeting-text`) immediately on call using `Utils.formatGreeting`
    - Schedule the first tick with `setTimeout` to fire at the top of the next minute (`60000 − (ms % 60000)`), then switch to `setInterval` at 60 000 ms
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 4. Implement the Timer Widget
  - [x] 4.1 Implement the timer state machine and countdown logic
    - Define the four states: `IDLE`, `RUNNING`, `PAUSED`, `DONE`
    - On Start (from IDLE or PAUSED): transition to RUNNING, start `setInterval` at 1000 ms decrementing in-memory remaining seconds
    - On Stop (from RUNNING): transition to PAUSED, clear interval
    - On Reset (from PAUSED or DONE): transition to IDLE, reset remaining to 1500 seconds, clear interval
    - When countdown reaches 0: transition to DONE, clear interval, show notification in `#timer-notification`
    - Disable `#timer-reset` while state is RUNNING; ignore Start while already RUNNING
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

  - [x] 4.2 Implement timer display formatting and UI bindings
    - Format remaining seconds as `MM:SS` (zero-padded) and write to `#timer-display`
    - Mount click listeners on `#timer-start`, `#timer-stop`, `#timer-reset`
    - _Requirements: 2.7_

  - [x]* 4.3 Write property test for timer display formatting (Property 11)
    - **Property 11: Timer display formatter always produces a valid MM:SS string** — generator: `fc.integer({min:0, max:1500})`
    - File comment: `// Feature: todo-life-dashboard, Property 11`
    - _Requirements: 2.7_

  - [x]* 4.4 Write unit tests for timer state machine
    - Transition sequence: IDLE → RUNNING → PAUSED → RUNNING → DONE → IDLE
    - Reset from RUNNING is blocked (button disabled); Reset from PAUSED works
    - Start while RUNNING is a no-op
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

- [x] 5. Checkpoint — Ensure Utils, Greeting, and Timer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Todo Widget
  - [x] 6.1 Implement task data layer: `_add`, `_sync`, `_render`, and `init` load
    - On `init()`: call `Utils.storage.get("tdl_tasks")`; on success render list; on error show banner in `#todo-error` and start with empty array
    - `_add(title)`: trim and validate (non-empty, ≤ 200 chars, list length < 100); generate id via `crypto.randomUUID()` or `Date.now().toString()` fallback; push to `tasks[]`; call `_sync()`; call `_render()`
    - `_sync()`: `Utils.storage.set("tdl_tasks", tasks)`
    - `_render()`: full re-render of `#todo-list`; each row gets `data-id` attribute; use `Utils.escapeHtml()` on title
    - Mount submit handler on `#todo-form` reading `#todo-input`; display validation errors in `#todo-error`
    - _Requirements: 3.1, 3.2, 3.9, 3.10, 3.11, 3.13_

  - [x]* 6.2 Write property tests for task data layer (Properties 1, 3, 4)
    - **Property 1: Task localStorage round-trip** — generator: `fc.array(fc.record({id: fc.string(), title: fc.string({minLength:1, maxLength:200}), completed: fc.boolean(), createdAt: fc.integer()}))`
    - **Property 3: Whitespace and empty titles are always rejected** — generator: `fc.stringMatching(/^\s*$/)`
    - **Property 4: Task list never exceeds the 100-item cap** — pre-fill list to 100, attempt one more add
    - File comment: `// Feature: todo-life-dashboard, Property 1/3/4`
    - _Requirements: 3.1, 3.2, 3.9, 3.10, 3.13_

  - [x] 6.3 Implement task complete/incomplete toggle and delete
    - `_toggleComplete(id)`: flip `completed` flag on matching task; call `_sync()`; re-render the affected row
    - `_delete(id)`: remove task from `tasks[]`; call `_sync()`; call `_render()`
    - Apply `completed` CSS class (strikethrough) to task rows where `completed === true`
    - _Requirements: 3.3, 3.4, 3.8, 3.9_

  - [x]* 6.4 Write property test for toggle involution (Property 8)
    - **Property 8: Toggle-complete is an involution** — generator: `fc.boolean()` (initial completed value); apply toggle twice and assert restored state
    - File comment: `// Feature: todo-life-dashboard, Property 8`
    - _Requirements: 3.3, 3.4_

  - [x] 6.5 Implement inline edit: `_startEdit`, `_confirmEdit`, `_cancelEdit`
    - `_startEdit(id)`: replace task row with an `<input>` pre-filled with current title
    - `_confirmEdit(id, newTitle)`: trim and validate (non-empty, ≤ 200 chars); update `tasks[].title`; call `_sync()`; re-render row
    - `_cancelEdit(id)`: re-render row from original in-memory title without mutation
    - Display validation errors inline on confirmation failure
    - _Requirements: 3.5, 3.6, 3.7, 3.12_

  - [x]* 6.6 Write unit tests for Todo Widget
    - Add with exactly 200 chars succeeds; 201 chars is rejected
    - Add with 100 items in list is rejected with cap message
    - Edit cancel restores the original title
    - `localStorage` error on load → empty list + error banner rendered
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.11, 3.12, 3.13_

- [~] 7. Checkpoint — Ensure Todo Widget tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the Quick Links Widget
  - [x] 8.1 Implement quick-link data layer: `_add`, `_sync`, `_render`, and `init` load
    - On `init()`: call `Utils.storage.get("tdl_links")`; render panel; on error show banner in `#links-error`
    - `_add(label, url)`: trim and validate (label non-empty ≤ 50 chars; URL starts with `http://` or `https://`; list length < 20); generate id; push to `links[]`; call `_sync()`; call `_render()`
    - `_sync()`: `Utils.storage.set("tdl_links", links)`
    - `_render()`: full re-render of `#quick-links-list`; each button opens URL in new tab (`target="_blank" rel="noopener noreferrer"`); use `Utils.escapeHtml()` on label
    - Mount submit handler on `#links-form`; display validation errors in `#links-error`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8_

  - [x]* 8.2 Write property tests for quick-link data layer (Properties 2, 5, 6)
    - **Property 2: Quick-link localStorage round-trip** — generator: `fc.array(fc.record({id: fc.string(), label: fc.string({minLength:1, maxLength:50}), url: fc.constantFrom("http://a.com","https://b.org")}))`
    - **Property 5: Non-HTTP(S) URLs are always rejected** — generator: `fc.string().filter(s => !/^https?:\/\//i.test(s))`
    - **Property 6: Quick-links panel never exceeds the 20-item cap** — pre-fill list to 20, attempt one more add
    - File comment: `// Feature: todo-life-dashboard, Property 2/5/6`
    - _Requirements: 4.1, 4.3, 4.6, 4.7, 4.8_

  - [x] 8.3 Implement quick-link delete
    - `_delete(id)`: remove from `links[]`; call `_sync()`; call `_render()`
    - _Requirements: 4.5, 4.6_

  - [x]* 8.4 Write unit tests for Quick Links Widget
    - Add with `http://` and `https://` succeeds; `ftp://` and `javascript:` are rejected
    - 20th link succeeds; 21st is rejected with cap message
    - Delete removes the correct link from DOM and storage
    - _Requirements: 4.1, 4.3, 4.5, 4.8_

- [x] 11. Implement the Theme Widget (Light / Dark Mode)
  - [x] 11.1 Implement `ThemeWidget.init()`, `_apply()`, and `_toggle()`
    - `init()`: call `Utils.storage.get("tdl_theme")`; default to `"light"` if absent or invalid; call `_apply(theme)`; mount click listener on `#theme-toggle`
    - `_apply(theme)`: set `data-theme` attribute on `<html>` to `"light"` or `"dark"`; write theme to `localStorage` key `"tdl_theme"` via `Utils.storage.set` within 500 ms
    - `_toggle()`: flip current theme between `"light"` and `"dark"`; call `_apply()`; complete the transition within 100 ms
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 11.2 Write property test for theme localStorage round-trip (Property 13)
    - **Property 13: Theme preference localStorage round-trip** — generator: `fc.constantFrom("light", "dark")`; write via `_apply()`, read back, assert equality
    - File comment: `// Feature: todo-life-dashboard, Property 13`
    - _Requirements: 8.4, 8.5_

  - [ ]* 11.3 Write unit tests for ThemeWidget
    - `_apply("dark")` sets `data-theme="dark"` on `<html>`; `_apply("light")` sets `data-theme="light"`
    - `_toggle()` from `"light"` produces `"dark"`; `_toggle()` from `"dark"` produces `"light"`
    - Theme persisted to `localStorage` key `"tdl_theme"` after `_apply()`
    - `init()` with no saved preference applies `"light"` by default
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 12. Extend Greeting Widget with custom name
  - [x] 12.1 Implement `GreetingWidget._saveName()` and name UI controls
    - Add DOM targets: `#greeting-name-input`, `#greeting-name-btn`, `#greeting-name-display` (shows saved name + "Change" button)
    - `_saveName(name)`: trim input; reject if empty after trim or > 50 chars with inline error in `#greeting-name-error`; write to `localStorage` key `"tdl_name"` via `Utils.storage.set` within 500 ms; call `_renderName()`
    - `_renderName()`: update `#greeting-text` using `Utils.formatGreeting(hour, this.name)`; show `#greeting-name-display` with saved name when name is set, hide when empty
    - On "Change" button click: show `#greeting-name-input` pre-filled with current saved name
    - `init()` extension: load name from `localStorage` key `"tdl_name"` on startup; call `_renderName()`; greet with personalized text if name is saved
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 12.2 Write property test for name localStorage round-trip (Property 12)
    - **Property 12: Custom name localStorage round-trip** — generator: `fc.string({minLength:1, maxLength:50}).filter(s => s.trim().length > 0)`; write via `_saveName()`, read back, assert equality
    - File comment: `// Feature: todo-life-dashboard, Property 12`
    - _Requirements: 7.5, 7.6_

  - [ ]* 12.3 Write unit tests for Greeting Widget name feature
    - `_saveName("")` and `_saveName("   ")` both reject with inline error; name state unchanged
    - `_saveName("A".repeat(51))` is rejected; `_saveName("A".repeat(50))` is accepted
    - After saving `"Alex"` at hour 8, `#greeting-text` reads `"Good Morning, Alex"`
    - On load with `"tdl_name"` in localStorage, greeting is personalized without user interaction
    - On load with no `"tdl_name"`, greeting shows only time-of-day string (no comma, no name)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.7_

- [x] 13. Extend Todo Widget with sort control
  - [x] 13.1 Implement `TodoWidget._setSort()` and `TodoWidget._sortedTasks()`
    - Add `sortOrder` state (string: `"createdAt"` | `"completion"`); load from `localStorage` key `"tdl_sort"` during `init()`; default to `"createdAt"` when absent
    - `_setSort(order)`: validate order is `"createdAt"` or `"completion"`; update `sortOrder`; write to `localStorage` key `"tdl_sort"` via `Utils.storage.set` within 500 ms; call `_render()`
    - `_sortedTasks()`: return a sorted copy of `tasks[]` without mutating the source; `"createdAt"` → ascending by `task.createdAt`; `"completion"` → incomplete (`completed === false`) first preserving insertion order within each group, then complete
    - Update `_render()` to call `_sortedTasks()` for display order instead of using `tasks[]` directly
    - Add `#todo-sort-select` `<select>` element to `index.html` with `<option>` values `"createdAt"` and `"completion"`; mount `change` listener calling `_setSort()`
    - Re-apply active sort after every `_add`, `_toggleComplete`, `_confirmEdit`, and `_delete` by virtue of `_render()` always calling `_sortedTasks()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 13.2 Write property test for sort stability (Property 14)
    - **Property 14: Sort stability** — generator: `fc.array(fc.record({id: fc.uuid(), title: fc.string({minLength:1}), completed: fc.boolean(), createdAt: fc.integer({min:0})}))`
    - Assert that `"completion"` sort places every incomplete task before every complete task and preserves relative `createdAt` order within each group
    - Assert that `"createdAt"` sort yields strictly ascending `createdAt` order and no task is omitted or duplicated
    - File comment: `// Feature: todo-life-dashboard, Property 14`
    - _Requirements: 9.2, 9.3, 9.8_

  - [ ]* 13.3 Write unit tests for Todo Widget sort
    - `_sortedTasks()` with `sortOrder = "completion"` returns all incomplete tasks before all complete tasks
    - `_sortedTasks()` with `sortOrder = "createdAt"` returns tasks ordered by ascending `createdAt`
    - `_setSort("completion")` persists `"completion"` to `localStorage` key `"tdl_sort"`
    - Sort re-applied after adding a task while `"completion"` sort is active
    - On load with `"tdl_sort"` absent, sort defaults to `"createdAt"`
    - _Requirements: 9.2, 9.3, 9.5, 9.6, 9.7, 9.8_

- [x] 9. Visual design and cross-browser polish
  - [x] 9.1 Apply complete CSS styling including dark mode
    - Two font families maximum across all widgets
    - Every text element meets WCAG 2.1 AA contrast ratio (≥ 4.5:1) in both light and dark themes
    - Four widgets in visually distinct containers with visible margin or border
    - Completed tasks rendered with strikethrough
    - Error messages styled with class `error-msg`
    - Timer notification visually prominent
    - Theme toggle button (`#theme-toggle`) visually reflects current theme state
    - _Requirements: 6.3, 6.4, 6.5, 8.7, 8.8_

  - [x] 9.2 Verify responsiveness and 100 ms interaction latency
    - All UI state updates (add, delete, toggle, edit, timer tick, theme switch, name save, sort change) must reflect in DOM within 100 ms of user interaction
    - No uncaught JS exceptions produced by any supported interaction
    - Confirm layout has no overlapping or missing elements in a modern browser
    - _Requirements: 5.5, 6.2, 8.2, 8.3_

- [ ] 10. Final checkpoint — Full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check; run via Node.js with a `localStorage` mock — no browser required
- Unit tests cover concrete scenarios; property tests cover universal invariants
- Checkpoints at steps 5, 7, and 10 provide natural review breakpoints
- The three test files mirror the module they cover: `utils.test.js`, `timer.test.js`, `todo.test.js`, `links.test.js`
- New test coverage for Requirements 7–9 is distributed across tasks 11–13 and the extended task 2.4

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.1", "4.1", "11.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "6.1", "11.2", "11.3", "12.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "8.1", "12.2", "12.3"] },
    { "id": 5, "tasks": ["6.4", "6.5", "8.2", "8.3", "13.1"] },
    { "id": 6, "tasks": ["6.6", "8.4", "9.1", "13.2", "13.3"] },
    { "id": 7, "tasks": ["9.2"] }
  ]
}
```
