// Generates N random teams and validates each one with Pokémon Showdown's own validator.
// Usage: node scripts/validate-teams.js <path-to-built-pokemon-showdown> [N]
const path = require('path');
const [PS, N = '1000'] = process.argv.slice(2);
const {Teams, TeamValidator} = require(path.resolve(PS) + '/dist/sim');
globalThis.window = {};
require('../data.js');
const data = window.REG_MC;
const Gen = require('../generator.js');
const v = TeamValidator.get('gen9championsvgc2026regmc');

const optSets = [{}, {megaBias: 0.5}, {megaBias: 1, oneMega: true}, {spStyle: 'focused'}];
let fails = 0;
for (let i = 0; i < +N; i++) {
  const opts = optSets[i % optSets.length];
  const team = Gen.generateTeam(data, 1000 + i, opts);
  const paste = Gen.toShowdown(data, team);
  const problems = v.validateTeam(Teams.import(paste));
  const megas = team.filter(m => m.mega).length;
  if (problems || (opts.oneMega && megas > 1)) {
    fails++;
    if (fails <= 5) console.log('FAIL seed', 1000 + i, problems || 'multiple megas', '\n' + paste);
  }
}
console.log(`${+N - fails}/${N} teams valid`);
process.exit(fails ? 1 : 0);
