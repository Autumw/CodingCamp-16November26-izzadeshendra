# Design Document

## Overview

The Todo Life Dashboard is a self-contained, single-page web application delivered as three files: one HTML file (entry point), one CSS file (`css/styles.css`), and one JavaScript file (`js/app.js`). No build step, bundler, server, or external library is required. The page opens directly from the filesystem in any modern browser.

The application is divided into four independent widgets rendered inside a single layout grid:

- **Greeting Widget** — displays live time, date, and a time-of-day greeting
- **Focus Timer** — a 25-minute Pomodoro countdown with Start, Stop, and Reset controls
- **To-Do List** — a full CRUD task manager persisted to `localStorage`
- **Quick Links Panel** — a saved-links launcher persisted to `localStorage`

All state is held in memory during a session and serialised to `localStorage` on every mutation. No network requests are made.

---

## Architecture

### File Structure

```
todo-life-dashboard/
├── index.html          # Page shell, widget markup, script/style links
├── css/
│   └── styles.css      # Layout, widget styling, utility classes
└── js/
    └── app.js          # All application logic (modules via IIFE namespaces)
```

### Module Organisation (inside `app.js`)

`app.js` uses immediately-invoked function expressions (IIFEs) to create isolated namespaces. No ES modules are used so the file works without a server (no CORS restriction on `file://`).

```
app.js
├── Utils           — shared helpers (date formatting, DOM helpers, storage wrapper, greeting formatter)
├── ThemeWidget     — light/dark theme toggle and localStorage persistence; flash-prevention inline script in <head>
├── GreetingWidget  — time/date/greeting display, tick loop, and custom name management
├── TimerWidget     — countdown state machine and UI bindings
├── TodoWidget      — task CRUD, validation, sort, localStorage sync
└── QuickLinksWidget— quick-link CRUD, validation, localStorage sync
```

Each widget module exposes a single `init()` function called from a top-level `DOMContentLoaded` handler.

### Data Flow

```
User Interaction
      │
      ▼
Widget Handler (validate → mutate in-memory state)
      │
      ▼
DOM Update (render diff or full re-render of widget list)
      │
      ▼
localStorage.setItem (serialise full widget state as JSON)
```

Reads happen once at page load (`init()`). Writes happen on every mutation.

---

## Components and Interfaces

### Utils

```js
Utils.formatTime(date)          // → "HH:MM"  (24-hour)
Utils.formatDate(date)          // → "Weekday, DD Month YYYY"
Utils.getGreeting(hour)         // → "Good Morning" | "Good Afternoon" | "Good Evening"
Utils.formatGreeting(hour, name) // → "[Greeting], [Name]" if name non-empty; "[Greeting]" otherwise
Utils.storage.get(key)          // → parsed JSON or null; swallows errors
Utils.storage.set(key, value)   // → void; swallows QuotaExceededError
Utils.escapeHtml(str)           // → HTML-safe string (prevents XSS in task titles / link labels)
```

localStorage keys managed by Utils: `"tdl_name"` (string, 1–50 chars), `"tdl_theme"` (`"light"` | `"dark"`).

### GreetingWidget

Internal state: `name` (string, loaded from `localStorage` key `"tdl_name"`; empty string when not set).

```js
GreetingWidget.init()           // Renders immediately; starts 1-minute interval aligned to wall clock; loads saved name
GreetingWidget._saveName(name)  // Validates (1–50 chars, non-empty after trim); writes to localStorage; re-renders greeting
GreetingWidget._renderName()    // Updates #greeting-text using Utils.formatGreeting(hour, this.name)
```

DOM targets: `#greeting-time`, `#greeting-date`, `#greeting-text`, `#greeting-name-input`, `#greeting-name-btn`, `#greeting-name-display`.

- `#greeting-name-display` shows the current saved name and a "Change" button when a name is saved; it is hidden when no name is set.
- `#greeting-name-input` / `#greeting-name-btn` are the entry control (an `<input>` + submit button). The input is pre-filled with the saved name when the change-name control is activated.
- On submission the widget validates the name (non-empty after trim, ≤ 50 characters); on failure an inline error message is shown and no state changes.

The tick is scheduled with `setTimeout` to fire at the top of the next minute (using `60000 − (ms % 60000)`), then switches to `setInterval` with a 60 000 ms period to avoid drift.

### TimerWidget

Internal state machine:

| State    | Allowed transitions        |
|----------|---------------------------|
| IDLE     | → RUNNING (Start)          |
| RUNNING  | → PAUSED (Stop), DONE (reaches 00:00) |
| PAUSED   | → RUNNING (Start), IDLE (Reset) |
| DONE     | → IDLE (Reset)             |

