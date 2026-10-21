// Puts the name of the page (or of the session you are in) on the browser tab, and puts it back when you leave.
import { useEffect } from "react";

const BASE = "Boardly";

export default function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${BASE}` : previous;
    return () => { document.title = previous; };
  }, [title]);
}
