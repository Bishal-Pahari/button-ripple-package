// Pointer Events cover mouse, touch and pen in one stream. Listening to both
// `pointerdown` and `touchstart` made every tap on a touch screen create two
// ripples, so touch/mouse events are only a fallback for browsers without
// Pointer Events (iOS Safari < 13).
const POINTER_EVENTS = {
  in: ["pointerdown"],
  out: ["pointerup", "pointercancel", "pointerleave", "dragleave"],
};
const LEGACY_EVENTS = {
  in: ["touchstart", "mousedown"],
  out: ["mouseup", "mouseleave", "dragleave", "touchmove", "touchend", "touchcancel"],
};
// Browsers fire emulated mouse events after a touch; ignore those so a tap on
// the legacy path still creates a single ripple.
const EMULATED_MOUSE_WINDOW_MS = 800;
// Must match the `.ripple` opacity transition in styles.css.
const FADE_OUT_MS = 600;
// Fade a ripple out even if no release event ever arrives (e.g. Firefox sends
// no pointer events to a button that disables itself while pressed).
const SAFETY_RELEASE_MS = 10000;
const DEFAULT_MAX_RADIUS = 2000;

// Ripples live inside this clipping container instead of the host element so
// they never inflate the host's scrollHeight (which would break accordions /
// expandables that animate height from a measured scrollHeight).
const RIPPLE_CONTAINER_CLASS = "ripple-container";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Validate a user-supplied color with the browser's own CSS parser so an
// attacker-controlled `data-ripple-color` value cannot be injected verbatim
// into the CSSOM via setProperty. Fail closed (use the default) when we can't
// validate.
const isSafeColor = (value: string) =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("color", value);

// Distance from (x, y) — relative to the element — to its furthest corner.
function findFurthestPoint(x: number, y: number, width: number, height: number) {
  const cornerX = x > width / 2 ? 0 : width;
  const cornerY = y > height / 2 ? 0 : height;
  return Math.hypot(cornerX - x, cornerY - y);
}