```js
TimerWidget.init()              // Mounts event listeners; renders initial 25:00
```

DOM targets: `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-notification`.

The countdown uses `setInterval` at 1000 ms. On each tick the remaining seconds are decremented in memory; the display is updated from the in-memory value (not from wall-clock drift). The Reset control is disabled programmatically (`button.disabled = true`) while state is RUNNING.

### TodoWidget

In-memory state: `tasks[]` — ordered array of Task objects (see Data Models).

```js
TodoWidget.init()               // Loads from localStorage; renders list; mounts form handler
TodoWidget._add(title)          // Validates; appends to tasks[]; syncs; re-renders
TodoWidget._toggleComplete(id)  // Flips completed flag; syncs; re-renders item
TodoWidget._startEdit(id)       // Replaces task row with edit input
TodoWidget._confirmEdit(id, newTitle) // Validates; updates title; syncs; re-renders item
TodoWidget._cancelEdit(id)      // Reverts row to display mode
TodoWidget._delete(id)          // Removes from tasks[]; syncs; re-renders list
TodoWidget._sync()              // JSON.stringify(tasks) → localStorage key "tdl_tasks"
TodoWidget._render()            // Full re-render of #todo-list from tasks[]
```

DOM targets: `#todo-form`, `#todo-input`, `#todo-error`, `#todo-list`.

Each task row is identified by a `data-id` attribute set to `task.id`.

### QuickLinksWidget

In-memory state: `links[]` — ordered array of QuickLink objects.

```js
QuickLinksWidget.init()         // Loads from localStorage; renders panel; mounts form handler
QuickLinksWidget._add(label, url)   // Validates; appends; syncs; re-renders
QuickLinksWidget._delete(id)        // Removes; syncs; re-renders
QuickLinksWidget._sync()            // → localStorage key "tdl_links"
QuickLinksWidget._render()          // Full re-render of #quick-links-list from links[]
```

DOM targets: `#links-form`, `#links-label-input`, `#links-url-input`, `#links-error`, `#quick-links-list`.

### ThemeWidget

Internal state: `theme` — `"light"` (default) | `"dark"`, loaded from `localStorage` key `"tdl_theme"`.

```js
ThemeWidget.init()              // Reads saved theme (or defaults to "light"); applies data-theme attribute; mounts toggle listener
ThemeWidget._apply(theme)       // Sets data-theme="light"|"dark" on <html>; writes to localStorage key "tdl_theme"
ThemeWidget._toggle()           // Flips between "light" and "dark"; calls _apply()
```

DOM targets: `#theme-toggle` (button in page header).

**Flash prevention:** A minimal inline `<script>` in `<head>` reads `localStorage.getItem("tdl_theme")` synchronously and sets `document.documentElement.setAttribute("data-theme", ...)` before the browser paints. This runs before the main `app.js` loads and before any CSS rules are applied, ensuring no flash of the opposite theme.

CSS theming strategy: all colour and surface values are declared as CSS custom properties on `:root` (light defaults). A `[data-theme="dark"]` block on `:root` or `html` overrides those variables. No JavaScript manipulates individual element styles; every theme change is achieved by toggling the single attribute.

### TodoWidget sort extension

`TodoWidget` gains a `sortOrder` state (string: `"createdAt"` | `"completion"`) in addition to the existing `tasks[]` array.

```js
TodoWidget._setSort(order)      // Validates order value; updates sortOrder; writes to localStorage key "tdl_sort"; calls _render()
TodoWidget._sortedTasks()       // Returns a sorted copy of tasks[] without mutating the source array:
                                //   "createdAt"  → ascending by task.createdAt
                                //   "completion" → incomplete first (preserving insertion order within group), then complete
```

`_render()` now calls `_sortedTasks()` to obtain the display order before building the DOM list. The canonical `tasks[]` array always retains insertion order; sort is applied only at render time.

DOM targets: `#todo-sort-select` (a `<select>` element with two `<option>` values: `"createdAt"` and `"completion"`).

The saved sort order is loaded during `TodoWidget.init()` from localStorage key `"tdl_sort"`. If no value is saved, `sortOrder` defaults to `"createdAt"`.

---

## Data Models

### Task

```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString() fallback
  title:     string,   // 1–200 characters, HTML-escaped before insertion into DOM
  completed: boolean,  // false on creation
  createdAt: number    // Date.now() — used to preserve insertion order after reload
}
```

