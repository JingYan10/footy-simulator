// UI: renders screens from engine state and handles taps.

const app = document.getElementById('app');
const modal = document.getElementById('modal');
let tab = 'home';
let clubView = 'table';
let viewLeague = null;
let honTab = 'ind';
const draft = { name: '', nat: 'ENG', pos: 'ST' };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avgRating = st => st.apps ? (st.rsum / st.apps).toFixed(2) : '–';
const ratingClass = r => r >= 7.5 ? 'hi' : r < 6 ? 'lo' : '';

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  train: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  shop: '<path d="M4 8h16l-1.5 11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM9 8V6a3 3 0 0 1 6 0v2"/>',
  club: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  agent: '<path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 12h18"/>',
  career: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  contract: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

// ---------- landing ----------
// First screen on every visit: continue the saved career on this device or start a new one.
let landing = true;
let pastView = null; // id of a past career being looked at

function savedCareerCard() {
  const p = S.player;
  if (S.phase === 'retired') return '';
  if (S.phase === 'choose') return `<section class="card hero"><h2>Saved career</h2><b style="font:800 26px var(--display)">${esc(p.name)}</b>
    <div class="small muted">${POS_NAMES[p.pos]} · ${esc(natName(p.nat))} · Still choosing a first club</div>
    <button class="btn primary block" data-act="continue">Continue career</button></section>`;
  const c = myClub(), ovr = calcOVR(), t = careerTotals();
  const live = S.phase === 'season' ? p.st : { apps: 0, goals: 0, assists: 0 };
  const where = S.phase === 'retired' ? 'Retired' : `${seasonLabel()} · ${S.phase === 'season' ? `Week ${S.week}` : 'Summer'}`;
  return `<section class="card hero"><h2>Saved career</h2>
    <div class="idrow"><div class="ovr card-${cardTier(ovr).toLowerCase()}"><b class="num">${ovr}</b><span>${p.pos}</span></div>
      <div class="who"><h1>${esc(p.name)}</h1><p>${c.name}${p.loan ? ' (loan)' : ''} · Age ${ageOf(p.by)}</p></div>${crest(c.id, 'small')}</div>
    <div class="kv"><div><small>Apps</small><b>${t.apps + live.apps}</b></div><div><small>Goals</small><b>${t.goals + live.goals}</b></div><div><small>Trophies</small><b>${p.trophies.length}</b></div></div>
    <div class="small muted">${where} · ${money(p.money)} in the bank</div>
    <button class="btn primary block" data-act="continue">Continue career</button></section>`;
}

function renderLanding() {
  // A retired save is finished: it shows up with the past careers, not as one to continue.
  if (S && S.phase === 'retired') archiveCurrent();
  const active = S && S.phase !== 'retired', past = loadArchive();
  app.innerHTML = `<div class="create wrap">
    <h1 class="brand">Pitch to <em>Legend</em></h1>
    <p class="lede">From a 16-year-old hopeful to a legend of the game.</p>
    ${active ? savedCareerCard() : '<section class="card"><p class="small muted" style="margin:0">No career in progress on this device.</p></section>'}
    <button class="btn ${active ? '' : 'primary'} block" data-act="landingNew">Start a new career</button>
    <button class="btn block" data-act="importAsk">Import a saved career</button>
    ${past.length ? `<section class="card"><h2>Past careers</h2><div class="inbox">${past.map(r => {
      const t = careerTotals(r);
      return `<div class="pastrow"><button class="house" data-act="viewPast" data-v="${r.id}"><span><b>${esc(r.name)}</b> · ${r.pos} · Peak ${r.peak}<br><span class="small muted">${esc(r.lastClub)} · ${r.career.length} season${r.career.length !== 1 ? 's' : ''} · ${t.goals} goals · ${r.trophies.length} trophies</span>${tagHtml(legacyTags(r))}</span><span class="small flood">View</span></button><button class="btn danger sm" data-act="pastDelAsk" data-v="${r.id}" aria-label="Delete ${esc(r.name)}">Delete</button></div>`;
    }).join('')}</div></section>` : ''}
    <p class="small muted">Your career saves automatically on this device. Use Export save in the Career tab to back it up.</p>
  </div>`;
}

// ---------- create ----------
function renderCreate() {
  const posBtns = POSITIONS.map(p => `<button type="button" class="${draft.pos === p ? 'on' : ''}" data-act="pos" data-v="${p}">${p}</button>`).join('');
  const natOpts = Object.entries(NATIONS).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}" ${draft.nat === k ? 'selected' : ''}>${v}</option>`).join('');
  app.innerHTML = `
  <form class="create wrap" id="createForm">
    <h1 class="brand">Pitch to <em>Legend</em></h1>
    <p class="lede">You're 16 and five clubs want to sign you. Win over the manager, spend your wages wisely and earn a move to the biggest clubs in Europe.</p>
    <div class="field"><label for="f-name">Player name</label><input id="f-name" maxlength="28" placeholder="Your name" value="${esc(draft.name)}" autocomplete="off" required></div>
    <div class="field"><label for="f-nat">Nationality</label><select id="f-nat">${natOpts}</select></div>
    <div class="field"><label>Position</label><div class="posgrid">${posBtns}</div><span class="small muted">${POS_NAMES[draft.pos]}</span></div>
    <button class="btn primary block" type="submit">See club offers</button>
    <button class="btn block" type="button" data-act="menu">Back</button>
    <p class="small muted">${DB.leagues.length} leagues across ${[...new Set(DB.leagues.map(l => l.country))].join(', ').replace(/, ([^,]+)$/, ' and $1')}. Squads and managers are based on the 2025-26 season. Ratings are game estimates.</p>
  </form>`;
  const form = document.getElementById('createForm');
  form.addEventListener('input', e => {
    if (e.target.id === 'f-name') draft.name = e.target.value;
    if (e.target.id === 'f-nat') draft.nat = e.target.value;
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) { document.getElementById('f-name').focus(); return; }
    prepareGame({ ...draft, name });
    render();
    window.scrollTo(0, 0);
  });
}

const TIER_LABEL = { 1: 'Top flight', 2: '2nd tier', 3: '3rd tier' };

function renderChoose() {
  const ovr = calcOVR();
  const cards = S.startChoices.map(id => {
    const c = club(id), l = league(c.league), tier = l.tier;
    const note = tier === 1 ? 'Hard to break into. Barely play and you will be loaned out.' : tier === 2 ? 'A good level to learn, with a fair chance of minutes.' : 'Regular football likely once your OVR reaches the 60s.';
    return `<div class="offer">
      <div class="row"><div class="clubcell">${crest(c.id, "small")}<div style="min-width:0"><div class="club">${c.name}</div><div class="small muted">${l.name} · ${l.country}</div></div></div><span class="chip ${tier === 1 ? 'flood' : ''}">${TIER_LABEL[tier]}</span></div>
      <div class="kv"><div><small>Team</small><b>${Math.round(teamStrength(c))}</b></div><div><small>Role</small><b>${squadStatus(c, ovr, 50)}</b></div><div><small>Wage</small><b class="num">${money(startWage(id))}/wk</b></div></div>
      <div class="small muted">Manager: ${c.mgr}. ${note}</div>
      <button class="btn good sm" data-act="choose" data-v="${id}">Sign for ${c.name}</button>
    </div>`;
  }).join('');
  app.innerHTML = `<div class="create wrap">
    <h1 class="brand" style="font-size:36px">Pick your <em>club</em></h1>
    <p class="lede">${esc(S.player.name)}, ${POS_NAMES[S.player.pos].toLowerCase()}, age ${START_AGE}, OVR <b style="color:var(--chalk)">${ovr}</b>. Five clubs have offered a 3-year youth contract.</p>
    <button class="btn block" data-act="refresh" ${S.rerolls > 0 ? "" : "disabled"}>Refresh offers (${S.rerolls} left)</button>
    ${cards}
  </div>`;
}

// ---------- shell ----------
function topbar() {
  const p = S.player, c = myClub(), ovr = calcOVR();
  const e = Math.round(p.energy);
  const eClass = e < 30 ? 'low' : e < 55 ? 'mid' : '';
  const status = S.phase === 'retired' ? 'Retired' : p.needsContract && p.free ? 'Free agent' : squadStatus();
  return `
  <header class="topbar wrap">
    <div class="idrow">
      <div class="ovr card-${cardTier(ovr).toLowerCase()}"><b class="num">${ovr}</b><span>${p.pos}</span></div>
      <div class="who">
        <h1>${esc(p.name)}</h1>
        <p>${c.name} · ${status}${p.loan ? ` · On loan from ${club(p.loan.parent).short}` : ''}</p>
      </div>
    </div>
    <div class="chips">
      <span class="chip">Age <b>${ageOf(p.by)}</b></span>
      <span class="chip flood"><b class="num">${money(p.money)}</b></span>
      <span class="chip">${seasonLabel()} · <b>${S.phase === 'season' ? `Wk ${S.week}` : S.phase === 'offseason' ? 'Summer' : 'End'}</b></span>
      ${p.injured ? `<span class="chip bad">Injured ${p.injured}w</span>` : ''}
    </div>
    ${S.phase === 'season' ? `<div class="energy"><span>Energy</span><div class="bar"><i class="${eClass}" style="width:${e}%"></i></div><b class="num">${e}</b></div>` : ''}
  </header>`;
}

function nav() {
  const tabs = [['home', 'Home'], ['train', 'Train'], ['contract', 'Contract'], ['shop', 'Shop'], ['agent', 'Agent'], ['club', 'Club'], ['career', 'Career']];
  return `<nav class="tabs"><div class="in">${tabs.map(([k, l]) => `
    <button class="${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" aria-label="${l}">
      ${icon(k)}<span>${l}</span>${k === 'contract' && S.offers.length ? '<i class="dot"></i>' : ''}${k === 'agent' && (S.player.sponsorReqs || []).length ? '<i class="dot"></i>' : ''}${k === 'train' && S.phase === 'season' && S.player.slots > 0 && !S.player.injured ? '<i class="dot" style="background:var(--flood)"></i>' : ''}
    </button>`).join('')}</div></nav>`;
}

function render() {
  if (pastView) { renderPast(); return; }
  if (landing) { renderLanding(); return; }
  if (!S) { renderCreate(); return; }
  if (S.phase === 'choose') { renderChoose(); return; }
  const scrollY = window.scrollY;
  const views = { home: viewHome, train: viewTrain, contract: viewContract, shop: viewShop, agent: viewAgent, club: viewClub, career: viewCareer };
  app.innerHTML = topbar() + `<main class="wrap">${views[tab]()}</main>` + nav();
  const chip = app.querySelector('.cuptabs .on');
  if (chip) chip.parentElement.scrollLeft = chip.offsetLeft - chip.parentElement.offsetLeft - 24;
  window.scrollTo(0, scrollY);
  nextPopup();
}

// ---------- home ----------
// Club logos live in Club_logos/<original league>/<club name>.<ext>. Missing files fall back to the short name.
const LOGO_EXTS = ['png', 'svg', 'webp', 'jpg'];
const logoState = {}; // club id -> index into LOGO_EXTS that works, or -1 when there is no logo

function logoUrl(c, ext) {
  const dir = DB.leagues.find(l => l.id === c.id.split('-')[0]).name;
  return `Club_logos/${encodeURIComponent(dir)}/${encodeURIComponent(c.name)}.${ext}`;
}

function crest(id, size = '') {
  if (!isClub(id)) return `<div class="crest ${size} ${isNation(id) ? 'nation' : ''}"><span>${teamCode(id).slice(0, 4)}</span></div>`;
  const c = club(id), st = logoState[id] ?? 0;
  const img = st >= 0 ? `<img src="${logoUrl(c, LOGO_EXTS[st])}" alt="" data-club="${id}" data-ext="${st}">` : '';
  return `<div class="crest ${id === S.player.club ? 'me' : ''} ${st >= 0 ? 'haslogo' : ''} ${size}">${img}<span>${c.short.slice(0, 4)}</span></div>`;
}

// Try the next file type, then give up and show the short name.
document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset.club) return;
  // Each image steps through the file types on its own; the same club can be on screen twice.
  const id = img.dataset.club, next = +img.dataset.ext + 1;
  if (next < LOGO_EXTS.length) {
    img.dataset.ext = next;
    img.src = logoUrl(club(id), LOGO_EXTS[next]);
  } else {
    if (logoState[id] === undefined) logoState[id] = -1;
    img.parentElement.classList.remove('haslogo');
    img.remove();
  }
}, true);

document.addEventListener('load', e => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.dataset.club) logoState[img.dataset.club] = +img.dataset.ext;
}, true);

function offersHtml() {
  const summer = S.phase === 'offseason' && (S.offerRerolls || 0) > 0;
  if (!S.offers.length && !summer) return '';
  const refresh = summer ? `<button class="btn block" data-act="refreshOffers" ${canRefreshOffers() ? '' : 'disabled'}>Wait for more offers (${S.offerRerolls} left)</button>` : '';
  return `<section class="card"><h2>Contract offers</h2>${S.offers.length ? '' : '<p class="small muted">No offers right now.</p>'}${S.offers.map(o => {
    const c = club(o.club), left = maxRounds(o) - o.rounds;
    const talk = o.type === 'transfer'
      ? `<div class="small bad"><b>They will only negotiate ${left} more time${left !== 1 ? 's' : ''}.</b> If a negotiation fails, they walk away.</div>`
      : o.talksOver ? '<div class="small bad">Talks broke down. You can still sign this offer or decline it, but not negotiate.</div>'
      : negLocked() ? `<div class="small muted">Salary talks are locked until about week ${lockWeekLabel()}. You can still sign.</div>` : '';
    return `<div class="offer">
      <div class="row"><div class="clubcell">${crest(c.id, "small")}<div style="min-width:0"><div class="club">${c.name}</div><div class="small muted">${league(c.league).name} · Team rating ${Math.round(teamStrength(c))}</div></div></div>
      <span class="chip ${o.type === 'renew' ? '' : 'flood'}">${o.type === 'renew' ? 'Renewal' : 'Transfer'}</span></div>
      <div class="kv"><div><small>Wage</small><b class="num">${money(o.wage)}/wk</b></div><div><small>Years</small><b>${o.years}</b></div><div><small>Role</small><b class="${o.promised ? 'good' : ''}">${o.status}${o.promised ? ' (promised)' : ''}</b></div></div>
      <div class="small muted">Current wage ${money(S.player.wage)}/wk${o.promised ? ' · They promise you a starting place' : ''}</div>
      ${o.type === 'transfer' && rivalBetrayal(o.club).length ? `<div class="small bad"><b>Rivals of ${rivalBetrayal(o.club).map(id => esc(club(id).name)).join(' and ')}.</b> Join them and ${rivalBetrayal(o.club).length > 1 ? 'those clubs' : 'that club'} will hate you and never approach you again.</div>` : ''}
      ${o.type === 'transfer' && leagueGrowth(c) < 1 ? '<div class="small flood">Big money, weaker league: your OVR will grow more slowly here.</div>' : ''}
      ${talk}
      <div class="btns"><button class="btn good sm" data-act="accept" data-v="${o.id}">Sign</button><button class="btn sm" data-act="negAsk" data-v="${o.id}" ${canNegotiate(o) ? '' : 'disabled'}>Negotiate</button><button class="btn sm" data-act="decline" data-v="${o.id}">Decline</button></div>
    </div>`;
  }).join('')}${refresh}</section>`;
}

