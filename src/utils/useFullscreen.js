// Full screen for the whole app (browser tabs and address bar disappear; Esc leaves).
// `active` follows the browser's real state, so leaving with Esc updates the button too.
import { useCallback, useEffect, useState } from "react";

const fullscreenElement = () => (typeof document === "undefined" ? null : document.fullscreenElement || document.webkitFullscreenElement || null);

export function useFullscreen({ hotkey = true } = {}) {
  const supported = typeof document !== "undefined" && Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const [active, setActive] = useState(() => Boolean(fullscreenElement()));

  useEffect(() => {
    const sync = () => setActive(Boolean(fullscreenElement()));
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (fullscreenElement()) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const el = document.documentElement;
        const request = el.requestFullscreen || el.webkitRequestFullscreen;
        await request.call(el, { navigationUI: "hide" });
      }
    } catch { /* the browser refused (no user gesture, or blocked by policy): stay as we are */ }
  }, []);

  // "F" toggles it, unless the person is typing
  useEffect(() => {
    if (!hotkey || !supported) return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "f" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, supported, toggle]);

  return { supported, active, toggle };
}
