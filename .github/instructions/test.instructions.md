---
applyTo: "**/*.test.ts,**/*.spec.ts,**/*.test.js,**/*.spec.js"
---

# Unit test instructions

## General

- Test framework is [Vitest](https://vitest.dev/).
- [jsdom](https://github.com/jsdom/jsdom) is used as the test environment.
- [Sinon](https://github.com/sinonjs/sinon) is used for mocking, spying and stubs.
- Use `describe` to group related tests.