function lockWeekLabel(w = S.player.negLock) {
  const s = Math.floor((w - 1) / SEASON_WEEKS), wk = w - s * SEASON_WEEKS;
  return `${wk}${s !== S.season ? ` of ${seasonLabel(s)}` : ''}`;
}

function showNegotiate(id) {
  const o = S.offers.find(x => x.id === id), c = club(o.club), renew = o.type === 'renew', left = maxRounds(o) - o.rounds;
  const chanceLabel = ch => ch >= .7 ? 'Likely' : ch >= .4 ? 'Risky' : 'Long shot';
  const intro = renew
    ? `${c.name} offer ${money(o.wage)}/week. Asking for more annoys ${c.mgr} whatever happens. Even if he agrees, his affection drops by a fifth, his objectives get a little harder and you can't talk salary again for about six months. ${left} attempt${left !== 1 ? 's' : ''} left.`
    : `${c.name} offer ${money(o.wage)}/week. Their manager won't hold it against you; his affection only counts once you join.`;
  openModal(`<h3>Negotiate</h3>
    <p class="muted" style="margin:0">${intro}</p>
    ${renew ? '' : `<p class="bad" style="margin:0"><b>They will only negotiate ${left} more time${left !== 1 ? 's' : ''}. If a negotiation fails, they walk away.</b></p>`}
    <div class="inbox">${ASKS.map((a, i) => {
      // Show what they would really pay; an ask that can't raise the wage at all is switched off.
      const ch = negotiateChance(o, a), pay = negWage(o, a), capped = pay < Math.round(o.wage * (1 + a.pct) / 10) * 10;
      if (pay <= o.wage) return `<button class="house" disabled><span><b>Ask ${a.label}</b><br><span class="small muted">They can't go any higher than ${money(o.wage)}/wk</span></span></button>`;
      return `<button class="house" data-act="neg" data-v="${o.id}:${i}"><span><b>Ask ${a.label}</b> · ${money(pay)}/wk${capped ? ' <span class="small flood">(their limit)</span>' : ''}<br><span class="small muted">${chanceLabel(ch)} (${Math.round(ch * 100)}%)${renew ? ` · affection −${a.pen}` : ''}</span></span></button>`;
    }).join('')}</div>
    <button class="btn block" data-act="close">Cancel</button>`);
}

// About your objectives record only; how he feels about you is the affection bar above it.
const BAND_NOTE = {
  elite: 'Outstanding record. Salary talks can go well above market value.',
  great: 'Strong record. A little room above market value in salary talks.',
  good: 'Decent record. Only a slim chance above market value.',
  ok: 'Fair record, but salary talks will not go above market value.',
  poor: 'You miss too many targets. His patience is wearing thin.',
  new: 'Hit his targets to build trust. It decides how far salary talks can go.',
};

function managerCard() {
  const p = S.player, c = myClub(), eff = Math.round(effAff()), band = objBand(), rate = objRate();
  const mood = eff >= 75 ? 'Loves you' : eff >= 60 ? 'Trusts you' : eff >= 45 ? 'Neutral' : eff > FROZEN_AFF ? 'Unconvinced' : eff > SACK_AFF + 3 ? 'Frozen out' : 'On the brink';
  // The objectives record only speaks for him while he still likes you.
  const note = eff <= FROZEN_AFF ? `You are frozen out: he won't pick you until affection is above ${FROZEN_AFF}.`
    : eff < 45 && ['elite', 'great', 'good'].includes(band) ? 'You hit your targets, but he has gone cold on you. Win him back before asking for money.'
    // Straight after contract talks there's no room to promise: he's still sore, or talks are locked.
    : negLocked() ? `You just re-signed: no salary talks until about week ${lockWeekLabel()}.`
    : p.affPen >= 1 ? 'He is still sore from your contract talks. Let it settle before asking for more money.'
    : BAND_NOTE[band];
  const cls = eff >= 60 ? '' : eff >= 40 ? 'mid' : 'low';
  const objs = (p.objectives || []).map(o => {
    const pct = Math.min(100, Math.round(o.progress / o.target * 100));
    const hint = o.kind === 'train' ? 'Train it in the Train tab' : o.kind === 'energy' ? `Rest when needed: under ${o.min} energy on matchday doesn't count` : `${o.games} games`;
    return `<div class="obj"><div class="row small"><span><b>${OBJ_SPAN[o.span].label}</b> · ${objText(o)}</span><span class="num ${o.progress >= o.target ? 'good' : ''}">${o.progress}/${o.target}</span></div>
      <div class="bar"><i class="${o.progress >= o.target ? '' : 'mid'}" style="width:${pct}%"></i></div>
      <div class="small muted">${o.span === 'season' ? 'Ends with the season' : `Until week ${o.endWeek}`} · ${hint}</div></div>`;
  }).join('') || '<p class="small muted" style="margin:0">No objectives right now.</p>';
  return `<section class="card"><div class="row"><h2>Manager</h2><span class="small">${c.mgr}</span></div>
    <div class="energy" style="margin:0"><span>${mood}</span><div class="bar"><i class="${cls}" style="width:${eff}%"></i></div><b class="num">${eff}</b></div>
    ${p.affPen >= 1 ? `<div class="small bad">−${Math.round(p.affPen)} from contract talks, fading each week</div>` : ''}
    ${eff <= FROZEN_AFF + 5 ? `<div class="small bad"><b>Warning:</b> at ${FROZEN_AFF} he freezes you out, and at ${SACK_AFF} he tears up your contract.</div>` : ''}
    <div class="energy" style="margin:0"><span>Board</span><div class="bar"><i class="${p.board >= 60 ? '' : p.board >= 40 ? 'mid' : 'low'}" style="width:${p.board}%"></i></div><b class="num">${Math.round(p.board)}</b></div>
    <div class="row small"><span class="muted">Objectives hit</span><b>${rate === null ? '–' : Math.round(rate * 100) + '%'} <span class="muted">(${(p.objHist || []).length} so far)</span></b></div>
    <div class="small ${band === 'poor' || note !== BAND_NOTE[band] ? 'bad' : band === 'elite' || band === 'great' ? 'good' : 'muted'}">${note}</div>
    ${p.objHard ? `<div class="small muted">Targets are ${Math.round(p.objHard * 100)}% harder since your pay rise.</div>` : ''}
    ${p.promise > 0 ? `<div class="small good">Promised starting place: ${p.promise} more league games${effAff() < 30 ? ' (on hold while affection is under 30)' : ''}.</div>` : ''}
    ${objs}</section>`;
}

function orderBox() {
  const o = S.player.order;
  if (!o) return '';
  return `<div class="order"><div class="small flood"><b>Manager's instructions</b></div><div>“${esc(o.text)}”</div>
    <div class="btns"><button class="btn sm ${o.choice === 'follow' ? 'good' : ''}" data-act="order" data-v="follow">Follow the plan</button><button class="btn sm ${o.choice === 'own' ? 'danger' : ''}" data-act="order" data-v="own">Play my own game</button></div>
    <div class="small muted">Following gives the team a small edge and pleases him. Your own game boosts your scoring chances but hurts the team: a goal or assist in a win and he forgives you, a goal or assist without a win and he is a little annoyed, neither and he is furious.</div></div>`;
}

function freeAgentView() {
  return `<section class="card hero"><h2>Free agent</h2><p style="margin:0">You have no club. You can't play until you sign for someone, but free agents can sign at any time.</p>
    <button class="btn primary block" data-act="tab" data-v="contract">Find a club in Contract</button></section>` + inboxHtml();
}

// Home only points at the Contract tab, where the offers live.
function offersBanner() {
  const n = S.offers.length, waits = S.phase === 'offseason' && canRefreshOffers();
  if (!n && !waits) return '';
  return `<section class="card"><div class="row"><h2>Contract offers</h2><span class="chip ${n ? 'flood' : ''}">${n} waiting</span></div>
    <button class="btn block" data-act="tab" data-v="contract">${n ? 'View offers' : 'Wait for offers'}</button></section>`;
}

function viewContract() {
  const p = S.player;
  if (S.phase === 'retired') return '<section class="card"><h2>Contract</h2><p class="muted" style="margin:0">You have retired.</p></section>';
  if (p.needsContract) return `<section class="card hero"><h2>Free agent</h2><p class="bad" style="margin:0">${S.phase === 'offseason' ? 'Your contract has run out.' : 'You have no club.'} Sign with a club below to keep playing.</p>
    <button class="btn block" data-act="findClubs">Ask your agent to find clubs</button></section>` + offersHtml();
  return contractDetails() + offersHtml() + contractCard();
}

// The deal you are on now.
function contractDetails() {
  const p = S.player, home = club(p.loan ? p.loan.parent : p.club), mkt = marketWage(calcOVR(), myClub());
  // In the summer the season just ended has already come off the contract.
  const ends = S.season + p.years - (S.phase === 'offseason' ? 0 : 1), a = agent();
  const pct = Math.round((p.wage / Math.max(1, mkt) - 1) * 100);
  return `<section class="card hero"><div class="row"><div class="clubcell">${crest(home.id, 'small')}<div><div class="club">${home.name}</div><div class="small muted">${league(home.league).name}</div></div></div>
      <span class="chip">${p.years > 0 ? `${p.years} yr${p.years !== 1 ? 's' : ''} left` : 'Expiring'}</span></div>
    <div class="kv"><div><small>Wage</small><b class="num">${money(p.wage)}/wk</b></div><div><small>Per year</small><b class="num">${money(p.wage * 52)}</b></div><div><small>Expires</small><b>End of ${seasonLabel(ends)}</b></div></div>
    <div class="kv"><div><small>Role</small><b class="${p.promise > 0 ? 'good' : ''}">${squadStatus()}${p.promise > 0 ? ' (promised)' : ''}</b></div><div><small>Market value</small><b class="num">${money(mkt)}/wk</b></div><div><small>vs market</small><b class="${pct >= 0 ? 'good' : 'bad'}">${pct >= 0 ? '+' : ''}${pct}%</b></div></div>
    ${p.loan ? `<div class="small flood">On loan at ${myClub().name} until the end of the season. ${home.name} still pay your wage.</div>` : ''}
    <div class="small muted">Agent: ${a.name}${agentCut() ? ` · takes ${money(agentCut())}/wk` : ''}</div>
  </section>`;
}

function contractCard() {
  const p = S.player;
  if (p.loan) return '';
  const { breakout } = scoutBuzz();
  return `<section class="card"><h2>Your options</h2>
    ${breakout ? '<div class="small flood">Breakout season: top-flight scouts are watching.</div>' : ''}
    ${negLocked() ? `<div class="small muted">You just re-signed: no salary talks until about week ${lockWeekLabel()}.</div>` : ''}
    ${leagueGrowth() < 1 ? '<div class="small muted">Weaker league: your OVR grows about 40% slower here than in Europe.</div>' : ''}
    ${offerLocked() ? `<div class="small muted">Settling in: other clubs will not bid for you until about week ${lockWeekLabel(S.player.offerLock)}.</div>` : ''}
    ${p.listed ? `<div class="small flood">You are transfer-listed. ${inWindow() ? 'Clubs are bidding now.' : `Bids arrive when the window opens (week ${JAN_WINDOW[0]} or summer).`}</div>` : ''}
    <div class="btns">
      <button class="btn sm" data-act="askContract">Ask for new contract</button>
      ${p.listed ? '<button class="btn sm" data-act="unlist">Withdraw request</button>' : '<button class="btn sm danger" data-act="listAsk">Request transfer</button>'}
    </div></section>`;
}

function inboxHtml() {
  return `<section class="card"><h2>Inbox</h2><div class="inbox">${S.inbox.slice(0, 8).map(m =>
    `<div class="msg ${m.kind}">${esc(m.text)}<small>${seasonLabel(m.season)} · Week ${Math.min(m.week, SEASON_WEEKS)}</small></div>`).join('') || '<span class="muted small">No messages.</span>'}</div></section>`;
}

function viewHome() {
  if (S.phase === 'offseason') return viewOffseason();
  if (S.phase === 'retired') return viewRetired();
  if (S.player.needsContract) return freeAgentView();
  const p = S.player, fx = nextFixture();
  let matchCard;
  if (fx) {
    const opp = club(fx.opp);
    const sel = p.injured ? '<span class="bad">Injured, you will miss this match</span>' : `Role: <b>${squadStatus()}</b> · Start chance <b>${Math.round(startChance().start * 100)}%</b>`;
    matchCard = `<section class="card hero">
      <div class="row"><h2>Matchday ${S.week}</h2><span class="small muted">${league(myClub().league).name}</span></div>
      <div class="fixture">
        <div class="team">${crest(fx.home)}<b>${club(fx.home).name}</b><span>${Math.round(teamStrength(club(fx.home)))} rated</span></div>
        <div class="vs">VS</div>
        <div class="team">${crest(fx.away)}<b>${club(fx.away).name}</b><span>${Math.round(teamStrength(club(fx.away)))} rated</span></div>
      </div>
      <div class="small muted" style="text-align:center">${sel} · ${opp.mgr}'s ${opp.name} ${fx.isHome ? 'visit you' : 'host you'}</div>
      ${p.slots > 0 && !p.injured ? `<div class="small flood" style="text-align:center">${p.slots} training session${p.slots > 1 ? 's' : ''} left this week</div>` : ''}
      ${euroLine()}
      ${orderBox()}
      <button class="btn primary block" data-act="advance">Play matchday</button>
    </section>`;
  } else {
    matchCard = `<section class="card hero"><h2>Week ${S.week}</h2><p class="muted" style="margin:0">No league match this week. Rest, train and get ready.</p>
      ${euroLine()}
      <button class="btn primary block" data-act="advance">${midweekFixture() ? 'Play cup game' : 'Next week'}</button></section>`;
  }
  const form = p.form.length ? `<section class="card"><div class="row"><h2>Form</h2><span class="small muted">Season avg ${avgRating(p.st)}</span></div><div class="form">${p.form.map(r => `<span class="${ratingClass(r)}">${r.toFixed(1)}</span>`).join('')}</div>
    <div class="small muted">${p.st.apps} apps · ${p.st.goals} goals · ${p.st.assists} assists</div></section>` : '';
  const tbl = leagueTable(myClub().league), myPos = tbl.findIndex(r => r.id === p.club) + 1;
  const money_ = `<section class="card"><div class="row"><h2>This week</h2><span class="small">Table: <b>${S.table[p.club].p ? myPos + ordinal(myPos) : "–"}</b></span></div>
    <div class="row small"><span class="muted">Wage + sponsors − rent</span><b class="num ${weeklyNet() >= 0 ? 'good' : 'bad'}">${weeklyNet() >= 0 ? '+' : ''}${money(weeklyNet())}</b></div></section>`;
  return matchCard + offersBanner() + managerCard() + form + money_ + inboxHtml();
}

