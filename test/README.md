# Test Environment

This directory contains browser-based tests and debugging tools for the GPS PWA.

## Structure

```text
test/
├── README.md
├── index.html
└── gps-test.js
```

The test environment is kept separate from the application source in `src/`.

### Local Testing

`index.html` provides the local browser test environment and can be served through the project's Node development server.

```text
test/index.html
    └── gps-test.js
```

## Mobile / HTTPS Debug Environment

Physical mobile devices require a secure context (`HTTPS`) for browser APIs such as Geolocation.

To avoid requiring local certificates or additional development software, the test environment is also maintained in CodePen for mobile device testing.

### Debug

**GPS Test — CodePen**

https://codepen.io/editor/RJLeyra/debug/01a045db-86be-77c3-814c-56c8e1f06d09

The CodePen debug environment follows the same basic structure as this directory:

```text
test/
├── index.html
└── gps-test.js
```

CodePen is used specifically as an HTTPS testing environment for physical mobile devices. Tests developed there can subsequently be brought back into this directory and integrated into the application.

## Purpose

The test environment is intended for:

* GPS / Geolocation API testing
* Mobile browser testing
* Device permission testing
* Browser hardware API experiments
* Debugging before integration into `src/`
