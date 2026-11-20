# Requirements Document

## Introduction

The Todo Life Dashboard is a personal productivity web application built with HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser using Local Storage for persistence, with no backend, frameworks, or build tools required. The dashboard provides four core features on a single page: a time-aware greeting, a Pomodoro-style focus timer, a full-featured to-do list, and a quick links panel. The goal is a clean, fast, and self-contained tool a user can open directly in any modern browser.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Timer**: The Pomodoro-style countdown component that tracks a 25-minute focus session.
- **Task**: A user-created to-do item with a title, completion state, and optional edit capability.
- **Task_List**: The collection of Tasks displayed and managed on the Dashboard.
- **Quick_Link**: A user-defined shortcut consisting of a label and a URL.
- **Quick_Links_Panel**: The UI section that displays and manages Quick_Links.
- **Local_Storage**: The browser's `localStorage` Web API used for client-side data persistence.
- **Greeting_Widget**: The UI section that displays the current time, date, and time-of-day greeting.
- **Session**: A single uninterrupted 25-minute Timer countdown.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I have immediate situational awareness and a welcoming experience.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in 24-hour HH:MM format, updated at the start of each new minute.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, DD Month YYYY" (e.g., Monday, 16 June 2025).
3. WHEN the local time is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local time is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local time is between 18:00 and 23:59, or between 00:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the Dashboard page loads, THE Greeting_Widget SHALL display the correct time, date, and greeting within 1 second, without requiring user interaction.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can structure my work into focused Pomodoro sessions.

#### Acceptance Criteria

1. THE Timer SHALL initialize with a countdown value of 25 minutes and 00 seconds (25:00).
2. WHEN the user activates the Start control and the Timer is not currently running, THE Timer SHALL begin counting down one second per second.
3. WHEN the Timer is running and the user activates the Stop control, THE Timer SHALL pause at the current remaining time.
4. WHEN the Timer is paused and the user activates the Start control, THE Timer SHALL resume countdown from the paused remaining time.
5. WHEN the user activates the Reset control, THE Timer SHALL stop any active countdown and return the display to 25:00.
6. WHEN the Timer reaches 00:00, THE Timer SHALL stop counting and display a visible notification indicating the Session has ended.
7. THE Timer SHALL display the remaining time in MM:SS format while running, paused, and after reaching 00:00.
8. WHILE the Timer is running, THE Timer SHALL disable the Reset control.
9. IF the user activates the Start control while the Timer is already running, THEN THE Timer SHALL ignore the input and continue the current countdown without interruption.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, complete, and delete tasks that persist across browser sessions, so that I can track my work without losing progress when I close the tab.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task title of at most 200 characters, THE Task_List SHALL add the new Task and display it immediately.
2. IF the user attempts to submit an empty task title, THEN THE Task_List SHALL reject the submission and display an inline validation message.
3. WHEN the user marks a Task as complete, THE Task_List SHALL apply a visual completed style (strikethrough text) to that Task.
4. WHEN the user marks a completed Task as incomplete, THE Task_List SHALL remove the completed style from that Task.
5. WHEN the user activates the edit control on a Task, THE Task_List SHALL replace the Task title with an editable input field pre-filled with the current title.
6. WHEN the user confirms an edit with a non-empty title of at most 200 characters, THE Task_List SHALL update the Task title and return to display mode.
7. IF the user confirms an edit with an empty title, THEN THE Task_List SHALL reject the edit and retain the previous Task title.
8. WHEN the user activates the delete control on a Task, THE Task_List SHALL remove that Task from the list.
9. WHEN any Task is added, updated, completed, or deleted, THE Task_List SHALL write the full current Task_List state to Local_Storage within 500 milliseconds.
10. WHEN the Dashboard page loads, THE Task_List SHALL read all previously saved Tasks from Local_Storage and render them in insertion order with their saved completion state.
11. IF Local_Storage is unavailable or returns a read error when the Dashboard page loads, THEN THE Task_List SHALL render an empty task list and display an error message indicating that saved tasks could not be loaded.
12. WHEN the user cancels an active edit, THE Task_List SHALL discard all changes and return the Task to display mode with the original title unchanged.
13. IF the Task_List already contains 100 Tasks and the user attempts to submit a new task title, THEN THE Task_List SHALL reject the submission and display a message indicating the maximum task limit has been reached.

---

### Requirement 4: Quick Links Panel

**User Story:** As a user, I want to save and manage shortcut links to my favorite websites, so that I can open them quickly without leaving the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a Quick_Link with a non-empty label of 1–50 characters and a URL that begins with `http://` or `https://`, THE Quick_Links_Panel SHALL add the Quick_Link and display it as a clickable button immediately.
2. IF the user attempts to submit a Quick_Link with an empty label or empty URL, THEN THE Quick_Links_Panel SHALL reject the submission and display an inline validation message.
3. IF the user attempts to submit a Quick_Link with a URL that does not begin with `http://` or `https://`, THEN THE Quick_Links_Panel SHALL reject the submission and display an inline validation message describing the expected format.
4. WHEN the user activates a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
5. WHEN the user activates the delete control on a Quick_Link, THE Quick_Links_Panel SHALL remove that Quick_Link.
6. WHEN any Quick_Link is added or deleted, THE Quick_Links_Panel SHALL write the full current Quick_Link collection to Local_Storage within 100 milliseconds.
7. WHEN the Dashboard page loads, THE Quick_Links_Panel SHALL read all previously saved Quick_Links from Local_Storage and render them as clickable buttons.
8. THE Quick_Links_Panel SHALL accept no more than 20 Quick_Links; IF the user attempts to add a Quick_Link when 20 already exist, THEN THE Quick_Links_Panel SHALL reject the submission and display an inline message indicating the limit has been reached.

---

### Requirement 5: Single-File Architecture and Technical Constraints

**User Story:** As a developer, I want the project to follow a strict single-file-per-type structure with no build tools or frameworks, so that the codebase stays simple, readable, and deployable by opening one HTML file.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using exactly one HTML file, one CSS file located in `css/`, and one JavaScript file located in `js/`.
2. THE Dashboard SHALL function correctly when opened directly in a modern browser as a local file without a web server.
3. THE Dashboard SHALL operate without any external JavaScript frameworks, CSS preprocessors, or build tools.
4. THE Dashboard SHALL store and retrieve all persistent data exclusively using the browser Local_Storage API, with no network requests for data persistence.
5. WHERE Chrome, Firefox, Edge, or Safari is used, THE Dashboard SHALL render and function with no missing or overlapping layout elements and with no uncaught JavaScript exceptions logged to the browser console.

---

### Requirement 6: Performance and Visual Design

**User Story:** As a user, I want the Dashboard to load instantly and respond without lag, with a clean and readable visual design, so that it feels like a lightweight native tool rather than a heavy web app.

#### Acceptance Criteria

1. THE Dashboard SHALL complete its initial render within 2 seconds when opened as a local file on a machine with at least a dual-core 1.6 GHz CPU and 4 GB RAM running a supported browser.
2. WHEN the user interacts with any control (add, delete, edit, start timer, etc.), THE Dashboard SHALL reflect the change in the UI within 100 milliseconds.
3. THE Dashboard SHALL apply text styling using no more than two font families across all widgets.
4. THE Dashboard SHALL apply text and background colors such that every text element meets a contrast ratio of at least 4.5:1 against its background, as defined by WCAG 2.1 AA.
5. THE Dashboard SHALL use a layout that organizes the four widgets (Greeting_Widget, Timer, Task_List, Quick_Links_Panel) such that each widget is enclosed in a visually distinct container separated from adjacent widgets by a visible margin or border.
