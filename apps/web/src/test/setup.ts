import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installMatchMediaMock, resetMatchMediaMock } from "@/test/match-media";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock,
    configurable: true,
    writable: true,
  });
}

installMatchMediaMock();

afterEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  resetMatchMediaMock();
  document.cookie = "ui-theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  cleanup();
});
