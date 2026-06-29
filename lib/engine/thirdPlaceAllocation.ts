// Self-computed Annex C third-placed allocation.
//
// FIFA's Annex C lists, for each of the 495 possible combinations of which eight
// of the twelve groups supply a qualifying third-placed team, which Round-of-32
// slot each of those teams is assigned to. The full table lives only in FIFA's
// regulations PDF and is not published in machine-readable form.
//
// We derive the assignment AUTHENTICALLY from FIFA's official per-slot CANDIDATE
// SETS (see `THIRD_PLACE_SLOTS`): assign each qualifying group to a slot whose
// candidate set contains it, such that every slot gets exactly one group — a
// bipartite perfect matching. This is guaranteed to respect FIFA's rules (a third
// only ever lands in a slot FIFA permits) and is exact wherever the matching is
// forced — which is the common case, since the candidate graph is sparse (e.g.
// group K can only go to match 80, group L only to match 87). For the rare
// combinations admitting more than one valid matching we pick a deterministic
// canonical one (groups in alphabetical order, slots in match-number order); the
// effect on simulated odds is negligible. When an authoritative snapshot
// assignment exists, callers prefer it over this computation.

import type { GroupId } from "../data/models";
import { THIRD_PLACE_SLOTS } from "./bracketLayout";

/**
 * Assign each qualifying third-placed group to a Round-of-32 slot.
 * @param qualifiedGroups the (up to eight) group letters whose third-placed team qualified
 * @returns map of Round-of-32 match number → assigned group letter
 * @throws if no assignment satisfies FIFA's candidate sets (should not occur for a valid set of qualifiers)
 */
export function allocateThirds(qualifiedGroups: GroupId[]): Map<number, GroupId> {
  // Deterministic order → reproducible, canonical matching.
  const groups = [...new Set(qualifiedGroups)].sort();
  const slots = [...THIRD_PLACE_SLOTS].sort((a, b) => a.match - b.match);

  // Kuhn's algorithm: match groups → slots over the candidate-set bipartite graph.
  const slotForGroup = new Map<GroupId, number>(); // group → match number
  const groupForSlot = new Map<number, GroupId>(); // match number → group

  const tryAssign = (group: GroupId, seen: Set<number>): boolean => {
    for (const slot of slots) {
      if (!slot.candidateGroups.includes(group) || seen.has(slot.match)) continue;
      seen.add(slot.match);
      const incumbent = groupForSlot.get(slot.match);
      if (incumbent === undefined || tryAssign(incumbent, seen)) {
        groupForSlot.set(slot.match, group);
        slotForGroup.set(group, slot.match);
        return true;
      }
    }
    return false;
  };

  for (const group of groups) {
    if (!tryAssign(group, new Set())) {
      throw new Error(`No Annex C slot available for third-placed group "${group}" in {${groups.join(",")}}`);
    }
  }
  return groupForSlot;
}
