import "server-only";

import type { ObjectId } from "mongodb";

export function uniqueOwnerIds(owners: ObjectId[]) {
  const seen = new Set<string>();
  return owners.filter((owner) => {
    const key = owner.toHexString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
