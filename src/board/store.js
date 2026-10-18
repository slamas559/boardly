// ObjectStore: the single source of truth for drawn objects on the board or a PDF.
// - Local edits are recorded for undo/redo and reported through `onLocalOps` (to the socket)
// - Remote edits are applied silently
// Mirrors the server's op format: add / update / remove / clear.

import { paintOrder, topLayer } from "./layers.js";

// The server accepts at most 500 ops per message, so big batches (e.g. renumbering layers) are sent in parts
export const chunkOps = (ops, size = 400) => {
  const parts = [];
  for (let i = 0; i < ops.length; i += size) parts.push(ops.slice(i, i + size));
  return parts;
};

// Edits tagged with the same `coalesce` key within this window share one undo step
const COALESCE_WINDOW_MS = 1500;

export class ObjectStore {
  constructor({ onLocalOps } = {}) {
    this.objects = new Map();
    this.version = 0;
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.onLocalOps = onLocalOps || (() => {});
    this._cache = null;
    this.restricted = false; // true for a listener who was let draw
    this.authorKey = null;
  }

  /**
   * Who is drawing here. The host can change anything. A listener the host let draw can add objects (stamped
   * with their own key) and change or remove only those, mirroring what the server accepts.
   */
  setAuthor({ host = true, key = null } = {}) {
    this.restricted = !host;
    this.authorKey = host ? null : key;
  }

  _limitToAuthor(ops) {
    if (!this.restricted) return ops;
    const key = this.authorKey;
    if (!key) return [];
    const out = [];
    for (const op of ops) {
      if (op.op === "add") {
        if (!op.obj || ["paper", "cover", "media"].includes(op.obj.type)) continue;
        out.push({ ...op, obj: { ...op.obj, by: key } });
      } else if (op.op === "update" || op.op === "remove") {
        if (this.objects.get(op.id)?.by === key) out.push(op);
      } // clearing a page is for the host
    }
    return out;
  }

  /* --- subscription (compatible with useSyncExternalStore) --- */
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  _changed() {
    this.version++;
    this._cache = null;
    this.listeners.forEach((fn) => fn());
  }

  list() {
    if (!this._cache) this._cache = [...this.objects.values()];
    return this._cache;
  }
  get(id) {
    return this.objects.get(id);
  }
  onPage(page) {
    return paintOrder(this.list().filter((o) => (o.page ?? 0) === page && o.type !== "paper")); // bottom to top
  }
  /** The highest layer in use on a page; new objects are stacked at this level, on top of what is there. */
  topZ(page) {
    return topLayer(this.onPage(page));
  }
  /** The paper (background pattern) of a page, or undefined for the default dots. */
  paperFor(page) {
    return this.objects.get(`paper-${page}`);
  }

  /** Replace everything (used for the initial room-state sync). Clears history. */
  reset(list = []) {
    this.objects = new Map();
    for (const o of list) if (o && o.id && !o.removed) this.objects.set(o.id, o);
    this.undoStack = [];
    this.redoStack = [];
    this._changed();
  }

  /* --- raw application --- */
  _applyOp(op) {
    switch (op.op) {
      case "add":
        this.objects.set(op.obj.id, op.obj);
        break;
      case "update": {
        const cur = this.objects.get(op.id);
        if (cur) this.objects.set(op.id, { ...cur, ...op.patch });
        break;
      }
      case "remove":
        this.objects.delete(op.id);
        break;
      case "clear":
        for (const [id, o] of this.objects) {
          if (o.type !== "paper" && (op.page === undefined || (o.page ?? 0) === op.page)) this.objects.delete(id);
        }
        break;
      default:
        break;
    }
  }

  /** Compute the ops that would undo `ops`, using the current state. */
  _inverse(ops) {
    const inverse = [];
    // Work on a scratch copy so sequences like add+update invert correctly
    const scratch = new Map(this.objects);
    for (const op of ops) {
      switch (op.op) {
        case "add":
          if (scratch.has(op.obj.id)) inverse.unshift({ op: "update", id: op.obj.id, patch: pick(scratch.get(op.obj.id), Object.keys(op.obj)) });
          else inverse.unshift({ op: "remove", id: op.obj.id });
          scratch.set(op.obj.id, op.obj);
          break;
        case "update": {
          const cur = scratch.get(op.id);
          if (!cur) break;
          inverse.unshift({ op: "update", id: op.id, patch: pick(cur, Object.keys(op.patch)) });
          scratch.set(op.id, { ...cur, ...op.patch });
          break;
        }
        case "remove": {
          const cur = scratch.get(op.id);
          if (!cur) break;
          inverse.unshift({ op: "add", obj: cur });
          scratch.delete(op.id);
          break;
        }
        case "clear": {
          const removed = [];
          for (const [id, o] of scratch) {
            if (o.type !== "paper" && (op.page === undefined || (o.page ?? 0) === op.page)) {
              removed.push({ op: "add", obj: o });
              scratch.delete(id);
            }
          }
          inverse.unshift(...removed);
          break;
        }
        default:
          break;
      }
    }
    return inverse;
  }

