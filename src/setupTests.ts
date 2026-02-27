import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill for HTMLDialogElement in JSDOM environment
if (typeof window !== 'undefined' && window.HTMLDialogElement && !window.HTMLDialogElement.prototype.showModal) {
  window.HTMLDialogElement.prototype.show = function() {
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.showModal = function() {
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.close = function() {
    this.removeAttribute('open');
  };
}

// Polyfill for Popover API in JSDOM environment
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function() {
    this.style.display = 'block';
  };
  HTMLElement.prototype.hidePopover = function() {
    this.style.display = 'none';
  };
}
