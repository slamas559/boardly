// Keeps a floating panel (menu, popover, picker) fully on screen. Panels are placed next to the button that opens
// them, which on a narrow phone can push one past the screen edge, where it is cut off, or under the notch or
// rounded corners. This slides the panel back inside the visible area (and caps its width) whenever it opens or
// the screen changes size, for example when a phone is rotated or the on-screen keyboard appears.
import { useLayoutEffect } from "react";

let probe = null;
// The space the phone itself takes at each edge (notch, rounded corners, home bar), in pixels
function safeInsets() {
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;"
      + "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
  }
  const style = getComputedStyle(probe);
  return {
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
  };
}

/**
 * How to move a box (its left edge, right edge) so it sits between minX and maxX: the sideways shift to apply and,
 * when the box is wider than the space, the width to cap it at.
 */
export function fitHorizontally({ left, right }, minX, maxX) {
  const space = Math.max(120, Math.floor(maxX - minX));
  const width = right - left;
  const cap = width > space ? space : null;
  const newRight = cap ? left + cap : right;
  let dx = 0;
  if (left < minX) dx = minX - left;
  else if (newRight > maxX) dx = maxX - newRight;
  return { dx, cap };
}

export function useKeepOnScreen(ref, active = true, margin = 8) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return undefined;

    const fit = () => {
      el.style.translate = "";
      el.style.maxWidth = "";
      const inset = safeInsets();
      const viewport = window.visualViewport;
      const minX = inset.left + margin;
      const maxX = (viewport ? viewport.offsetLeft + viewport.width : window.innerWidth) - inset.right - margin;
      const first = el.getBoundingClientRect();
      const { cap } = fitHorizontally(first, minX, maxX);
      if (cap) el.style.maxWidth = `${cap}px`;
      const { dx } = fitHorizontally(el.getBoundingClientRect(), minX, maxX);
      if (Math.abs(dx) >= 0.5) el.style.translate = `${Math.round(dx)}px 0`;
    };

    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    observer?.observe(el);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      observer?.disconnect();
      el.style.translate = "";
      el.style.maxWidth = "";
    };
  }, [ref, active, margin]);
}
