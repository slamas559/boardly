// Groups: a persistent "glue" between drawn objects.
// A group is not a new object. Every member simply carries the same `groupId`, so it syncs
// through the normal update ops, survives reloads, and undo/redo and the server need no new concepts.
// Clicking or marquee-selecting any member selects the whole group, so it moves, resizes,
// duplicates and deletes as one thing until it is ungrouped.

// Objects that can be glued together (page paper, PDF text markup, covers and instruments stay independent)
const NOT_GROUPABLE = new Set(["paper", "markup", "highlight", "cover", "instrument"]);

export const isGroupable = (o) => Boolean(o) && !NOT_GROUPABLE.has(o.type);

/** Ids of everything on `page` that shares a group with any of `ids` (the ids themselves are always kept). */
export function expandToGroups(store, page, ids) {
  const wanted = new Set();
  for (const id of ids) {
    const gid = store.get(id)?.groupId;
    if (gid) wanted.add(gid);
  }
  if (!wanted.size) return [...new Set(ids)];
  const out = new Set(ids);
  for (const o of store.onPage(page)) if (o.groupId && wanted.has(o.groupId)) out.add(o.id);
  return [...out];
}

/** What the current selection allows: glue loose objects together, and / or release a group. */
export function groupState(objects) {
  const list = (objects || []).filter(Boolean);
  const groupable = list.filter(isGroupable);
  const gids = new Set(groupable.map((o) => o.groupId || null));
  const alreadyOneGroup = groupable.length > 0 && gids.size === 1 && !gids.has(null);
  return {
    canGroup: groupable.length >= 2 && !alreadyOneGroup,
    canUngroup: list.some((o) => Boolean(o.groupId)),
  };
}

/** Ops that glue `objects` into one new group. Selecting several groups and grouping merges them. */
export function groupOps(objects, groupId) {
  return objects.filter(isGroupable).map((o) => ({ op: "update", id: o.id, patch: { groupId } }));
}

/** Ops that release every group touched by `objects` (members that are not selected are released too). */
export function ungroupOps(store, page, objects) {
  const gids = new Set(objects.filter((o) => o.groupId).map((o) => o.groupId));
  if (!gids.size) return [];
  return store.onPage(page).filter((o) => gids.has(o.groupId)).map((o) => ({ op: "update", id: o.id, patch: { groupId: null } }));
}

/**
 * For freshly copied objects: give every copied group its own new id (so the copy is not glued to the
 * original) and drop group ids that lost their partners. Mutates and returns `copies`.
 */
export function remapGroupIds(copies, makeId) {
  const counts = new Map();
  for (const o of copies) if (o.groupId) counts.set(o.groupId, (counts.get(o.groupId) || 0) + 1);
  const fresh = new Map();
  for (const o of copies) {
    if (!o.groupId) continue;
    if (counts.get(o.groupId) < 2) {
      delete o.groupId;
      continue;
    }
    if (!fresh.has(o.groupId)) fresh.set(o.groupId, makeId());
    o.groupId = fresh.get(o.groupId);
  }
  return copies;
}