localStorage key: `"tdl_tasks"` — JSON array of Task objects.

### QuickLink

```js
{
  id:    string,   // crypto.randomUUID() or Date.now().toString() fallback
  label: string,   // 1–50 characters
  url:   string    // must start with "http://" or "https://"
}
```

localStorage key: `"tdl_links"` — JSON array of QuickLink objects.

### Name (GreetingWidget)

```js
// Stored as a plain string directly (not wrapped in an object)
localStorage key: "tdl_name"   // string, 1–50 characters; absent when no name has been saved
```

### Theme (ThemeWidget)

```js
// Stored as a plain string directly
localStorage key: "tdl_theme"  // "light" | "dark"; absent when no preference has been saved (defaults to "light")
```

### Sort Order (TodoWidget)

```js
// Stored as a plain string directly
localStorage key: "tdl_sort"   // "createdAt" | "completion"; absent when no preference saved (defaults to "createdAt")
```

### Validation Rules Summary

| Field         | Rule                                                      |
|---------------|----------------------------------------------------------|
| Task title    | Non-empty after trim; ≤ 200 chars; list must have < 100 tasks |
| Edit title    | Non-empty after trim; ≤ 200 chars                        |
| Link label    | Non-empty after trim; ≤ 50 chars                         |
| Link URL      | Non-empty; starts with `http://` or `https://`           |
| Link count    | ≤ 20 links                                               |
| User name     | Non-empty after trim; ≤ 50 chars                         |
| Sort order    | Must be `"createdAt"` or `"completion"`                  |
| Theme         | Must be `"light"` or `"dark"`                            |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Task localStorage round-trip

*For any* array of valid Task objects serialised to `localStorage` via `TodoWidget._sync()`, parsing the stored JSON must produce an array that is structurally equivalent to the original — same `id`, `title`, `completed`, and `createdAt` values in the same order.

**Validates: Requirements 3.9, 3.10**

### Property 2: Quick-link localStorage round-trip

*For any* array of valid QuickLink objects serialised to `localStorage` via `QuickLinksWidget._sync()`, parsing the stored JSON must produce an array structurally equivalent to the original — same `id`, `label`, and `url` values in the same order.

**Validates: Requirements 4.6, 4.7**

### Property 3: Whitespace and empty titles are always rejected

*For any* string composed entirely of whitespace characters (space, tab, newline, etc.) or the empty string, `TodoWidget._add()` and `TodoWidget._confirmEdit()` must both reject the input and leave the `tasks[]` array unchanged.

**Validates: Requirements 3.1, 3.2, 3.7**

### Property 4: Task list never exceeds the 100-item cap

*For any* add operation attempted against a task list that already contains exactly 100 items, the operation must be rejected and the list length must remain 100, regardless of the title content.

**Validates: Requirements 3.13**

### Property 5: Non-HTTP(S) URLs are always rejected

*For any* URL string that does not begin with `http://` or `https://`, `QuickLinksWidget._add()` must reject it and leave the `links[]` array unchanged.

**Validates: Requirements 4.3**

### Property 6: Quick-links panel never exceeds the 20-item cap

*For any* add operation attempted against a links panel that already contains exactly 20 items, the operation must be rejected and the list length must remain 20, regardless of the label or URL content.

**Validates: Requirements 4.8**

### Property 7: Time-of-day greeting covers all 24 hours without gaps or overlaps

*For any* integer hour in the range [0, 23], `Utils.getGreeting(hour)` must return exactly one of "Good Morning", "Good Afternoon", or "Good Evening" — no hour may return an empty string, `undefined`, or any value outside that set.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 8: Toggle-complete is an involution

*For any* task with an arbitrary initial `completed` value, applying `toggleComplete` twice must return the task to its original `completed` state.

**Validates: Requirements 3.3, 3.4**

### Property 9: `formatTime` always produces a valid HH:MM string

*For any* `Date` object, `Utils.formatTime(date)` must return a string of the form `HH:MM` where HH is in [00, 23] and MM is in [00, 59].

**Validates: Requirements 1.1**

### Property 10: `formatDate` always produces a correctly structured date string

*For any* `Date` object, `Utils.formatDate(date)` must return a string matching the pattern `<Weekday>, <DD> <Month> <YYYY>` where Weekday is a full English day name, Month is a full English month name, DD is a zero-padded two-digit day, and YYYY is the four-digit year.

**Validates: Requirements 1.2**

### Property 11: Timer display formatter always produces a valid MM:SS string

*For any* integer number of remaining seconds in [0, 1500] (the full 25-minute range), the timer display formatter must return a string of the form `MM:SS` where both components are zero-padded and the value correctly represents the input seconds.

