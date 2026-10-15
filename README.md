# Reg M-C Randomizer

A static website that generates a random, fully legal **Pokémon Champions** team for
**VGC 2026 Regulation Set M-C** (Sep 9 – Dec 2, 2026).

Every team gets:

- **6 Pokémon** from the Reg M-C pool (269 species/forms; Species Clause enforced, so no Persian + Alolan Persian)
- **A random held item**, with no repeats (Item Clause). Mega Stones only go to the Pokémon that can use them.
  Items are only handed out when they can actually do something:
  - type-boosting items (Charcoal, Mystic Water, …, Normal Gem) need a damaging move of that type among the 4 moves,
    counting type-changing abilities (Pixilate/Refrigerate make Normal moves Fairy/Ice, Liquid Voice makes sound moves Water)
  - resist berries (Occa, Passho, …) need the Pokémon to be weak to that type, and not immune through its ability
    (Levitate, Flash Fire, Water Absorb, …). Protean/Libero holders also count the types their moves can turn them into.
    Chilan Berry halves any Normal hit, so it only needs the Pokémon to be hittable by Normal moves
- **A random legal Ability**
- **4 random legal moves** from that Pokémon's Champions learnset
- **A random stat alignment** (Nature: ×1.1 / ×0.9)
- **Random training**: 66 Stat Points, max 32 per stat, with final Level 50 stats shown

You can also lock or reroll single slots, share a team by link (the whole team is encoded in the URL),
and copy a Showdown paste.

## Data

`data.js` is generated from [Pokémon Showdown](https://github.com/smogon/pokemon-showdown)'s
`champions` mod, using its own `[Gen 9 Champions] VGC 2026 Reg M-C` validator to decide what is legal
for each species, ability, move and item. `scripts/validate-teams.js` runs generated teams back through
that validator and checks the item rules against Showdown's type chart.

To refresh the data after a Showdown update (for example when the next regulation starts):

```bash
git clone --depth 1 https://github.com/smogon/pokemon-showdown.git ../pokemon-showdown
(cd ../pokemon-showdown && npm install && node build)
node scripts/extract-data.js ../pokemon-showdown data.js
node scripts/validate-teams.js ../pokemon-showdown 2000
```

For a different regulation, change `FORMAT` in `scripts/extract-data.js` and the format id in `scripts/validate-teams.js`.

## Running locally

It's plain HTML/CSS/JS with no build step:

```bash
python3 -m http.server 8000
```

Fan project, not affiliated with Nintendo, Game Freak or The Pokémon Company. Sprites come from Pokémon Showdown.
