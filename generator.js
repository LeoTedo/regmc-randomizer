// Team generation logic. Shared by the page (window.TeamGen) and the Node validation test.
(function (root) {
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const STAT_LABEL = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

  // mulberry32: small seeded PRNG so a team can be shared/reproduced from its seed.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function sample(r, arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  // Distribute `total` stat points across the six stats, max `cap` each.
  // 'chaos': skewed random weights, 'focused': two stats maxed + leftover.
  function spread(r, style, total, cap) {
    const sp = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    if (style === 'focused') {
      const [a, b, c] = sample(r, STATS, 3);
      sp[a] = cap; sp[b] = cap; sp[c] = total - 2 * cap;
      return sp;
    }
    const w = STATS.map(() => Math.pow(r(), 2.5));
    const sum = w.reduce((x, y) => x + y, 0) || 1;
    STATS.forEach((s, i) => { sp[s] = Math.min(cap, Math.floor((w[i] / sum) * total)); });
    let left = total - STATS.reduce((x, s) => x + sp[s], 0);
    while (left > 0) {
      // hand out the remainder weighted toward already-invested stats
      const open = STATS.filter(s => sp[s] < cap);
      const s = r() < 0.7 ? open.reduce((m, x) => (sp[x] > sp[m] ? x : m), open[0]) : pick(r, open);
      const add = Math.min(left, cap - sp[s], 1 + Math.floor(r() * left));
      sp[s] += add; left -= add;
    }
    return sp;
  }

  // Champions stat formula at level 50 (31 IVs baked in), matching Showdown's champions mod.
  function calcStats(base, sp, nature) {
    const out = {};
    for (const s of STATS) {
      if (s === 'hp') { out.hp = base.hp + sp.hp + 75; continue; }
      let v = base[s] + sp[s] + 20;
      if (nature.plus === s) v = Math.floor((v * 110) / 100);
      else if (nature.minus === s) v = Math.floor((v * 90) / 100);
      out[s] = v;
    }
    return out;
  }

  // opts: { megaBias: 0..1, oneMega: bool, spStyle: 'chaos'|'focused' }
  // locked: array of existing mons (or null) to keep in their slots.
  function generateTeam(data, seed, opts, locked) {
    const r = rng(seed);
    opts = Object.assign({ megaBias: 0, oneMega: false, spStyle: 'chaos' }, opts || {});
    locked = locked || [];
    const team = new Array(6).fill(null);
    const usedNums = new Set();
    const usedItems = new Set();
    let megaCount = 0;
    locked.forEach((m, i) => {
      if (!m) return;
      team[i] = m;
      usedNums.add(m.num);
      usedItems.add(m.item);
      if (m.mega) megaCount++;
    });

    const pool = sample(r, data.species, data.species.length);
    let p = 0;
    for (let slot = 0; slot < 6; slot++) {
      if (team[slot]) continue;
      // Species Clause: one per National Dex number (regional forms included)
      while (usedNums.has(pool[p].num)) p++;
      const sp = pool[p++];
      usedNums.add(sp.num);
      team[slot] = buildMon(data, sp, r, opts, usedItems, megaCount);
      if (team[slot].mega) megaCount++;
    }
    return team;
  }

  function buildMon(data, sp, r, opts, usedItems, megaCount) {
    // Item Clause: no duplicate items on a team
    const megaAllowed = !(opts.oneMega && megaCount >= 1);
    const stones = megaAllowed ? sp.megas.filter(m => !usedItems.has(m.item)) : [];
    const generic = data.genericItems.filter(i => !usedItems.has(i));
    let item, mega = null;
    if (stones.length && opts.megaBias > 0 && r() < opts.megaBias) {
      mega = pick(r, stones);
    } else {
      const all = generic.concat(stones.map(m => m.item));
      item = pick(r, all);
      mega = stones.find(m => m.item === item) || null;
    }
    if (mega) item = mega.item;
    usedItems.add(item);

    const nature = pick(r, data.natures);
    const evs = spread(r, opts.spStyle, data.rules.spTotal, data.rules.spMax);
    return {
      id: sp.id, name: sp.name, num: sp.num,
      gender: sp.genders.length ? pick(r, sp.genders) : '',
      ability: pick(r, sp.abilities),
      item, mega,
      nature: nature.n,
      evs,
      moves: sample(r, sp.moves, Math.min(4, sp.moves.length)),
      stats: calcStats(sp.stats, evs, nature),
    };
  }

  function toShowdown(data, team) {
    return team.map(m => {
      const item = data.items[m.item];
      const lines = [`${m.name}${m.gender ? ` (${m.gender})` : ''} @ ${item.n}`];
      lines.push(`Ability: ${m.ability}`);
      lines.push('Level: 50');
      const ev = STATS.filter(s => m.evs[s] > 0).map(s => `${m.evs[s]} ${STAT_LABEL[s]}`);
      if (ev.length) lines.push(`EVs: ${ev.join(' / ')}`);
      lines.push(`${m.nature} Nature`);
      for (const mv of m.moves) lines.push(`- ${data.moves[mv].n}`);
      return lines.join('\n');
    }).join('\n\n');
  }

  const api = { STATS, STAT_LABEL, rng, generateTeam, buildMon, calcStats, toShowdown };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TeamGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
