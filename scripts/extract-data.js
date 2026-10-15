// Extracts Reg M-C legal data from Pokémon Showdown's champions mod.
// Usage: node scripts/extract-data.js <path-to-built-pokemon-showdown> data.js
const [R, OUT] = process.argv.slice(2);
const {Dex, TeamValidator} = require(R + '/dist/sim');
const fs = require('fs');
const FORMAT = 'gen9championsvgc2026regmc';
const fmt = Dex.formats.get(FORMAT);
const dex = Dex.forFormat(fmt);
const v = TeamValidator.get(fmt);
const T = dex.loadTextData(); // move/item/ability descriptions live in data/text
const desc = (table, id) => (T[table][id] && (T[table][id].shortDesc || T[table][id].desc)) || '';
const ivs = {hp:31,atk:31,def:31,spa:31,spd:31,spe:31};

function baseSet(s) {
  return {species: s.name, name: '', ability: Object.values(s.abilities)[0], moves: [], item: '',
    nature: 'Hardy', evs: {hp:2,atk:0,def:0,spa:0,spd:0,spe:0}, ivs: {...ivs}, level: 50,
    gender: s.gender || (s.genderRatio && s.genderRatio.M === 0 ? 'F' : 'M')};
}
const ok = (set, ignore) => {
  const p = v.validateSet(set, {}) || [];
  return p.filter(x => !(ignore && ignore.test(x)));
};

const allMoves = dex.moves.all().filter(m => m.exists && !m.isNonstandard && !m.isZ && !m.isMax);
const items = dex.items.all().filter(i => i.exists && !i.isNonstandard);
const genericItems = items.filter(i => !i.megaStone);
const megaItems = items.filter(i => i.megaStone);

const species = [];
const usedMoves = new Set();
for (const s of dex.species.all()) {
  if (!s.exists || s.battleOnly || s.isNonstandard) continue;
  const set = baseSet(s);
  set.moves = ['protect'];
  if (ok(set, /protect/i).length) continue;
  // cosmetic formes collapse to base (Vivillon patterns, Alcremie flavors, ...)
  const base = s.baseSpecies !== s.name ? dex.species.get(s.baseSpecies) : null;
  if (base && base.cosmeticFormes && base.cosmeticFormes.includes(s.name)) continue;

  const abilities = [...new Set(Object.values(s.abilities))].filter(a => {
    const t = {...set, ability: a};
    return !ok(t, /protect/i).length;
  });
  const moves = [];
  for (const m of allMoves) {
    const t = {...set, ability: abilities[0], moves: [m.name]};
    if (!ok(t).length) moves.push(m.id);
  }
  moves.forEach(m => usedMoves.add(m));
  const megas = [];
  for (const it of megaItems) {
    const forme = it.megaStone[s.name];
    if (!forme) continue;
    const t = {...set, ability: abilities[0], moves: [moves[0]], item: it.name};
    if (ok(t).length) continue;
    const ms = dex.species.get(forme);
    megas.push({item: it.id, forme: ms.name, types: ms.types, ability: Object.values(ms.abilities)[0],
      stats: ms.baseStats, sprite: ms.spriteid});
  }
  const genders = s.gender ? [s.gender] : (s.genderRatio.M === 0 ? ['F'] : s.genderRatio.F === 0 ? ['M'] : ['M','F']);
  const genderless = s.gender === 'N';
  species.push({
    id: s.id, name: s.name, num: s.num, types: s.types, stats: s.baseStats,
    abilities, moves, megas, genders: genderless ? [] : genders, sprite: s.spriteid,
    cosmetic: s.cosmeticFormes || undefined,
  });
}

const moveData = {};
for (const id of [...usedMoves].sort()) {
  const m = dex.moves.get(id);
  moveData[id] = {n: m.name, t: m.type, c: m.category === 'Status' ? 'X' : m.category[0], p: m.basePower, a: m.accuracy === true ? 0 : m.accuracy, pp: m.pp, d: desc('Moves', m.id)};
}
const itemData = {};
for (const i of items) itemData[i.id] = {n: i.name, s: i.spritenum, d: desc('Items', i.id), mega: !!i.megaStone};
const abilData = {};
for (const s of species) for (const a of [...s.abilities, ...s.megas.map(m => m.ability)]) {
  const ab = dex.abilities.get(a); abilData[ab.name] = desc('Abilities', ab.id);
}
const natures = dex.natures.all().map(n => ({n: n.name, plus: n.plus || null, minus: n.minus || null}));

const data = {
  format: fmt.name, source: 'Pokémon Showdown (smogon/pokemon-showdown) champions mod',
  generated: new Date().toISOString().slice(0,10),
  species, moves: moveData, items: itemData, genericItems: genericItems.map(i => i.id), abilities: abilData, natures,
  rules: {level: 50, spTotal: 66, spMax: 32},
};
fs.writeFileSync(OUT, 'window.REG_MC = ' + JSON.stringify(data) + ';\n');
console.log('species', species.length, 'moves', Object.keys(moveData).length, 'items', items.length,
  'generic', genericItems.length, 'mega-capable', species.filter(s => s.megas.length).length);
console.log(species.filter(s => s.moves.length < 4).map(s => s.name + ':' + s.moves.length));
console.log(species.filter(s => s.abilities.length < Object.keys(dex.species.get(s.id).abilities).length).map(s=>s.name).slice(0,20));