function attachRipple(el: HTMLElement) {
  let maxRadius = DEFAULT_MAX_RADIUS;
  // The value this library last wrote for each inline CSS variable, so we
  // only ever remove our own value, never one the app set via `style`.
  const written: Record<string, string | undefined> = {};

  const setVar = (name: string, value: string | null) => {
    const current = el.style.getPropertyValue(name);
    if (value !== null) {
      // Compare with the live inline value (cheap, no layout) rather than a
      // cache, so a value wiped by a framework replacing `style` comes back.
      if (current !== value) el.style.setProperty(name, value);
      written[name] = value;
    } else if (written[name] !== undefined) {
      if (current === written[name]) el.style.removeProperty(name);
      written[name] = undefined;
    }
  };

  // Read on every press (not just once at attach) so data-ripple-* changes
  // made after mount, e.g. by a React re-render, take effect.
  const applyOptions = () => {
    const color = el.dataset.rippleColor;
    const duration = el.dataset.rippleDuration;
    const max = el.dataset.rippleMaxRadius;

    // Only forward a value the browser confirms is a valid CSS color
    setVar("--ripple-color", color && isSafeColor(color) ? color : null);

    const seconds = duration ? Number(duration) : NaN;
    setVar(
      "--ripple-duration",
      Number.isFinite(seconds) && seconds >= 0
        ? `${clamp(seconds, 0, 60)}s`
        : null
    );

    const radius = max ? Number(max) : NaN;
    maxRadius =
      Number.isFinite(radius) && radius > 0
        ? clamp(radius, 1, 100000)
        : DEFAULT_MAX_RADIUS;
  };

  // Also apply at attach: with nested hosts, an inner host's first press
  // runs before the outer host's handler and inherits its variables.
  applyOptions();

  // Lazily create (and re-attach, in case a re-render removed it) the clipping
  // container that holds the ripples.
  let container: HTMLElement | null = null;
  const ensureContainer = () => {
    if (!container || !container.isConnected) {
      container = el.querySelector<HTMLElement>(
        `:scope > .${RIPPLE_CONTAINER_CLASS}`
      );
      if (!container) {
        container = document.createElement("span");
        container.className = RIPPLE_CONTAINER_CLASS;
        container.setAttribute("aria-hidden", "true");
        el.appendChild(container);
      }
    }
    return container;
  };

  const events =
    typeof window.PointerEvent === "function" ? POINTER_EVENTS : LEGACY_EVENTS;
  let lastTouchAt = -Infinity;

  const createRipple = (e: Event) => {
    // Primary button only: a right/middle click opens a context menu or
    // autoscroll that swallows `pointerup`, leaving the ripple stuck.
    if ((e as MouseEvent).button > 0) return;

    if (e.type === "touchstart") {
      lastTouchAt = Date.now();
    } else if (
      e.type === "mousedown" &&
      Date.now() - lastTouchAt < EMULATED_MOUSE_WINDOW_MS
    ) {
      return;
    }

    applyOptions();

    // Do every layout/style read before the DOM write below, so a tap costs
    // one layout pass instead of forcing a second style recalculation.
    // The ripple container covers the padding box, so measure inside the
    // border (client*), not the border box (offset*).
    const rect = el.getBoundingClientRect();
    const width = el.clientWidth;
    const height = el.clientHeight;
    const rawDuration = getComputedStyle(el)
      .getPropertyValue("--ripple-duration")
      .trim();
    const parsedMs =
      parseFloat(rawDuration) * (/ms$/.test(rawDuration) ? 1 : 1000);
    // `0` is a valid duration (instant fade), so don't use `|| 400`.
    const durationMs = Number.isFinite(parsedMs) ? parsedMs : 400;

    // changedTouches[0] is the finger that just landed; touches[0] could be
    // another finger elsewhere on the screen.
    const touch =
      (e as TouchEvent).changedTouches && (e as TouchEvent).changedTouches[0];
    const point = touch || (e as PointerEvent);
    // Centering is computed here rather than with the CSS `translate`
    // property, which older browsers (Chrome < 104, Safari < 14.1) ignore.
    const center = el.dataset.rippleCenter === "true";
    const x = center ? width / 2 : point.clientX - rect.left - el.clientLeft;
    const y = center ? height / 2 : point.clientY - rect.top - el.clientTop;

    const size = Math.min(
      findFurthestPoint(x, y, width, height) * 2.5,
      maxRadius * 2
    );

    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.top = `${y - size / 2}px`;
    ripple.style.left = `${x - size / 2}px`;

    ensureContainer().appendChild(ripple);

    const fadeDelay = durationMs / 4;
    // With two fingers on one element, lifting one must only end its own
    // ripple. Events without a pointerId (dragleave, legacy events) end it too.
    const pointerId = (e as PointerEvent).pointerId;
    let released = false;

    // Runs once per ripple, then detaches all of its listeners. (Previously
    // each ripple left up to five `once` listeners behind, so they piled up
    // with every tap and all fired together on the next mouseleave.)
    const release = (endEvent?: Event) => {
      const endId = endEvent && (endEvent as PointerEvent).pointerId;
      if (released || (endId !== undefined && endId !== pointerId)) return;
      released = true;
      clearTimeout(safetyTimer);
      events.out.forEach((event) => el.removeEventListener(event, release));

      setTimeout(() => {
        ripple.style.opacity = "0";
      }, fadeDelay);
      // Remove only after the fade-out has finished; removing at `durationMs`
      // cut the ripple off half-way through the fade.
      setTimeout(() => {
        ripple.remove();
      }, fadeDelay + FADE_OUT_MS);
    };

    const safetyTimer = setTimeout(release, SAFETY_RELEASE_MS);
    events.out.forEach((event) =>
      el.addEventListener(event, release, { passive: true })
    );
  };

  // `passive` lets the browser start scrolling immediately on touchstart
  // instead of waiting for this handler (matters on low-end phones).
  events.in.forEach((event) =>
    el.addEventListener(event, createRipple, { passive: true })
  );

  // Emulated mouse events follow touchend (plus ~300 ms on old iOS), so a long
  // press could outlast a window measured from touchstart alone.
  if (events === LEGACY_EVENTS) {
    const markTouch = () => {
      lastTouchAt = Date.now();
    };
    el.addEventListener("touchend", markTouch, { passive: true });
    el.addEventListener("touchcancel", markTouch, { passive: true });
  }
}

const RIPPLE_SELECTOR = "[data-ripple-color], .ripple-host";

// Track elements that already have ripple attached to avoid duplicates
const attachedElements = new WeakSet<HTMLElement>();

function attachRippleToElement(el: HTMLElement) {
  if (attachedElements.has(el)) {
    return;
  }
  attachedElements.add(el);
  attachRipple(el);
}

function initializeElements(root: Document | Element = document) {
  root
    .querySelectorAll(RIPPLE_SELECTOR)
    .forEach((el) => attachRippleToElement(el as HTMLElement));
}

// One observer is shared by every initRippleEffect() / useRippleEffect() caller
// (each used to add its own, so N components meant N subtree scans per DOM
// change). It disconnects when the last caller cleans up.
let observer: MutationObserver | null = null;
let activeCallers = 0;

const handleMutations = (mutations: MutationRecord[]) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (element.matches && element.matches(RIPPLE_SELECTOR)) {
          attachRippleToElement(element);
        }

        initializeElements(element);
      }
    });
  });
};

const startObserving = () => {
  // Cleaned up before DOMContentLoaded fired.
  if (!observer) return;
  if (document.body) {
    // Covers init from a <head> script: the first scan found no body yet.
    initializeElements();
    observer.observe(document.body, { childList: true, subtree: true });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserving, {
      once: true,
    });
  } else {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
};

export function initRippleEffect() {
  initializeElements();

  activeCallers++;
  if (!observer) {
    observer = new MutationObserver(handleMutations);
    startObserving();
  }

  let cleanedUp = false;
  return () => {
    // Calling the same cleanup twice must not release another caller's hold.
    if (cleanedUp) return;
    cleanedUp = true;
    activeCallers--;
    if (activeCallers === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}
