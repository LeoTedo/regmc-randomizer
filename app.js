(function () {
  const data = window.REG_MC;
  const Gen = window.TeamGen;
  const SPECIES = Object.fromEntries(data.species.map(s => [s.id, s]));
  const TYPE_COLORS = {
    Normal: '#9a9a6e', Fire: '#ee7f30', Water: '#5b86ec', Electric: '#e6bf1e', Grass: '#6cbc48', Ice: '#76c9c8',
    Fighting: '#bb2f28', Poison: '#9a419a', Ground: '#d4b25a', Flying: '#9480e6', Psychic: '#f25584', Bug: '#9aaa20',
    Rock: '#b29a3a', Ghost: '#6a5594', Dragon: '#6b3cf0', Dark: '#6a5446', Steel: '#a8a8c4', Fairy: '#e38fa6',
  };
  const $ = id => document.getElementById(id);

  let team = [];
  let locks = [false, false, false, false, false, false];

  const newSeed = () => (Math.random() * 2 ** 32) >>> 0;
  const opts = () => ({
    megaBias: +$('megaBias').value,
    oneMega: $('oneMega').checked,
    spStyle: $('spStyle').value,
  });

  // ---------- share links: the whole team is encoded in the URL hash ----------
  function encode(t) {
    const compact = t.map(m => [m.id, m.gender, m.ability, m.item, m.nature, Gen.STATS.map(s => m.evs[s]), m.moves]);
    return btoa(unescape(encodeURIComponent(JSON.stringify(compact)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    const json = decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
    return JSON.parse(json).map(([id, gender, ability, item, nature, ev, moves]) => {
      const sp = SPECIES[id];
      const nat = data.natures.find(n => n.n === nature);
      if (!sp || !nat || !data.items[item]) throw new Error('bad team');
      const evs = Object.fromEntries(Gen.STATS.map((s, i) => [s, ev[i]]));
      return {
        id, name: sp.name, num: sp.num, gender, ability, item, nature, evs, moves,
        mega: sp.megas.find(m => m.item === item) || null,
        stats: Gen.calcStats(sp.stats, evs, nat),
      };
    });
  }

  // ---------- rendering ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const typeChip = t => `<span class="type" style="background:${TYPE_COLORS[t]}">${t}</span>`;
  const itemIcon = n => `background-position:-${(n % 16) * 24}px -${Math.floor(n / 16) * 24}px`;
  const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const ICON_UNLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';
  const ICON_DICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/></svg>';

  function spriteUrls(spriteId, fallbackId) {
    return [
      `https://play.pokemonshowdown.com/sprites/home-centered/${spriteId}.png`,
      `https://play.pokemonshowdown.com/sprites/gen5/${spriteId}.png`,
      `https://play.pokemonshowdown.com/sprites/home-centered/${fallbackId}.png`,
    ];
  }

  function renderMon(m, i) {
    const sp = SPECIES[m.id];
    const nat = data.natures.find(n => n.n === m.nature);
    const item = data.items[m.item];
    const types = m.mega ? m.mega.types : sp.types;
    const urls = spriteUrls(m.mega ? m.mega.sprite : sp.sprite, sp.sprite);
    const spTotal = Gen.STATS.reduce((a, s) => a + m.evs[s], 0);
    const natText = nat.plus ? `+${Gen.STAT_LABEL[nat.plus]} −${Gen.STAT_LABEL[nat.minus]}` : 'neutral';

    const statRows = Gen.STATS.map(s => {
      const cls = nat.plus === s ? 'plus' : nat.minus === s ? 'minus' : '';
      const arrow = cls === 'plus' ? '↑' : cls === 'minus' ? '↓' : '';
      return `<span class="lbl ${cls}">${Gen.STAT_LABEL[s]}${arrow}</span>
        <span class="base">${sp.stats[s]}</span>
        <span class="track" title="${m.evs[s]} / ${data.rules.spMax} Stat Points"><span style="width:${(m.evs[s] / data.rules.spMax) * 100}%"></span></span>
        <span class="sp">${m.evs[s]}</span>
        <span class="fin">${m.stats[s]}</span>`;
    }).join('');

    const moves = m.moves.map(id => {
      const mv = data.moves[id];
      const cat = mv.c === 'P' ? 'Physical' : mv.c === 'S' ? 'Special' : 'Status';
      const meta = [mv.t, cat, mv.p ? `${mv.p} BP` : null, mv.a ? `${mv.a}%` : null].filter(Boolean).join(' · ');
      return `<li class="move" style="--mt:${TYPE_COLORS[mv.t]}" data-tip="${esc(mv.d)}"><b>${esc(mv.n)}</b><small>${meta}</small></li>`;
    }).join('');

    const ability = m.ability;
    const megaLine = m.mega
      ? `<dt>Mega</dt><dd><span data-tip="${esc(data.abilities[m.mega.ability] || '')}">${esc(m.mega.forme)} · ${esc(m.mega.ability)}</span></dd>`
      : '';

    return `<article class="mon${locks[i] ? ' locked' : ''}" style="--t1:${TYPE_COLORS[types[0]]};--t2:${TYPE_COLORS[types[1] || types[0]]}">
      <div class="mon-head">
        <div class="sprite"><img alt="${esc(m.mega ? m.mega.forme : m.name)}" src="${urls[0]}" data-fallbacks="${urls.slice(1).join(' ')}" loading="lazy"></div>
        <div class="mon-title">
          <h2 class="mon-name">${esc(m.name)}${m.gender ? `<span class="gender ${m.gender}">${m.gender === 'M' ? '♂' : '♀'}</span>` : ''}${m.mega ? '<span class="mega-tag">MEGA READY</span>' : ''}</h2>
          <div class="types">${types.map(typeChip).join('')}</div>
        </div>
        <div class="slot-actions">
          <button class="icon-btn" data-act="lock" data-i="${i}" aria-pressed="${locks[i]}" aria-label="${locks[i] ? 'Unlock' : 'Lock'} ${esc(m.name)}" title="${locks[i] ? 'Unlock' : 'Lock'} this slot">${locks[i] ? ICON_LOCK : ICON_UNLOCK}</button>
          <button class="icon-btn" data-act="reroll" data-i="${i}" aria-label="Reroll ${esc(m.name)}" title="Reroll this slot">${ICON_DICE}</button>
        </div>
      </div>
      <dl class="facts">
        <dt>Item</dt><dd><span class="item-icon" style="${itemIcon(item.s)}"></span><span data-tip="${esc(item.d || '')}">${esc(item.n)}</span></dd>
        <dt>Ability</dt><dd><span data-tip="${esc(data.abilities[ability] || '')}">${esc(ability)}</span></dd>
        ${megaLine}
        <dt>Alignment</dt><dd>${esc(m.nature)} <span class="nat-mod">${natText}</span></dd>
      </dl>
      <div class="stats">
        <span class="h">Stat</span><span class="h" style="text-align:right">Base</span><span class="h sp-total">Stat Points · ${spTotal}/${data.rules.spTotal}</span><span class="h" style="text-align:right">SP</span><span class="h" style="text-align:right">Lv50</span>
        ${statRows}
      </div>
      <ul class="moves">${moves}</ul>
    </article>`;
  }

  function renderEmpty() {
    $('team').innerHTML = `<div class="empty">
      <span class="ball big" aria-hidden="true"></span>
      <p><b>No team yet.</b> Hit <i>Generate team</i> (or press <kbd>G</kbd>) to roll six random Reg M-C Pokémon.</p>
    </div>`;
    setTeamControls(false);
  }

  function setTeamControls(on) {
    $('copy').disabled = !on;
    $('share').disabled = !on;
    $('paste').closest('details').hidden = !on;
  }

  function render() {
    setTeamControls(true);
    $('team').innerHTML = team.map(renderMon).join('');
    $('team').querySelectorAll('img[data-fallbacks]').forEach(img => {
      img.addEventListener('error', () => {
        const rest = img.dataset.fallbacks.split(' ').filter(Boolean);
        if (!rest.length) return;
        img.src = rest.shift();
        img.dataset.fallbacks = rest.join(' ');
      });
    });
    $('paste').value = Gen.toShowdown(data, team);
    history.replaceState(null, '', '#t=' + encode(team));
  }

  function generate() {
    const keep = team.map((m, i) => (locks[i] ? m : null));
    team = Gen.generateTeam(data, newSeed(), opts(), keep);
    render();
  }

  function reroll(i) {
    const keep = team.map((m, j) => (j === i ? null : m));
    team = Gen.generateTeam(data, newSeed(), opts(), keep);
    render();
  }

  // ---------- UI wiring ----------
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => t.classList.remove('show'), 1600);
  }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch { $('paste').closest('details').open = true; $('paste').select(); toast('Select and copy manually'); }
  }

  $('generate').addEventListener('click', generate);
  $('copy').addEventListener('click', () => copy($('paste').value, 'Paste copied'));
  $('share').addEventListener('click', () => copy(location.href, 'Share link copied'));
  $('team').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const i = +b.dataset.i;
    if (b.dataset.act === 'lock') { locks[i] = !locks[i]; render(); }
    else reroll(i);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) generate();
  });

  // remember options per browser
  const OPT_KEY = 'regmc-opts';
  try {
    const saved = JSON.parse(localStorage.getItem(OPT_KEY) || 'null');
    if (saved) { $('megaBias').value = saved.megaBias; $('oneMega').checked = saved.oneMega; $('spStyle').value = saved.spStyle; }
  } catch {}
  ['megaBias', 'oneMega', 'spStyle'].forEach(id => $(id).addEventListener('change', () => {
    try { localStorage.setItem(OPT_KEY, JSON.stringify(opts())); } catch {}
  }));

  // tooltips for move / item / ability descriptions
  const tip = document.createElement('div');
  tip.id = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el || !el.dataset.tip) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const r = el.getBoundingClientRect();
    tip.style.left = Math.min(r.left, innerWidth - 296) + 'px';
    tip.style.top = (r.bottom + 6) + 'px';
  });
  addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  $('meta').textContent = `${data.species.length} Pokémon, ${Object.keys(data.items).length} items, updated ${data.generated}`;

  const m = location.hash.match(/^#t=(.+)$/);
  if (m) {
    try { team = decode(m[1]); render(); } catch { history.replaceState(null, '', location.pathname); renderEmpty(); }
  } else renderEmpty();
})();
