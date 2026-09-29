// Copy detection without any external API.
//
// Each answer becomes a set of hashed 5-word shingles. Shingles that appear in
// lots of answers (the question text pasted back, stock phrases) are dropped,
// then only answer pairs that share at least one shingle are compared, via an
// inverted index, so this stays fast for a few thousand answers.

const SHINGLE = 5;
const MIN_WORDS = 25;

const normalise = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// FNV-1a, good enough to bucket shingles.
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const shingles = (text) => {
  const words = normalise(text);
  if (words.length < MIN_WORDS) return null;
  const set = new Set();
  for (let i = 0; i + SHINGLE <= words.length; i++) {
    set.add(hash(words.slice(i, i + SHINGLE).join(" ")));
  }
  return set;
};

/**
 * docs: [{ id, text }] for one question.
 * Returns pairs with jaccard (overall overlap) and containment (how much of the
 * shorter answer appears in the longer one; catches partial copying).
 */
export const similarPairs = (docs, { minJaccard = 0.45, minContainment = 0.7 } = {}) => {
  const sets = docs.map((d) => ({ id: d.id, set: shingles(d.text) })).filter((d) => d.set);
  if (sets.length < 2) return [];

  const df = new Map();
  for (const { set } of sets) for (const h of set) df.set(h, (df.get(h) || 0) + 1);
  const maxDf = Math.max(3, Math.floor(sets.length * 0.3));

  const index = new Map();
  sets.forEach(({ set }, i) => {
    for (const h of set) {
      if (df.get(h) > maxDf) continue;
      if (!index.has(h)) index.set(h, []);
      index.get(h).push(i);
    }
  });

  const shared = new Map(); // "i:j" -> shared shingle count
  for (const postings of index.values()) {
    for (let a = 0; a < postings.length; a++) {
      for (let b = a + 1; b < postings.length; b++) {
        const key = `${postings[a]}:${postings[b]}`;
        shared.set(key, (shared.get(key) || 0) + 1);
      }
    }
  }

  const pairs = [];
  for (const [key, inter] of shared) {
    const [i, j] = key.split(":").map(Number);
    const a = sets[i].set.size;
    const b = sets[j].set.size;
    const jaccard = inter / (a + b - inter);
    const containment = inter / Math.min(a, b);
    if (jaccard >= minJaccard || containment >= minContainment) {
      pairs.push({ a: sets[i].id, b: sets[j].id, jaccard: +jaccard.toFixed(3), containment: +containment.toFixed(3) });
    }
  }
  return pairs.sort((x, y) => y.containment - x.containment);
};

// Groups ids connected by any suspicious pair (union-find).
export const clusters = (pairs) => {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  for (const { a, b } of pairs) parent.set(find(a), find(b));
  const groups = new Map();
  for (const x of parent.keys()) {
    const r = find(x);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(x);
  }
  return [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
};

// The same repo / Figma / Drive link submitted by more than one applicant.
export const sharedLinks = (docs) => {
  const byUrl = new Map();
  for (const { id, text } of docs) {
    for (const raw of String(text || "").match(/https?:\/\/[^\s)\]]+/g) || []) {
      const url = raw
        .replace(/[.,;]+$/, "")
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\/+$/, "")
        .replace(/\.git$/, "")
        .toLowerCase();
      // Ignore bare domains and profile roots; only specific artefacts count.
      if (url.split("/").length < 3) continue;
      if (!byUrl.has(url)) byUrl.set(url, new Set());
      byUrl.get(url).add(id);
    }
  }
  return [...byUrl.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([url, ids]) => ({ url, ids: [...ids] }))
    .sort((a, b) => b.ids.length - a.ids.length);
};
