// The interface language follows the browser when none is chosen, and jsdom reports en-US.
// Tests run in Romanian, the default; the English and Hungarian ones provide their language.
Object.defineProperty(window.navigator, 'languages', { value: ['ro-RO'], configurable: true });
