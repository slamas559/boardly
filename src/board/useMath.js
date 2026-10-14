// React hook: starts loading the equation engine and re-renders when it (or an image) becomes ready.
import { useEffect, useReducer } from "react";
import { MATH_READY_EVENT, ensureMath, mathReady } from "./mathRender.js";

export function useMathReady() {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    ensureMath();
    window.addEventListener(MATH_READY_EVENT, bump);
    return () => window.removeEventListener(MATH_READY_EVENT, bump);
  }, []);
  return mathReady();
}