// The midweek cup game (European or domestic), played straight after the league match.
function euroLine() {
  const e = midweekFixture();
  if (!e) return '';
  return `<div class="order"><div class="small flood"><b>Midweek · ${esc(e.t.name)}</b> · ${e.stage}</div>
    <div class="clubcell">${crest(e.opp, 'small')}<span>${e.isHome ? 'vs' : 'at'} <b>${club(e.opp).name}</b> <span class="muted small">${Math.round(teamStrength(club(e.opp)))} rated</span></span></div>
    <div class="small ${S.player.energy < TWO_GAME_ENERGY ? 'bad' : 'muted'}">Two games this week: you need ${TWO_GAME_ENERGY}+ energy to play both${S.player.energy < TWO_GAME_ENERGY ? `. You have ${Math.round(S.player.energy)}, so if you play the league game you will be rested for this one` : ''}.</div></div>`;
}

function viewOffseason() {
  const sum = S.seasonSummary, p = S.player, age = ageOf(p.by);
  const delta = sum.ovrEnd - sum.ovrStart;
  return `<section class="card hero">
      <h2>Season ${seasonLabel(sum.season)} review</h2>
      <div class="row"><b style="font:800 24px var(--display)">${sum.club}</b><span>Finished <b>${sum.pos}${ordinal(sum.pos)}</b></span></div>
      ${sum.clubs && sum.clubs.length > 1 ? `<div class="small muted">This season: ${sum.clubs.map(esc).join(' → ')}. Stats cover all of them.</div>` : ''}
      <div class="bigstat"><div><b>${sum.apps}</b><small>Apps</small></div><div><b>${sum.goals}</b><small>Goals</small></div><div><b>${sum.assists}</b><small>Assists</small></div><div><b>${sum.apps ? sum.avg.toFixed(1) : '–'}</b><small>Rating</small></div></div>
      ${sum.cup && sum.cup.apps ? `<div class="small muted">Cups: ${sum.cup.apps} apps · ${sum.cup.goals} goals · ${sum.cup.assists} assists</div>` : ''}
      ${sum.missed ? `<div class="small bad">Missed ${sum.missed} league game${sum.missed !== 1 ? 's' : ''} injured</div>` : ''}
      <div class="small">OVR ${sum.ovrStart} → <b>${sum.ovrEnd}</b> <span class="${delta >= 0 ? 'good' : 'bad'}">(${delta >= 0 ? '+' : ''}${delta})</span></div>
      ${ovrBreakdown(sum)}
      ${sum.awards.map(a => `<div class="award">${esc(a)}</div>`).join('')}
    </section>
    ${honoursCard(sum)}
    ${summerCard()}
    <section class="card"><h2>Contract</h2>
      ${p.needsContract ? '<p class="bad" style="margin:0">Your contract has run out. Sign with a club in the Contract tab to continue.</p>' : `<p style="margin:0">${money(p.wage)}/week · ${p.years} year${p.years !== 1 ? 's' : ''} left at ${club(p.loan ? p.loan.parent : p.club).name}</p>`}
      ${sum.loanNext ? `<p class="small flood" style="margin:0">You made only ${sum.starts} starts, so you will be sent out on loan next season. Sign for another club to avoid it.</p>` : ''}
      ${sum.returning && p.loan ? `<p class="small muted" style="margin:0">Your loan ends. You return to ${club(p.loan.parent).name} for pre-season.</p>` : ''}
      <button class="btn block" data-act="tab" data-v="contract">${S.offers.length ? `View ${S.offers.length} offer${S.offers.length > 1 ? 's' : ''}` : 'Open Contract'}</button>
    </section>
    <section class="card">
      ${summerPending() ? `<p class="small muted" style="margin:0">Finish the ${summerPending().name} first.</p>` : ''}
      <button class="btn primary block" data-act="nextSeason" ${p.needsContract || summerPending() ? 'disabled' : ''}>Start ${seasonLabel(S.season + 1)}</button>
      <button class="btn danger block" data-act="retireAsk">Retire${age < 30 ? ' early' : ''}</button>
    </section>` + inboxHtml();
}

// Why OVR moved this season: matches and training, the end-of-season review, and ageing.
function ovrBreakdown(sum) {
  const sign = v => `${v > 0 ? '+' : ''}${v}`, cls = v => v > 0 ? 'good' : v < 0 ? 'bad' : '';
  const rows = [];
  if (sum.seasonGain != null) rows.push(`Matches and training: <b class="${cls(sum.seasonGain)}">${sign(sum.seasonGain)}</b>`);
  if (sum.review) rows.push(`Performance review: <b class="${cls(sum.review.change)}">${sign(sum.review.change)}</b>${!sum.review.change && sum.ovrPreAge >= MAX_OVR ? ` <span class="flood">already at the ${MAX_OVR} maximum</span>` : ''}${sum.review.notes.length ? ` (${esc(sum.review.notes.join(', '))})` : ''}`);
  if (sum.ageLoss > 0) rows.push(`Ageing, turning ${sum.ageTo}: <b class="bad">−${sum.ageLoss}</b>. From 34 your body slows down a little more every birthday.`);
  // Attributes can sit above the 91 cap, which hides small gains and losses for a while.
  if (sum.rawEnd > MAX_OVR) rows.push(`Your attributes are still above the ${MAX_OVR} cap (${sum.rawEnd}), so ${sum.ageLoss > 0 ? 'the ageing loss' : 'changes'} won't show in your OVR until they drop below it.`);
  else if (sum.ovrPreAge >= MAX_OVR && sum.review && sum.review.change > 0) rows.push(`You're at the ${MAX_OVR} maximum, so gains can't take you higher.`);
  return rows.map(r => `<div class="small muted">${r}</div>`).join('');
}

// The world's individual awards this season and who won them.
function honoursCard(sum) {
  if (!sum.honours || !sum.honours.length) return '';
  return `<section class="card"><h2>Season awards</h2><div class="tablewrap"><table><tbody>${sum.honours.map(h => `<tr class="${h.me ? 'me' : ''}"><td>${esc(h.name)}${h.note ? `<div class="small muted">${esc(h.note)}</div>` : ''}</td><td class="r"><b>${esc(h.winner)}</b><div class="small muted">${esc(club(h.club).name)}</div></td></tr>`).join('')}</tbody></table></div></section>`;
}