**Validates: Requirements 2.7**

### Property 12: Custom name localStorage round-trip

*For any* valid name string (non-empty after trim, ≤ 50 characters), writing it to `localStorage` via `GreetingWidget._saveName()` and then reading it back must produce a value equal to the original name.

**Validates: Requirements 7.5, 7.6**

### Property 13: Theme preference localStorage round-trip

*For any* theme value in `{"light", "dark"}`, writing it to `localStorage` via `ThemeWidget._apply()` and then reading it back must produce the same theme identifier.

**Validates: Requirements 8.4, 8.5**

### Property 14: Sort stability

*For any* array of Task objects:

- When sorted by **"Completion Status"**, every incomplete task (`completed === false`) must appear before every complete task (`completed === true`), and the relative insertion order (by `createdAt`) must be preserved within each group.
- When sorted by **"Creation Date"**, tasks must appear in ascending `createdAt` order, and no task may be omitted or duplicated.

**Validates: Requirements 9.2, 9.3, 9.8**

---

## Error Handling

### localStorage Unavailable on Load

If `localStorage.getItem` throws or returns unparseable JSON, the widget catches the error, initialises from an empty array, and renders an inline error banner (e.g., "Saved tasks could not be loaded."). The session continues normally; writes are attempted on subsequent mutations and silently dropped if storage remains unavailable.

### localStorage Quota Exceeded on Write

`Utils.storage.set` wraps every `setItem` call in a try/catch. If `QuotaExceededError` is thrown, the error is caught silently — the in-memory state is already correct, and the user's current session is unaffected. A future enhancement could surface a toast warning, but it is not in scope for this version.

### Invalid Input (Forms)

All validation runs client-side before any state mutation. On failure:
- The submission is cancelled.
- An inline `<p>` element with class `error-msg` renders beneath the form input with a human-readable message.
- The input field retains its current value and focus.
- No state change occurs and no localStorage write is made.

### Timer Edge Cases

- Activating Start while the timer is RUNNING is a no-op (the event listener checks state before acting).
- Activating Reset while RUNNING is blocked by the disabled attribute on the Reset button.
- If `setInterval` fires slightly late (tab backgrounded), the countdown resumes from the in-memory remaining value, not from wall time, so it may run slow in background tabs — this is acceptable and consistent with browser throttling behaviour.

### XSS Prevention

Task titles and Quick Link labels are stored as plain strings. When inserting into the DOM, `Utils.escapeHtml()` converts `<`, `>`, `&`, `"`, and `'` to their HTML entities. URLs are validated to start with `http://` or `https://`, preventing `javascript:` protocol injection. User names are stored as plain strings and HTML-escaped before DOM insertion via the same mechanism.

### Theme Flash Prevention

If the inline `<script>` in `<head>` encounters a `localStorage` read error (e.g., storage is blocked in a sandboxed context), it silently falls back to `"light"` without throwing. This guarantees the page always renders with a valid theme even when storage is unavailable.

---

## Testing Strategy

### Approach

Because this feature has no pure algorithmic core that can be driven by an arbitrary input generator — most logic is UI event handling, timer state transitions, and localStorage I/O — the primary testing tools are:

- **Example-based unit tests** for validation functions and the `Utils` helpers (run in a Node.js environment with a `localStorage` mock).
- **Property-based tests** for the small set of pure or near-pure functions identified in the Correctness Properties section above (`Utils.getGreeting`, `_sync`/parse round-trips, validation boundary conditions, and toggle involution).
- **Example-based integration tests** (manual or with a headless browser like Playwright) for full end-to-end widget interactions.

### Property-Based Testing

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript, runs in Node.js, well-maintained, no build step needed for test scripts).

**Minimum iterations:** 100 per property test.

**Tag format:** Each test file comment references the design property:
`// Feature: todo-life-dashboard, Property N: <property_text>`

