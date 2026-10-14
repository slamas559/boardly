// On-screen math keyboard for equation blocks. Six tabs (numbers, letters, functions, Greek, symbols,
// ready-made formulas) with 40px keys so it is comfortable on a phone and compact in the desktop dock.
// Keys never take focus from the formula field, so the caret stays where it was.
import { useState } from "react";
import { ArrowBigUp } from "lucide-react";
import { KEYS, KEY_TABS, LETTERS } from "./mathKeys.js";

const keepFocus = (e) => e.preventDefault();

const KEY_BASE = "flex h-10 min-w-0 select-none items-center justify-center rounded-md border px-1 text-[15px] leading-none transition-colors active:scale-[0.97]";
const TONES = {
  normal: "border-line bg-white text-ink hover:bg-sunken active:bg-accent-soft",
  control: "border-transparent bg-sunken text-gray-700 hover:bg-line active:bg-line-strong",
  active: "border-accent bg-accent-soft text-accent",
};

function Key({ item, onPress, className = "" }) {
  return (
    <button
      type="button"
      onPointerDown={keepFocus}
      onClick={() => onPress(item)}
      title={item.title}
      aria-label={item.title || item.label}
      className={`${KEY_BASE} ${TONES[item.tone || "normal"]} ${item.full ? "col-span-6 justify-start px-3 text-left text-sm" : item.wide ? "col-span-2" : ""} ${className}`}
    >
      {item.label}
    </button>
  );
}

export default function MathKeyboard({ onInsert, onAction }) {
  const [tab, setTab] = useState("basic");
  const [shift, setShift] = useState(false);

  const press = (item) => {
    if (item.action) onAction(item.action);
    else onInsert(item.insert);
  };

  const letterKeys = LETTERS.map((letter) => {
    const shown = shift ? letter.toUpperCase() : letter;
    return { label: shown, insert: shown, title: shown };
  });

  return (
    <div className="space-y-2" role="group" aria-label="Math keyboard">
      <div role="tablist" aria-label="Keyboard sections" className="scroll-thin flex gap-1 overflow-x-auto border-b border-line pb-1.5">
        {KEY_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            title={item.title}
            onPointerDown={keepFocus}
            onClick={() => setTab(item.id)}
            className={`h-8 shrink-0 rounded-md px-2.5 text-sm ${tab === item.id ? "bg-ink text-paper" : "text-gray-700 hover:bg-sunken"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {tab === "letters" ? (
          <>
            {letterKeys.map((item) => <Key key={item.label} item={item} onPress={press} className="font-display text-lg italic" />)}
            <button
              type="button"
              onPointerDown={keepFocus}
              onClick={() => setShift((value) => !value)}
              aria-label="Capital letters"
              aria-pressed={shift}
              title="Capital letters"
              className={`${KEY_BASE} ${shift ? TONES.active : TONES.control}`}
            >
              <ArrowBigUp size={18} />
            </button>
            <Key item={{ label: "⌫", action: "backspace", title: "Delete", tone: "control" }} onPress={press} />
            <Key item={{ label: "←", action: "left", title: "Move left", tone: "control" }} onPress={press} />
            <Key item={{ label: "→", action: "right", title: "Move right", tone: "control" }} onPress={press} />
          </>
        ) : (
          KEYS[tab].map((item) => <Key key={`${item.label}-${item.title}`} item={item} onPress={press} />)
        )}
      </div>
      {!["basic", "letters"].includes(tab) && (
        <div className="grid grid-cols-4 gap-1.5">
          <Key item={{ label: "←", action: "left", title: "Move left", tone: "control" }} onPress={press} />
          <Key item={{ label: "→", action: "right", title: "Move right", tone: "control" }} onPress={press} />
          <Key item={{ label: "⇥", action: "next", title: "Next box", tone: "control" }} onPress={press} />
          <Key item={{ label: "⌫", action: "backspace", title: "Delete", tone: "control" }} onPress={press} />
        </div>
      )}
      {tab === "library" && <p className="text-[11px] text-muted">Formulas are added at the cursor, so you can build on them.</p>}
    </div>
  );
}