// Your summer tournament: the group table or the next tie, and a button to play on.
function summerCard() {
  const list = (S.summer || []).filter(t => t.mine);
  return list.map(t => {
    const me = t.mine, st = t.stages[t.stage];
    let body = '';
    if (t.winner) body = `<div class="award">${t.winner === me ? 'Champions!' : `Won by ${esc(teamName(t.winner))}`}</div>`;
    else {
      const f = stageFixture(t, me), opp = f ? (f[0] === me ? f[1] : f[0]) : null;
      body = `<div class="small flood"><b>Next: ${st.name}</b>${opp ? ` vs ${esc(teamName(opp))} <span class="muted">(${Math.round(teamStr(opp))} rated)</span>` : ''}</div>`;
    }
    const g = t.groups.findIndex(gr => gr.includes(me));
    const table = `<div class="tablewrap"><table><thead><tr><th>Group ${'ABCDEFGH'[g]}</th><th class="r">P</th><th class="r">GD</th><th class="r">Pts</th></tr></thead><tbody>
      ${groupTable(t, g).map((r, i) => `<tr class="${r.id === me ? 'me' : ''} ${i < 2 ? 'zone-cl' : ''}"><td class="clubname"><span class="clubcell">${crest(r.id, 'mini')}${esc(teamName(r.id))}</span></td><td class="r">${r.p}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div>`;
    const ko = t.ko.map(k => { const r = k.res.find(x => x.h === me || x.a === me); return r ? `<div class="small">${k.name}: ${esc(teamName(r.h))} ${r.gh}–${r.ga} ${esc(teamName(r.a))}${r.pens ? ` (${esc(teamName(r.pens))} on penalties)` : ''}</div>` : ''; }).join('');
    return `<section class="card hero"><div class="row"><h2>${esc(t.name)}</h2><span class="small">${isNation(me) ? esc(natName(me.slice(2))) : esc(teamName(me))}</span></div>
      ${body}${table}${ko}
      ${t.winner ? '' : `<div class="btns"><button class="btn primary sm" data-act="summerPlay">Play ${st.name.toLowerCase()}</button><button class="btn sm" data-act="summerSim">Simulate the rest</button></div>`}</section>`;
  }).join('');
}

function careerTotals(p = S.player) {
  // Season rows include cup games; the live season adds its own cup line.
  const c = p.career.concat(p === S?.player && S.phase === 'season' && p.st.cup ? [p.st.cup] : []);
  return { apps: c.reduce((s, r) => s + r.apps, 0), goals: c.reduce((s, r) => s + r.goals, 0), assists: c.reduce((s, r) => s + r.assists, 0) };
}

// Summary of a finished career: the current save after retiring, or one from the past-careers list.
function retiredHtml(rec, newAct = 'menu') {
  const t = careerTotals(rec);
  return `<section class="card hero"><h2>Career over</h2>
    <b style="font:800 28px var(--display)">${esc(rec.name)}</b>
    <div class="small muted">${POS_NAMES[rec.pos]} · ${esc(natName(rec.nat))} · Last club ${esc(rec.lastClub)} · Retired at ${rec.retiredAge}</div>
    <div class="bigstat"><div><b>${t.apps}</b><small>Apps</small></div><div><b>${t.goals}</b><small>Goals</small></div><div><b>${t.assists}</b><small>Assists</small></div><div><b>${rec.trophies.length}</b><small>Titles</small></div></div>
    <div class="small muted">Peak OVR ${rec.peak} · ${rec.caps} international caps · Earned ${money(rec.money)} in the bank</div>
    <button class="btn primary block" data-act="${newAct}">Start a new career</button></section>` + legacyCard(rec) + clubStints(rec) + careerTables(rec);
}

// Short tags for a finished career: legend status, Ballon d'Ors, and the main clubs' numbers.
function legacyTags(rec) {
  const clubs = clubLegacy(rec), tags = [];
  clubs.filter(c => c.legend).forEach(c => tags.push(['legend', `${c.club} legend`]));
  ballonDors(rec).forEach(b => tags.push(['gold', `Ballon d'Or ${seasonLabel(b.season)}${b.club ? ` · ${b.club}` : ''}`]));
  // The legend clubs, or else the club you played most games for.
  (clubs.some(c => c.legend) ? clubs.filter(c => c.legend) : clubs.slice(0, 1)).forEach(c => {
    const titles = Object.entries(c.titles).map(([n, k]) => `${k}× ${n} title${k > 1 ? 's' : ''}`).join(', ');
    tags.push(['club', `${c.club}: ${c.seasons} season${c.seasons !== 1 ? 's' : ''} · ${c.gk ? `${c.clean} clean sheets` : `${c.ga} G/A`}${titles ? ` · ${titles}` : ''}`]);
  });
  return tags;
}
const tagHtml = tags => tags.length ? `<span class="tags">${tags.map(([k, t]) => `<span class="tag ${k}">${esc(t)}</span>`).join('')}</span>` : '';

function legacyCard(rec) {
  const clubs = clubLegacy(rec), legends = clubs.filter(c => c.legend);
  const rows = clubs.slice(0, 4).map(c => {
    const titles = Object.entries(c.titles).map(([n, k]) => `${k}× ${n}`).join(', ');
    const need = c.legend ? '' : `Legend needs ${LEGEND.seasons + 1}+ seasons, ${c.gk ? `${LEGEND.clean} clean sheets` : `${LEGEND.ga} G/A`} and ${LEGEND.apps + 1}+ apps`;
    return `<div class="commit ${c.legend ? 'on' : ''}"><div><b>${esc(c.club)}</b>${c.legend ? ' <span class="tag legend">Club legend</span>' : ''}
      <div class="small muted">${c.seasons} season${c.seasons !== 1 ? 's' : ''} · ${c.apps} apps · ${c.gk ? `${c.clean} clean sheets` : `${c.goals} G · ${c.assists} A`}${titles ? ` · ${titles}` : ''}</div>${need ? `<div class="small muted">${need}</div>` : ''}</div><b class="num">${c.gk ? c.clean : c.ga}</b></div>`;
  }).join('');
  const bd = ballonDors(rec);
  return `<section class="card"><h2>Legacy</h2>
    ${legends.length ? `<p style="margin:0">Well known for your <b>${knownFor(rec).join(' and ')}</b>. A ${legends.map(c => esc(c.club)).join(' and ')} legend.</p>` : ''}
    ${['DEF', 'GK'].includes(POS_GROUP[rec.pos]) ? `<div class="small muted">${POS_GROUP[rec.pos] === 'GK' ? `${careerCleanSheets(rec)} clean sheets in all competitions (goalkeeping needs more than ${KNOWN.clean})` : `${careerTackleAvg(rec).toFixed(1)} tackles per game (defending needs ${KNOWN.tackles}+)`}</div>` : ''}
    ${bd.length ? `<div class="small flood">Ballon d'Or: ${bd.map(b => `${seasonLabel(b.season)}${b.club ? ` (${esc(b.club)})` : ''}`).join(', ')}</div>` : ''}
    <div class="commits">${rows}</div></section>`;
}

// Back-to-back seasons at the same club add up to one stint. Leaving and coming back later
// starts a new stint, so each spell keeps its own numbers.
function clubStints(rec) {
  const stints = [];
  rec.career.forEach(r => {
    const last = stints[stints.length - 1];
    if (last && last.club === r.club && r.season - last.to <= 1) {
      last.to = r.season; last.seasons.add(r.season);
      last.apps += r.apps; last.goals += r.goals; last.assists += r.assists; last.rsum += r.avg * r.apps;
    } else stints.push({ club: r.club, clubId: r.clubId, league: r.league, from: r.season, to: r.season, seasons: new Set([r.season]), apps: r.apps, goals: r.goals, assists: r.assists, rsum: r.avg * r.apps });
  });
  if (!stints.length) return '';
  const cards = stints.slice().reverse().map(s => {
    const n = s.seasons.size, span = s.from === s.to ? seasonLabel(s.from) : `${seasonLabel(s.from)} – ${seasonLabel(s.to)}`;
    return `<div class="stint"><div class="row"><div class="clubcell">${rowCrest(s)}<div style="min-width:0"><b class="club">${esc(s.club)}</b><div class="small muted">${span} · ${n} season${n !== 1 ? 's' : ''}</div></div></div></div>
      <div class="spellstats"><span><b>${s.apps}</b> apps</span><span><b>${s.goals}</b> G</span><span><b>${s.assists}</b> A</span><span><b>${s.apps ? (s.rsum / s.apps).toFixed(2) : '–'}</b></span></div></div>`;
  }).join('');
  return `<section class="card"><h2>Clubs</h2><p class="small muted" style="margin:0">Every spell at a club, all competitions added up.</p>${cards}</section>`;
}

function viewRetired() { return retiredHtml(retiredRecord()); }

// A past career opened from the landing page.
function renderPast() {
  const rec = loadArchive().find(r => r.id === pastView);
  if (!rec) { pastView = null; landing = true; render(); return; }
  app.innerHTML = `<div class="create wrap">${retiredHtml(rec, 'freshStart')}<button class="btn block" data-act="pastBack">Back</button></div>`;
}

// ---------- train ----------
function viewTrain() {
  const p = S.player, keys = attrKeys(p.pos), w = WEIGHTS[p.pos];
  const can = S.phase === 'season' && p.slots > 0 && !p.injured;
  const head = `<section class="card"><div class="row"><h2>Training</h2><span class="small"><b>${p.slots}</b>/${TRAIN_SLOTS} sessions left</span></div>
    <p class="small muted" style="margin:0">Each session uses ${TRAIN_ENERGY} energy. Your ${EQUIP_TIERS[p.equip].name.toLowerCase()} equipment gives ×${EQUIP_TIERS[p.equip].mult} XP; upgrade it in the Shop. Gains slow with age (a lot from 34) and as you get close to the maximum of ${MAX_OVR} OVR. Match ratings, goals, assists and awards also move your OVR up or down. Your OVR is weighted the way EA rates a ${POS_NAMES[p.pos].toLowerCase()}.</p>
    <p class="small" style="margin:6px 0 0">Physicality ${Math.round(physOf())}: injury risk <b class="${injuryMult() <= 1 ? 'good' : 'bad'}">×${injuryMult().toFixed(2)}</b>, and ${Math.round(seriousChance() * 100)}% of injuries are serious. More Physicality means fewer and milder injuries.</p>
    ${calcOVR() >= MAX_OVR ? `<p class="small good" style="margin:0">You are at the maximum ${MAX_OVR} OVR. Training now just keeps you sharp.</p>` : ''}
    ${p.injured ? '<p class="bad small" style="margin:0">You are injured and cannot train.</p>' : ''}
    ${S.phase !== 'season' ? '<p class="small muted" style="margin:0">Training resumes when the season starts.</p>' : ''}
  </section>`;
  const cards = keys.map(k => {
    const v = p.attrs[k], gain = trainGain(k);
    const brief = (p.objectives || []).find(o => o.kind === 'train' && o.attr === k && o.progress < o.target);
    return `<div class="attr">
      <div><span class="name">${ATTR_NAMES[k]}</span>${w[k] >= .2 ? '<span class="key">key</span>' : ''}${brief ? `<span class="key brief">Manager ${brief.progress}/${brief.target}</span>` : ''}<div class="meta">${gain ? `+${gain.toFixed(2)} per session` : 'Max OVR'} · ${Math.round(w[k] * 100)}% of your OVR</div></div>
      <div class="val num">${Math.floor(v)}<small class="dec">.${Math.floor((v % 1) * 10)}</small></div>
      <div class="bar"><i style="width:${v}%"></i></div>
      <button class="btn sm" style="grid-column:1/-1" data-act="train" data-v="${k}" ${can && p.energy >= TRAIN_ENERGY ? '' : 'disabled'}>Train ${ATTR_NAMES[k]}</button>
    </div>`;
  }).join('');
  return head + `<div class="attrs">${cards}</div>` + `<button class="btn block" data-act="rest" ${S.phase === 'season' && p.slots > 0 ? '' : 'disabled'}>Rest instead (+8 energy)</button>`;
}

// ---------- shop ----------
// Every weekly bill you are tied into: homes in each country (with lease time left), kit and agent.
function commitmentsView() {
  const p = S.player, nat = homeNat(), w = absWeek();
  const homes = [{ nat, house: p.house, end: p.house ? p.leaseEnd || 0 : 0, current: true }, ...oldLeases()];
  const rows = homes.map(h => {
    const left = Math.max(0, h.end - w);
    return `<div class="commit ${h.current ? 'on' : ''}"><div><b>${natName(h.nat)}</b> · ${HOUSING[h.house].name}${h.current ? ' <span class="chip">You live here</span>' : ' <span class="chip bad">Moved away</span>'}
      <div class="small muted">${h.house ? left ? `Lease: ${left} week${left !== 1 ? 's' : ''} left` : 'Lease done: you can move any time' : 'No lease'}</div></div>
      <b class="num bad">−${money(houseRent(h.nat, h.house))}/wk</b></div>`;
  }).join('');
  const kit = p.equip ? `<div class="commit"><div><b>${EQUIP_TIERS[p.equip].name} training kit</b><div class="small muted">Running costs, until you switch back to Normal</div></div><b class="num bad">−${money(EQUIP_TIERS[p.equip].fee)}/wk</b></div>` : '';
  const ag = p.agent ? `<div class="commit"><div><b>${agent().name}</b><div class="small muted">${Math.round(agent().cut * 100)}% of your wage</div></div><b class="num bad">−${money(agentCut())}/wk</b></div>` : '';
  return `<section class="card"><h2>Commitments</h2>
    <p class="small muted" style="margin:0">Leases follow the country you play in. Move abroad before one ends and you keep paying it until it runs out, on top of your new home.</p>
    <div class="commits">${rows}${kit}${ag}</div>
    <div class="row"><span>Total per week</span><b class="num bad">−${money(weeklyCosts())}</b></div></section>`;
}

let shopView = 'shop';
function viewShop() {
  const p = S.player;
  syncHousing();
  const seg = `<div class="seg">${[['shop', 'Kit & home'], ['commit', 'Commitments']].map(([k, l]) => `<button class="${shopView === k ? 'on' : ''}" data-act="shopView" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (shopView === 'commit') return seg + commitmentsView();
  const nat = homeNat(), away = oldLeases();
  const fin = `<section class="card"><h2>Finances</h2>
    <div class="row small"><span class="muted">Wage</span><b class="num">${money(p.wage)}/wk</b></div>
    <div class="row small"><span class="muted">Sponsors (${sponsorDeals().length} deal${sponsorDeals().length !== 1 ? 's' : ''} + image rights)</span><b class="num">${money(sponsorIncome())}/wk</b></div>
    <div class="row small"><span class="muted">Rent${away.length ? ` (incl. ${away.length} lease${away.length > 1 ? 's' : ''} abroad)` : ''}</span><b class="num bad">−${money(rentNow())}/wk</b></div>
    <div class="row small"><span class="muted">Equipment</span><b class="num bad">−${money(EQUIP_TIERS[p.equip].fee)}/wk</b></div>
    ${p.agent ? `<div class="row small"><span class="muted">Agent (${Math.round(agent().cut * 100)}% of wage)</span><b class="num bad">−${money(agentCut())}/wk</b></div>` : ''}
    <div class="row"><span>Net per week</span><b class="num ${weeklyNet() >= 0 ? 'good' : 'bad'}">${money(weeklyNet())}</b></div>
    <div class="row small"><span class="muted">Bank</span><b class="num">${money(p.money)}</b></div></section>`;
  const tiers = EQUIP_TIERS.map((t, i) => {
    const cost = equipCost(i), owned = i && !cost;
    return `<button class="house tier-${t.name.toLowerCase()} ${p.equip === i ? 'on' : ''}" data-act="equip" data-v="${i}" ${i && p.equip !== i && p.money < cost + t.fee ? 'disabled' : ''}>
      <span><b class="tiername">${t.name}</b> · ×${t.mult} training XP${t.energy ? ` · +${t.energy} energy` : ''}<br><span class="small muted">${t.desc}</span></span><span class="num small r">${!i ? 'Free' : `${owned ? 'Owned' : money(cost)}<br><span class="muted">${money(t.fee)}/wk</span>`}</span></button>`;
  }).join('');
  const left = leaseLeft();
  const houses = HOUSING.map((h, i) => `<button class="house ${p.house === i ? 'on' : ''}" data-act="house" data-v="${i}" ${p.house !== i && left ? 'disabled' : ''}>
      <span><b>${h.name}</b><br><span class="small muted">${h.energy ? `+${h.energy} energy/week` : 'No energy bonus'}${i ? ' · 1-year lease' : ' · No lease'}</span></span><span class="num small">${money(houseRent(nat, i))}/wk</span></button>`).join('');
  const lease = left ? `<p class="small flood" style="margin:0">You are tied into your lease for ${left} more week${left !== 1 ? 's' : ''}. You can move once it ends.</p>`
    : `<p class="small muted" style="margin:0">Homes are let on a one-year lease: once you move in, you can't move again until it ends.</p>`;
  const awayNote = away.length ? `<p class="small bad" style="margin:0">Still paying for ${away.map(l => `a ${HOUSING[l.house].name.toLowerCase()} in ${natName(l.nat)}`).join(' and ')}. See Commitments.</p>` : '';
  return seg + fin + `<section class="card"><h2>Training equipment</h2><p class="small muted" style="margin:0">Your equipment decides how fast your OVR rises. Buy it once, then pay weekly to keep it running; if you run out of money you drop back to Normal (you keep what you bought).</p><div class="inbox">${tiers}</div></section>` + `<section class="card"><h2>Housing in ${natName(nat)}</h2>${lease}${awayNote}<div class="inbox">${houses}</div></section>`;
}

// ---------- agent ----------
// Sponsors: your deals, brands asking for you, and brands you can sign with.
let agentView = 'agent';
function sponsorsView() {
  const p = S.player, deals = sponsorDeals(), reqs = p.sponsorReqs || [], slots = sponsorSlots(), full = deals.length >= slots;
  const cat = k => SPONSOR_CATS.find(c => c.key === k).label;
  const terms = d => `${money(d.weekly)}/wk${d.goalBonus ? ` + ${money(d.goalBonus)}/goal` : ''}`;
  const head = `<section class="card hero"><div class="row"><h2>Sponsors</h2><span class="chip">${deals.length}/${slots} slots</span></div>
    <div class="kv"><div><small>From deals</small><b class="num">${money(deals.reduce((s, d) => s + d.weekly, 0))}/wk</b></div><div><small>Image rights</small><b class="num">${money(imageRights())}/wk</b></div><div><small>Level</small><b>${SPONSOR_LEVELS[sponsorLevel()].name}</b></div></div>
    <div class="small muted">Reputation ${Math.round(p.rep)} decides which brands will talk to you${sponsorLevel() < SPONSOR_LEVELS.length - 1 ? ` (${SPONSOR_LEVELS[sponsorLevel() + 1].name} brands from ${SPONSOR_LEVELS[sponsorLevel() + 1].minRep})` : ''}. ${p.agent ? `Your ${agent().name.toLowerCase()} gets you ${Math.round((sponsorAgentMult() - 1) * 100)}% bigger fees${p.agent >= 3 ? ', an extra slot' : ''} and brands calling from reputation ${sponsorReqRep()}.` : `An agent gets bigger fees, more slots and brands calling sooner. Brands start calling you at reputation ${sponsorReqRep()}.`}</div></section>`;
  const mine = `<section class="card"><h2>Your deals</h2>${deals.length ? `<div class="commits">${deals.map(d => `<div class="commit"><div><b>${esc(d.brand)}</b> <span class="chip">${cat(d.cat)}</span><div class="small muted">${d.level} · ${d.weeks} week${d.weeks !== 1 ? 's' : ''} left</div></div><b class="num good">${terms(d)}</b></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">No sponsors yet. Sign one below.</p>'}</section>`;
  const reqHtml = reqs.length ? `<section class="card"><h2>Requests</h2><p class="small muted" style="margin:0">Brands that came to you pay a quarter more. They wait 4 weeks for an answer.</p>${reqs.map(r => `<div class="offer"><div class="row"><div><b>${esc(r.brand)}</b> <span class="chip flood">${cat(r.cat)}</span><div class="small muted">${r.level} · ${r.weeks / SEASON_WEEKS} season${r.weeks > SEASON_WEEKS ? 's' : ''} · answer within ${r.expires} week${r.expires !== 1 ? 's' : ''}</div></div><b class="num good">${terms(r)}</b></div>
    <div class="btns"><button class="btn good sm" data-act="sponsorSign" data-v="${r.id}" ${full || deals.some(d => d.cat === r.cat) ? 'disabled' : ''}>Accept</button><button class="btn sm" data-act="sponsorNo" data-v="${r.id}">Decline</button></div></div>`).join('')}</section>` : '';
  const market = sponsorMarket();
  const pickHtml = `<section class="card"><h2>Pick a sponsor</h2>${full ? '<p class="small bad" style="margin:0">All your slots are taken. More open up with reputation and a better agent.</p>' : ''}
    <div class="inbox">${market.map(o => `<button class="house" data-act="sponsorSign" data-v="${o.id}" ${full ? 'disabled' : ''}><span><b>${esc(o.brand)}</b> · ${cat(o.cat)}<br><span class="small muted">${o.level} · ${o.weeks / SEASON_WEEKS} season${o.weeks > SEASON_WEEKS ? 's' : ''}</span></span><span class="num small good">${terms(o)}</span></button>`).join('') || '<p class="small muted" style="margin:0">You have a deal in every category.</p>'}</div>
    <p class="small muted" style="margin:0">New brands appear each season.</p></section>`;
  return head + reqHtml + mine + pickHtml;
}

function viewAgent() {
  const seg = `<div class="seg">${[['agent', 'Agent'], ['sponsors', `Sponsors${(S.player.sponsorReqs || []).length ? ` (${S.player.sponsorReqs.length})` : ''}`]].map(([k, l]) => `<button class="${agentView === k ? 'on' : ''}" data-act="agentView" data-v="${k}">${l}</button>`).join('')}</div>`;
  return seg + (agentView === 'sponsors' ? sponsorsView() : agentMain());
}

function agentMain() {
  const p = S.player, ovr = calcOVR(), cur = p.agent || 0, a = agent();
  const me = `<section class="card hero"><h2>Your agent</h2>
    <div class="kv"><div><small>Agent</small><b>${a.name}</b></div><div><small>Their cut</small><b>${cur ? `${Math.round(a.cut * 100)}%` : '–'}</b></div><div><small>Per week</small><b class="num ${cur ? 'bad' : ''}">${cur ? `−${money(agentCut())}` : '–'}</b></div></div>
    <div class="small muted">${cur ? `Bigger wage offers (+${Math.round(a.wage * 100)}%), better odds in salary talks (+${Math.round(a.neg * 100)}%) and ${a.offers}× the club interest.${cur >= 4 ? ' Buying clubs also allow one extra round of talks.' : ''}` : 'You handle your own deals. An agent gets you bigger offers, more clubs calling and better odds in salary talks, and can tell the world which club you dream of joining.'}</div></section>`;
  // Dream club: status, then the button to name one.
  const w = p.wish && club(p.wish);
  const status = !w ? '' : p.wishPending
    ? `<div class="row"><span class="clubcell">${crest(p.wish, 'mini')}<b>${esc(w.name)}</b></span><span class="chip flood">Waiting</span></div><div class="small muted">They decide at the transfer window. Chance: ${wishOdds(p.wish).toLowerCase()}.</div>`
    : `<div class="row"><span class="clubcell">${crest(p.wish, 'mini')}<b>${esc(w.name)}</b></span>${p.wishResult === 'offer' ? '<span class="chip good">Offered</span>' : p.wishResult === 'no' ? '<span class="chip bad">No bid</span>' : `<span class="small muted">${seasonLabel(p.wishSeason)}</span>`}</div>`;
  const why = !cur ? 'You need an agent to do this.' : p.loan ? 'Not while you are on loan.' : p.wishSeason === S.season ? 'You can name a dream club once per season.' : '';
  const dream = `<section class="card"><h2>Dream club</h2><p class="small muted" style="margin:0">Name any club in the game. ${esc(myClub().mgr)} and the board will not like it (manager −10, board −12). The club still decides for itself: going public makes them a bit more likely to bid, but nothing is guaranteed. If they bid, it is a normal offer you can negotiate.</p>
    ${status}<div class="btns"><button class="btn primary sm" data-act="wishAsk" ${canAnnounce() ? '' : 'disabled'}>Announce dream club</button></div>${why ? `<div class="small muted">${why}</div>` : ''}</section>`;
  const log = (p.agentLog || []).slice().reverse().slice(0, 12);
  const msgs = `<section class="card"><h2>Messages</h2>${log.length ? `<div class="inbox">${log.map(m => `<div class="msg ${m.kind}">${esc(m.text)}<small>${seasonLabel(m.season)} · Week ${Math.min(m.week, SEASON_WEEKS)}</small></div>`).join('')}</div>` : '<span class="small muted">No messages from your agent yet.</span>'}</section>`;
  const rows = AGENTS.map((ag, i) => {
    const locked = ovr < ag.minOvr, poor = p.money < ag.fee;
    const perks = i ? `+${Math.round(ag.wage * 100)}% wage offers · +${Math.round(ag.neg * 100)}% talk success · ${ag.offers}× club interest · takes ${Math.round(ag.cut * 100)}%` : 'No fee, no cut, no help';
    return `<button class="house ${cur === i ? 'on' : ''}" data-act="agent" data-v="${i}" ${cur !== i && (locked || poor) ? 'disabled' : ''}>
      <span><b>${ag.name}</b><br><span class="small muted">${ag.desc}</span><br><span class="small">${perks}</span>${locked ? `<br><span class="small bad">Only takes players rated ${ag.minOvr}+</span>` : ''}</span><span class="num small">${ag.fee ? money(ag.fee) : 'Free'}</span></button>`;
  }).join('');
  const hire = `<section class="card"><h2>Agents</h2><p class="small muted" style="margin:0">Pay a fee to sign an agent, then they take a cut of your wage every week. The best agents only take players who are already good. You have ${money(p.money)}.</p><div class="inbox">${rows}</div></section>`;
  return me + dream + msgs + hire;
}

// Pick a dream club from any league in the game.
let wishLeague = null;
function showWishSheet() {
  const lid = wishLeague || myClub().league;
  const opts = S.leagues.map(l => `<option value="${l.id}" ${l.id === lid ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  const list = league(lid).clubs.map(club).filter(c => c.id !== S.player.club).sort((a, b) => teamStrength(b) - teamStrength(a)).map(c => {
    const odds = isBanned(c.id) ? 'Will not talk to you' : `Chance: ${wishOdds(c.id).toLowerCase()}`;
    return `<button class="house" data-act="wishGo" data-v="${c.id}" ${isBanned(c.id) ? 'disabled' : ''}><span class="clubcell">${crest(c.id, 'mini')}<span><b>${esc(c.name)}</b><br><span class="small muted">Team rating ${Math.round(teamStrength(c))} · ${odds}</span></span></span></button>`;
  }).join('');
  openModal(`<h3>Announce your dream club</h3><select data-act="wishLeague" class="pick">${opts}</select><div class="inbox" style="max-height:50vh;overflow:auto">${list}</div><button class="btn block" data-act="close">Cancel</button>`);
}

// ---------- club ----------
function viewClub() {
  const c = myClub();
  const lid = viewLeague || c.league;
  const head = `<section class="card"><div class="row"><div><b style="font:700 22px var(--display)">${c.name}</b><div class="small muted">Manager: ${c.mgr} (${NATIONS[c.mgrNat] || c.mgrNat})</div></div>${crest(c.id)}</div>
    <div class="small muted">${league(c.league).name} (${TIER_LABEL[clubTier(c)].toLowerCase()}) · Team rating ${Math.round(teamStrength(c))} · Your role: <b style="color:var(--chalk)">${squadStatus()}</b></div></section>`;
  const seg = `<div class="seg">${[['table', 'Table'], ['results', 'Results'], ['rivals', 'Rivals'], ['squad', 'Squad'], ['scorers', 'Goals'], ['assists', 'Assists'], ['cups', 'Cups']].map(([k, l]) => `<button class="${clubView === k ? 'on' : ''}" data-act="clubView" data-v="${k}">${l}</button>`).join('')}</div>`;
  const countries = [...new Set(S.leagues.map(l => l.country))];
  const lgSel = ['table', 'scorers', 'assists'].includes(clubView) ?`<select class="btn block" data-act="league" aria-label="League">${countries.map(ct => `<optgroup label="${ct}">${S.leagues.filter(l => l.country === ct).sort((a, b) => a.tier - b.tier).map(l => `<option value="${l.id}" ${l.id === lid ? 'selected' : ''}>${l.name}</option>`).join('')}</optgroup>`).join('')}</select>` : '';
  let body = '';
  if (clubView === 'rivals') {
    const order = peckingOrder(), slots = GROUP_SLOTS[POS_GROUP[S.player.pos]];
    body = `<section class="card"><h2>Pecking order</h2><p class="small muted" style="margin:0">Everyone fighting for the ${slots} ${{ GK: 'goalkeeper', DEF: 'defence', MID: 'midfield', FWD: 'attack' }[POS_GROUP[S.player.pos]]} spot${slots > 1 ? 's' : ''}. The manager picks on ability, affection and form. Above the line start.</p>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th>Pos</th><th class="r">OVR</th><th class="r">Affection</th></tr></thead><tbody>
      ${order.map((r, i) => `<tr class="${r.me ? 'me' : ''}" ${i === slots - 1 ? 'style="border-bottom:2px solid var(--flood)"' : ''}><td>${i + 1}</td><td class="clubname">${esc(r.n)}${r.inj ? ` <span class="bad small">injured ${r.inj}w</span>` : ''}</td><td><span class="pos-tag">${r.pos}</span></td><td class="r">${r.r}</td><td class="r">${Math.round(r.a)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  } else if (clubView === 'table') {
    const tbl = leagueTable(lid), n = tbl.length, tier = league(lid).tier;
    body = `<section class="card"><div class="tablewrap"><table><thead><tr><th>#</th><th>Club</th><th class="r">P</th><th class="r">W</th><th class="r">D</th><th class="r">L</th><th class="r">GD</th><th class="r">Pts</th></tr></thead><tbody>
      ${tbl.map((r, i) => `<tr class="${r.id === S.player.club ? 'me' : ''} ${i < (tier === 1 ? 4 : PROMOTE) ? 'zone-cl' : i >= n - PROMOTE && tier < 3 ? 'zone-rel' : ''}"><td>${i + 1}</td><td class="clubname"><span class="clubcell">${crest(r.id, "mini")}${club(r.id).name}</span></td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.d}</td><td class="r">${r.l}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td></tr>`).join('')}
      </tbody></table></div></section>`;
  } else if (clubView === 'squad') {
    const p = S.player;
    const rows = c.players.map(pl => ({ ...pl, age: ageOf(pl.by) }));
    rows.push({ n: p.name, pos: p.pos, age: ageOf(p.by), nat: p.nat, r: calcOVR(), me: true });
    rows.sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.r - a.r);
    body = `<section class="card"><div class="tablewrap"><table><thead><tr><th>Pos</th><th>Player</th><th>Nat</th><th class="r">Age</th><th class="r">OVR</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td><span class="pos-tag">${r.pos}</span></td><td class="clubname">${esc(r.n)}</td><td class="muted">${r.nat}</td><td class="r">${r.age}</td><td class="r"><b>${r.r}</b></td></tr>`).join('')}
      </tbody></table></div></section>`;
  } else if (clubView === 'results') {
    body = resultsView();
  } else if (clubView === 'cups') {
    body = cupsView();
  } else {
    const assists = clubView === 'assists', list = assists ? topAssists(lid, 15) : topScorers(lid, 15);
    body = `<section class="card"><div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th>Club</th><th class="r">${assists ? 'Assists' : 'Goals'}</th></tr></thead><tbody>
      ${list.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td class="clubname">${esc(r.n)}</td><td class="muted">${club(r.club).short}</td><td class="r"><b>${r.g}</b></td></tr>`).join('') || `<tr><td colspan="4" class="muted">No ${assists ? 'assists' : 'goals'} yet this season.</td></tr>`}
      </tbody></table></div></section>`;
  }
  return head + seg + lgSel + body;
}

// The competition chips scroll sideways with the mouse wheel and by dragging, not just by swiping.
document.addEventListener('wheel', e => {
  const row = e.target.closest && e.target.closest('.cuptabs');
  if (!row || row.scrollWidth <= row.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  row.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive: false });
let chipDrag = null;
document.addEventListener('pointerdown', e => {
  const row = e.pointerType === 'mouse' && e.target.closest && e.target.closest('.cuptabs');
  if (row) chipDrag = { row, x: e.clientX, left: row.scrollLeft, moved: false };
});
document.addEventListener('pointermove', e => {
  if (!chipDrag) return;
  const dx = e.clientX - chipDrag.x;
  if (Math.abs(dx) > 4) { chipDrag.moved = true; chipDrag.row.classList.add('drag'); }
  chipDrag.row.scrollLeft = chipDrag.left - dx;
});
document.addEventListener('pointerup', () => { if (chipDrag) { chipDrag.row.classList.remove('drag'); if (chipDrag.moved) chipDrag.row.dataset.dragged = '1'; chipDrag = null; } });
// A drag that ends on a chip shouldn't also pick it.
document.addEventListener('click', e => {
  const row = e.target.closest && e.target.closest('.cuptabs');
  if (row && row.dataset.dragged) { delete row.dataset.dragged; e.stopPropagation(); e.preventDefault(); }
}, true);

// ---------- results ----------
// Every game your club has played this season, newest first. Tap one for the goals and your numbers.
function resultsView() {
  const list = S.results || [];
  if (!list.length) return '<section class="card"><p class="small muted" style="margin:0">No games played yet this season.</p></section>';
  const rows = list.map(r => {
    // Rows saved before this update only know the opponent and the score.
    const h = r.h || (r.isHome ? S.player.club : r.opp), a = r.a || (r.isHome ? r.opp : S.player.club);
    const gh = r.h ? r.gh : r.isHome ? r.gf : r.ga, ga = r.h ? r.gaH : r.isHome ? r.ga : r.gf;
    const won = r.winner ? myTeams().includes(r.winner) : null;
    const res = r.gf > r.ga || (r.gf === r.ga && won) ? ['W', 'good'] : r.gf < r.ga || won === false ? ['L', 'bad'] : ['D', 'draw'];
    const me = r.mins ? `${r.mins}' · ${r.start ? 'Started' : 'Sub'} · ${r.goals} G · ${r.assists} A · <b>${r.rating ? r.rating.toFixed(1) : '–'}</b>` : r.rested ? 'Rested' : 'Did not play';
    const goals = r.scorers && r.scorers.length ? `<div class="scorers">${goalTimeline(r.scorers)}</div>` : r.scorers ? '<p class="small muted" style="margin:0">No goals.</p>' : '';
    return `<details class="result"><summary>
        <span class="rmeta"><span class="small muted">Wk ${Math.min(r.week, SEASON_WEEKS)}</span><span class="rcomp ${r.kind || 'league'}">${esc(r.comp || 'League')}</span></span>
        <span class="rline">${tieRow(h, a, { gh, ga, pens: r.pens, winner: r.winner || (gh > ga ? h : ga > gh ? a : null) })}</span>
        <span class="rbadge ${res[1]}">${res[0]}</span></summary>
      <div class="rbody">${r.stage ? `<div class="small muted">${esc(r.stage)}</div>` : ''}${goals}<div class="small muted">You: ${me}</div></div></details>`;
  }).join('');
  return `<section class="card"><h2>Results</h2><div class="results">${rows}</div></section>`;
}

// ---------- cups ----------
// One competition at a time, picked from a row of chips. Ties show both crests, the winner in
// bold and the loser faded; your own ties are highlighted. Newest round first.
let cupTab = null, cupPart = null;

function tieRow(h, a, r) {
  const mine = myTeams().includes(h) || myTeams().includes(a);
  const side = (x, right) => {
    const cls = !r || !r.winner ? '' : r.winner === x ? 'w' : 'l';
    return `<span class="tside ${right ? 'r' : ''} ${cls}">${right ? '' : crest(x, 'mini')}<span class="tname">${esc(teamName(x))}</span>${right ? crest(x, 'mini') : ''}</span>`;
  };
  return `<div class="tie2 ${mine ? 'me' : ''}">${side(h)}<span class="tscore num">${r ? `${r.gh}–${r.ga}` : 'v'}${r && r.pens ? '<small>pens</small>' : ''}</span>${side(a, true)}</div>`;
}
const roundBlock = (name, meta, ties) => `<div class="round"><div class="roundhead"><b>${name}</b>${meta ? `<span class="muted">${meta}</span>` : ''}</div>${ties}</div>`;

// Where your team stands in a competition, in one line.
function cupStatus(t, inIt, out) {
  if (t.winner) return `<div class="cupstatus ${myTeams().includes(t.winner) ? 'good' : ''}">${crest(t.winner, 'mini')}<span>Winner: <b>${esc(teamName(t.winner))}</b></span></div>`;
  if (!inIt) return '<div class="cupstatus muted">You are not in this competition.</div>';
  return out ? '<div class="cupstatus bad">You are out.</div>' : '<div class="cupstatus good">You are still in.</div>';
}

// Group-and-knockout competitions: European cups and summer tournaments.
function tournamentHtml(t) {
  const mineIn = t.groups.flat().some(id => myTeams().includes(id));
  const st = t.stages[t.stage], lp = t.format === 'league';
  const stillIn = mineIn && myTeams().some(id => alive(t, id));
  const part = cupPart === 'groups' || cupPart === 'ko' ? cupPart : t.ko.length ? 'ko' : 'groups';
  const next = !t.winner && st ? `<div class="small muted">Next: <b>${st.name}</b>${t.key in { UCL: 1, UEL: 1, UECL: 1 } ? ` · week ${euroWeeks(t)[t.stage]}` : ''}</div>` : '';
  const seg = `<div class="seg">${[['ko', 'Knockouts'], ['groups', lp ? 'League phase' : 'Groups']].map(([k, l]) => `<button class="${part === k ? 'on' : ''}" data-act="cupPart" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body;
  if (part === 'ko') {
    // Two-legged ties show the aggregate with both legs underneath; a tie halfway through shows its first leg.
    // Both legs from the left-hand club's side (away first, then at home), so they add up to the aggregate.
    const legLine = r => r.legs ? `<div class="legs small muted">1st leg (away) ${r.legs[0].ga}–${r.legs[0].gh} · 2nd leg (home) ${r.legs[1].gh}–${r.legs[1].ga}</div>` : '';
    const koRound = k => k.res.length
      ? roundBlock(k.name, `${k.res.length} tie${k.res.length > 1 ? 's' : ''}${k.legs ? ' · two legs' : ''}`, k.res.map(r => tieRow(r.h, r.a, r) + legLine(r)).join(''))
      : roundBlock(k.name, '1st legs played', k.legs[0].map(r => tieRow(r.h, r.a, { gh: r.gh, ga: r.ga })).join(''));
    body = t.ko.length ? t.ko.slice().reverse().map(koRound).join('')
      : `<p class="small muted" style="margin:0">${lp ? 'The knockouts start after the league phase: 9th to 24th play a knockout play-off, then the top 8 join the winners in the round of 16.' : 'The knockouts start after the group stage. The top two in each group go through.'}</p>`;
  } else if (lp) {
    // One 36-club table: green = round of 16, amber = knockout play-off, the rest are out.
    // Last five: newest on the right, grey dots for games not played yet.
    const last5 = id => { const f = (t.form && t.form[id]) || [], show = f.slice(-5); return `<span class="last5">${show.map(x => `<i class="f${x}">${x === 'W' ? '✓' : x === 'L' ? '✕' : '–'}</i>`).join('')}${'<i></i>'.repeat(5 - show.length)}</span>`; };
    body = `<div class="tablewrap"><table class="grp lp"><thead><tr><th>#</th><th>Club</th><th class="r">MP</th><th class="r">W</th><th class="r">D</th><th class="r">L</th><th class="r">GF</th><th class="r">GA</th><th class="r">GD</th><th class="r">Pts</th>${t.form ? '<th>Last 5</th>' : ''}</tr></thead><tbody>
      ${leaguePhaseTable(t).map((r, i) => `<tr class="${myTeams().includes(r.id) ? 'me' : ''} ${i < 8 ? 'zone-cl' : i < 24 ? 'zone-po' : 'zone-out'}"><td class="muted">${i + 1}</td><td class="clubname"><span class="clubcell">${crest(r.id, 'mini')}<span class="tname">${esc(teamName(r.id))}</span></span></td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.d}</td><td class="r">${r.l}</td><td class="r">${r.gf}</td><td class="r">${r.ga}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td>${t.form ? `<td>${last5(r.id)}</td>` : ''}</tr>`).join('')}
      </tbody></table></div><p class="small muted" style="margin:0">Each club plays 8 opponents, two from each pot, four at home and four away, none from its own country. <span class="good">1–8</span> go straight to the round of 16, <span class="flood">9–24</span> play a two-legged knockout play-off (9th–16th seeded against 17th–24th), 25–36 are out.</p>`;
  } else {
    // Your group first.
    const order = t.groups.map((g, gi) => gi).sort((a, b) => (t.groups[b].some(id => myTeams().includes(id)) ? 1 : 0) - (t.groups[a].some(id => myTeams().includes(id)) ? 1 : 0));
    body = `<div class="cupgrid">${order.map(gi => `<div class="tablewrap"><table class="grp"><thead><tr><th>Group ${'ABCDEFGH'[gi]}</th><th class="r">P</th><th class="r">W</th><th class="r">D</th><th class="r">L</th><th class="r">GD</th><th class="r">Pts</th></tr></thead><tbody>
      ${groupTable(t, gi).map((r, i) => `<tr class="${myTeams().includes(r.id) ? 'me' : ''} ${i < 2 ? 'zone-cl' : ''}"><td class="clubname"><span class="clubcell">${crest(r.id, 'mini')}${esc(teamName(r.id))}</span></td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.d}</td><td class="r">${r.l}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td></tr>`).join('')}
      </tbody></table></div>`).join('')}</div><p class="small muted" style="margin:0">Top two in each group (green line) reach the knockouts.</p>`;
  }
  return `<section class="card"><div class="row"><h2>${esc(t.name)}</h2></div>${cupStatus(t, mineIn, !stillIn)}${next}${seg}${body}</section>`;
}

// A domestic knockout cup: the next draw first, then every round played, newest first.
function domesticCupHtml(t) {
  const id = S.player.club;
  // Early rounds of a big cup have dozens of ties: show yours, plus later rounds in full.
  const show = (list, getHA) => list.filter(x => list.length <= 8 || getHA(x).includes(id));
  const next = t.winner ? '' : (() => {
    const list = show(t.ties, x => x);
    const meta = `week ${t.weeks[t.r]}${t.r === 0 && t.byes.length ? ` · ${t.byes.length} byes` : ''}${list.length < t.ties.length ? ` · ${t.ties.length} ties` : ''}`;
    return roundBlock(`Next: ${cupStage(t)}`, meta, list.map(([h, a]) => tieRow(h, a, null)).join('') || '<p class="small muted" style="margin:0">Your club is not in this round.</p>');
  })();
  const rounds = t.rounds.slice().reverse().map(rd => {
    const list = show(rd.res, r => [r.h, r.a]);
    return list.length ? roundBlock(rd.name, list.length < rd.res.length ? `${rd.res.length} ties` : '', list.map(r => tieRow(r.h, r.a, r)).join('')) : '';
  }).join('');
  const inIt = t.teams.includes(id);
  const out = !t.winner && !t.ties.some(x => x.includes(id)) && !(t.r === 0 && t.byes.includes(id));
  return `<section class="card"><div class="row"><h2>${esc(t.name)}</h2></div>${cupStatus(t, inIt, out)}${next}${rounds}</section>`;
}

function cupsView() {
  const myNat = league(myClub().league).nat;
  // Other countries' domestic cups would crowd the list out.
  const foreignCups = new Set(Object.entries(DOMESTIC).filter(([n]) => n !== myNat).flatMap(([, defs]) => defs.map(d => d.key)));
  const comps = [
    ...Object.values(S.cups || {}).filter(t => t.nat === myNat).map(t => ({ key: 'd:' + t.key, name: t.name, html: () => domesticCupHtml(t), mine: t.teams.includes(S.player.club) })),
    ...Object.values(S.euro || {}).map(t => ({ key: 'e:' + t.key, name: t.name, html: () => tournamentHtml(t), mine: t === euroComp() })),
    ...(S.summer || []).map(t => ({ key: 's:' + t.key, name: t.name, html: () => tournamentHtml(t), mine: t.groups.flat().some(id => myTeams().includes(id)) })),
  ];
  const past = (S.history || []).slice().reverse().filter(h => !foreignCups.has(h.key)).slice(0, 20);
  comps.push({ key: 'winners', name: 'Past winners', html: () => past.length ? `<section class="card"><h2>Recent winners</h2><div class="tablewrap"><table><tbody>${past.map(h => `<tr><td class="muted">${seasonLabel(h.season)}</td><td>${esc(h.name)}</td><td class="r"><span class="clubcell" style="justify-content:flex-end">${crest(h.winner, 'mini')}<b>${esc(teamName(h.winner))}</b></span></td></tr>`).join('')}</tbody></table></div></section>` : '<section class="card"><p class="small muted" style="margin:0">No winners yet: the first season is still going.</p></section>' });
  // Default to a competition you are in.
  const cur = comps.find(c => c.key === cupTab) || comps.find(c => c.mine) || comps[0];
  const chips = `<div class="cuptabs">${comps.map(c => `<button class="${c === cur ? 'on' : ''} ${c.mine ? 'mine' : ''}" data-act="cupTab" data-v="${c.key}">${esc(c.name.replace(/ \d{4}$/, ''))}</button>`).join('')}</div>`;
  const year = START_YEAR + S.season + 1;
  const nextSummer = SUMMER_EVENTS.map(ev => { const y = nextEventYear(ev, year); return [y, `${ev.name} ${y}`]; }).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, 3).join(' · ');
  return chips + cur.html() + `<p class="small muted" style="margin:0 4px">Cup games are midweek. European places come from the league table. Next summer tournaments: ${nextSummer}.</p>`;
}

// ---------- career ----------
function careerTables(p = S.player) {
  return careerHistory(p) + honoursCardTabs(p);
}

// Crest for a career row, only when that club exists in the save on screen.
function rowCrest(r) {
  if (!S || !S.clubs) return '';
  const name = r.club.replace(' (loan)', ''), c = (r.clubId && S.clubs[r.clubId] && S.clubs[r.clubId].name === name) ? S.clubs[r.clubId] : clubByName(name);
  return c ? crest(c.id, 'mini') : '';
}

// SofaScore-style history: one block per season, clubs side by side, tap for every competition.
function careerHistory(p = S.player) {
  const rows = p.career.slice();
  if (p === S?.player && S.phase === 'season' && p.st && p.st.apps + p.st.cup.apps > 0) rows.push({ ...careerRow(p.st, myClub()), live: true });
  if (!rows.length) return '<section class="card"><h2>Career history</h2><span class="small muted">Your first season is under way.</span></section>';
  const bySeason = {};
  rows.forEach(r => (bySeason[r.season] = bySeason[r.season] || []).push(r));
  const line = (n, c) => `<tr><td>${esc(n)}</td><td class="r">${c.apps}</td><td class="r">${c.goals}</td><td class="r">${c.assists}</td><td class="r">${c.apps ? (c.rsum / c.apps).toFixed(2) : '–'}</td></tr>`;
  const compTable = list => `<div class="tablewrap"><table class="comps"><thead><tr><th>Competition</th><th class="r">App</th><th class="r">G</th><th class="r">A</th><th class="r">Avg</th></tr></thead><tbody>${list.map(([n, c]) => line(n, c)).join('')}</tbody></table></div>`;
  const ORDER = { league: 0, cup: 1, euro: 2 };
  const seasons = Object.keys(bySeason).map(Number).sort((a, b) => b - a).map(s => {
    const spells = bySeason[s];
    const cards = spells.map(r => `<div class="spell"><div class="clubcell">${rowCrest(r)}<div style="min-width:0"><b class="club">${esc(r.club)}</b><div class="small muted">${esc(r.league)}</div></div></div>
      <div class="spellstats"><span><b>${r.apps}</b> apps</span><span><b>${r.goals}</b> G</span><span><b>${r.assists}</b> A</span><span><b>${r.apps ? r.avg.toFixed(2) : '–'}</b></span></div></div>`).join('');
    const clubParts = spells.map(r => {
      const list = Object.entries(r.comps || {}).filter(([, c]) => c.kind !== 'nat').sort((a, b) => ORDER[a[1].kind] - ORDER[b[1].kind]);
      // Two clubs side by side are too narrow for a table: one line per competition instead.
      const compact = list.map(([n, c]) => `<div class="compline"><span>${esc(n)}</span><span class="small muted">${c.apps} apps · ${c.goals} G · ${c.assists} A</span></div>`).join('');
      return `<div class="spellcomps">${list.length ? (spells.length > 1 ? compact : compTable(list)) : '<span class="small muted">No breakdown recorded for this season.</span>'}</div>`;
    }).join('');
    const nat = spells.flatMap(r => Object.entries(r.comps || {}).filter(([, c]) => c.kind === 'nat'));
    const ovr = spells[spells.length - 1].ovr;
    return `<details class="season"><summary><div class="row"><b>${seasonLabel(s)}${spells.some(r => r.live) ? ' <span class="small flood">ongoing</span>' : ''}</b><span class="small muted">OVR ${ovr} ▾</span></div><div class="spells n${Math.min(spells.length, 2)}">${cards}</div></summary>
      <div class="spells n${Math.min(spells.length, 2)}">${clubParts}</div>
      ${nat.length ? `<div class="small muted" style="margin-top:8px">${esc(natName(p.nat))}</div>${compTable(nat)}` : ''}</details>`;
  }).join('');
  return `<section class="card"><h2>Career history</h2><p class="small muted" style="margin:0">Tap a season to see every competition you played in.</p>${seasons}</section>`;
}

// Honours split into what you won yourself, with your clubs and with your country.
const NAT_EVENT = /^(World Cup|European Championship|Copa América|AFC Asian Cup|Africa Cup of Nations)\b/;
function honoursCardTabs(p = S.player) {
  const natNames = new Set(Object.keys({ ...NATIONS, ...(typeof EXTRA_NATIONS !== 'undefined' ? EXTRA_NATIONS : {}) }).map(natName));
  const isNatTrophy = t => t.nat || natNames.has(t.club);
  const groups = {
    ind: p.awards.filter(a => !(a.nat || NAT_EVENT.test(a.name))).map(a => ({ name: a.name, season: a.season })),
    club: p.trophies.filter(t => !isNatTrophy(t)).map(t => ({ name: t.name, sub: t.club, season: t.season })),
    nat: [...p.trophies.filter(isNatTrophy).map(t => ({ name: t.name, season: t.season })), ...p.awards.filter(a => a.nat || NAT_EVENT.test(a.name)).map(a => ({ name: a.name, season: a.season }))],
  };
  // The same honour won more than once shows as one line with a count and every season.
  const grouped = list => {
    const m = new Map();
    list.forEach(h => { const k = h.name + '|' + (h.sub || ''); const g = m.get(k) || { ...h, seasons: [] }; g.seasons.push(h.season); m.set(k, g); });
    return [...m.values()].sort((a, b) => b.seasons.length - a.seasons.length || Math.min(...a.seasons) - Math.min(...b.seasons));
  };
  const tabs = [['ind', 'Individual'], ['club', 'Club'], ['nat', 'Country']];
  const list = grouped(groups[honTab] || []);
  const empty = { ind: 'No individual awards yet.', club: 'No club trophies yet.', nat: 'Nothing won with your country yet.' }[honTab];
  // Club and Country read like a Wikipedia honours list: the team as a heading, then
  // "Competition: season, season" under it.
  // National tournaments are played in the summer after the season, so they show a single year.
  const label = honTab === 'nat' ? s => String(START_YEAR + s + 1) : seasonLabel;
  const hline = h => `<div class="honline"><b>${esc(h.name)}</b>: ${h.seasons.slice().sort((a, b) => a - b).map(label).join(', ')}</div>`;
  const teamBlock = (name, items, crestHtml = '', sub = '') => `<div class="honteam"><div class="clubcell">${crestHtml}<span><b class="honhead">${esc(name)}</b>${sub ? `<div class="small muted">${sub}</div>` : ''}</span></div>${items.map(hline).join('')}</div>`;
  let body;
  if (honTab === 'club') {
    const teams = new Map();
    list.forEach(h => { const t = teams.get(h.sub) || []; t.push(h); teams.set(h.sub, t); });
    // Clubs in the order you first won something there.
    body = [...teams.entries()].sort((a, b) => Math.min(...a[1].flatMap(h => h.seasons)) - Math.min(...b[1].flatMap(h => h.seasons)))
      .map(([name, items]) => { const c = S && S.clubs ? clubByName(name) : null; return teamBlock(name, items, c ? crest(c.id, 'mini') : ''); }).join('');
  } else if (honTab === 'nat') body = teamBlock(natName(p.nat), list, '', `${p.caps || 0} caps · ${p.intlGoals || 0} goals`);
  else body = `<div class="honteam">${list.map(hline).join('')}</div>`;
  return `<section class="card"><h2>Honours</h2><div class="seg">${tabs.map(([k, l]) => `<button class="${honTab === k ? 'on' : ''}" data-act="honTab" data-v="${k}">${l} (${grouped(groups[k]).reduce((n, g) => n + g.seasons.length, 0)})</button>`).join('')}</div>
    ${list.length ? body : honTab === 'nat' ? teamBlock(natName(p.nat), [], '', `${p.caps || 0} caps · ${p.intlGoals || 0} goals · nothing won yet`) : `<span class="small muted">${empty}</span>`}</section>`;
}

function viewCareer() {
  const p = S.player, t = careerTotals();
  // In the summer this season is already in the career rows.
  const live = S.phase === 'season' ? p.st : { apps: 0, goals: 0, assists: 0 };
  const value = Math.round(marketWage(calcOVR(), myClub()) * 52 * Math.max(1, 30 - ageOf(p.by)) / 3 / 1e4) * 1e4;
  return `<section class="card hero"><h2>Profile</h2>
      <div class="kv"><div><small>Position</small><b>${POS_NAMES[p.pos]}</b></div><div><small>Nation</small><b>${natName(p.nat)}</b></div><div><small>Country</small><b class="${calledUp() ? 'good' : ''}">${calledUp() ? 'In squad' : 'Not picked'}</b></div>
      <div><small>Reputation</small><b>${Math.round(p.rep)}/100</b></div><div><small>Value</small><b>${money(value)}</b></div><div><small>Caps</small><b>${p.caps}${p.intlGoals ? ` (${p.intlGoals}g)` : ''}</b></div></div>
      <div class="small muted">${nationNote()} Max OVR is ${MAX_OVR}.</div></section>
    <section class="card"><h2>This season</h2><div class="bigstat"><div><b>${p.st.apps}</b><small>Apps</small></div><div><b>${p.st.goals}</b><small>Goals</small></div><div><b>${p.st.assists}</b><small>Assists</small></div><div><b>${avgRating(p.st)}</b><small>Rating</small></div></div>
      ${p.st.cup && p.st.cup.apps ? `<div class="small muted">Cups: ${p.st.cup.apps} apps · ${p.st.cup.goals} goals · ${p.st.cup.assists} assists</div>` : ''}
      ${(p.seasonSpells || []).length ? `<div class="small muted">These are your numbers at ${esc(myClub().name)}. Earlier spells this season have their own rows in your career history.</div>` : ''}
      <div class="small muted">Career: ${t.apps + live.apps} apps · ${t.goals + live.goals} goals · ${t.assists + live.assists} assists</div></section>
    ${careerTables()}
    <section class="card"><h2>Game</h2><p class="small muted" style="margin:0">Progress saves automatically on this device. Export a backup to keep it safe or move it to another device.</p>
      <div class="btns"><button class="btn sm" data-act="exportSave">Export save</button><button class="btn sm" data-act="importAsk">Import save</button></div>
      <button class="btn block" data-act="menu">Main menu</button>
      ${S.phase !== 'retired' ? '<button class="btn danger block" data-act="retireAsk">Retire now</button>' : ''}
      <button class="btn ${S.phase === 'retired' ? 'primary' : 'danger'} block" data-act="${S.phase === 'retired' ? 'menu' : 'newAsk'}">Start a new career</button></section>`;
}

// Why you are (or aren't) in your national team.
function nationNote() {
  const p = S.player, nat = esc(natName(p.nat)), floor = callUpFloor(p.nat), ahead = natRivals();
  if (calledUp()) return ahead.length ? `You are in the ${nat} squad, with ${esc(ahead[0].n)} (${ahead[0].r}) ahead of you at ${p.pos}.` : `You are ${nat}'s first-choice ${p.pos}.`;
  if (calcOVR() < floor) return `${nat} only look at players rated ${floor}+.`;
  return `${ahead.length} compatriots are ahead of you at ${p.pos}: ${ahead.slice(0, 3).map(r => `${esc(r.n)} (${r.r})`).join(', ')}. With two or more ahead, you are left out.`;
}

function showExport() {
  const data = exportSave();
  let link = '';
  try { link = URL.createObjectURL(new Blob([data], { type: 'application/json' })); } catch (e) { /* no blob support */ }
  openModal(`<h3>Export save</h3><p class="small muted" style="margin:0">Download the file, or copy the text below and keep it somewhere safe.</p>
    <textarea class="savebox" readonly>${esc(data)}</textarea>
    <div class="btns">${link ? `<a class="btn primary sm" href="${link}" download="pitch-to-legend-${esc(S.player.name.replace(/\W+/g, '-'))}-${seasonLabel().replace('/', '-')}.json">Download file</a>` : ''}<button class="btn sm" data-act="copySave">Copy text</button><button class="btn sm" data-act="close">Close</button></div>`);
}

function showImport() {
  openModal(`<h3>Import save</h3><p class="small muted" style="margin:0">This replaces the career on this device. Pick a save file or paste the save text.</p>
    <input type="file" id="importFile" accept=".json,application/json" class="btn block">
    <textarea class="savebox" id="importText" placeholder="Or paste save text here"></textarea>
    <div class="btns"><button class="btn danger sm" data-act="importGo">Replace my career</button><button class="btn sm" data-act="close">Cancel</button></div>`);
  document.getElementById('importFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) f.text().then(t => { document.getElementById('importText').value = t; });
  });
}

// ---------- modals ----------
// ---------- event pop-ups ----------
// Good news gets fireworks, bad news gets a dark, rainy screen. Shown one at a time.
const fxLayer = document.createElement('div');
fxLayer.id = 'fx';
fxLayer.hidden = true;
document.body.appendChild(fxLayer);
let fxFrame = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const POP_ICON = {
  good: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>',
  bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 15a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
};

function nextPopup() {
  if (!S || !modal.hidden || !fxLayer.hidden) return;
  const pop = POPUPS.shift();
  if (pop) showPopup(pop);
  else if (S.decision) showDecision();
}

// Goals and assists: one ball per goal, one boot per assist, and a show that grows with the haul.
function showHaul(pop) {
  const lvl = Math.min(pop.goals, 6);
  const icons = (svg, n, cls) => Array.from({ length: n }, (_, i) => `<span class="${cls}" style="animation-delay:${.15 + i * .12}s">${svg}</span>`).join('');
  fxLayer.className = `haul ${lvl ? `lvl${lvl}` : 'assist'}`;
  fxLayer.innerHTML = `<canvas></canvas><div class="pop" role="dialog" aria-modal="true">
    ${pop.goals ? `<div class="haul-icons">${icons(BALL, pop.goals, 'hb')}</div>` : ''}
    ${pop.assists ? `<div class="haul-icons small-row">${icons(BOOT, pop.assists, 'hs')}</div>` : ''}
    <h3>${esc(pop.title)}</h3><p>${esc(pop.text)}</p>
    <button class="btn primary block" data-act="popNext">Continue</button></div>`;
  fxLayer.hidden = false;
  startFx(fxLayer.querySelector('canvas'), 'haul', lvl);
}

function showPopup(pop) {
  if (pop.kind === 'haul') { showHaul(pop); return; }
  fxLayer.className = pop.kind;
  fxLayer.innerHTML = `<canvas></canvas><div class="pop" role="dialog" aria-modal="true">
    <div class="pop-icon">${POP_ICON[pop.kind]}</div><h3>${esc(pop.title)}</h3><p>${esc(pop.text)}</p>
    <button class="btn ${pop.kind === 'good' ? 'primary' : ''} block" data-act="popNext">Continue</button></div>`;
  fxLayer.hidden = false;
  startFx(fxLayer.querySelector('canvas'), pop.kind);
}

function closePopup() {
  cancelAnimationFrame(fxFrame);
  fxLayer.hidden = true;
  fxLayer.innerHTML = '';
  nextPopup();
}

function startFx(canvas, kind, lvl = 0) {
  const dpr = window.devicePixelRatio || 1, ctx = canvas.getContext('2d');
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const parts = [], balls = [];
  const haul = kind === 'haul';
  // Hauls: assists sparkle green, goals get gold, and every extra goal makes the show faster and bigger.
  const colors = haul && !lvl ? ['#4cc38a', '#eef2f7', '#9be7c0'] : haul && lvl < 3 ? ['#ffb547', '#eef2f7', '#ffd38a'] : ['#ffb547', '#4cc38a', '#eef2f7', '#7cc7ff', '#ff9ec7'];
  const gap = haul ? [1100, 900, 650, 450, 350, 280, 200][lvl] : 650, size = haul ? 30 + lvl * 10 : 46;
  let last = 0;
  const burst = () => {
    const x = W * rand(.15, .85), y = H * rand(.12, .45), col = haul && lvl >= 6 ? `hsl(${rand(0, 360)},90%,65%)` : pick(colors);
    for (let i = 0; i < size; i++) {
      const a = Math.PI * 2 * i / size, s = rand(1.5, 4.2) * dpr * (haul ? 1 + lvl * .08 : 1);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col, r: rand(1.5, 2.6) * dpr });
    }
  };
  const drops = kind === 'bad' ? Array.from({ length: 90 }, () => ({ x: rand(0, W), y: rand(0, H), v: rand(4, 9) * dpr, l: rand(10, 26) * dpr })) : [];
  const frame = t => {
    ctx.clearRect(0, 0, W, H);
    if (kind === 'good' || haul) {
      if (t - last > gap) { burst(); last = t; }
      // Hat-trick and up: footballs rain down.
      if (haul && lvl >= 3 && Math.random() < .05 * (lvl - 2)) balls.push({ x: rand(0, W), y: -20 * dpr, v: rand(2, 4.5) * dpr, r: rand(7, 12) * dpr, spin: rand(0, 6) });
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.y += b.v; b.spin += .05;
        if (b.y > H + b.r) { balls.splice(i, 1); continue; }
        ctx.globalAlpha = .9;
        ctx.fillStyle = '#eef2f7'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
        ctx.fillStyle = '#0c1524'; ctx.beginPath();
        for (let k = 0; k < 5; k++) { const a = b.spin + k * 1.2566; ctx.lineTo(b.x + Math.cos(a) * b.r * .42, b.y + Math.sin(a) * b.r * .42); }
        ctx.fill();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.x += q.vx; q.y += q.vy; q.vy += .045 * dpr; q.vx *= .985; q.life -= .011;
        if (q.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = q.life;
        ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(150,170,200,.35)';
      ctx.lineWidth = dpr;
      drops.forEach(d => {
        d.y += d.v; d.x -= d.v * .15;
        if (d.y > H) { d.y = -d.l; d.x = rand(0, W * 1.1); }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * .15, d.y - d.l); ctx.stroke();
      });
    }
    if (!reduceMotion) fxFrame = requestAnimationFrame(frame);
  };
  if (kind === 'good') { burst(); burst(); }
  if (haul) for (let i = 0; i < 1 + Math.ceil(lvl / 2); i++) burst();
  fxFrame = requestAnimationFrame(frame);
}