  /**
   * Apply a local user action. It is recorded for undo and (unless emit is false)
   * sent to the network. Pass emit:false for things already streamed (live strokes).
   */
  commit(ops, { emit = true, coalesce = null } = {}) {
    ops = this._limitToAuthor(ops);
    if (!ops.length) return;
    ops = this._stackOnTop(ops);
    const inverse = this._inverse(ops);
    ops.forEach((op) => this._applyOp(op));
    const now = Date.now();
    const top = this.undoStack[this.undoStack.length - 1];
    if (coalesce && top && top.coalesce === coalesce && now - top.at < COALESCE_WINDOW_MS
      && top.forward.length === 1 && ops.length === 1 && ops[0].op === "update" && top.forward[0].op === "update"
      && top.forward[0].id === ops[0].id) {
      // Repeated edits of the same object (e.g. typing in the graph panel) become one undo step:
      // keep the original "before" values and move the "after" values forward.
      top.forward = [{ ...ops[0], patch: { ...top.forward[0].patch, ...ops[0].patch } }];
      top.inverse = [{ ...top.inverse[0], patch: { ...inverse[0].patch, ...top.inverse[0].patch } }];
      top.at = now;
    } else {
      this.undoStack.push({ forward: ops, inverse, coalesce, at: now });
      if (this.undoStack.length > 200) this.undoStack.shift();
    }
    this.redoStack = [];
    this._changed();
    if (emit) this.onLocalOps(ops);
  }

  // Something drawn after another object is meant to sit on top of it, even when that object was raised
  _stackOnTop(ops) {
    if (!ops.some((op) => op.op === "add" && op.obj.z === undefined)) return ops;
    const tops = new Map();
    const topOf = (page) => {
      if (!tops.has(page)) tops.set(page, this.topZ(page));
      return tops.get(page);
    };
    return ops.map((op) => {
      if (op.op !== "add" || op.obj.z !== undefined || op.obj.type === "paper" || op.obj.type === "cover") return op;
      const z = topOf(op.obj.page ?? 0);
      return z > 0 ? { ...op, obj: { ...op.obj, z } } : op;
    });
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    entry.inverse.forEach((op) => this._applyOp(op));
    this.redoStack.push(entry);
    this._changed();
    this.onLocalOps(entry.inverse);
    return true;
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    entry.forward.forEach((op) => this._applyOp(op));
    this.undoStack.push(entry);
    this._changed();
    this.onLocalOps(entry.forward);
    return true;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }

  /** Remote ops from the host (no history, no echo). */
  applyRemote(ops) {
    if (!Array.isArray(ops)) return;
    ops.forEach((op) => this._applyOp(op));
    this._changed();
  }

  /** Remote live-stroke chunk: create or extend a stroke as points arrive. */
  applyRemoteStroke({ id, page, meta, points }) {
    const cur = this.objects.get(id);
    if (cur) {
      this.objects.set(id, { ...cur, points: cur.points.concat(points) });
    } else if (meta) {
      this.objects.set(id, {
        id,
        type: "stroke",
        page: page ?? 0,
        tool: meta.tool,
        color: meta.color,
        width: meta.width,
        opacity: meta.opacity ?? 1,
        vp: meta.vp,
        texture: meta.texture,
        pattern: meta.pattern,
        ...(meta.z ? { z: meta.z } : {}),
        ...(meta.by ? { by: meta.by } : {}),
        points: points.slice(),
      });
    } else {
      return;
    }
    this._changed();
  }
}

function pick(obj, keys) {
  const out = {};
  // `undefined` would be dropped when the op is sent as JSON, so a group id that did not exist yet is
  // restored as null; that is what makes undoing "group" reach collaborators too.
  // (a missing layer is layer 0, so undoing a reorder reaches collaborators too)
  for (const k of keys) out[k] = obj[k] === undefined && k === "groupId" ? null : obj[k] === undefined && k === "z" ? 0 : obj[k];
  return out;
}
