// Feature: todo-life-dashboard, Unit Tests for QuickLinksWidget

/**
 * Unit tests for the QuickLinksWidget pure logic.
 *
 * Run: node tests/links.test.js
 *
 * Validates: Requirements 4.1, 4.3, 4.5, 4.8
 *
 * The QuickLinksWidget lives inside an IIFE and depends on DOM elements and
 * localStorage. The pure logic is re-declared inline here (kept in sync
 * with js/app.js), and minimal DOM + localStorage mocks are provided.
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Minimal localStorage mock
// ---------------------------------------------------------------------------

const localStorageStore = {};

global.localStorage = {
  getItem: function (key) {
    return Object.prototype.hasOwnProperty.call(localStorageStore, key)
      ? localStorageStore[key]
      : null;
  },
  setItem: function (key, value) {
    localStorageStore[key] = value;
  },
  removeItem: function (key) {
    delete localStorageStore[key];
  },
  clear: function () {
    Object.keys(localStorageStore).forEach(function (k) {
      delete localStorageStore[k];
    });
  },
};

// ---------------------------------------------------------------------------
// Minimal DOM mock
// ---------------------------------------------------------------------------

const domElements = {};

function resetDom() {
  localStorage.clear();
  Object.keys(domElements).forEach(function (k) { delete domElements[k]; });
  domElements['quick-links-list'] = createMockElement('quick-links-list');
  domElements['links-error']      = createMockElement('links-error');
  domElements['links-form']       = createMockElement('links-form');
  domElements['links-label-input']= createMockElement('links-label-input');
  domElements['links-url-input']  = createMockElement('links-url-input');
}

function createMockElement(id) {
  return {
    id: id,
    textContent: '',
    innerHTML: '',
    value: '',
    children: [],
    addEventListener: function (evt, fn) {},
    appendChild: function (child) { this.children.push(child); },
  };
}

global.document = {
  getElementById: function (id) {
    return domElements[id] || null;
  },
  createElement: function (tag) {
    return {
      tag: tag,
      type: '',
      textContent: '',
      innerHTML: '',
      href: '',
      target: '',
      rel: '',
      className: '',
      children: [],
      listeners: {},
      addEventListener: function (evt, fn) {
        this.listeners[evt] = fn;
      },
      appendChild: function (child) { this.children.push(child); },
    };
  },
};

// ---------------------------------------------------------------------------
// Utils stub (only the parts QuickLinksWidget uses)
// ---------------------------------------------------------------------------

var Utils = {
  storage: {
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
      } catch (e) { /* swallow */ }
    },
  },
  escapeHtml: function (str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
};

// ---------------------------------------------------------------------------
// QuickLinksWidget logic — re-declared from js/app.js.
// Keep in sync with the source file.
// Returns a fresh isolated instance so each test is independent.
// ---------------------------------------------------------------------------

function createQuickLinksWidget() {
  var links = [];

  function generateId() {
    return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString() + Math.random().toString(36).slice(2);
  }

  function showError(message) {
    var errorEl = document.getElementById('links-error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function _sync() {
    Utils.storage.set('tdl_links', links);
  }

  function _render() {
    var list = document.getElementById('quick-links-list');
    if (!list) return;
    list.innerHTML = '';
    list.children = [];
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var li = document.createElement('li');
      var anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.innerHTML = Utils.escapeHtml(link.label);
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
      list.children.push(li);
    }
  }

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

  function _delete(id) {
    links = links.filter(function (l) { return l.id !== id; });
    _sync();
    _render();
  }

  return {
    _add:     _add,
    _delete:  _delete,
    _sync:    _sync,
    _render:  _render,
    getLinks: function () { return links; },
  };
}

// ---------------------------------------------------------------------------
// Lightweight test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function run(name, fn) {
  resetDom();
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
// Test 1 — Add with http:// succeeds
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------

console.log('\nURL scheme validation — accepted schemes');

run('add with http:// succeeds — list has 1 item, no error', function () {
  var widget = createQuickLinksWidget();
  widget._add('Google', 'http://google.com');
  var links = widget.getLinks();
  assert.strictEqual(links.length, 1, 'Expected 1 link after valid http:// add');
  assert.strictEqual(domElements['links-error'].textContent, '',
    'Expected no error message after valid add');
});

// ---------------------------------------------------------------------------
// Test 2 — Add with https:// succeeds
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------