function showDecision() {
  const d = S.decision;
  const opts = d.type === 'recall'
    ? [['return', 'Go back now', 'Your loan ends and you rejoin the squad straight away'], ['stay', 'Ask to stay on loan', `${club(d.club).mgr} will be disappointed (−8 when you return)`]]
    : d.type === 'rumour'
    ? [['deny', 'Deny it publicly', 'The manager likes loyalty (+3)'], ['silent', 'Say nothing', 'He wonders why you stayed quiet (−1)']]
    : [['reject', 'Reject them', `Show you are committed (+${d.rival ? 8 : 4}${d.rival ? ', rivals!' : ''})`], ['listen', 'Tell your agent to listen', 'They may bid in the window (−2)']];
  openModal(`<h3>${{ recall: 'Recalled from loan', rumour: 'Rumours', approach: 'Transfer approach' }[d.type]}</h3><p style="margin:0">${esc(d.text)}</p>
    <div class="inbox">${opts.map(([v, l, s]) => `<button class="house" data-act="decide" data-v="${v}"><span><b>${l}</b><br><span class="small muted">${s}</span></span></button>`).join('')}</div>`);
}

function showOrderSheet() {
  const o = S.player.order;
  openModal(`<h3>Manager's plan</h3><p style="margin:0">Before the game, ${myClub().mgr} pulls you aside: “${esc(o.text)}”</p>
    <div class="inbox">
      <button class="house" data-act="orderGo" data-v="follow"><span><b>Follow the plan</b><br><span class="small muted">Slightly better chance of winning, same scoring chance. Affection +2 if you play.</span></span></button>
      <button class="house" data-act="orderGo" data-v="own"><span><b>Play my own game</b><br><span class="small muted">Better chance to score, worse chance of winning. Goal or assist in a win: +2. Goal or assist without winning: −2. Neither: −6.</span></span></button>
    </div>`);
}

