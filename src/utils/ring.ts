/**
 * Seats people round the ring so those who share something sit side by side, which lets every
 * strand follow the ring. Tries every seating for up to seven people; keeps the given order on ties.
 */
export function seatRing<T extends { id: string }>(people: T[], links: string[][]): T[] {
  if (people.length < 4 || people.length > 7 || !links.length) return people;
  const pairs = links.flatMap((ids) => ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const)));
  const score = (order: T[]) => {
    const at = new Map(order.map((p, i) => [p.id, i]));
    return pairs.reduce((sum, [a, b]) => {
      const ia = at.get(a);
      const ib = at.get(b);
      if (ia === undefined || ib === undefined) return sum;
      const gap = Math.abs(ia - ib);
      return sum + (gap === 1 || gap === order.length - 1 ? 1 : 0);
    }, 0);
  };
  let best = people;
  let bestScore = score(people);
  const rest = people.slice(1);
  const permute = (prefix: T[], left: T[]) => {
    if (!left.length) {
      const sc = score(prefix);
      if (sc > bestScore) {
        best = prefix;
        bestScore = sc;
      }
      return;
    }
    left.forEach((p, i) => permute([...prefix, p], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  // The first person stays at the top; rotations of the same seating score the same.
  permute([people[0]], rest);
  return best;
}
