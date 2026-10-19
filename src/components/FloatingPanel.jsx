// A panel that floats next to the control that opened it and always stays fully on screen, on any phone.
import { useRef } from "react";
import { useKeepOnScreen } from "../utils/useKeepOnScreen.js";

export default function FloatingPanel({ className = "", children, ...rest }) {
  const ref = useRef(null);
  useKeepOnScreen(ref);
  return (
    <div ref={ref} className={`float-panel ${className}`} {...rest}>
      {children}
    </div>
  );
}
