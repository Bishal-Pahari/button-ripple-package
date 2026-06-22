const IN_EVENTS = ["pointerdown", "touchstart"];

const OUT_EVENTS = [
  "pointerup",
  "mouseleave",
  "dragleave",
  "touchmove",
  "touchend",
  "touchcancel",
];

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

function findFurthestPoint(
  clickX: number,
  elWidth: number,
  offsetX: number,
  clickY: number,
  elHeight: number,
  offsetY: number
) {
  const x = clickX - offsetX > elWidth / 2 ? 0 : elWidth;
  const y = clickY - offsetY > elHeight / 2 ? 0 : elHeight;
  return Math.hypot(x - (clickX - offsetX), y - (clickY - offsetY));
}

function attachRipple(el: HTMLElement) {
  let maxRadius = 2000;

  const applyOptions = () => {
    const color = el.dataset.rippleColor;
    const duration = el.dataset.rippleDuration;
    const max = el.dataset.rippleMaxRadius;
    const center = el.dataset.rippleCenter;

    // Only forward a value the browser confirms is a valid CSS color
    if (color && isSafeColor(color)) {
      el.style.setProperty("--ripple-color", color);
    }

    if (duration) {
      const seconds = Number(duration);
      if (Number.isFinite(seconds) && seconds >= 0) {
        el.style.setProperty("--ripple-duration", `${clamp(seconds, 0, 60)}s`);
      }
    }

    if (max) {
      const radius = Number(max);
      if (Number.isFinite(radius) && radius > 0) {
        maxRadius = clamp(radius, 1, 100000);
      }
    }

    el.dataset.rippleCenter = center === "true" ? "true" : "false";
  };

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

  const createRipple = (e: Event) => {
    const rect = el.getBoundingClientRect();
    const pointerEvent = e as PointerEvent | TouchEvent;
    const clientX =
      "clientX" in pointerEvent
        ? pointerEvent.clientX
        : pointerEvent.touches[0]?.clientX ?? 0;
    const clientY =
      "clientY" in pointerEvent
        ? pointerEvent.clientY
        : pointerEvent.touches[0]?.clientY ?? 0;

    const radius = findFurthestPoint(
      clientX,
      el.offsetWidth,
      rect.left,
      clientY,
      el.offsetHeight,
      rect.top
    );

    const ripple = document.createElement("div");
    ripple.className = "ripple";

    let size = radius * 2.5;
    let top = clientY - rect.top - size / 2;
    let left = clientX - rect.left - size / 2;

    if (maxRadius && size > maxRadius * 2) {
      size = maxRadius * 2;
      top = clientY - rect.top - maxRadius;
      left = clientX - rect.left - maxRadius;
    }

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.top = `${top}px`;
    ripple.style.left = `${left}px`;

    ensureContainer().appendChild(ripple);

    const durationMs =
      parseFloat(getComputedStyle(el).getPropertyValue("--ripple-duration")) *
        1000 || 400;

    const fadeDelay = durationMs / 4;

    const removeRipple = () => {
      setTimeout(() => {
        ripple.style.opacity = "0";
      }, fadeDelay);

      setTimeout(() => {
        ripple.remove();
      }, durationMs);
    };

    OUT_EVENTS.forEach((event) =>
      el.addEventListener(event, removeRipple, { once: true })
    );
  };

  IN_EVENTS.forEach((event) => el.addEventListener(event, createRipple));
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

export function initRippleEffect() {
  initializeElements();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;

          if (element.matches && element.matches(RIPPLE_SELECTOR)) {
            attachRippleToElement(element);
          }

          const matches = element.querySelectorAll?.(RIPPLE_SELECTOR);
          matches?.forEach((el) => attachRippleToElement(el as HTMLElement));
        }
      });
    });
  });

  const startObserving = () => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startObserving, {
          once: true,
        });
      } else {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }
    }
  };

  startObserving();

  return () => {
    observer.disconnect();
  };
}