| Design Property | Test description | Generator strategy |
|---|---|---|
| P1 — Task round-trip | Serialise array → parse → compare | `fc.array(fc.record({id, title, completed, createdAt}))` |
| P2 — QuickLink round-trip | Serialise array → parse → compare | `fc.array(fc.record({id, label, url}))` |
| P3 — Whitespace/empty rejection | All-whitespace and empty strings rejected from add and edit | `fc.stringMatching(/^\s*$/)` |
| P4 — Task cap at 100 | Adds beyond 100 rejected | `fc.string({minLength:1, maxLength:200})` with list pre-filled to 100 |
| P5 — URL scheme rejection | Non-HTTP(S) URLs rejected | `fc.string().filter(s => !/^https?:\/\//i.test(s))` |
| P6 — Link cap at 20 | Adds beyond 20 rejected | valid `fc.record({label, url})` with list pre-filled to 20 |
| P7 — Greeting completeness | Every hour 0–23 returns one valid greeting | `fc.integer({min:0, max:23})` |
| P8 — Toggle involution | Double-toggle restores state | `fc.boolean()` (initial completed value) |
| P9 — `formatTime` format | Any Date produces valid HH:MM | `fc.date()` |
| P10 — `formatDate` format | Any Date produces valid "Weekday, DD Month YYYY" | `fc.date()` |
| P11 — Timer display format | Any seconds 0–1500 produces valid MM:SS | `fc.integer({min:0, max:1500})` |
| P12 — Name round-trip | Save name → read back → same value | `fc.string({minLength:1, maxLength:50}).filter(s => s.trim().length > 0)` |
| P13 — Theme round-trip | Save theme → read back → same value | `fc.constantFrom("light", "dark")` |
| P14 — Sort stability | Any task array sorted by completion places incomplete before complete with stable relative order; sorted by createdAt yields ascending order | `fc.array(fc.record({id: fc.uuid(), title: fc.string({minLength:1}), completed: fc.boolean(), createdAt: fc.integer({min:0})}))` |

### Unit Tests (Example-Based)

Cover the following concrete scenarios:

- `Utils.formatTime` formats midnight as "00:00" and noon as "12:00".
- `Utils.formatDate` outputs the correct weekday and month name.
- Timer transitions: IDLE → RUNNING → PAUSED → RUNNING → DONE → IDLE.
- Reset from RUNNING is blocked (button disabled); Reset from PAUSED works.
- Task add with exactly 200 characters succeeds; 201 characters is rejected.
- Task add with 100 items in list is rejected with the cap message.
- Edit cancel restores the original title.
- Quick Link add with `http://` and `https://` succeeds; `ftp://` and `javascript:` are rejected.
- Quick Links cap: 20th link succeeds, 21st is rejected.

**New unit tests for Requirements 7, 8, 9:**

- `Utils.formatGreeting(hour, name)` returns `"Good Morning, Alex"` at hour 8 with name `"Alex"`.
- `Utils.formatGreeting(hour, "")` returns `"Good Morning"` (no trailing comma or space).
- `GreetingWidget._saveName("")` and `GreetingWidget._saveName("   ")` both reject with an inline error message.
- `GreetingWidget._saveName("A".repeat(51))` is rejected; `"A".repeat(50)` is accepted.
- `ThemeWidget._apply("dark")` sets `data-theme="dark"` on `<html>`; `_apply("light")` sets `data-theme="light"`.
- `ThemeWidget._toggle()` from `"light"` produces `"dark"`; `_toggle()` from `"dark"` produces `"light"`.
- `TodoWidget._sortedTasks()` with `sortOrder = "completion"` returns all incomplete tasks before all complete tasks.
- `TodoWidget._sortedTasks()` with `sortOrder = "createdAt"` returns tasks ordered by ascending `createdAt`.
- `TodoWidget._setSort("completion")` persists `"completion"` to `localStorage` key `"tdl_sort"`.

### Integration / End-to-End Tests (Manual Checklist)

Run against `index.html` opened as a local file in Chrome, Firefox, Edge, and Safari:

1. Reload page — greeting updates, tasks reload, links reload.
2. Add a task, close tab, reopen — task persists.
3. Complete, edit, and delete a task — UI updates and localStorage reflects state.
4. Start timer — counts down; Stop pauses; Reset returns to 25:00.
5. Let timer reach 00:00 — notification appears; Reset clears it.
6. Add and delete quick links — buttons appear/disappear; clicking opens new tab.
7. No uncaught exceptions in browser console during any above interaction.

**New integration checks for Requirements 7, 8, 9:**

8. Enter a name in the greeting widget — greeting updates to "[Greeting], [Name]"; close tab, reopen — personalized greeting persists.
9. Submit an empty name — validation message appears; greeting unchanged.
10. Toggle theme to dark — all widgets switch to dark theme within 100 ms; close tab, reopen — dark theme applied immediately with no flash.
11. Toggle theme back to light — all widgets switch to light theme.
12. Change sort to "Completion Status" — completed tasks move below incomplete tasks; close tab, reopen — sort preference restored.
13. Add a task while "Completion Status" sort is active — task list re-applies the sort order after the addition.
