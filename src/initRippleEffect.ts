const IN_EVENTS = ["pointerdown", "touchstart"];

const OUT_EVENTS = [
  "pointerup",
  "mouseleave",
  "dragleave",
  "touchmove",
  "touchend",
  "touchcancel",
];

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

    if (color) el.style.setProperty("--ripple-color", color);
    if (duration) el.style.setProperty("--ripple-duration", `${duration}s`);
    if (max) maxRadius = Number(max);

    el.dataset.rippleCenter = center === "true" ? "true" : "false";
  };

  applyOptions();

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

    el.appendChild(ripple);

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