function doAdvance() { const rep = advanceWeek(); render(); if (rep) showMatchReport(rep); }

function openModal(html) { modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; modal.hidden = false; }
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

// One finished game: score, scorers and your own numbers.
const BALL = '<svg class="ico ball" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-label="Goal"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/><path d="M12 7.5V3M16 10.4l4.3-1.4M14.5 15.1l2.7 3.7M9.5 15.1l-2.7 3.7M8 10.4L3.7 9"/></svg>';
const BOOT = '<svg class="ico boot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Assist"><path d="M3 6h6l1 4c3.5 0 7 1 9.5 3.2 1 .9 1.5 2 1.5 3.3V18H3z"/><path d="M5 18v2M9 18v2M13 18v2M17 18v2"/></svg>';

// Goals in the order they went in: home side on the left, away side on the right.
function goalTimeline(scorers) {
  const list = scorers.some(s => s.min) ? [...scorers].sort((x, y) => (x.min || 0) - (y.min || 0)) : scorers;
  return list.map(s => {
    const goal = `<div class="g ${s.home ? '' : 'a'}">
      <div class="${s.me ? 'me' : ''}">${BALL}<span>${esc(s.n)}</span>${s.min ? `<b class="num">${s.min}'</b>` : ''}</div>
      ${s.ast ? `<div class="ast ${s.astMe ? 'me' : ''}">${BOOT}<span>${esc(s.ast)}</span></div>` : ''}</div>`;
    return s.home ? goal + '<div></div>' : '<div></div>' + goal;
  }).join('');
}

function matchBlock(m, title, injured) {
  const u = m.user;
  const sc = goalTimeline(m.scorers);
  const mine = m.isHome ? m.gh : m.ga, theirs = m.isHome ? m.ga : m.gh;
  const won = m.winner ? m.winner === (m.isHome ? m.h : m.a) : null;
  const verdict = mine > theirs || (mine === theirs && won) ? '<span class="good">Win</span>' : mine < theirs || won === false ? '<span class="bad">Defeat</span>' : '<span class="muted">Draw</span>';
  return `<div class="row"><h3>${title}</h3>${verdict}</div>
    <div class="fixture"><div class="team">${crest(m.h)}<b>${esc(teamName(m.h))}</b></div><div class="score num">${m.gh}–${m.ga}</div><div class="team">${crest(m.a)}<b>${esc(teamName(m.a))}</b></div></div>
    ${m.pens ? `<div class="small muted" style="text-align:center">${esc(teamName(m.pens))} win on penalties</div>` : ''}
    ${m.agg ? `<div class="small muted" style="text-align:center">Aggregate ${m.agg[0]}–${m.agg[1]}: <b>${esc(teamName(m.winner))}</b> go through</div>` : ''}
    ${sc ? `<div class="scorers">${sc}</div>` : ''}
    ${u && u.mins ? `<div class="bigstat"><div><b>${u.rating.toFixed(1)}</b><small>Rating</small></div><div><b>${u.mins}'</b><small>${u.start ? 'Started' : 'Sub'}</small></div><div><b>${u.goals}</b><small>Goals</small></div><div><b>${u.assists}</b><small>Assists</small></div></div>${u.tackles ? `<div class="small muted" style="text-align:center">${u.tackles} tackle${u.tackles !== 1 ? 's' : ''}</div>` : ''}`
      : `<p class="muted" style="margin:0">${injured ? 'You were out injured.' : u && u.rested ? `Rested: you need ${TWO_GAME_ENERGY}+ energy to play twice in a week.` : 'You stayed on the bench.'}</p>`}`;
}

function showMatchReport(rep) {
  const m = rep.match;
  const p = S.player;
  const injured = p.injured || rep.events.some(e => e.startsWith('Injured'));
  let html = '';
  if (m) html += matchBlock(m, 'Full time', injured);
  else if (!rep.cup) html += `<h3>Week ${rep.week} done</h3><p class="muted" style="margin:0">No match this week.</p>`;
  if (rep.cup) html += matchBlock(rep.cup, `${rep.cup.comp} · ${rep.cup.stage}`, injured);
  html += rep.events.map(e => `<div class="award">${esc(e)}</div>`).join('');
  html += `<div class="row small"><span class="muted">Weekly income</span><b class="num ${rep.net >= 0 ? 'good' : 'bad'}">${rep.net >= 0 ? '+' : ''}${money(rep.net)}</b></div>`;
  html += `<button class="btn primary block" data-act="close">${S.phase === 'offseason' ? 'See season review' : 'Continue'}</button>`;
  openModal(html);
}

function showSummerReport(rep) {
  if (!rep) { render(); return; }
  openModal(matchBlock(rep.match, `${rep.comp} · ${rep.stage}`, false) + `<button class="btn primary block" data-act="close">Continue</button>`);
}

function confirmSheet(title, text, act, label, v = '') {
  openModal(`<h3>${title}</h3><p class="muted" style="margin:0">${text}</p><div class="btns"><button class="btn danger" data-act="${act}" data-v="${v}">${label}</button><button class="btn" data-act="close">Cancel</button></div>`);
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || b.tagName === 'SELECT') return;
  const act = b.dataset.act, v = b.dataset.v;
  switch (act) {
    case 'pos': draft.pos = v; renderCreate(); return;
    case 'tab': tab = v; window.scrollTo(0, 0); render(); return;
    case 'clubView': clubView = v; render(); return;
    case 'cupTab': cupTab = v; cupPart = null; render(); return;
    case 'shopView': shopView = v; render(); return;
    case 'agentView': agentView = v; render(); return;
    case 'sponsorSign': if (signSponsor(v)) toast('Sponsor signed'); render(); return;
    case 'sponsorNo': declineSponsorReq(v); render(); return;
    case 'cupPart': cupPart = v; render(); return;
    case 'train': { const g = train(v); if (g != null) toast(g ? `${ATTR_NAMES[v]} +${g.toFixed(2)}` : `${ATTR_NAMES[v]} session done`); render(); return; }
    case 'rest': rest(); toast('Rested: +8 energy'); render(); return;
    case 'advance': if (S.player.order && !S.player.order.choice) showOrderSheet(); else doAdvance(); return;
    case 'order': setOrderChoice(v); render(); return;
    case 'orderGo': setOrderChoice(v); closeModal(); doAdvance(); return;
    case 'decide': resolveDecision(v); closeModal(); render(); return;
    case 'popNext': closePopup(); return;
    case 'findClubs': toast(findClubs() ? 'Your agent is making calls' : 'Try again next week'); render(); return;
    case "equip": if (setEquip(+v)) toast(`${EQUIP_TIERS[+v].name} equipment`); render(); return;
    case 'agent': if (hireAgent(+v)) toast(+v ? `Signed: ${AGENTS[+v].name}` : 'Agent released'); render(); return;
    case 'wishAsk': showWishSheet(); return;
    case 'wishGo': if (announceWish(v)) toast('Dream move announced'); closeModal(); render(); return;
    case 'honTab': honTab = v; render(); return;
    case "refresh": refreshStartChoices(); render(); window.scrollTo(0, 0); return;
    case "refreshOffers": { const n = refreshOffers(); toast(n ? `${n} more club${n > 1 ? 's' : ''} came in` : 'No new clubs this time'); render(); return; }
    case "askContract": { const r = requestContract(); toast(r === "offer" ? "New contract offered" : r === "refused" ? "The club said no" : r === "tooOld" ? "Not at your age, they say" : r === "soon" ? "Too soon to ask again" : r === "locked" ? "You only just re-signed" : "Not possible right now"); render(); return; }
    case 'summerPlay': { const r = playSummerStage(); render(); showSummerReport(r); return; }
    case 'summerSim': simulateSummer(); render(); return;
    case 'exportSave': showExport(); return;
    case 'copySave': navigator.clipboard.writeText(exportSave()).then(() => toast('Save copied'), () => toast('Select the text and copy it')); return;
    case 'importAsk': showImport(); return;
    case 'importGo': { const ok = importSave(document.getElementById('importText').value.trim()); if (ok) { closeModal(); landing = false; tab = 'home'; toast('Career imported'); render(); } else toast('That is not a valid save'); return; }
    case 'continue': landing = false; tab = 'home'; render(); window.scrollTo(0, 0); return;
    case 'viewPast': pastView = +v; render(); window.scrollTo(0, 0); return;
    case 'pastBack': pastView = null; landing = true; render(); window.scrollTo(0, 0); return;
    case 'pastDelAsk': { const r = loadArchive().find(x => x.id === +v); if (r) confirmSheet(`Delete ${esc(r.name)}?`, `This career (${r.career.length} season${r.career.length !== 1 ? 's' : ''}, ${esc(r.lastClub)}) will be gone for good. This cannot be undone.`, 'pastDel', 'Delete', v); return; }
    case 'pastDel': deleteArchived(+v); closeModal(); toast('Career deleted'); pastView = null; landing = true; render(); return;
    case 'freshStart': archiveCurrent(); wipe(); pastView = null; landing = false; draft.name = ''; render(); window.scrollTo(0, 0); return;
    case 'landingNew': if (!S || S.phase === 'retired') { archiveCurrent(); wipe(); landing = false; draft.name = ''; render(); window.scrollTo(0, 0); }
      else confirmSheet('Start a new career?', `${esc(S.player.name)} has not retired yet, so this deletes that career on this device. Retire first to keep it in your past careers, or export it from the Career tab.`, 'newGame', 'Delete and start over');
      return;
    case 'menu': landing = true; pastView = null; closeModal(); render(); window.scrollTo(0, 0); return;
    case "listAsk": confirmSheet("Request a transfer?", "The manager (−15) and the board (−20) will be unhappy. Clubs will bid for you in the transfer windows.", "list", "Hand in request"); return;
    case "list": requestTransfer(); closeModal(); render(); return;
    case "unlist": withdrawTransferRequest(); render(); return;
    case 'house': if (setHouse(+v)) toast(HOUSING[+v].name); render(); return;
    case 'choose': chooseStart(v); tab = 'home'; render(); window.scrollTo(0, 0); return;
    case 'accept': {
      const o = S.offers.find(x => x.id === v), burned = o && o.type === 'transfer' ? rivalBetrayal(o.club) : [];
      if (burned.length) { const names = burned.map(id => esc(club(id).name)).join(' and '); confirmSheet(`Join ${esc(club(o.club).name)}?`, `They are rivals of ${names}. If you join them, ${names} fans and board will hate you, and they will never approach you again.`, 'acceptGo', 'Sign anyway', v); return; }
      acceptOffer(v); toast('Contract signed'); render(); return;
    }
    case 'acceptGo': acceptOffer(v); closeModal(); toast('Contract signed'); render(); return;
    case 'negAsk': showNegotiate(v); return;
    case 'neg': { const [id, i] = v.split(':'); const r = negotiate(id, +i); closeModal(); toast(r === 'accepted' ? 'They agreed!' : r === 'withdrawn' ? 'Offer withdrawn' : 'They said no'); render(); return; }
    case 'decline': declineOffer(v); render(); return;
    case 'nextSeason': if (startNextSeason()) { tab = 'home'; window.scrollTo(0, 0); } render(); return;
    case 'retireAsk': confirmSheet('Retire?', 'Your career ends now, whatever your age, and you will see your final summary. Export a save first if you might want to come back.', 'retire', 'Retire'); return;
    case 'retire': retire(); closeModal(); tab = 'home'; render(); return;
    case 'newAsk': confirmSheet('Start over?', 'This deletes your current career save on this device.', 'newGame', 'Delete and start over'); return;
    case 'newGame': wipe(); closeModal(); landing = false; draft.name = ''; render(); return;
    case 'close': closeModal(); render(); return;
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.act === 'league') { viewLeague = e.target.value; render(); }
  if (e.target.dataset && e.target.dataset.act === 'wishLeague') { wishLeague = e.target.value; showWishSheet(); }
});

modal.addEventListener('click', e => { if (e.target === modal) { closeModal(); render(); } });

// Service worker only works over http(s), not when opened as a local file.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

load();
render();
