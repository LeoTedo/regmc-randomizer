// Generates N random teams and validates each one with Pokémon Showdown's own validator.
// Usage: node scripts/validate-teams.js <path-to-built-pokemon-showdown> [N]
const path = require('path');
const [PS, N = '1000'] = process.argv.slice(2);
const {Dex, Teams, TeamValidator} = require(path.resolve(PS) + '/dist/sim');
globalThis.window = {};
require('../data.js');
const data = window.REG_MC;
const Gen = require('../generator.js');
const v = TeamValidator.get('gen9championsvgc2026regmc');
const dex = Dex.forFormat(Dex.formats.get('gen9championsvgc2026regmc'));

// Item usefulness rules, checked with Showdown's own type chart rather than data.js's copy.
function itemProblem(m) {
  const sp = dex.species.get(m.id);
  const boost = data.boostItems[m.item];
  if (boost) {
    const ok = m.moves.some(id => dex.moves.get(id).category !== 'Status' && Gen.moveType(data, id, m.ability) === boost);
    return ok ? null : `${m.name} holds ${m.item} without a damaging ${boost} move`;
  }
  const resist = data.resistBerries[m.item];
  if (resist) {
    if (data.abilityImmunities[m.ability] === resist) return `${m.name} holds ${m.item} but ${m.ability} is immune to ${resist}`;
    const typings = [sp.types];
    if (['Protean', 'Libero'].includes(m.ability)) m.moves.forEach(id => typings.push([Gen.moveType(data, id, m.ability)]));
    const hits = t => dex.getImmunity(resist, t) && (resist === 'Normal' || dex.getEffectiveness(resist, t) > 0);
    return typings.some(hits) ? null : `${m.name} (${sp.types}) holds ${m.item} without a ${resist} weakness`;
  }
  return null;
}
const itemCounts = {};

const optSets = [{}, {megaBias: 0.5}, {megaBias: 1, oneMega: true}, {spStyle: 'focused'}];
let fails = 0;
for (let i = 0; i < +N; i++) {
  const opts = optSets[i % optSets.length];
  const team = Gen.generateTeam(data, 1000 + i, opts);
  const paste = Gen.toShowdown(data, team);
  const problems = v.validateTeam(Teams.import(paste));
  const megas = team.filter(m => m.mega).length;
  const itemIssues = team.map(itemProblem).filter(Boolean);
  team.forEach(m => { itemCounts[m.item] = (itemCounts[m.item] || 0) + 1; });
  if (itemIssues.length) { fails++; if (fails <= 5) console.log('FAIL seed', 1000 + i, itemIssues); continue; }
  if (problems || (opts.oneMega && megas > 1)) {
    fails++;
    if (fails <= 5) console.log('FAIL seed', 1000 + i, problems || 'multiple megas', '\n' + paste);
  }
}
const restricted = Object.keys({...data.boostItems, ...data.resistBerries});
console.log('restricted items (times rolled):', restricted.map(i => `${i} ${itemCounts[i] || 0}`).join(', '));
console.log(`${+N - fails}/${N} teams valid`);
process.exit(fails ? 1 : 0);
