import { vi } from "vitest";

type Listener = (event: MediaQueryListEvent) => void;

const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<Listener>();
let prefersDark = false;

function createMediaQueryList(query: string): MediaQueryList {
  return {
    get matches() {
      return query === MEDIA_QUERY ? prefersDark : false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as Listener);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as Listener);
    },
    addListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null) => {
      if (listener) {
        listeners.add(listener);
      }
    },
    removeListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null) => {
      if (listener) {
        listeners.delete(listener);
      }
    },
    dispatchEvent: (event) => {
      listeners.forEach((listener) => listener(event as MediaQueryListEvent));
      return true;
    },
  };
}

export function installMatchMediaMock() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => createMediaQueryList(query)),
  });
}

export function setMatchMediaTheme(theme: "light" | "dark") {
  prefersDark = theme === "dark";
  const event = {
    matches: prefersDark,
    media: MEDIA_QUERY,
  } as MediaQueryListEvent;

  listeners.forEach((listener) => listener(event));
}

export function resetMatchMediaMock() {
  prefersDark = false;
  listeners.clear();
}
