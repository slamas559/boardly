// Which section of the equation panel is open ("values", "type", "templates", "keys", or null).
// Shared so the board can ask for one: a new formula opens on "type".
let open = null;
const listeners = new Set();

export function requestEquationSection(name) {
  open = name;
  listeners.forEach((fn) => fn());
}
export const subscribeEquationSection = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getEquationSection = () => open;