run('add with https:// succeeds — list has 1 item, no error', function () {
  var widget = createQuickLinksWidget();
  widget._add('GitHub', 'https://github.com');
  var links = widget.getLinks();
  assert.strictEqual(links.length, 1, 'Expected 1 link after valid https:// add');
  assert.strictEqual(domElements['links-error'].textContent, '',
    'Expected no error message after valid add');
});

// ---------------------------------------------------------------------------
// Test 3 — ftp:// is rejected
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

console.log('\nURL scheme validation — rejected schemes');

run('ftp:// URL is rejected — list stays empty, error contains "http"', function () {
  var widget = createQuickLinksWidget();
  widget._add('FTP', 'ftp://files.example.com');
  var links = widget.getLinks();
  assert.strictEqual(links.length, 0, 'Expected 0 links after ftp:// add');
  var errorText = domElements['links-error'].textContent;
  assert.ok(errorText.length > 0, 'Expected a non-empty error message');
  assert.ok(errorText.toLowerCase().includes('http'),
    'Expected error to mention "http", got: ' + errorText);
});

// ---------------------------------------------------------------------------
// Test 4 — javascript: is rejected
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

run('javascript: URL is rejected — list stays empty, error shown', function () {
  var widget = createQuickLinksWidget();
  widget._add('XSS', 'javascript:alert(1)');
  var links = widget.getLinks();
  assert.strictEqual(links.length, 0, 'Expected 0 links after javascript: add');
  var errorText = domElements['links-error'].textContent;
  assert.ok(errorText.length > 0, 'Expected a non-empty error message');
});

// ---------------------------------------------------------------------------
// Test 5 — 20th link succeeds
// Validates: Requirements 4.8
// ---------------------------------------------------------------------------

console.log('\nList capacity — 20-item boundary');

run('20th link succeeds — list has 20 items after add', function () {
  var widget = createQuickLinksWidget();
  // Pre-fill with 19 links.
  for (var i = 0; i < 19; i++) {
    widget._add('Link ' + i, 'https://example.com/' + i);
  }
  assert.strictEqual(widget.getLinks().length, 19, 'Pre-fill should produce exactly 19 links');

  widget._add('Last', 'https://last.com');
  assert.strictEqual(widget.getLinks().length, 20,
    'Expected 20 links after adding the 20th item');
  assert.strictEqual(domElements['links-error'].textContent, '',
    'Expected no error when adding the 20th link');
});

// ---------------------------------------------------------------------------
// Test 6 — 21st link is rejected
// Validates: Requirements 4.8
// ---------------------------------------------------------------------------

run('21st link is rejected — list stays at 20, error mentions limit', function () {
  var widget = createQuickLinksWidget();
  // Pre-fill with 20 links.
  for (var i = 0; i < 20; i++) {
    widget._add('Link ' + i, 'https://example.com/' + i);
  }
  assert.strictEqual(widget.getLinks().length, 20, 'Pre-fill should produce exactly 20 links');

  widget._add('Over', 'https://over.com');
  assert.strictEqual(widget.getLinks().length, 20,
    'Expected list to stay at 20 after rejected add');

  var errorText = domElements['links-error'].textContent;
  var mentionsLimit = errorText.includes('20')
    || errorText.toLowerCase().includes('maximum')
    || errorText.toLowerCase().includes('limit');
  assert.ok(mentionsLimit,
    'Expected error to mention "20", "maximum", or "limit", got: ' + errorText);
});

// ---------------------------------------------------------------------------
// Test 7 — Delete removes correct link
// Validates: Requirements 4.5
// ---------------------------------------------------------------------------

console.log('\nDelete behaviour');

run('_delete removes the correct link — remaining item is the second one', function () {
  var widget = createQuickLinksWidget();
  widget._add('Alpha', 'https://alpha.com');
  widget._add('Beta',  'https://beta.com');

  var links = widget.getLinks();
  assert.strictEqual(links.length, 2, 'Setup: expected 2 links');

  var firstId  = links[0].id;
  var secondId = links[1].id;

  widget._delete(firstId);

  var remaining = widget.getLinks();
  assert.strictEqual(remaining.length, 1, 'Expected 1 link after deleting the first');
  assert.strictEqual(remaining[0].id, secondId,
    'Remaining link should be the second one (Beta)');
  assert.strictEqual(remaining[0].label, 'Beta',
    'Remaining link label should be "Beta"');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed\n');
if (failed > 0) {
  process.exit(1);
}
