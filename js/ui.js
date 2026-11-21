// UI: renders screens from engine state and handles taps.

const app = document.getElementById('app');
const modal = document.getElementById('modal');
let tab = 'home';
let clubView = 'table';
let viewLeague = null;
let honTab = 'ind';
let careerSub = 'career'; // Career tab: 'career' (profile, this season, your card) or 'history' (career history, honours)
const draft = { name: '', nat: 'ENG', pos: 'ST', birth: '2010-01-01', foot: 'R' };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avgRating = st => rateBox(st.apps ? st.rsum / st.apps : null);
// A rating in a coloured box, SofaScore style: red under 6, orange to 6.5, yellow to 7, green to 8,
// teal to 9, blue from 9, gray when there is no rating yet.
const rateTier = r => r >= 9 ? 'r9' : r >= 8 ? 'r8' : r >= 7 ? 'r7' : r >= 6.5 ? 'r65' : r >= 6 ? 'r6' : 'r5';
// The shirt number you wore, on a little shirt like the team sheet's.
const shirtTag = no => `<b class="shirt-tag" title="Shirt number">${no}</b>`;
const rateBox = (r, digits = 2) => r == null ? '<span class="rate-box none">–</span>' : `<span class="rate-box ${rateTier(r)}">${r.toFixed(digits)}</span>`;
// The version tag the phone page loads this script with (artifact.html, ?v=...), reused on logo
// images so a recoloured or replaced logo shows up after a publish instead of a cached old one.
const ASSET_V = ((document.currentScript && document.currentScript.src.match(/[?&]v=(\d+)/)) || [])[1] || '';

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  train: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  shop: '<path d="M4 8h16l-1.5 11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM9 8V6a3 3 0 0 1 6 0v2"/>',
  club: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  nation: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
  agent: '<path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 12h18"/>',
  career: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
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
  const where = S.phase === 'retired' ? 'Retired' : S.phase === 'season' ? `${seasonLabel()} · ${fmtDate(weekDate())}` : `${seasonLabel()} · Summer`;
  return `<section class="card hero"><h2>Saved career</h2>
    <div class="idrow"><div class="ovr card-${cardTier(ovr).toLowerCase()}"><b class="num">${ovr}</b><span>${p.pos}</span></div>
      <div class="who"><h1>${esc(p.name)}</h1><p>${c.name}${p.loan ? ' (loan)' : ''} · Age ${realAge()}</p></div>${crest(c.id, 'small')}</div>
    <div class="kv"><div><small>Apps</small><b>${t.apps + live.apps}</b></div><div><small>Goals</small><b>${t.goals + live.goals}</b></div><div><small>Trophies</small><b>${p.trophies.length}</b></div></div>
    <div class="small muted">${where} · ${money(p.money)} in the bank</div>
    <button class="btn primary block" data-act="continue">Continue career</button></section>`;
}

// Careers put aside without retiring: pick any of them up again. The one you are playing is put
// aside in its place.
function pausedHtml() {
  const list = pausedList();
  if (!list.length) return '';
  return `<section class="card"><h2>Careers in progress</h2><p class="small muted" style="margin:0">Careers you put aside without retiring.${S && S.phase !== 'retired' ? ` Continuing one puts ${esc(S.player.name)} aside in its place.` : ''}</p><div class="inbox">${list.map(r => `<div class="pastrow"><button class="house" data-act="resume" data-v="${r.id}"><span class="clubcell">${dbCrest(r.club)}<span><b>${esc(r.name)}</b> · ${r.pos} · OVR ${r.ovr}<br><span class="small muted">${esc(r.club)} · Age ${r.age} · ${esc(r.season)}</span></span></span><span class="small good">Continue</span></button><button class="btn danger sm" data-act="pausedDelAsk" data-v="${r.id}" aria-label="Delete ${esc(r.name)}">Delete</button></div>`).join('')}</div></section>`;
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
    ${pausedHtml()}
    ${hallOfFameCard(past)}
    ${STORE_BUILD ? (PRO ? '<p class="small good" style="margin:0;text-align:center">Pro: no ads, no waiting</p>' : '<button class="btn block" data-act="proShow">Go Pro: no ads, no waiting</button>') : ''}
    ${STORE_BUILD ? '' : `<button class="btn block" data-act="badgeMode">Badges: ${BADGE_MODE === 'abstract' ? 'Abstract (store build)' : 'Real (development)'}</button>`}
    <button class="btn block" data-act="achvShow">Achievements ${Object.keys(achvList()).length}/${ACHIEVEMENTS.length}</button>
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
    <div class="field"><label for="f-birth">Date of birth</label><input id="f-birth" type="date" min="1960-01-01" max="2015-12-31" value="${draft.birth}" required><span class="small muted" id="f-birth-note">Your career starts in the summer of ${+draft.birth.slice(0, 4) + START_AGE}, the year you turn ${START_AGE}.</span></div>
    <div class="field"><label>Position</label><div class="posgrid">${posBtns}</div><span class="small muted">${POS_NAMES[draft.pos]}</span></div>
    <div class="field"><label>Strong foot</label><div class="seg">${[['R', 'Right'], ['L', 'Left']].map(([k, l]) => `<button type="button" class="${draft.foot === k ? 'on' : ''}" data-act="foot" data-v="${k}">${l}</button>`).join('')}</div><span class="small muted">On your strong side you cross more; on your weaker side you cut inside and shoot more.</span></div>
    <button class="btn primary block" type="submit">See club offers</button>
    <button class="btn block" type="button" data-act="menu">Back</button>
    <p class="small muted">${DB.leagues.length} leagues across ${[...new Set(DB.leagues.map(l => l.country))].join(', ').replace(/, ([^,]+)$/, ' and $1')}. Squads and managers are based on the 2025-26 season. Ratings are game estimates.</p>
  </form>`;
  const form = document.getElementById('createForm');
  form.addEventListener('input', e => {
    if (e.target.id === 'f-name') draft.name = e.target.value;
    if (e.target.id === 'f-nat') draft.nat = e.target.value;
    // Only the note under the date changes: redrawing the form would close the iPhone date wheel mid-pick.
    if (e.target.id === 'f-birth' && e.target.value) {
      draft.birth = e.target.value;
      document.getElementById('f-birth-note').textContent = `Your career starts in the summer of ${+draft.birth.slice(0, 4) + START_AGE}, the year you turn ${START_AGE}.`;
    }
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
    const c = club(id), l = league(c.league), tier = l.tier, par = parentOf(c);
    const note = par ? `${esc(par.name)}'s second team: their academy scouts rate you highly. Play well here and ${esc(par.name)} will call you up to their first team.` : tier === 1 ? 'Hard to break into. Barely play and you will be loaned out.' : tier === 2 ? 'A good level to learn, with a fair chance of minutes.' : 'Regular football likely once your OVR reaches the 60s.';
    return `<div class="offer">
      <div class="row"><div class="clubcell">${crest(c.id, "small")}<div style="min-width:0"><div class="club">${c.name}</div><div class="small muted">${l.name} · ${l.country}</div></div></div><span class="chip ${tier === 1 || par ? 'flood' : ''}">${par ? 'Academy' : TIER_LABEL[tier]}</span></div>
      <div class="kv"><div><small>Team</small><b>${Math.round(teamStrength(c))}</b></div><div><small>Role</small><b>${squadStatus(c, ovr, 50)}</b></div><div><small>Wage</small><b class="num">${money(startWage(id))}/wk</b></div></div>
      <div class="small muted">Manager: ${c.mgr}. ${note}</div>
      <button class="btn good sm" data-act="choose" data-v="${id}">Sign for ${c.name}</button>
    </div>`;
  }).join('');
  app.innerHTML = `<div class="create wrap">
    <h1 class="brand" style="font-size:36px">Pick your <em>club</em></h1>
    <p class="lede">${esc(S.player.name)}, ${POS_NAMES[S.player.pos].toLowerCase()}, age ${realAge()}, OVR <b style="color:var(--chalk)">${ovr}</b>. Five clubs have offered a 3-year youth contract.</p>
    ${S.rerolls <= 0 && STORE_BUILD && (S.adRolls || 0) < AD_ROLLS
      ? `<button class="btn block" data-act="adRoll">${isPro() ? 'Extra roll' : 'Watch an ad for another roll'} (${AD_ROLLS - (S.adRolls || 0)} left)</button>`
      : `<button class="btn block" data-act="refresh" ${S.rerolls > 0 ? "" : "disabled"}>Refresh offers (${S.rerolls} left)</button>`}
    ${cards}
  </div>`;
}

// ---------- shell ----------
function topbar() {
  const p = S.player, c = myClub(), ovr = calcOVR();
  const e = Math.round(p.energy);
  const eClass = e < 30 ? 'low' : e < 55 ? 'mid' : '';
  const status = S.phase === 'retired' ? 'Retired' : p.needsContract ? 'Free agent' : squadStatus();
  return `
  <header class="topbar wrap">
    <div class="idrow">
      <div class="ovr card-${cardTier(ovr).toLowerCase()}"><b class="num">${ovr}</b><span>${p.pos}</span></div>
      <div class="who">
        <h1>${esc(p.name)}</h1>
        <p>${p.needsContract && S.phase !== 'retired' ? status : `${c.name} · ${status}`}${p.loan ? ` · On loan from ${club(p.loan.parent).short}` : ''}</p>
      </div>
      ${altPositions().length || p.nextPos ? `<div class="altpos">${altPositions().map(x => x === p.nextPos
        // A position you can already play that becomes your main one next season: marked on its own chip.
        ? `<span class="next" title="You play here now; it becomes your main position next season" data-act="altInfo" data-v="next">→${x}</span>`
        : `<span title="You can also play ${POS_NAMES[x]} (${x})" data-act="altInfo" data-v="${x}">${x}</span>`).join('')}${p.nextPos && !altPositions().includes(p.nextPos) ? `<span class="next" title="You play here now; it becomes your main position next season" data-act="altInfo" data-v="next">→${p.nextPos}</span>` : ''}</div>` : ''}
    </div>
    <div class="chips">
      <span class="chip">Age <b>${realAge()}</b></span>
      <span class="chip flood"><b class="num">${money(p.money)}</b></span>
      <span class="chip">${S.phase === 'season' ? `${DAY_NAMES[todayDate().getUTCDay()]} ${fmtDate(todayDate())} · <b>Wk ${S.week}</b>` : `${seasonLabel()} · <b>${S.phase === 'offseason' ? 'Summer' : 'End'}</b>`}</span>
      ${p.injured ? `<span class="chip bad">Injured ${p.injured}w</span>` : p.rust > 0 ? `<span class="chip flood">Rusty ${p.rust}w</span>` : ''}
    </div>
    ${S.phase === 'season' ? `<div class="energy"><span>Energy</span><div class="bar"><i class="${eClass}" style="width:${e}%"></i></div><b class="num">${e}</b></div>` : ''}
  </header>`;
}

// Long club names slide sideways inside their cells; all the names in one table slide together, as one column.
// The others only move when they are more than a pixel off, so the copies settle at once instead of echoing.
document.addEventListener('scroll', e => {
  const cell = e.target;
  if (!cell.matches || !cell.matches('td.clubname .clubcell')) return;
  for (const other of cell.closest('table').querySelectorAll('td.clubname .clubcell')) if (other !== cell && Math.abs(other.scrollLeft - cell.scrollLeft) > 1) other.scrollLeft = cell.scrollLeft;
}, true);
// Every name in a table gets the same slide distance (shorter ones are padded at the end), so the column moves
// as one strip instead of only the long names shifting.
function evenNameCells() {
  for (const table of document.querySelectorAll('table')) {
    const cells = [...table.querySelectorAll('td.clubname .clubcell')];
    if (!cells.length) continue;
    cells.forEach(c => c.style.removeProperty('--namepad'));
    // The width of what's in the cell (crest and name), not of the cell itself.
    const widths = cells.map(c => { const r = document.createRange(); r.selectNodeContents(c); return Math.ceil(r.getBoundingClientRect().width); });
    const max = Math.max(...widths);
    if (max <= cells[0].clientWidth) continue;
    cells.forEach((c, i) => c.style.setProperty('--namepad', `${max - widths[i]}px`));
  }
}
window.addEventListener('resize', () => evenNameCells());

// On phones the top bar shrinks once you scroll down and grows back near the top. The two thresholds differ so
// the bar's own change in height can't flip it back and forth.
let compactTop = false;
window.addEventListener('scroll', () => {
  const want = window.innerHeight < 900 && (compactTop ? window.scrollY > 8 : window.scrollY > 120);
  if (want !== compactTop) { compactTop = want; document.body.classList.toggle('compact', want); }
}, { passive: true });

function nav() {
  const tabs = [['home', 'Home'], ['train', 'Train'], ['contract', 'Contract'], ['shop', 'Shop'], ['agent', 'Agent'], ['club', 'Club'], ['nation', 'Nation'], ['career', 'Career']];
  return `<nav class="tabs"><div class="in">${tabs.map(([k, l]) => `
    <button class="${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" aria-label="${l}">
      ${icon(k)}<span>${l}</span>${k === 'contract' && S.offers.length ? '<i class="dot"></i>' : ''}${k === 'agent' && (S.player.sponsorReqs || []).length ? '<i class="dot"></i>' : ''}${k === 'train' && S.phase === 'season' && S.player.slots > 0 && !S.player.injured ? '<i class="dot" style="background:var(--flood)"></i>' : ''}
    </button>`).join('')}</div></nav>`;
}

function render() {
  // A career that has just ended opens like any finished one: Summary, Career, Assets and Back,
  // not the live game's tabs.
  if (!pastView && !landing && S && S.phase === 'retired' && loadArchive().some(r => r.id === S.player.careerId)) {
    pastView = S.player.careerId; pastTab = 'summary'; pastSub = 'profile';
  }
  if (pastView) { renderPast(); if (S && S.phase === 'retired' && pastView === S.player.careerId) nextPopup(); return; }
  if (landing) { renderLanding(); return; }
  if (!S) { renderCreate(); return; }
  if (S.phase === 'choose') { renderChoose(); return; }
  const scrollY = window.scrollY;
  const views = { home: viewHome, train: viewTrain, contract: viewContract, shop: viewShop, agent: viewAgent, club: viewClub, nation: viewNation, career: viewCareer };
  app.innerHTML = topbar() + `<main class="wrap">${views[tab]()}</main>` + nav();
  const chip = app.querySelector('.cuptabs .on');
  if (chip) chip.parentElement.scrollLeft = chip.offsetLeft - chip.parentElement.offsetLeft - 24;
  // Tab rows that slide sideways on phones: keep the selected tab in view.
  for (const on of app.querySelectorAll('.seg .on')) { const s = on.parentElement; if (s.scrollWidth > s.clientWidth) s.scrollLeft = on.offsetLeft - s.offsetLeft - 24; }
  evenNameCells();
  window.scrollTo(0, scrollY);
  nextPopup();
  // New club, or you gave your shirt away: pick a number before anything else.
  if (needShirt() && modal.hidden && !POPUPS.length && !S.decision) showShirtPicker();
  else if (needNatShirt() && modal.hidden && !POPUPS.length && !S.decision) showNatShirtPicker();
  else if (STORE_BUILD && !S.decision) storeWindowAd();
}

// ---------- home ----------
// Club logos live in Club_logos/<original league>/<club name>.<ext>. Missing files fall back to the short name.
const LOGO_EXTS = ['png', 'svg', 'webp', 'jpg'];
const logoState = {}; // club id -> index into LOGO_EXTS that works, or -1 when there is no logo

// Crests drawn in black on a clear background vanish on the dark pitch: these are shown in white.
const INK_CRESTS = new Set(['Derby County']);
// Abstract badges are drawn in colour already, so only real crests get the white treatment.
const inkCrest = name => INK_CRESTS.has(name) && BADGE_MODE !== 'abstract' ? ' class="ink"' : '';
// ---------- abstract badges ----------
// The commercial build can't ship real crests (trademarks). In 'abstract' mode every club gets a badge
// drawn in code from the club's colours: a shape and an emblem picked from the club name, so a club always
// gets the same badge. 'real' (the default, for development) keeps the real files. Switch on the start
// screen, or with ?badges=abstract / ?badges=real in the address.
const BADGE_MODE_KEY = 'fs-badges';
// The store app (tools/build-app.ps1) sets window.STORE_BUILD: it ships no real crests, so it is always abstract
// and has no switch.
const STORE_BUILD = !!window.STORE_BUILD;

// ---------- store names ----------
// The store app also shows made-up names for trademarked leagues, cups, awards and football bodies. Only the
// text on screen changes (a watcher rewrites it as it appears), so the game data and saves keep the real names
// and a save moves between dev and the store app unchanged. Plain descriptive names (Turkish Cup, Golden Boot)
// stay. Longer names are matched first, so "Club World Cup" is never read as "World Cup".
const STORE_NAMES = [
  // leagues
  ['Premier League', 'English Premier Division'], ['Championship', 'English Second Division'], ['League One', 'English Third Division'],
  ['La Liga', 'Primera División'], ['Primera Federación', 'Spanish Third Division'],
  ['Serie A', 'Italian Prima Divisione'], ['Serie B', 'Italian Seconda Divisione'], ['Serie C', 'Italian Terza Divisione'],
  ['Bundesliga', 'German Erste Liga'], ['2. Bundesliga', 'German Zweite Liga'], ['3. Liga', 'German Third Division'],
  ['Ligue 1', 'French Première Division'], ['Ligue 2', 'French Deuxième Division'],
  ['Liga Portugal', 'Portuguese Primeira Divisão'], ['Liga Portugal 2', 'Portuguese Segunda Divisão'], ['Liga 3', 'Portuguese Terceira Divisão'],
  ['Eredivisie', 'Dutch Premier Division'], ['Süper Lig', 'Turkish Premier Division'],
  ['Belgian Pro League', 'Belgian Premier Division'], ['Challenger Pro League', 'Belgian Second Division'], ['Saudi Pro League', 'Saudi Premier Division'],
  ['MLS Eastern Conference', 'North American League East'], ['MLS Western Conference', 'North American League West'],
  ['USL Championship', 'North American Second Division'], ['USL League One', 'North American Third Division'],
  // domestic cups
  ['FA Cup', 'English Cup'], ['Carabao Cup', 'English League Cup'], ['Community Shield', 'English Super Cup'],
  ['Copa del Rey', 'Spanish Cup'], ['Supercopa de España', 'Spanish Super Cup'], ['Coppa Italia', 'Italian Cup'], ['Supercoppa Italiana', 'Italian Super Cup'],
  ['DFB-Pokal', 'German Cup'], ['DFL-Supercup', 'German Super Cup'], ['Coupe de France', 'French Cup'], ['Trophée des Champions', 'French Super Cup'],
  ['Taça de Portugal', 'Portuguese Cup'], ['Taça da Liga', 'Portuguese League Cup'], ['Supertaça', 'Portuguese Super Cup'],
  ['KNVB Cup', 'Dutch Cup'], ['Johan Cruyff Shield', 'Dutch Super Cup'], ['MLS Cup', 'North American Cup'], ['U.S. Open Cup', 'American Open Cup'],
  // club and international tournaments
  ['Champions League', 'European Elite Cup'], ['Europa League', 'European Trophy'], ['Conference League', 'European Shield'],
  ['Club World Cup', 'World Club Championship'], ['World Cup', 'World Championship'], ['European Championship', 'European Nations Cup'],
  ['Nations League', 'Nations Series'], ['Copa América', 'South American Championship'], ['Africa Cup of Nations', 'African Championship'],
  ['AFC Asian Cup', 'Asian Championship'], ['Gold Cup', 'North American Championship'],
  // awards
  ["Ballon d'Or", 'Golden Crown'], ["The Best FIFA Men's Player", 'Federation Player of the Year'], ['Kopa Trophy', 'Young Player Trophy'],
  ['Golden Boy', 'Golden Prospect'], ['Yashin Trophy', 'Keeper of the Year'], ['FIFPRO World XI', 'World XI'], ['FIFPRO', 'Players Union'],
  // football bodies
  ['FIFA', 'World Football Federation'], ['UEFA', 'European Football Union'], ['CONMEBOL', 'South American Federation'],
  ['CONCACAF', 'North American Federation'], ['CAF', 'African Federation'], ['AFC', 'Asian Federation'], ['OFC', 'Oceania Federation'],
];
const STORE_NAME_MAP = new Map(STORE_NAMES.map(([a, b]) => [a.replace(/['’]/g, "'"), b]));
// Whole names only (not inside a longer word), case-sensitive. AFC Wimbledon is a club, not the Asian federation.
const STORE_NAME_RE = new RegExp(`(?<![\\p{L}\\p{N}])(${[...STORE_NAME_MAP.keys()].sort((a, b) => b.length - a.length)
  .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]"))
  // The made-up tournament names end in "Championship" too: leave those alone when the text is checked again.
  .map(n => n === 'Championship' ? '(?<!(?:World|Club|American|African|Asian|European|Nations) )Championship' : n).join('|')})(?![\\p{L}\\p{N}])(?! Wimbledon)`, 'gu');
const storeText = s => s.replace(STORE_NAME_RE, m => STORE_NAME_MAP.get(m.replace(/’/g, "'")) || m);
function storeRewrite(root) {
  // Text in save boxes and inputs is data the player copies out, so it keeps the real names.
  const skip = n => n.parentElement && n.parentElement.closest('textarea, input, script, style');
  const fix = n => { if (!skip(n)) { const t = storeText(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; } };
  if (root.nodeType === 3) { fix(root); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) fix(n);
  for (const el of [root, ...root.querySelectorAll('[title], [aria-label], [placeholder]')]) for (const a of ['title', 'aria-label', 'placeholder']) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v) { const t = storeText(v); if (t !== v) el.setAttribute(a, t); }
  }
}
// ---------- store money: ads and Pro ----------
// Only in the store app. Dev (GitHub, PC, phone artifact) counts as Pro: no ads, no waits, nothing to buy.
//   - One full-screen ad when each transfer window opens (summer and January).
//   - Rewarded ads the player chooses: one extra training session a week, and up to 3 extra club rolls at the start.
//   - Every 5 seasons a free player waits 24 hours before the next season.
//   - Pro (one purchase) removes the forced ads and the wait, and gives the rewards with a tap instead of a video.
// In the app the ads come from AdMob (@capacitor-community/admob) and Pro from Google Play Billing
// (cordova-plugin-purchase). In a browser (testing the store build) both are simulated.
const MONEY = {
  // Google's TEST ad units. Replace with your own from admob.google.com before release, together with the app id
  // in app/android/app/src/main/AndroidManifest.xml, and set testing to false.
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  testing: true,
  // The product id to create in the Play Console (Monetize > In-app products), as a one-time product.
  proId: 'pro_unlock',
};
const WAIT_EVERY = 5, WAIT_MS = 24 * 3600 * 1000, AD_ROLLS = 3;
const PRO_KEY = 'ptl-pro';
let PRO = (() => { try { return localStorage.getItem(PRO_KEY) === '1'; } catch (e) { return false; } })();
function setPro(v) { PRO = !!v; try { localStorage.setItem(PRO_KEY, PRO ? '1' : '0'); } catch (e) { /* storage unavailable */ } }
const isPro = () => !STORE_BUILD || PRO;
const admob = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
const billing = () => window.CdvPurchase && window.CdvPurchase.store;
let moneyReady = null;
function moneyInit() {
  if (!STORE_BUILD) return Promise.resolve();
  if (moneyReady) return moneyReady;
  return (moneyReady = (async () => {
    const ad = admob();
    if (ad && !moneyInit.ads) {
      moneyInit.ads = true;
      try {
        await ad.initialize({ initializeForTesting: MONEY.testing });
        // European players are asked for ad consent first (Google's consent form).
        const c = await ad.requestConsentInfo();
        if (c && c.isConsentFormAvailable && c.status === 'REQUIRED') await ad.showConsentForm();
      } catch (e) { /* ads unavailable: the game carries on */ }
    }
    // The billing plugin only exists after Cordova's deviceready, so this part may run on a later call.
    const store = billing();
    if (store && !moneyInit.billing) {
      moneyInit.billing = true;
      try {
        const { ProductType, Platform } = window.CdvPurchase;
        store.register([{ id: MONEY.proId, type: ProductType.NON_CONSUMABLE, platform: Platform.GOOGLE_PLAY }]);
        store.when()
          .approved(t => t.verify())
          .verified(r => { r.finish(); if (store.owned(MONEY.proId)) { setPro(true); render(); } })
          .productUpdated(pr => { if (pr.id === MONEY.proId && pr.owned && !PRO) { setPro(true); render(); } });
        await store.initialize([Platform.GOOGLE_PLAY]);
        if (store.owned(MONEY.proId)) setPro(true);
      } catch (e) { /* billing unavailable */ }
    }
  })());
}
document.addEventListener('deviceready', () => { moneyReady = null; moneyInit(); });
// A stand-in ad for testing the store build in a browser.
function fakeAd(kind) {
  return new Promise(res => {
    let n = 4;
    openModal(`<h3>Ad</h3><p class="small muted" style="margin:0">In the store app a ${kind} ad plays here.</p><p class="small" id="adCount">Closes in ${n}s</p>`);
    const t = setInterval(() => {
      n--;
      const el = document.getElementById('adCount');
      if (el) el.textContent = `Closes in ${n}s`;
      if (n <= 0 || !el) { clearInterval(t); closeModal(); res(!!el); }
    }, 1000);
  });
}
async function showInterstitial() {
  if (isPro()) return;
  await moneyInit();
  const ad = admob();
  if (!ad) { await fakeAd('full-screen'); return; }
  try { await ad.prepareInterstitial({ adId: MONEY.interstitial, isTesting: MONEY.testing }); await ad.showInterstitial(); } catch (e) { /* no ad: carry on */ }
}
// Resolves true once the reward is earned. Pro players get it straight away.
async function earnReward() {
  if (isPro()) return true;
  await moneyInit();
  const ad = admob();
  if (!ad) return fakeAd('rewarded');
  try {
    await ad.prepareRewardVideoAd({ adId: MONEY.rewarded, isTesting: MONEY.testing });
    return !!(await ad.showRewardVideoAd());
  } catch (e) { toast('No ad available right now. Try again later.'); return false; }
}
function showProSheet(why = '') {
  openModal(`<h3>Pitch to Legend Pro</h3>
    ${why ? `<p class="small" style="margin:0 0 6px">${why}</p>` : ''}
    <p class="small muted" style="margin:0">One purchase, yours for good:</p>
    <ul class="small" style="margin:6px 0 0;padding-left:18px"><li>No ads at the transfer windows</li><li>No 24-hour wait every ${WAIT_EVERY} seasons</li><li>Extra training sessions and club rolls with a tap, no videos</li></ul>
    <div class="btns"><button class="btn primary sm" data-act="proBuy">Get Pro</button><button class="btn sm" data-act="proRestore">Restore purchase</button><button class="btn sm" data-act="close">Not now</button></div>`);
}
async function buyPro() {
  await moneyInit();
  const store = billing();
  if (!store) { setPro(true); closeModal(); toast('Pro unlocked (test: no real payment outside the app)'); render(); return; }
  const pr = store.get(MONEY.proId), offer = pr && pr.getOffer();
  if (!offer) { toast('Pro is not available right now. Try again later.'); return; }
  closeModal();
  try { await offer.order(); } catch (e) { toast('The purchase did not go through.'); }
}
async function restorePro() {
  await moneyInit();
  const store = billing();
  if (store) { try { await store.restorePurchases(); } catch (e) { /* ignore */ } }
  closeModal();
  toast(PRO ? 'Pro restored' : 'No Pro purchase found on this account');
  render();
}
// One full-screen ad when a transfer window opens, once per window. Waits until no pop-up is showing.
function storeWindowAd() {
  if (isPro() || !S || S.phase === 'choose' || S.phase === 'retired' || !inWindow() || !modal.hidden || POPUPS.length) return;
  const k = windowKey();
  if (S.storeAdWindow === k) return;
  S.storeAdWindow = k; save();
  showInterstitial();
}
// Hours left before a free player may start the next season (0 when they may go on now).
function seasonWaitLeft() {
  if (isPro()) return 0;
  if (S.storeStart == null) S.storeStart = S.season;
  if ((S.season - S.storeStart + 1) % WAIT_EVERY) return 0;
  if (!S.storeWait || S.storeWait.season !== S.season) { S.storeWait = { season: S.season, until: Date.now() + WAIT_MS }; save(); }
  return Math.max(0, S.storeWait.until - Date.now());
}
function showWaitSheet(ms) {
  const mins = Math.ceil(ms / 60000), h = Math.floor(mins / 60), m = mins % 60;
  showProSheet(`You have played another ${WAIT_EVERY} seasons. Your next season unlocks in <b>${h}h ${m}m</b>. Come back then, or go Pro to play on now.`);
}

if (STORE_BUILD) {
  new MutationObserver(list => { for (const m of list) { if (m.type === 'characterData') storeRewrite(m.target); else m.addedNodes.forEach(storeRewrite); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
}
let BADGE_MODE = (() => {
  if (STORE_BUILD) return 'abstract';
  const q =(location.search.match(/[?&]badges=(real|abstract)/) || [])[1];
  // A build can pick its own default (the phone artifact sets window.BADGE_DEFAULT before this script).
  const def = window.BADGE_DEFAULT === 'abstract' ? 'abstract' : 'real';
  try { if (q) localStorage.setItem(BADGE_MODE_KEY, q); return q || localStorage.getItem(BADGE_MODE_KEY) || def; } catch (e) { return q || def; }
})();
function setBadgeMode(m) { BADGE_MODE = m; try { localStorage.setItem(BADGE_MODE_KEY, m); } catch (e) {} }
// [main, second, trim] per club. Colours only: no names, shapes or symbols from the real crests.
const BADGE_COLORS = {
  'Arsenal': ['#DB0007', '#FFFFFF', '#9C824A'], 'Aston Villa': ['#670E36', '#95BFE5', '#F2B705'], 'Bournemouth': ['#DA291C', '#111111', '#FFFFFF'],
  'Brentford': ['#E30613', '#FFFFFF', '#111111'], 'Brighton': ['#0057B8', '#FFFFFF', '#FFCD00'], 'Burnley': ['#6C1D45', '#99D6EA', '#FFFFFF'],
  'Chelsea': ['#034694', '#FFFFFF', '#DBA111'], 'Crystal Palace': ['#1B458F', '#C4122E', '#FFFFFF'], 'Everton': ['#003399', '#FFFFFF', '#FFFFFF'],
  'Fulham': ['#FFFFFF', '#111111', '#CC0000'], 'Leeds United': ['#FFFFFF', '#1D428A', '#FFCD00'], 'Liverpool': ['#C8102E', '#00B2A9', '#F6EB61'],
  'Manchester City': ['#6CABDD', '#FFFFFF', '#1C2C5B'], 'Manchester United': ['#DA291C', '#FBE122', '#111111'], 'Newcastle United': ['#111111', '#FFFFFF', '#41B6E6'],
  'Nottingham Forest': ['#DD0000', '#FFFFFF', '#111111'], 'Sunderland': ['#EB172B', '#FFFFFF', '#A68A0D'], 'Tottenham Hotspur': ['#132257', '#FFFFFF', '#FFFFFF'],
  'West Ham United': ['#7A263A', '#1BB1E7', '#F3D459'], 'Wolverhampton': ['#FDB913', '#231F20', '#FFFFFF'],
  'Real Madrid': ['#FFFFFF', '#00529F', '#FEBE10'], 'Barcelona': ['#004D98', '#A50044', '#EDBB00'], 'Atlético Madrid': ['#CB3524', '#FFFFFF', '#272E61'],
  'Athletic Club': ['#EE2523', '#FFFFFF', '#111111'], 'Villarreal': ['#FFE667', '#005187', '#FFFFFF'], 'Real Betis': ['#00954C', '#FFFFFF', '#F2B705'],
  'Celta Vigo': ['#8AC3EE', '#FFFFFF', '#E5254E'], 'Real Sociedad': ['#0067B1', '#FFFFFF', '#E4B21C'], 'Rayo Vallecano': ['#FFFFFF', '#E53027', '#111111'],
  'Osasuna': ['#D91A21', '#0A346F', '#FFFFFF'], 'Mallorca': ['#E20613', '#111111', '#F2B705'], 'Valencia': ['#FFFFFF', '#111111', '#EE3524'],
  'Getafe': ['#005999', '#FFFFFF', '#E30613'], 'Espanyol': ['#007FC8', '#FFFFFF', '#E30613'], 'Girona': ['#CD2534', '#FFFFFF', '#F2B705'],
  'Sevilla': ['#FFFFFF', '#D71920', '#111111'], 'Alavés': ['#1E4C9A', '#FFFFFF', '#F2B705'], 'Elche': ['#FFFFFF', '#05642C', '#111111'],
  'Levante': ['#004F9F', '#B4053F', '#F2B705'], 'Real Oviedo': ['#0055A4', '#FFFFFF', '#F2B705'],
  'Inter': ['#0068A8', '#111111', '#D4AF37'], 'Napoli': ['#12A0D7', '#FFFFFF', '#003C82'], 'AC Milan': ['#FB090B', '#111111', '#FFFFFF'],
  'Juventus': ['#111111', '#FFFFFF', '#D4AF37'], 'Atalanta': ['#1E71B8', '#111111', '#FFFFFF'], 'Roma': ['#8E1F2F', '#F0BC42', '#FFFFFF'],
  'Lazio': ['#87D8F7', '#FFFFFF', '#15366F'], 'Fiorentina': ['#482E92', '#FFFFFF', '#E30613'], 'Bologna': ['#A21C26', '#1A2F48', '#FFFFFF'],
  'Como': ['#00498C', '#FFFFFF', '#F2B705'], 'Torino': ['#8A1E03', '#FFFFFF', '#F2B705'], 'Udinese': ['#111111', '#FFFFFF', '#A08A55'],
  'Genoa': ['#A51E36', '#002D62', '#F2B705'], 'Cagliari': ['#A6192E', '#002350', '#FFFFFF'], 'Lecce': ['#F6DA00', '#DA291C', '#002D62'],
  'Parma': ['#FFFFFF', '#FFD200', '#0047AB'], 'Sassuolo': ['#00A752', '#111111', '#FFFFFF'], 'Hellas Verona': ['#002D72', '#FFD100', '#FFFFFF'],
  'Cremonese': ['#BB1E3B', '#9EA3A8', '#FFFFFF'], 'Pisa': ['#111111', '#0A4E9F', '#FFFFFF'],
  'Bayern Munich': ['#DC052D', '#FFFFFF', '#0066B2'], 'Borussia Dortmund': ['#FDE100', '#111111', '#FFFFFF'], 'RB Leipzig': ['#FFFFFF', '#DD0741', '#001F47'],
  'Bayer Leverkusen': ['#E32221', '#111111', '#F2B705'], 'VfB Stuttgart': ['#FFFFFF', '#E32219', '#F2B705'], 'Eintracht Frankfurt': ['#E1000F', '#111111', '#FFFFFF'],
  'SC Freiburg': ['#111111', '#E3001B', '#FFFFFF'], 'VfL Wolfsburg': ['#65B32E', '#FFFFFF', '#1D2A4D'], 'Borussia Mönchengladbach': ['#FFFFFF', '#111111', '#00A651'],
  'TSG Hoffenheim': ['#1961B5', '#FFFFFF', '#111111'], 'Union Berlin': ['#EB1923', '#FFFFFF', '#F2B705'], 'FC Augsburg': ['#BA3733', '#46714D', '#FFFFFF'],
  'Werder Bremen': ['#1D9053', '#FFFFFF', '#111111'], 'Mainz 05': ['#C3141E', '#FFFFFF', '#111111'], '1. FC Köln': ['#ED1C24', '#FFFFFF', '#111111'],
  'Hamburger SV': ['#0A3F86', '#FFFFFF', '#E30613'], '1. FC Heidenheim': ['#E2001A', '#003B79', '#FFFFFF'], 'FC St. Pauli': ['#5C3A21', '#FFFFFF', '#E30613'],
  'Paris Saint-Germain': ['#004170', '#DA291C', '#FFFFFF'], 'Marseille': ['#FFFFFF', '#2FAEE0', '#D4AF37'], 'Monaco': ['#E51B22', '#FFFFFF', '#D4AF37'],
  'Lille': ['#E01E13', '#20325F', '#FFFFFF'], 'Lyon': ['#FFFFFF', '#14387F', '#DA001A'], 'Nice': ['#C8102E', '#111111', '#FFFFFF'],
  'Lens': ['#FFD800', '#E30613', '#111111'], 'Rennes': ['#E13327', '#111111', '#FFFFFF'], 'Strasbourg': ['#009FE3', '#FFFFFF', '#E30613'],
  'Toulouse': ['#6B3FA0', '#FFFFFF', '#111111'], 'Brest': ['#E30613', '#FFFFFF', '#111111'], 'Nantes': ['#FCD405', '#00843D', '#FFFFFF'],
  'Auxerre': ['#FFFFFF', '#004B93', '#F2B705'], 'Angers': ['#111111', '#FFFFFF', '#F2B705'], 'Le Havre': ['#8CC3E6', '#1C2E5C', '#FFFFFF'],
  'Lorient': ['#F58220', '#111111', '#FFFFFF'], 'Metz': ['#7A1235', '#FFFFFF', '#F2B705'], 'Paris FC': ['#1E2A4F', '#FFFFFF', '#E30613'],
  // Other top flights: where the colours picked from the crest come out wrong (white or grey crests).
  'Benfica': ['#E30613', '#FFFFFF', '#F2B705'], 'Porto': ['#003893', '#FFFFFF', '#F2B705'], 'Sporting CP': ['#008057', '#FFFFFF', '#F2B705'],
  'Braga': ['#D2001F', '#FFFFFF', '#111111'], 'Vitória SC': ['#FFFFFF', '#111111', '#F2B705'],
  'PSV': ['#ED1C24', '#FFFFFF', '#111111'], 'Feyenoord': ['#ED1C24', '#FFFFFF', '#111111'], 'Ajax': ['#FFFFFF', '#D2122E', '#111111'],
  'AZ': ['#E30613', '#FFFFFF', '#111111'], 'FC Twente': ['#E30613', '#FFFFFF', '#111111'], 'FC Utrecht': ['#E30613', '#FFFFFF', '#111111'],
  'Galatasaray': ['#A90432', '#FDB912', '#FFFFFF'], 'Fenerbahçe': ['#002D72', '#FFED00', '#FFFFFF'], 'Beşiktaş': ['#111111', '#FFFFFF', '#E30A17'],
  'Trabzonspor': ['#7A1C3B', '#46B5E5', '#FFFFFF'], 'Başakşehir': ['#F26522', '#002D62', '#FFFFFF'],
  'Club Brugge': ['#0070C0', '#111111', '#FFFFFF'], 'Union SG': ['#F2C300', '#0047AB', '#FFFFFF'], 'Anderlecht': ['#4D2C8B', '#FFFFFF', '#F2B705'],
  'Genk': ['#0047AB', '#FFFFFF', '#F2B705'], 'Gent': ['#0047AB', '#FFFFFF', '#F2B705'], 'Antwerp': ['#E30613', '#FFFFFF', '#111111'],
  'Standard Liège': ['#E30613', '#FFFFFF', '#111111'],
  'Al Hilal': ['#0033A0', '#FFFFFF', '#F2B705'], 'Al Nassr': ['#FFD100', '#003DA5', '#FFFFFF'], 'Al Ittihad': ['#F2C300', '#111111', '#FFFFFF'],
  'Al Ahli': ['#00843D', '#FFFFFF', '#111111'],
  'Inter Miami': ['#F7B5CD', '#231F20', '#FFFFFF'], 'LA Galaxy': ['#00245D', '#FFD200', '#FFFFFF'], 'LAFC': ['#111111', '#C39E6D', '#FFFFFF'],
  'Seattle Sounders': ['#5D9741', '#005595', '#FFFFFF'], 'New York City FC': ['#6CACE4', '#041E42', '#F15524'], 'Toronto FC': ['#B81137', '#FFFFFF', '#455560'],
  'Atlanta United': ['#80000A', '#111111', '#A19060'], 'Orlando City': ['#633492', '#FFFFFF', '#FDE192'],
};
const badgeHash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };
// Unknown clubs still get a steady colour pair from their name.
const hueColor = (h, l) => `hsl(${h % 360},65%,${l}%)`;
const badgeLum = c => { if (c[0] !== '#') return +c.match(/(\d+)%\)$/)[1] / 100; const n = parseInt(c.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
const BADGE_CACHE = {};
// The outline family and colour layout of each well-known club's crest: 'outline layout [stars]'. Only the general
// shape and how the colours sit, never the central symbol (no devils, cannons, lions, ships or birds).
// Outlines: shield pointed french tall pear tallrect cut swiss hex banner rect round oval ringshield.
// Layouts: plain vstripes hoops halves diag sash band chevron quarters chief.
// Clubs that aren't listed get an outline and layout picked from their name.
const BADGE_SHAPES = {
  'Arsenal': 'shield chief', 'Aston Villa': 'banner chief', 'Bournemouth': 'rect vstripes', 'Brentford': 'round band', 'Brighton': 'round plain',
  'Burnley': 'banner chief', 'Chelsea': 'round plain', 'Crystal Palace': 'french halves', 'Everton': 'swiss plain', 'Fulham': 'swiss band',
  'Leeds United': 'shield chief', 'Liverpool': 'tall plain', 'Manchester City': 'round chief', 'Manchester United': 'ringshield plain', 'Newcastle United': 'round vstripes',
  'Nottingham Forest': 'round plain', 'Sunderland': 'shield vstripes', 'Tottenham Hotspur': 'oval plain', 'West Ham United': 'shield chief', 'Wolverhampton': 'hex plain',
  'Real Madrid': 'round sash', 'Barcelona': 'pear vstripes', 'Atlético Madrid': 'pointed vstripes', 'Athletic Club': 'shield vstripes', 'Villarreal': 'oval plain',
  'Real Betis': 'round vstripes', 'Celta Vigo': 'swiss plain', 'Real Sociedad': 'round band', 'Rayo Vallecano': 'shield sash', 'Osasuna': 'shield chief',
  'Mallorca': 'shield chief', 'Valencia': 'tall chief', 'Getafe': 'shield band', 'Espanyol': 'round vstripes', 'Girona': 'shield vstripes',
  'Sevilla': 'pear chief', 'Alavés': 'round plain', 'Elche': 'shield band', 'Levante': 'shield vstripes', 'Real Oviedo': 'round plain',
  'Inter': 'round plain 2', 'Napoli': 'ringshield plain', 'AC Milan': 'oval vstripes 1', 'Juventus': 'tallrect vstripes 2', 'Atalanta': 'round vstripes',
  'Roma': 'pointed chief', 'Lazio': 'pointed plain', 'Fiorentina': 'pointed plain', 'Bologna': 'shield halves', 'Como': 'shield plain',
  'Torino': 'banner plain', 'Udinese': 'banner vstripes', 'Genoa': 'shield halves', 'Cagliari': 'round halves', 'Lecce': 'shield vstripes',
  'Parma': 'shield chief', 'Sassuolo': 'round plain', 'Hellas Verona': 'shield chief', 'Cremonese': 'shield vstripes', 'Pisa': 'round vstripes',
  'Bayern Munich': 'round plain 5', 'Borussia Dortmund': 'round plain 1', 'RB Leipzig': 'tallrect plain', 'Bayer Leverkusen': 'round chief', 'VfB Stuttgart': 'shield band',
  'Eintracht Frankfurt': 'round plain', 'SC Freiburg': 'shield chief', 'VfL Wolfsburg': 'round plain', 'Borussia Mönchengladbach': 'oval plain', 'TSG Hoffenheim': 'shield plain',
  'Union Berlin': 'shield chief', 'FC Augsburg': 'rect halves', 'Werder Bremen': 'cut plain', 'Mainz 05': 'round plain', '1. FC Köln': 'shield chief',
  'Hamburger SV': 'cut quarters', '1. FC Heidenheim': 'shield halves', 'FC St. Pauli': 'shield plain',
  'Paris Saint-Germain': 'round band', 'Marseille': 'shield plain 1', 'Monaco': 'shield diag', 'Lille': 'shield chief', 'Lyon': 'swiss chief',
  'Nice': 'shield vstripes', 'Lens': 'round halves', 'Rennes': 'banner chief', 'Strasbourg': 'round plain', 'Toulouse': 'round plain',
  'Brest': 'round plain', 'Nantes': 'shield chief', 'Auxerre': 'shield chief', 'Angers': 'shield vstripes', 'Le Havre': 'round halves',
  'Lorient': 'round plain', 'Metz': 'shield chief', 'Paris FC': 'round plain',
  'Benfica': 'ringshield chief', 'Porto': 'french quarters', 'Sporting CP': 'shield hoops', 'Braga': 'round plain', 'Vitória SC': 'shield chief',
  'Famalicão': 'shield chief', 'Gil Vicente': 'shield plain', 'Moreirense': 'shield chief', 'Estoril': 'shield vstripes', 'Santa Clara': 'round plain',
  'Rio Ave': 'shield hoops', 'Casa Pia': 'round plain', 'Arouca': 'shield plain', 'Nacional': 'round halves',
  'PSV': 'round vstripes', 'Feyenoord': 'swiss halves', 'Ajax': 'round plain', 'AZ': 'round plain', 'FC Twente': 'round plain',
  'FC Utrecht': 'shield plain', 'NEC': 'shield vstripes', 'Go Ahead Eagles': 'round band', 'Heerenveen': 'shield chief', 'Sparta Rotterdam': 'shield vstripes',
  'Fortuna Sittard': 'round plain', 'PEC Zwolle': 'shield plain', 'Groningen': 'round halves', 'Heracles': 'shield vstripes', 'NAC Breda': 'round plain',
  'Galatasaray': 'round halves', 'Fenerbahçe': 'round vstripes', 'Beşiktaş': 'round halves', 'Trabzonspor': 'shield vstripes', 'Başakşehir': 'round plain',
  'Göztepe': 'shield halves', 'Samsunspor': 'round plain', 'Konyaspor': 'shield plain', 'Kayserispor': 'shield halves', 'Antalyaspor': 'shield vstripes',
  'Club Brugge': 'banner vstripes', 'Union SG': 'round plain', 'Anderlecht': 'shield plain', 'Genk': 'round plain', 'Gent': 'oval plain',
  'Antwerp': 'shield plain', 'Standard Liège': 'shield vstripes', 'Mechelen': 'shield vstripes', 'Cercle Brugge': 'shield vstripes', 'Charleroi': 'round vstripes',
  'Al Hilal': 'round plain', 'Al Nassr': 'round plain', 'Al Ittihad': 'shield vstripes', 'Al Ahli': 'round plain', 'Al Shabab': 'round plain',
  'Al Ettifaq': 'shield plain', 'Al Qadsiah': 'round plain', 'Al Taawoun': 'shield plain',
  'Inter Miami': 'round plain', 'LA Galaxy': 'shield sash', 'LAFC': 'shield plain', 'Seattle Sounders': 'shield chief', 'New York City FC': 'round plain',
  'Toronto FC': 'round plain', 'Atlanta United': 'round vstripes', 'Orlando City': 'shield plain', 'Columbus Crew': 'round plain', 'Philadelphia Union': 'round plain',
  'Portland Timbers': 'tall plain', 'Chicago Fire': 'round plain', 'Sporting Kansas City': 'round plain', 'Real Salt Lake': 'shield plain', 'Vancouver Whitecaps': 'round plain',
};
// Founding years shown as "EST. 1878" on the badge (a fact, not part of any crest). Clubs without one show none.
const BADGE_YEARS = {
  'Arsenal': 1886, 'Aston Villa': 1874, 'Bournemouth': 1899, 'Brentford': 1889, 'Brighton': 1901, 'Burnley': 1882, 'Chelsea': 1905, 'Crystal Palace': 1905,
  'Everton': 1878, 'Fulham': 1879, 'Leeds United': 1919, 'Liverpool': 1892, 'Manchester City': 1880, 'Manchester United': 1878, 'Newcastle United': 1892,
  'Nottingham Forest': 1865, 'Sunderland': 1879, 'Tottenham Hotspur': 1882, 'West Ham United': 1895, 'Wolverhampton': 1877,
  'Real Madrid': 1902, 'Barcelona': 1899, 'Atlético Madrid': 1903, 'Athletic Club': 1898, 'Villarreal': 1923, 'Real Betis': 1907, 'Celta Vigo': 1923,
  'Real Sociedad': 1909, 'Rayo Vallecano': 1924, 'Osasuna': 1920, 'Mallorca': 1916, 'Valencia': 1919, 'Getafe': 1983, 'Espanyol': 1900, 'Girona': 1930,
  'Sevilla': 1890, 'Alavés': 1921, 'Elche': 1923, 'Levante': 1909, 'Real Oviedo': 1926,
  'Inter': 1908, 'Napoli': 1926, 'AC Milan': 1899, 'Juventus': 1897, 'Atalanta': 1907, 'Roma': 1927, 'Lazio': 1900, 'Fiorentina': 1926, 'Bologna': 1909,
  'Como': 1907, 'Torino': 1906, 'Udinese': 1896, 'Genoa': 1893, 'Cagliari': 1920, 'Lecce': 1908, 'Parma': 1913, 'Sassuolo': 1920, 'Hellas Verona': 1903,
  'Cremonese': 1903, 'Pisa': 1909,
  'Bayern Munich': 1900, 'Borussia Dortmund': 1909, 'RB Leipzig': 2009, 'Bayer Leverkusen': 1904, 'VfB Stuttgart': 1893, 'Eintracht Frankfurt': 1899,
  'SC Freiburg': 1904, 'VfL Wolfsburg': 1945, 'Borussia Mönchengladbach': 1900, 'TSG Hoffenheim': 1899, 'Union Berlin': 1966, 'FC Augsburg': 1907,
  'Werder Bremen': 1899, 'Mainz 05': 1905, '1. FC Köln': 1948, 'Hamburger SV': 1887, '1. FC Heidenheim': 1846, 'FC St. Pauli': 1910,
  'Paris Saint-Germain': 1970, 'Marseille': 1899, 'Monaco': 1924, 'Lille': 1944, 'Lyon': 1950, 'Nice': 1904, 'Lens': 1906, 'Rennes': 1901, 'Strasbourg': 1906,
  'Toulouse': 1970, 'Brest': 1950, 'Nantes': 1943, 'Auxerre': 1905, 'Angers': 1919, 'Le Havre': 1872, 'Lorient': 1926, 'Metz': 1932, 'Paris FC': 1969,
  'Benfica': 1904, 'Porto': 1893, 'Sporting CP': 1906, 'Braga': 1921, 'Vitória SC': 1922, 'Famalicão': 1931, 'Gil Vicente': 1924, 'Moreirense': 1938,
  'Estoril': 1939, 'Santa Clara': 1921, 'Rio Ave': 1939, 'Casa Pia': 1920, 'Arouca': 1951, 'Nacional': 1910, 'Alverca': 1939, 'Tondela': 1933,
  'PSV': 1913, 'Feyenoord': 1908, 'Ajax': 1900, 'AZ': 1967, 'FC Twente': 1965, 'FC Utrecht': 1970, 'NEC': 1900, 'Go Ahead Eagles': 1902, 'Heerenveen': 1920,
  'Sparta Rotterdam': 1888, 'Fortuna Sittard': 1968, 'PEC Zwolle': 1910, 'Groningen': 1971, 'Heracles': 1903, 'NAC Breda': 1912, 'Excelsior': 1902,
  'FC Volendam': 1977, 'Telstar': 1963,
  'Galatasaray': 1905, 'Fenerbahçe': 1907, 'Beşiktaş': 1903, 'Trabzonspor': 1967, 'Başakşehir': 1990, 'Göztepe': 1925, 'Samsunspor': 1965, 'Eyüpspor': 1919,
  'Kasımpaşa': 1921, 'Kocaelispor': 1966, 'Antalyaspor': 1966, 'Alanyaspor': 1948, 'Konyaspor': 1922, 'Kayserispor': 1966, 'Gaziantep FK': 1988,
  'Çaykur Rizespor': 1968, 'Gençlerbirliği': 1923, 'Fatih Karagümrük': 1926,
  'Club Brugge': 1891, 'Union SG': 1897, 'Anderlecht': 1908, 'Genk': 1988, 'Antwerp': 1880, 'Standard Liège': 1898, 'Mechelen': 1904, 'Sint-Truiden': 1924,
  'Westerlo': 1933, 'Charleroi': 1904, 'OH Leuven': 2002, 'Cercle Brugge': 1899, 'Zulte Waregem': 2001,
  'Al Hilal': 1957, 'Al Nassr': 1955, 'Al Ittihad': 1927, 'Al Ahli': 1937, 'Al Qadsiah': 1967, 'Al Ettifaq': 1945, 'Al Shabab': 1947, 'Al Taawoun': 1956,
  'Al Fateh': 1958, 'Al Khaleej': 1945, 'Al Fayha': 1953,
  'Inter Miami': 2018, 'FC Cincinnati': 2015, 'Philadelphia Union': 2008, 'Charlotte FC': 2019, 'Orlando City': 2010, 'New York City FC': 2013,
  'New York Red Bulls': 1995, 'Columbus Crew': 1994, 'Nashville SC': 2016, 'Chicago Fire': 1997, 'Atlanta United': 2014, 'Toronto FC': 2006,
  'CF Montréal': 1992, 'D.C. United': 1994, 'New England Revolution': 1994, 'LAFC': 2014, 'San Diego FC': 2023, 'Vancouver Whitecaps': 1974,
  'Seattle Sounders': 2007, 'Minnesota United': 2010, 'LA Galaxy': 1994, 'Portland Timbers': 2009, 'Austin FC': 2018, 'San Jose Earthquakes': 1994,
  'Real Salt Lake': 2004, 'Colorado Rapids': 1995, 'Houston Dynamo': 2005, 'FC Dallas': 1995, 'Sporting Kansas City': 1995, 'St. Louis City SC': 2019,
};
const BADGE_OUTLINES = {
  shield: ['M7 5 H57 V31 Q57 51 32 61 Q7 51 7 31 Z', 'M11 9 H53 V31 Q53 48 32 56.6 Q11 48 11 31 Z'],
  pointed: ['M32 2 L58 8 V31 Q58 51 32 62 Q6 51 6 31 V8 Z', 'M32 6.2 L54 11.2 V31 Q54 48 32 57.6 Q10 48 10 31 V11.2 Z'],
  french: ['M7 9 Q32 1 57 9 V32 Q57 52 32 62 Q7 52 7 32 Z', 'M11 12.2 Q32 5.4 53 12.2 V32 Q53 49 32 57.6 Q11 49 11 32 Z'],
  // tall: a narrow shield with long straight sides
  tall: ['M11 2 H53 V38 Q53 54 32 62 Q11 54 11 38 Z', 'M15 6 H49 V38 Q49 51 32 57.6 Q15 51 15 38 Z'],
  // pear: wide shoulders, rounded belly, a point at the bottom
  pear: ['M6 4 Q32 9 58 4 Q60 22 54 38 Q46 54 32 62 Q18 54 10 38 Q4 22 6 4 Z', 'M10 8.4 Q32 12.8 54 8.4 Q55.6 23 50.4 36.6 Q43.6 50.6 32 57.6 Q20.4 50.6 13.6 36.6 Q8.4 23 10 8.4 Z'],
  // tallrect: an upright rectangle with a round bottom
  tallrect: ['M12 2 H52 V46 Q52 62 32 62 Q12 62 12 46 Z', 'M16 6 H48 V46 Q48 58 32 58 Q16 58 16 46 Z'],
  // cut: a shield with its top corners cut off
  cut: ['M15 3 H49 L57 11 V32 Q57 52 32 62 Q7 52 7 32 V11 Z', 'M16.7 7 H47.3 L53 12.7 V32 Q53 49 32 57.6 Q11 49 11 32 V12.7 Z'],
  rect: ['M8 4 H56 V44 L32 61 L8 44 Z', 'M12 8 H52 V42 L32 56.2 L12 42 Z'],
  // hex: a six-sided badge standing on a point
  hex: ['M32 2 L58 16 V46 L32 62 L6 46 V16 Z', 'M32 6.6 L54 18.4 V43.6 L32 57.4 L10 43.6 V18.4 Z'],
  // swiss: a shield whose sides curve in at the top
  swiss: ['M5 4 H59 Q54 14 56 30 Q56 50 32 62 Q8 50 8 30 Q10 14 5 4 Z', 'M11.4 8 H52.6 Q49.4 15 51.6 30 Q51.6 47 32 57.4 Q12.4 47 12.4 30 Q14.6 15 11.4 8 Z'],
  // banner: a shield under an arched name banner (the banner itself is drawn with the lettering)
  banner: ['M8 12 H56 V33 Q56 52 32 62 Q8 52 8 33 Z', 'M12 16 H52 V33 Q52 49 32 57.6 Q12 49 12 33 Z'],
  // ringshield: a ring with the name around it and a small shield inside
  ringshield: ['M32 2 A30 30 0 1 1 31.99 2 Z', 'M21 17 H43 V32 Q43 43 32 48 Q21 43 21 32 Z'],
  round: ['M32 2 A30 30 0 1 1 31.99 2 Z', 'M32 11 A21 21 0 1 1 31.99 11 Z'],
  oval: ['M32 2 A24 30 0 1 1 31.99 2 Z', 'M32 7 A19 25 0 1 1 31.99 7 Z'],
};
const badgeText = bg => badgeLum(bg) > 0.55 ? '#111111' : '#FFFFFF';
// Hand-designed badges for clubs that need more than an outline and a pattern. Fields (all optional):
//   o outline, l layout, s stars, e emblem ('none' for a clean field), c [main, second, trim],
//   ink emblem colour, rt colour of the lettering on the ring or ribbon, disc colour inside a ringshield.
// Colours follow the real club; shapes and emblems never copy the real crest's symbol.
const BADGE_CUSTOM = {
  'Manchester United': { o: 'ringshield', l: 'chevron', e: 'flame', c: ['#DA291C', '#111111', '#DA291C'], ink: '#FBE122', rt: '#FBE122', disc: '#FBE122' },
  'Manchester City': { o: 'round', l: 'sunburst', e: 'star', c: ['#6CABDD', '#FFFFFF', '#1C2C5B'], ink: '#FFC659' },
  'Hull City': { o: 'shield', l: 'tiger', e: 'none', c: ['#F5A12D', '#111111', '#111111'], rt: '#F5A12D' },
  'Brighton': { o: 'round', l: 'vstripes', e: 'waves', c: ['#FFFFFF', '#0057B8', '#0057B8'], ink: '#0057B8' },
  'Villarreal': { o: 'french', l: 'band', e: 'ball', c: ['#FFE667', '#005187', '#005187'], ink: '#005187', rt: '#FFE667' },
  'Valencia': { o: 'tall', l: 'senyera', e: 'none', c: ['#FFFFFF', '#111111', '#111111'], rt: '#F2B705' },
  // Getafe: the real crest's colours (red-gold-red beside green) on a different shape, with a blue outline.
  'Getafe': { o: 'french', l: 'splitflag', e: 'none', c: ['#D52B1E', '#009A44', '#1B4FA8'], rt: '#FFFFFF', rim: '#1B4FA8' },
  'Alavés': { o: 'pointed', l: 'vstripes', e: 'none', c: ['#FFFFFF', '#1E4C9A', '#1E4C9A'] },
  'Sevilla': { o: 'pear', l: 'midstripes', e: 'none', c: ['#FFFFFF', '#D71920', '#C8A04B'], rt: '#111111' },
  'Inter': { o: 'round', l: 'pinstripes', e: 'none', s: 2, c: ['#0068A8', '#111111', '#111111'], ink: '#D4AF37', rt: '#D4AF37' },
  'Roma': { o: 'pointed', l: 'chief', e: 'none', c: ['#8E1F2F', '#F0BC42', '#F0BC42'] },
  'Bayer Leverkusen': { o: 'cut', l: 'halves', e: 'bolt', c: ['#E32221', '#111111', '#111111'], ink: '#F2B705', rt: '#E32221' },
  'Bayern Munich': { o: 'round', l: 'dstripes', e: 'none', s: 5, c: ['#FFFFFF', '#0066B2', '#DC052D'], ink: '#D4AF37' },
  'Borussia Dortmund': { o: 'round', l: 'bands', e: 'none', s: 1, c: ['#FDE100', '#111111', '#111111'], ink: '#FDE100', rt: '#FDE100' },
  'VfL Wolfsburg': { o: 'round', l: 'wmark', e: 'none', c: ['#FFFFFF', '#65B32E', '#65B32E'], rt: '#FFFFFF' },
  'RB Leipzig': { o: 'tallrect', l: 'plain', e: 'ball', c: ['#FFFFFF', '#DD0741', '#001F47'], ink: '#DD0741' },
  'Paris Saint-Germain': { o: 'round', l: 'centerstripe', e: 'none', c: ['#004170', '#DA291C', '#004170'] },
  'Lyon': { o: 'banner', l: 'chevron2', e: 'none', c: ['#FFFFFF', '#14387F', '#DA001A'], rt: '#FFFFFF' },
  'Al Hilal': { o: 'round', l: 'sunburst', e: 'star', c: ['#0033A0', '#4F8BFF', '#0033A0'], ink: '#FFFFFF', rt: '#FFFFFF' },
  'Genk': { o: 'shield', l: 'chevron', e: 'star', c: ['#0047AB', '#FFFFFF', '#0B2A5B'], ink: '#FFFFFF' },
  'Gent': { o: 'oval', l: 'hoops', e: 'crown', c: ['#0047AB', '#FFFFFF', '#FFFFFF'], ink: '#0047AB' },
  'AC Milan': { o: 'round', l: 'vstripes', e: 'none', s: 1, c: ['#FB090B', '#111111', '#111111'], ink: '#D4AF37', rt: '#FB090B', rim: '#111111' },
};
const BADGE_EMBLEMS = {
  star: 'M32 21 L35.2 29 L43.8 29 L36.9 34.1 L39.5 42.4 L32 37.4 L24.5 42.4 L27.1 34.1 L20.2 29 L28.8 29 Z',
  ball: 'M32 21 A11 11 0 1 1 31.99 21 Z M32 26.5 L36.6 29.8 L34.8 35.2 L29.2 35.2 L27.4 29.8 Z M31.4 21.2 H32.6 V26.5 H31.4 Z M36.6 29.8 L41.6 28 L42 29.2 L37 31 Z M34.8 35.2 L37.8 39.6 L36.8 40.3 L33.8 35.9 Z M29.2 35.2 L26.2 39.6 L27.2 40.3 L30.2 35.9 Z M27.4 29.8 L22.4 28 L22 29.2 L27 31 Z',
  bolt: 'M35 19 L25 34 L31 34 L28 45 L39 29 L33 29 Z',
  tower: 'M23 44 V27 H26 V24 H29 V27 H30.5 V24 H33.5 V27 H35 V24 H38 V27 H41 V44 H35 V37 Q32 33 29 37 V44 Z',
  waves: 'M20 27 Q26 21 32 27 Q38 33 44 27 V32 Q38 38 32 32 Q26 26 20 32 Z M20 36 Q26 30 32 36 Q38 42 44 36 V41 Q38 47 32 41 Q26 35 20 41 Z',
  sun: 'M32 25 A7 7 0 1 1 31.99 25 Z M31 18 H33 V22 H31 Z M31 42 H33 V46 H31 Z M18 31 H22 V33 H18 Z M42 31 H46 V33 H42 Z M22 21.6 L23.4 20.2 L26.2 23 L24.8 24.4 Z M37.8 37 L39.2 35.6 L42 38.4 L40.6 39.8 Z M22 42.4 L24.8 39.6 L26.2 41 L23.4 43.8 Z M37.8 27 L40.6 24.2 L42 25.6 L39.2 28.4 Z',
  diamond: 'M32 20 L43 32 L32 44 L21 32 Z M32 26 L37 32 L32 38 L27 32 Z',
  chevron: 'M21 36 L32 24 L43 36 V42 L32 30 L21 42 Z',
  // Only for hand-designed badges:
  flame: 'M32 17 C35 23 42 26 41 35 C40 41 36 45 32 45 C28 45 24 41 23 35 C22.5 30 26 27 27.5 23 C29 27 30.5 28.5 32 29.5 C33.5 25.5 33 21 32 17 Z M32 33 C34 36 35.5 37.5 35 40 C34.6 42 33.4 43 32 43 C30.6 43 29.4 42 29 40 C28.6 38 30 36 32 33 Z',
  crown: 'M21 40 L22 26 L27 32 L32 23 L37 32 L42 26 L43 40 Z',
  arrow: 'M21 32 L32 21 L43 32 V37 L32 26 L21 37 Z M21 41 L32 30 L43 41 V46 L32 35 L21 46 Z',
};
const BADGE_RANDOM_EMBLEMS = ['star', 'ball', 'bolt', 'tower', 'waves', 'sun', 'diamond', 'chevron'];
function abstractBadge(c, dir) {
  const key = `${dir}/${c.name}`;
  if (BADGE_CACHE[key]) return BADGE_CACHE[key];
  const h = badgeHash(c.name), cu = BADGE_CUSTOM[c.name] || {};
  const [a, b, t] = cu.c || BADGE_COLORS[c.name] || (typeof BADGE_PALETTE !== 'undefined' && BADGE_PALETTE[key]) || [hueColor(h, 42), '#FFFFFF', hueColor(h >> 8, 55)];
  // Clubs without a hand-made shape get one from their name.
  const spec = cu.o ? [cu.o, cu.l || 'plain', String(cu.s || 0)] : (BADGE_SHAPES[c.name] ||`${['shield', 'pointed', 'french', 'tall', 'pear', 'tallrect', 'cut', 'swiss', 'hex', 'banner', 'round', 'oval', 'ringshield', 'rect'][h % 14]} ${['plain', 'vstripes', 'chief', 'halves', 'band', 'sash', 'hoops', 'chevron'][(h >>> 3) % 8]}`).split(' ');
  const outline = spec[0], ring = outline === 'round' || outline === 'ringshield', round = ring || outline === 'oval', stars = +spec[2] || 0;
  // A round crest is cut in half, never in quarters (that reads as a car maker's roundel).
  const layout = round && spec[1] === 'quarters' ? 'halves' : spec[1];
  const [outer, field] = BADGE_OUTLINES[outline];
  // The emblem takes whichever other colour stands out more on the main one, with an outline so it shows on stripes.
  const ink = cu.ink || (Math.abs(badgeLum(b) - badgeLum(a)) >= Math.abs(badgeLum(t) - badgeLum(a)) ? b : t);
  // Lettering on the ring or ribbon.
  const tx = cu.rt || badgeText(t);
  const halo = badgeLum(ink) > 0.55 ? '#111111' : '#FFFFFF';
  const R = (x, y, w, hh, f) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${f}"/>`;
  const fill = {
    plain: '',
    vstripes: [14, 26, 38, 50].map(x => R(x - 3, 0, 6, 64, b)).join(''),
    hoops: [14, 26, 38, 50].map(y => R(0, y - 3, 64, 6, b)).join(''),
    halves: R(32, 0, 32, 64, b),
    diag: `<path d="M64 0 L64 64 L0 64 Z" fill="${b}"/>`,
    sash: `<path d="M0 6 L6 0 L64 58 L58 64 Z" fill="${b}"/>`,
    band: R(0, 27, 64, 11, b),
    chevron: `<path d="M0 40 L32 22 L64 40 L64 50 L32 32 L0 50 Z" fill="${b}"/>`,
    quarters: R(0, 0, 32, 33, b) + R(32, 33, 32, 31, b),
    chief: R(0, 0, 64, { round: 24, oval: 24, ringshield: 26, banner: 28 }[outline] || 21, b),
    // Thin stripes all the way across.
    pinstripes: [8, 16, 24, 32, 40, 48, 56].map(x => R(x - 2, 0, 4, 64, b)).join(''),
    // Stripes in a framed panel in the middle only.
    midstripes: [21, 28.5, 36, 43.5].map(x => R(x - 2, 20, 4, 26, b)).join('') + R(16, 18, 32, 2, b) + R(16, 46, 32, 2, b),
    // One broad stripe down the middle, edged in white.
    centerstripe: R(22, 0, 20, 64, '#FFFFFF') + R(25, 0, 14, 64, b),
    // Faint rays from the centre.
    sunburst: `<g fill="${b}" opacity=".22">${Array.from({ length: 12 }, (_, i) => `<path d="M32 32 L${(32 + 60 * Math.cos((i * 30 - 6) * Math.PI / 180)).toFixed(1)} ${(32 + 60 * Math.sin((i * 30 - 6) * Math.PI / 180)).toFixed(1)} L${(32 + 60 * Math.cos((i * 30 + 6) * Math.PI / 180)).toFixed(1)} ${(32 + 60 * Math.sin((i * 30 + 6) * Math.PI / 180)).toFixed(1)} Z"/>`).join('')}</g>`,
    // Tiger-like wedges coming in from both sides.
    tiger: `<path d="M0 10 L20 13 L0 15.5 Z M64 16 L44 19.5 L64 22 Z M0 23 L23 26.5 L0 29 Z M64 30 L41 33.5 L64 36 Z M0 37 L22 40.5 L0 43 Z M64 44 L43 47 L64 49.5 Z M0 51 L18 53.5 L0 56 Z M64 4 L48 6.5 L64 9 Z" fill="${b}"/>`,
    // Broad diagonal stripes running up to the right.
    dstripes: [-24, -2, 20, 42].map(o => `<path d="M${o} 64 L${o + 64} 0 L${o + 75} 0 L${o + 11} 64 Z" fill="${b}"/>`).join(''),
    // Two broad vertical bands with the main colour between and outside them.
    bands: R(14, 0, 11, 64, b) + R(39, 0, 11, 64, b),
    // A big zigzag W across the field.
    wmark: `<polyline points="12,21 22,46 32,20 42,46 52,21" fill="none" stroke="#1D2A4D" stroke-width="9.5" stroke-linejoin="miter" stroke-miterlimit="6"/><polyline points="12,21 22,46 32,20 42,46 52,21" fill="none" stroke="${b}" stroke-width="7" stroke-linejoin="miter" stroke-miterlimit="6"/>`,
    // Two chevrons stacked, in the second and trim colours.
    chevron2: `<path d="M0 30 L32 14 L64 30 L64 38 L32 22 L0 38 Z" fill="${t}"/><path d="M0 42 L32 26 L64 42 L64 51 L32 35 L0 51 Z" fill="${b}"/>`,
    // A dark top band over a gold panel with orange stripes.
    senyera: R(0, 0, 64, 21, b) + R(18, 25, 28, 29, '#F2B705') + [21, 27.5, 34, 40.5].map(x => R(x, 25, 3.5, 29, '#EE3524')).join(''),
    // Left half red-gold-red stripes, right half in the second colour.
    splitflag: R(0, 0, 32, 64, a) + R(18, 0, 7, 64, '#F6C700') + R(32, 0, 32, 64, b) + R(31.4, 0, 1.2, 64, '#FFFFFF'),
    // Two diagonal bands side by side, in the second and trim colours.
    sash2: `<path d="M0 2 L2 0 L64 46 L64 54 Z" fill="${b}"/><path d="M0 12 L0 20 L52 64 L60 64 Z" fill="${t}"/>`,
  }[layout] || '';
  // Round crests keep the middle clear of the ring; shields move it up to leave room for the ribbon.
  const ey = round ? 0 : outline === 'banner' ? -1 : -3;
  const emName = cu.e || BADGE_RANDOM_EMBLEMS[(h >>> 5) % BADGE_RANDOM_EMBLEMS.length];
  const em = emName === 'none' ? '' : `<path d="${BADGE_EMBLEMS[emName]}" fill="${ink}" fill-rule="evenodd" stroke="${halo}" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke" transform="${outline === 'ringshield' ? 'translate(32 33) scale(.55) translate(-32 -32)' : `translate(0 ${ey})`}"/>`;
  const starRow = stars ? Array.from({ length: stars }, (_, i) => {
    const x = 32 + (i - (stars - 1) / 2) * 6, y = { round: 16, oval: 14, ringshield: 21, banner: 24 }[outline] || 14;
    return `<path d="M${x} ${y - 2.4} L${x + .7} ${y - .7} L${x + 2.4} ${y - .7} L${x + 1} ${y + .4} L${x + 1.5} ${y + 2.2} L${x} ${y + 1.1} L${x - 1.5} ${y + 2.2} L${x - 1} ${y + .4} L${x - 2.4} ${y - .7} L${x - .7} ${y - .7} Z" fill="${ink}" stroke="${halo}" stroke-width=".5"/>`;
  }).join('') : '';
  const font = 'font-family="Arial,Helvetica,sans-serif" font-weight="800"';
  const name = esc(c.name.toUpperCase().slice(0, 30)), code = esc((c.short || c.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase());
  const year = BADGE_YEARS[c.name];
  const yearText = (x, y, size, f) => year ? `<text x="${x}" y="${y}" text-anchor="middle" ${font} font-size="${size}" letter-spacing=".3" fill="${f}" stroke="${badgeText(f) === '#111111' ? '#FFFFFF' : '#111111'}" stroke-width=".25" paint-order="stroke">EST. ${year}</text>` : '';
  const ringName = `<path id="arc" d="M13.6 47.4 A24 24 0 1 1 50.4 47.4" fill="none"/><text ${font} font-size="${Math.min(6, 118 / name.length).toFixed(2)}" fill="${tx}" letter-spacing=".3"><textPath href="#arc" startOffset="50%" text-anchor="middle">${name}</textPath></text>`;
  // The ribbon carries the short name, and the founding year beside it when there is one.
  const ribbon = `<path d="M2 43 H62 L59 47.5 L62 52 H2 L5 47.5 Z" fill="${t}" stroke="#F4F4F4" stroke-width="1"/><text x="32" y="${year ? 49.9 : 50.3}" text-anchor="middle" ${font} font-size="${year ? 5.4 : 6.4}" letter-spacing=".5" fill="${tx}">${code}${year ? ` · ${year}` : ''}</text>`;
  // Ring crests carry the name around the ring and the year at the bottom; banner shields carry the name on an
  // arch over the top; the rest get a ribbon with the short name and the year in the point below it.
  const lettering = ring
    // The arc runs about 250 degrees round the top; long names get smaller letters instead of being cut.
    ? ringName + (year ? yearText(32, 58.4, 4.4, tx) : `<path d="M32 53.4 L33 55.6 L35.4 55.8 L33.6 57.3 L34.2 59.6 L32 58.4 L29.8 59.6 L30.4 57.3 L28.6 55.8 L31 55.6 Z" fill="${tx}"/>`)
    : outline === 'oval' ? yearText(32, 50, 4.2, ink)
    : outline === 'banner'
      ? `<path d="M2 11 Q32 -1 62 11 L59 15.5 L62 20 Q32 8 2 20 L5 15.5 Z" fill="${t}" stroke="#F4F4F4" stroke-width="1"/><path id="arc" d="M5 17.6 Q32 6 59 17.6" fill="none"/><text ${font} font-size="${Math.min(5.6, 92 / name.length).toFixed(2)}" fill="${tx}" letter-spacing=".3"><textPath href="#arc" startOffset="50%" text-anchor="middle">${name}</textPath></text>${ribbon}`
      : ribbon;
  // Clubs with title stars get a gold rim; a hand-designed badge can set its own (rim).
  const rimColor = cu.rim || (stars ? '#D4AF37' : '#F4F4F4');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">`
    + `<path d="${outer}" fill="${t}" stroke="${rimColor}" stroke-width="${stars ? 2 : 1.6}"/>`
    + (outline === 'ringshield' ? `<circle cx="32" cy="32" r="21" fill="${cu.disc || b}"/>` : '')
    + `<clipPath id="f"><path d="${field}"/></clipPath><g clip-path="url(#f)">${R(0, 0, 64, 64, a)}${fill}</g>`
    + `<path d="${field}" fill="none" stroke="${halo}" stroke-opacity=".35" stroke-width=".8"/>`
    + `${starRow}${em}${lettering}</svg>`;
  return (BADGE_CACHE[key] = `data:image/svg+xml,${encodeURIComponent(svg)}`);
}

function logoUrl(c, ext) {
  const dir = DB.leagues.find(l => l.id === c.id.split('-')[0]).name;
  if (BADGE_MODE === 'abstract') return abstractBadge(c, dir);
  // Some crests are packed into one script (js/logos-tur.js) instead of separate files.
  const packed = typeof LOGO_DATA !== 'undefined' && LOGO_DATA[`${dir}/${c.name}`];
  if (packed) return packed;
  return `Club_logos/${encodeURIComponent(dir)}/${encodeURIComponent(c.name)}.${ext}${ASSET_V ? `?v=${ASSET_V}` : ''}`;
}

function crest(id, size = '') {
  // National teams show their flag (js/flags.js), or their code if there is none.
  const flag = isNation(id) && typeof FLAG_DATA !== 'undefined' && FLAG_DATA[id.slice(2)];
  if (flag) return `<div class="crest ${size} nation hasflag"><img src="${flag}" alt=""><span>${teamCode(id).slice(0, 4)}</span></div>`;
  if (!isClub(id)) return `<div class="crest ${size} ${isNation(id) ? 'nation' : ''}"><span>${teamCode(id).slice(0, 4)}</span></div>`;
  const c = club(id), st = logoState[id] ?? 0;
  const img = st >= 0 ? `<img src="${logoUrl(c, LOGO_EXTS[st])}" alt=""${inkCrest(c.name)} data-club="${id}" data-ext="${st}">` : '';
  return `<div class="crest ${id === S.player.club ? 'me' : ''} ${st >= 0 ? 'haslogo' : ''} ${size}">${img}<span>${c.short.slice(0, 4)}</span></div>`;
}

// Try the next file type, then give up and show the short name.
// In the league table, results, cups and career history every crest gets about the same visible area, like Google's standings: a tall
// crest (Juventus) is drawn a little smaller and a wide one (Lazio) a little bigger, within a 22px square.
const LGT_BOX = 22, LGT_AREA = 16 * 16;
document.addEventListener('load', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('table.lgt, .lgcrest, .spell, .stint, .honteam, .offer .clubcell, .sqmove') || img.closest('.nation') || !img.naturalWidth) return;
  const r = img.naturalWidth / img.naturalHeight;
  let w = Math.sqrt(LGT_AREA * r), h = Math.sqrt(LGT_AREA / r);
  const k = Math.min(1, LGT_BOX / w, LGT_BOX / h);
  img.style.width = `${Math.round(w * k)}px`; img.style.height = `${Math.round(h * k)}px`;
}, true);

document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset.club) return;
  // Each image steps through the file types on its own; the same club can be on screen twice.
  const id = img.dataset.club, next = +img.dataset.ext + 1;
  if (next < LOGO_EXTS.length) {
    // The save may be gone by now (back to the start screen): then there is nothing left to retry.
    const c = id.startsWith('db:') ? dbClubCache[id.slice(3)] : S && S.clubs && S.clubs[id];
    if (!c) return;
    img.dataset.ext = next;
    img.src = logoUrl(c, LOGO_EXTS[next]);
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

// What the club says when it hands you an offer. Each pitch is built from an opening, a line about
// you (your season, your position, your country, your age) and a closing, all picked to fit the
// deal, so two offers rarely read the same. The same offer always shows the same words.
// The role a buying club signs you for in its manager's shape, and where his plan B would put you.
const posWord = r => POS_NAMES[r].toLowerCase(), aPos = r => `${/^[aeiou]/i.test(posWord(r)) ? 'an' : 'a'} ${posWord(r)}`;
function signRole(c) {
  const pos = S.player.pos, main = formationOf(c), alt = altFormationOf(c), role = shapeRole(pos, c), altOpts = shapeOptions(pos, alt);
  return { pos, main, alt, role, altOpts, altSame: altOpts.length === 1 && altOpts[0] === role };
}
function signRolePitch(o, c) {
  const s = signRole(c);
  const first = s.role === s.pos ? `We need ${aPos(s.pos)}.` : `We play a ${s.main}, so we'd use you as ${aPos(s.role)}.`;
  if (s.altSame) return first;
  const extra = s.altOpts.filter(r => r !== s.role);
  return `${first} Sometimes we switch to a ${s.alt}, and then you might be ${s.altOpts.includes(s.role) ? `${extra.map(aPos).join(' or ')} instead` : s.altOpts.map(aPos).join(' or ')}.`;
}
function signRoleNote(c) {
  const s = signRole(c);
  return `<div class="small">Signed as <b>${s.role}</b> in ${esc(c.mgr)}'s ${s.main}${s.role !== s.pos ? ` <span class="muted">(no ${s.pos} spot)</span>` : ''}${s.altSame ? '' : ` · <span class="muted">plan B ${s.alt}:</span> <b>${s.altOpts.join(' or ')}</b>`}</div>`;
}
function offerPitch(o, c) {
  const p = S.player, age = ageOf(p.by), seed = [...o.id].reduce((s, ch, i) => s + ch.charCodeAt(0) * (i + 7), 0);
  // Each part uses its own slice of the seed, so the pieces vary independently.
  const one = (list, salt) => list[Math.floor(seed / (salt * 3 + 1)) % list.length];
  const mine = myClub(), lg = league(c.league), pos = POS_NAMES[p.pos].toLowerCase(), gk = p.pos === 'GK';
  const last = (p.career || []).at(-1), yrs = o.years === 1 ? 'one season' : `${o.years} seasons`;

  // Something personal: last season's numbers, your position, coming home, your age or your fame.
  const facts = [];
  if (last && last.apps >= 10) {
    facts.push(gk ? `${last.cleanAll || 0} clean sheets last season. We counted every one of them.`
      : `${last.goals} goals and ${last.assists} assists last season. Our analysts watched every single one.`);
    if (!gk && last.goals >= 10) facts.push(`${last.goals} goals in a season doesn't happen by accident. That's a hunger we want in our dressing room.`);
    if (last.avg >= 7) facts.push(`An average rating of ${last.avg.toFixed(2)}. Week in, week out, you deliver.`);
  }
  facts.push(gk ? 'Keepers who make the impossible saves look routine are rare. You\'re one of them.'
    : `The way you play as a ${pos}, the movement, the timing, the courage... you can't coach that.`);
  if (lg.nat === p.nat && league(mine.league).nat !== p.nat && o.type === 'transfer') facts.push(`It's time to come home. ${natName(p.nat)} misses you, and so do we.`);
  if (age <= 21) facts.push(`At ${age}, you're already doing things most players never manage. Imagine where you'll be in a few years.`);
  if (p.rep >= 60) facts.push(`Half of ${lg.name} knows your name already. The other half soon will.`);
  if (o.type === 'transfer' && teamStrength(c) > teamStrength(mine) + 4) facts.push(`${mine.name} gave you a start. We can give you the next level.`);
  if (o.type === 'renew' && p.joinedSeason != null && S.season - p.joinedSeason >= 2) facts.push(`${S.season - p.joinedSeason} seasons in this shirt, and every one of them has meant something to us.`);
  const fact = one(facts, 2);

  let open, close;
  if (o.clause) {
    const more = `${raisePct(o)}% more than you earn now`;
    open = one([
      'We really, truly love you as a player.',
      'Do you know what you mean to this club? The kitman, the cleaners, the fans in the stands... everyone smiles when your name comes up.',
      'We\'ve had a lot of players through here, but very few like you. You\'re not just part of our plans, you are the plan.',
      'Some players join a club. Others become part of it. You\'re the second kind.',
      'We sat down as a board last night and every single person in that room said your name first.',
    ], 1);
    close = one([
      `Give us ${o.clause} seasons and we'll make you our star. There's ${more} on the table, because you deserve to feel how much you mean to us. And the noise from outside? Other clubs, phone calls... we'll take care of all that. You just play.`,
      `We want ${o.clause} seasons with you, to watch you become everything we know you can be. Here's ${more}, from the bottom of our hearts. We'll keep every distraction far away from you, if you know what we mean. This is your family now.`,
      `Stay for ${o.clause} seasons and build something with us. We're offering ${more} so there's no doubt how much we believe in you. Let us handle the agents, the rumours and the other clubs. You focus on being you.`,
      `${o.clause} seasons, ${more}, and a club that will protect you like one of its own. Nobody will come knocking, we'll make sure of it. All you have to do is keep smiling on that pitch.`,
    ], 3);
  } else if (o.raise) {
    // You asked for more money on the deal you have: the club answers that, nothing more.
    open = one(['You asked, and we listened.', 'You\'ve earned this conversation.', 'The board looked at your numbers and agreed.', 'We know what you bring to this team.'], 1);
    close = one(['Same deal, a better wage. Keep doing what you\'re doing.', 'Nothing else changes: just keep giving us everything on the pitch.', 'Consider it a thank-you. Now let\'s go and win something.', 'We look after the players who look after us.'], 3);
  } else if (o.type === 'renew') {
    if (p.needsContract) {
      open = one(['Your contract may have run out, but our belief in you never did.', 'We know the paperwork says it\'s over. We don\'t.', 'Some goodbyes just don\'t feel right. This would be one of them.', 'Before you listen to anyone else, hear us out.'], 1);
      close = one(['This is your home. Let\'s go again, together.', 'Sign, and let\'s finish what we started.', `${yrs} more. That's all we ask, and we'll give you everything back.`, 'The door was never closed. Walk back through it.'], 3);
    } else if (vetYears(age)) {
      open = one(['You\'ve been a leader for us, on the pitch and off it.', 'Players like you don\'t come around often.', 'The young lads watch how you train, how you speak, how you carry yourself.', 'Every club needs someone who has seen it all. We have you.'], 1);
      close = one([`Give us ${o.years > 1 ? 'a couple more years' : 'one more year'}, and let the next generation learn from the best.`, 'The fans sing your name every week. We\'d love you to stay a little longer.', 'There\'s still a chapter left to write here, and we want you to write it.', 'Stay. Not because you have to, but because this place wouldn\'t be the same without you.'], 3);
    } else {
      open = one(['You\'ve given everything for this badge, and the supporters adore you for it.', 'This club feels different with you in it.', 'We\'ve watched you grow into this shirt.', 'Every time you step onto that pitch, the whole stadium leans forward a little.', `${mine.mgr} says you're the first name on his team sheet. The board agrees.`], 1);
      close = one(['We want you to keep writing your story here.', 'Stay with us, and let\'s win something special together.', 'There\'s so much more to come, and we want to be there for all of it.', `${yrs} more, and we promise you'll look back on them as the best of your life.`, 'Let\'s make this the place people remember you for.'], 3);
    }
  } else if (p.needsContract) {
    open = one(['Others let you go. We see exactly what they missed.', 'Every player has a tough spell. What matters is what comes next.', 'We\'ve been waiting for the chance to call you.', 'A club without you is losing out. A club with you is lucky. We want to be lucky.'], 1);
    close = one(['Come to us, and let\'s prove them all wrong together.', 'We\'re ready to give you a fresh start and a real home.', `${yrs} to show everyone who you really are. We'll be right behind you.`, 'Pick up the phone. Your next chapter starts here.'], 3);
  } else if (o.promised) {
    open = one(['We\'ve followed you for months and we\'re convinced.', 'We don\'t make promises lightly. This is one we\'ll keep.', 'Our manager has already drawn the team with your name in it.', `${c.mgr} told the board he won't sign anyone else for your position.`], 1);
    close = one(['Come to us and the starting shirt is yours. That\'s a promise.', 'You won\'t be sitting on any bench here. We want you on the pitch every week.', 'Ninety minutes, every week, at the heart of everything we do. Come and take it.', 'Starting XI, from day one. All you have to do is say yes.'], 3);
  } else if (o.status === 'Reserve') {
    open = one(['We know it may take a little time to break into this team.', 'Nobody walks straight into a side like ours, and we won\'t pretend otherwise.', 'Our squad is stacked, we won\'t lie to you.', 'Every great player started somewhere. Some started right here, on our bench.'], 1);
    close = one(['But we see a future star in you. Be patient with us, and we\'ll make you great.', 'Train with the best every day, learn, and when your chance comes, take it. We believe you will.', 'Work hard, stay hungry, and that shirt will be yours sooner than you think.', `Give us ${yrs} and we'll turn potential into something special.`], 3);
  } else if (richLeague(c)) {
    open = one(['Come and be the face of our project.', 'We\'re building something huge.', `${lg.name} is changing, and we want you to lead that change.`, 'Imagine sold-out stadiums chanting your name every week.'], 1);
    close = one(['The fans here will treat you like a king, and you\'ll be part of history.', 'A new city, a new challenge, and people who will love you from day one.', 'We\'ll look after you and your family like our own. Whatever you need, it\'s yours.', `${yrs} that people here will talk about for decades.`], 3);
  } else if (vetYears(age)) {
    open = one(['You still have so much to give.', 'Age is just a number.', 'Experience like yours can\'t be bought. Well, we\'re trying.', 'Young players can run. You know where to run. That\'s the difference.'], 1);
    close = one(['Bring your experience to our dressing room. Our young players need someone like you.', 'We\'ve seen you play, and we know you can still make the difference for us.', 'Come and show everyone you\'re far from finished.', `${yrs} to add one more great chapter to your story.`], 3);
  } else if (teamStrength(c) > teamStrength(mine) + 2) {
    open = one(['Our scouts can\'t stop talking about you.', 'Big nights, full stadiums, trophies.', `${c.mgr} has a picture of you on his office wall. Don't tell him we told you.`, 'We don\'t chase many players. We\'re chasing you.', `At ${c.name}, ordinary isn't enough. We think you're not ordinary.`], 1);
    close = one(['This is the stage you were made for. Come and show the world.', 'We think you\'re ready for it all, and we want you to do it in our colours.', 'Come and play where the whole world is watching.', `${yrs} at the top. Are you ready? We think you are.`, 'The next level is right here. Step up.'], 3);
  } else {
    open = one(['We\'d build our team around you.', 'Our fans already know your name.', 'We\'ve been watching you for a long time.', `Ask anyone at ${c.name}: you're the one we want.`, 'We\'re not looking for just another player. We\'re looking for a hero.'], 1);
    close = one(['Here, you wouldn\'t just be one of the players. You\'d be the player.', 'Join us, and we\'ll give you the platform and the love to become someone special.', 'You\'re exactly the player we\'ve been looking for.', `${yrs} to become a legend here. The badge is waiting.`, 'Come and be the reason our supporters believe again.'], 3);
  }
  return `${open} ${fact}${o.type === 'transfer' ? ' ' + signRolePitch(o, c) : ''} ${close}`;
}

function offersHtml() {
  const summer = S.phase === 'offseason' && (S.offerRerolls || 0) > 0;
  if (!S.offers.length && !summer) return '';
  const refresh = summer && canRefreshOffers() ? `<button class="btn block" data-act="refreshOffers">Wait for more offers (${S.offerRerolls} left)</button>` : '';
  return `<section class="card"><h2>Contract offers</h2>${S.offers.length ? '' : '<p class="small muted">No offers right now.</p>'}${S.offers.map(o => {
    const c = club(o.club), left = maxRounds(o) - o.rounds;
    // At your own club the role is where you stand with the manager right now: negotiating costs
    // affection, and that can cost you your place.
    const role = o.type === 'renew' && !o.roleCap ? squadStatus() : o.status, dropped = o.type === 'renew' && ROLE_RANK[role] < ROLE_RANK[o.status];
    const talk = o.type === 'transfer'
      ? `<div class="small bad"><b>They will only negotiate ${left} more time${left !== 1 ? 's' : ''}.</b> If a negotiation fails, they walk away.</div>`
      : o.clause ? `<div class="small muted"><b>Loyalty clause:</b> no club can bid for you, and no salary talks or transfer requests, until the end of ${seasonLabel(clauseEnd(o.clause))}.</div>${chanceBoosted() ? '' : `<div class="small good">Sign it and you are part of their plans: +${Math.round(CHANCE_BOOST * 100)}% start chance at ${esc(c.name)} for good.</div>`}`
      : o.raise && !negLocked() && !o.talksOver ? '<div class="small muted">Starts now: same contract, same end date, role and clauses, just more money.</div>'
      : o.now && !o.talksOver ? `<div class="small muted">Starts now: the new wage from this week.</div>`
      : o.type === 'renew' && S.phase === 'season' && !negLocked() && !o.talksOver ? '<div class="small muted">Starts next season: you finish this season on your current deal.</div>'
      : o.talksOver ? '<div class="small bad">Talks broke down. You can still sign this offer or decline it, but not negotiate.</div>'
      : negLocked() ? `<div class="small muted">Salary talks are locked until about week ${lockWeekLabel()}. You can still sign.</div>` : '';
    return `<div class="offer">
      <div class="row"><div class="clubcell">${crest(c.id, "small")}<div style="min-width:0"><div class="club">${c.name}</div><div class="small muted">${league(c.league).name} · Team rating ${Math.round(teamStrength(c))}</div></div></div>
      <span class="chip ${o.clause ? 'good' : o.type === 'renew' ? '' : 'flood'}">${o.clause ? 'Loyalty deal' : o.raise ? 'Pay rise' : o.callup ? 'Call-up' : o.type === 'renew' ? 'Renewal' : o.pre ? 'Pre-contract' : 'Transfer'}</span></div>
      <div class="kv"><div><small>Wage</small><b class="num">${money(o.wage)}/wk</b></div><div><small>Years</small><b>${o.years}</b><small>until end of ${seasonLabel(offerEnds(o))}</small></div><div><small>Role</small><b class="${o.promised ? 'good' : dropped ? 'bad' : ''}">${role}${o.promised ? ' (promised)' : ''}</b></div></div>
      ${o.pre ? `<div class="small good"><b>Pre-contract:</b> your deal runs out this season, so ${esc(c.name)} want you on a free. Sign now and you finish the season at ${esc(myClub().name)}, then join them when your contract expires (their summer tournaments, a Club World Cup included, are yours; ${esc(myClub().name)}'s are not). The offer goes when the season ends.</div>` : ''}
      ${o.keep && S.clubs[o.keep] ? `<div class="small flood"><b>Move blocked:</b> ${esc(c.name)} refused to sell you to ${esc(club(o.keep).name)}. This is their offer to keep you happy: sign it and you carry on, no hard feelings.</div>${buyoutHtml()}` : ''}
      ${o.callup ? `<div class="small good"><b>First-team call-up:</b> ${esc(c.name)} want to promote you from their second team. No fee, no transfer window needed. Answer within ${Math.max(1, CALLUP_LAPSE - (absWeek() - (o.at || 0)))} week${CALLUP_LAPSE - (absWeek() - (o.at || 0)) === 1 ? '' : 's'}.</div>` : ''}
      ${o.boss ? `<div class="small good"><b>Your old boss:</b> ${o.boss.back ? `${esc(o.boss.n)} never forgot what you did for him and wants you back.` : `${esc(o.boss.n)} managed you at ${esc(S.clubs[o.boss.was] ? club(o.boss.was).name : 'your old club')} and wants you with him again.`}</div>` : ''}
      ${o.desperate ? `<div class="small good"><b>Desperate:</b> ${esc(c.name)} badly need a player like you and are paying well over the odds.</div>` : ''}
      ${o.type === 'transfer' ? signRoleNote(c) : ''}
      <div class="small muted">${S.player.needsContract ? 'No wage now: you have no club' : `Current wage ${money(S.player.wage)}/wk`}${o.promised ? ' · They promise you a starting place' : ''}</div>
      ${o.type === 'renew' && !o.raise && ROLE_RANK[role] >= 2 ? `<div class="small good">Sign as ${role.toLowerCase()} and your starting place is protected for ${RENEW_PROMISE} games.</div>` : ''}
      ${dropped ? `<div class="small bad">Was offered as ${o.status.toLowerCase()}: your contract talks cost you affection with ${esc(c.mgr)}, and your place with it.</div>` : ''}
      ${o.type === 'transfer' && rivalBetrayal(o.club).length ? `<div class="small bad"><b>Rivals of ${rivalBetrayal(o.club).map(id => esc(club(id).name)).join(' and ')}.</b> Join them and ${rivalBetrayal(o.club).length > 1 ? 'those clubs' : 'that club'} will hate you and never approach you again. You could never be a legend at either club.</div>` : ''}
      ${o.type === 'transfer' && leagueGrowth(c) < 1 ? '<div class="small flood">Big money, weaker league: your OVR will grow more slowly here.</div>' : ''}
      ${o.block ? `<div class="small flood"><b>Release clause:</b> for ${o.block} year${o.block > 1 ? 's' : ''} after you sign, ${esc(c.name)} block any move and salary talks. Breaking it costs ${money(o.blockFee)}.</div>` : ''}
      <div class="loyal ${o.type === 'transfer' ? 'away' : ''}"><p>"${offerPitch(o, c)}"</p><span>— ${esc(c.mgr)}, ${esc(c.name)}</span></div>
      ${talk}
      ${canAskRole(o) ? `<div class="small muted">At ${ageOf(S.player.by)}, ${esc(c.name)} see you as ${o.status.toLowerCase()}. You can ask to be a starter once: they will judge your last season at ${esc(lastSpell().club)}.</div>` : o.roleAsk === 'yes' ? '<div class="small good">You asked to start, and they said yes.</div>' : o.roleAsk === 'no' ? `<div class="small bad">You asked to start. They said no: ${o.status.toLowerCase()} it is.</div>` : ''}
      <div class="btns">${canAskRole(o) ? `<button class="btn sm" data-act="roleAsk" data-v="${o.id}">Ask for more play time</button>` : ''}<button class="btn good sm" data-act="accept" data-v="${o.id}">Sign</button><button class="btn sm" data-act="negAsk" data-v="${o.id}" ${canNegotiate(o) ? '' : 'disabled'}>Negotiate</button><button class="btn sm" data-act="decline" data-v="${o.id}">Decline</button></div>
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
    ? `${c.name} offer ${money(o.wage)}/week. Asking for more annoys ${c.mgr} whatever happens. Even if he agrees, his affection drops by a fifth, which can cost you your place in the team (you are ${squadStatus().toLowerCase()} now), his objectives get a little harder and you can't talk salary again for about six months. ${left} attempt${left !== 1 ? 's' : ''} left.`
    : `${c.name} offer ${money(o.wage)}/week. Their manager won't hold it against you; his affection only counts once you join.`;
  // Attempts left as dots, and what this club does if an ask fails.
  const dots = Array.from({ length: maxRounds(o) }, (_, k) => `<i class="${k < left ? 'on' : ''}"></i>`).join('');
  const failNote = renew ? 'If he says no, the offer usually stays but talks are over. A big ask can make him pull it.' : 'If they say no, they walk away and the offer is gone.';
  openModal(`<div class="neghead">${crest(c.id, 'small')}<div><h3 style="margin:0">Negotiate</h3><div class="small muted">${esc(c.name)} · ${o.raise ? 'Pay rise' : renew ? 'Renewal' : 'Transfer'}</div></div></div>
    <div class="kv"><div><small>On the table</small><b class="num">${money(o.wage)}/wk</b></div><div><small>Market value</small><b class="num">${money(marketWage(calcOVR(), c))}/wk</b></div><div><small>Attempts left</small><b><span class="tries">${dots}</span> ${left}</b></div></div>
    <p class="small muted" style="margin:0">${intro}</p>
    <p class="small ${renew ? 'flood' : 'bad'}" style="margin:0"><b>${failNote}</b></p>
    <div class="asks">${ASKS.map((a, i) => {
      // Show what they would really pay; an ask that can't raise the wage at all is switched off.
      const ch = negotiateChance(o, a), pay = negWage(o, a), capped = pay < Math.round(o.wage * (1 + a.pct) / 10) * 10;
      if (pay <= o.wage) return `<button class="askcard" disabled><div class="asktop"><b>Ask ${a.label}</b><span class="odds none">—</span></div><div class="small muted">They can't go any higher than ${money(o.wage)}/wk.</div></button>`;
      const pct = Math.round(ch * 100), tone = ch >= .7 ? 'good' : ch >= .4 ? 'mid' : 'low';
      return `<button class="askcard ${tone}" data-act="neg" data-v="${o.id}:${i}">
        <div class="asktop"><div><b>Ask ${a.label}</b><div class="small">${money(pay)}/wk <span class="good">+${money(pay - o.wage)}</span>${capped ? ' <span class="flood">(their limit)</span>' : ''}</div></div>
          <div class="oddsbox"><span class="odds">${pct}%</span><small>${chanceLabel(ch)}</small></div></div>
        <div class="oddsbar"><i style="width:${pct}%"></i></div>
        ${renew ? `<div class="small muted">Costs ${c.mgr.split(' ').pop()} −${a.pen} affection and the board −2, win or lose.</div>` : ''}
      </button>`;
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

// The board's targets for the manager, drawn like your own objectives.
function boardTargetsHtml(c, m) {
  if (!m.target || m.tSeason !== S.season) return '';
  const tbl = S.table && S.table[c.id] ? leagueTable(c.league) : [], pos = tbl.findIndex(r => r.id === c.id) + 1;
  const onCourse = pos && pos <= m.target.top;
  const season = `<div class="small muted" style="margin-top:4px"><b>The board's targets for him</b></div><div class="obj"><div class="row small"><span><b>Season</b> · ${esc(m.target.label)}</span><span class="num ${onCourse ? 'good' : 'bad'}">${pos ? `${pos}${ordinal(pos)}` : '–'}</span></div>
    <div class="small muted">Judged at the end of the season · ${onCourse ? 'on course' : 'off course'}</div></div>`;
  let short = '';
  if (m.goal) {
    const g = m.goal, pr = shortProgress(c, g), val = g.kind === 'wins' ? pr.w : pr.l;
    const pct = g.kind === 'wins' ? Math.min(100, val / g.need * 100) : Math.min(100, pr.played / g.games * 100);
    const ok = g.kind === 'wins' ? val >= g.need : val <= g.need;
    short = `<div class="obj"><div class="row small"><span><b>Next ${g.games}</b> · ${shortText(g)}</span><span class="num ${g.kind === 'wins' ? (ok ? 'good' : '') : ok ? '' : 'bad'}">${g.kind === 'wins' ? `${val}/${g.need} won` : `${val} lost`}</span></div>
      <div class="bar"><i class="${g.kind === 'wins' ? (ok ? '' : 'mid') : ok ? '' : 'low'}" style="width:${pct}%"></i></div>
      <div class="small muted">${pr.played}/${g.games} games played</div></div>`;
  }
  let promo = '';
  if (m.promo) {
    const r = promoRace(c), done = m.promo.result;
    const right = done === 'hit' ? '<span class="num good">Promoted</span>' : done === 'miss' ? '<span class="num bad">Missed</span>'
      : r.behind > 0 ? `<span class="num bad">${r.behind} pt${r.behind !== 1 ? 's' : ''} off</span>` : `<span class="num good">${r.behind < 0 ? `${-r.behind} pt${r.behind !== -1 ? 's' : ''} clear` : 'level'}</span>`;
    const note = done === 'hit' ? 'Delivered: the board is delighted.' : done === 'miss' ? 'Mathematically gone: the board counted it as missed.'
      : `Still possible · ${r.left} game${r.left !== 1 ? 's' : ''} left (${r.left * 3} points to play for) · missed the moment it's out of reach`;
    promo = `<div class="obj"><div class="row small"><span><b>Promotion</b> · Win promotion (top ${PROMOTE})</span>${right}</div>
      <div class="small ${done === 'miss' ? 'bad' : 'muted'}">${note}</div></div>`;
  }
  const cups = (m.cups || []).map(t => {
    const s = cupTargetState(c, t), done = t.result;
    const comp = t.kind === 'euro' ? S.euro && S.euro[t.key] : t.kind === 'cup' ? S.cups && S.cups[t.key] : null;
    const where = t.kind === 'trophy' ? `${s.reached} won so far` : t.kind === 'euro' ? (s.reached >= 6 ? 'Winners' : EURO_STAGE[s.reached]) : comp ? (s.reached >= Math.round(Math.log2(comp.size)) ? 'Winners' : cupRoundLabel(comp, s.reached)) : '';
    const right = done === 'hit' ? '<span class="num good">Done</span>' : done === 'miss' ? '<span class="num bad">Missed</span>' : `<span class="num">${esc(where)}</span>`;
    const note = done === 'hit' ? 'Target reached: the board is pleased.' : done === 'miss' ? (t.kind === 'trophy' ? 'No trophy this season.' : 'Knocked out short of the target.')
      : t.kind === 'trophy' ? 'The league, any domestic cup or a European cup · judged at the end of the season' : `Still in · now at: ${esc(where).toLowerCase()}`;
    const label = t.kind === 'trophy' ? 'Trophies' : t.kind === 'euro' ? 'Europe' : 'Cup';
    return `<div class="obj"><div class="row small"><span><b>${label}</b> · ${esc(cupTargetText(t))}</span>${right}</div><div class="small ${done === 'miss' ? 'bad' : 'muted'}">${note}</div></div>`;
  }).join('');
  return season + promo + cups + short;
}

// Your club's summer comings and goings, on Home for the first 8 weeks of the season: who retired,
// who was sold and where, who arrived (from which club, or up from the academy) and the role each
// new player walks into.
const sqOpen = { v: false };
function squadMovesCard() {
  const c = myClub(), p = S.player, saved = S.squadMoves && S.squadMoves.season === S.season && S.squadMoves.clubs[c.id];
  // You count as one of the signings in the season you join.
  const a = p.arrival, me = a && a.club === c.id && a.season === S.season
    ? { n: p.name, pos: p.pos, r: calcOVR(), age: ageOf(p.by), from: a.from, fee: a.fee, free: a.free, loan: a.loan, me: true } : null;
  const log = { out: saved ? saved.out : [], in: [...(me ? [me] : []), ...(saved ? saved.in : [])] };
  if (!log.out.length && !log.in.length) return '';
  // Fee after the club: "· €12.5M", or "Free" when the contract had run out. Older saves have no fee.
  const fee = x => x.fee == null ? '' : x.fee > 0 ? ` <span class="muted">·</span> <b class="num">${money(x.fee)}</b>` : '';
  const row = (x, side) => {
    const other = side === 'out' ? (x.why === 'sold' ? x.to : null) : x.from;
    const how = side === 'out'
      ? (x.why === 'retired' ? '<span class="muted">Retired</span>' : x.why === 'released' ? '<span class="muted">Released</span>'
        : `<span class="muted">${x.fee === 0 ? 'Free transfer to' : 'Sold to'}</span> ${esc(club(other).name)}${fee(x)}`)
      : x.loan ? `<span class="muted">On loan from</span> ${esc(club(other).name)}`
      : other ? `<span class="muted">${x.fee === 0 ? 'Free from' : 'From'}</span> ${esc(club(other).name)}${fee(x)}`
      : x.free ? '<span class="muted">Free agent</span>' : '<span class="muted">Academy</span>';
    const role = side === 'in' && !x.me ? arrivalRole(c, x.n) : null;
    return `<div class="sqmove${x.me ? ' me' : ''}"><span class="pos-chip">${x.pos}</span><div style="min-width:0"><div class="sqname">${esc(x.n)} <span class="muted small">${x.age} · ${x.r}</span></div><div class="small">${how}</div></div>${other ? crest(other, 'mini') : ''}${role ? `<span class="chip ${role === 'Starter' ? 'good' : ''}">${role}</span>` : ''}${x.me ? '<span class="chip good">You</span>' : ''}</div>`;
  };
  const spent = log.in.reduce((s, x) => s + (x.fee || 0), 0), got = log.out.reduce((s, x) => s + (x.fee || 0), 0);
  const net = spent || got ? `<div class="small muted">Spent <b class="num" style="color:var(--chalk)">${money(spent)}</b> · Received <b class="num" style="color:var(--chalk)">${money(got)}</b></div>` : '';
  return `<section class="card"><details class="mdrop" style="padding:0" ${sqOpen.v ? 'open' : ''} ontoggle="sqOpen.v = this.open"><summary><h2>Squad changes</h2><span class="small muted">${log.out.length} out · ${log.in.length} in</span></summary><div class="mbody">
    ${net}${log.out.length ? `<div class="small muted"><b>Out</b></div>${log.out.map(x => row(x, 'out')).join('')}` : ''}
    ${log.in.length ? `<div class="small muted"><b>In</b></div>${log.in.map(x => row(x, 'in')).join('')}` : ''}</div></details></section>`;
}

// Buy your way out of a blocked move: the full release fee always works, half improves the odds.
function buyoutHtml() {
  const b = S.player.blockedMove;
  if (!b || !b.bid || !S.clubs[b.club]) return '';
  const full = b.fee, half = Math.round(b.fee / 2), m = S.player.money;
  return `<div class="small muted">Or pay your own release fee to force the move to ${esc(club(b.club).name)}: all of it (${money(full)}) and they must let you go; half (${money(half)}) gives a ${Math.round(buyoutOdds(true) * 100)}% chance they agree, and you keep your money if they don't.</div>
    <div class="btns"><button class="btn sm good" data-act="payRelease" data-v="full" ${m >= full ? '' : 'disabled'}>Pay ${money(full)}</button><button class="btn sm" data-act="payRelease" data-v="half" ${m >= half && !b.triedHalf ? '' : 'disabled'}>${b.triedHalf ? 'Half refused' : `Offer half: ${money(half)}`}</button></div>
    ${m < half ? `<div class="small bad">You have ${money(m)}: not enough for either.</div>` : ''}`;
}

// Under the matchday button while your club is blocking a move: refuse to play in protest.
const refuseBtn = () => canRefusePlay() ? `<button class="btn danger block" data-act="refusePlay">Refuse to play</button>
  <div class="small muted" style="text-align:center">${esc(myClub().name)} blocked your move to ${esc(club(S.player.blockedMove.club).name)}. Refuse and you are frozen out until the next window. You can only protest for ${Math.max(1, S.player.blockedMove.at != null ? S.player.blockedMove.at + REFUSE_WEEKS - absWeek() : 1)} more week${(S.player.blockedMove.at != null ? S.player.blockedMove.at + REFUSE_WEEKS - absWeek() : 1) === 1 ? '' : 's'}.</div>` : '';

const mgrOpen = { board: false, mgr: true };
function managerCard() {
  const p = S.player, c = myClub(), eff = Math.round(effAff()), band = objBand(), rate = objRate();
  const mood = eff >= 75 ? 'Loves you' : eff >= 60 ? 'Trusts you' : eff >= 45 ? 'Neutral' : eff > FROZEN_AFF ? 'Unconvinced' : eff > SACK_AFF + 3 ? 'Frozen out' : 'On the brink';
  // The objectives record only speaks for him while he still likes you.
  const note = eff <= FROZEN_AFF ? `You are frozen out: he won't pick you until affection is above ${FROZEN_AFF}.`
    : eff < 45 && ['elite', 'great', 'good'].includes(band) ? 'You hit your targets, but he has gone cold on you. Win him back before asking for money.'
    // Straight after contract talks there's no room to promise: he's still sore, or talks are locked.
    : negLocked() ? (blockActive() ? `Your release clause rules out salary talks until about week ${lockWeekLabel()}.` : clauseActive() ? `Your loyalty clause rules out salary talks until about week ${lockWeekLabel()}.` : `You just re-signed: no salary talks until about week ${lockWeekLabel()}.`)
    : p.affPen >= 1 ? 'He is still sore from your contract talks. Let it settle before asking for more money.'
    : BAND_NOTE[band];
  const cls = eff >= 60 ? '' : eff >= 40 ? 'mid' : 'low';
  const objs = (p.objectives || []).map(o => {
    const pct = Math.min(100, Math.round(o.progress / o.target * 100));
    const hint = o.kind === 'train' ? 'Train it in the Train tab' : o.kind === 'energy' ? `Rest when needed: under ${o.min} energy on matchday doesn't count` : `${o.games} games`;
    return `<div class="obj"><div class="row small"><span><b>${OBJ_SPAN[o.span].label}</b> · ${objText(o)}</span><span class="num ${o.progress >= o.target ? 'good' : ''}">${o.progress}/${o.target}</span></div>
      <div class="bar"><i class="${o.progress >= o.target ? '' : 'mid'}" style="width:${pct}%"></i></div>
      <div class="small muted">${o.span === 'season' ? 'Ends with the season' : `Until week ${o.endWeek}`} · ${hint}${o.oop ? ` · <span class="flood">lowered for ${o.oop} game${o.oop > 1 ? 's' : ''} out of position</span>` : ''}</div></div>`;
  }).join('') || '<p class="small muted" style="margin:0">No objectives right now.</p>';
  const mj = mgrOf(c), mjob = Math.round(mj.job);
  // Two dropdowns: the board and its manager (his rating, its affection, its targets for him), then
  // the manager and you. Which ones are open is remembered while the game is open.
  const jcls = mjob >= 50 ? 'good' : mjob >= 25 ? 'flood' : 'bad';
  return `<section class="card mgrcard">
    <details class="mdrop" ${mgrOpen.board ? 'open' : ''} ontoggle="mgrOpen.board = this.open"><summary><h2>Board</h2><span class="small"><span class="${jcls}">${jobLabel(mjob)}</span> · <b class="num">${mjob}</b></span></summary><div class="mbody">
    <div class="row small"><span class="muted">Manager</span><span>${esc(c.mgr)} · <span class="muted">rating</span> <b>${mj.r}</b></span></div>
    <div class="energy" style="margin:0"><span>Board affection</span><div class="bar"><i class="${mjob >= 50 ? '' : mjob >= 25 ? 'mid' : 'low'}" style="width:${mjob}%"></i></div><b class="num">${mjob}</b></div>
    <div class="small ${mjob < 25 ? 'bad' : 'muted'}">How the board feels about ${esc(c.mgr)}: ${jobLabel(mjob).toLowerCase()}.${mjob < 25 ? ' Keep losing and he will be sacked.' : ''}</div>
    ${boardTargetsHtml(c, mj)}</div></details>
    <details class="mdrop" ${mgrOpen.mgr ? 'open' : ''} ontoggle="mgrOpen.mgr = this.open"><summary><h2>Manager</h2><span class="small">${esc(c.mgr)} · <span class="${cls === 'low' ? 'bad' : cls === 'mid' ? 'flood' : 'good'}">${mood}</span> <b class="num">${eff}</b></span></summary><div class="mbody">
    <div class="small muted"><b>${esc(c.mgr)} and you</b></div>
    <div class="energy" style="margin:0"><span>${mood}</span><div class="bar"><i class="${cls}" style="width:${eff}%"></i></div><b class="num">${eff}</b></div>
    ${p.affPen >= 1 ? `<div class="small bad">−${Math.round(p.affPen)} from contract talks, fading each week</div>` : ''}
    ${eff <= FROZEN_AFF + 5 ? `<div class="small bad"><b>Warning:</b> at ${FROZEN_AFF} he freezes you out, and at ${SACK_AFF} he tears up your contract.</div>` : ''}
    <div class="energy" style="margin:0"><span>Board</span><div class="bar"><i class="${p.board >= 60 ? '' : p.board >= 40 ? 'mid' : 'low'}" style="width:${p.board}%"></i></div><b class="num">${Math.round(p.board)}</b></div>
    <div class="small muted">${boardPerks()}</div>
    <div class="row small"><span class="muted">Objectives hit</span><b>${rate === null ? '–' : Math.round(rate * 100) + '%'} <span class="muted">(${(p.objHist || []).length} so far)</span></b></div>
    <div class="small ${negLocked() && note !== BAND_NOTE[band] && eff > FROZEN_AFF && !(eff < 45 && ['elite', 'great', 'good'].includes(band)) ? 'muted' : band === 'poor' || note !== BAND_NOTE[band] ? 'bad' : band === 'elite' || band === 'great' ? 'good' : 'muted'}">${note}</div>
    ${p.objHard ? `<div class="small muted">Targets are ${Math.round(p.objHard * 100)}% harder since your pay rise.</div>` : ''}
    ${p.promise > 0 ? `<div class="small good">Promised starting place: ${p.promise} more league games${effAff() < 30 ? ' (on hold while affection is under 30)' : ''}.</div>` : ''}
    ${objs}
    ${adjusting() ? `<div class="small flood">Adjusting to ${POS_NAMES[matchPos()].toLowerCase()}: you are a little worse in matches for now, and his targets are 15% easier (until about week ${lockWeekLabel(p.adjustUntil)}).</div>` : ''}
    ${p.chance > 0 ? `<div class="small good">Your chance: he starts you in most games (${Math.round(CHANCE_START * 100)}%) for ${p.chance} more league game${p.chance !== 1 ? 's' : ''}.</div>` : ''}
    ${chanceBoosted() ? `<div class="small good">He trusts you for good here: +${Math.round(CHANCE_BOOST * 100)}% start chance at ${esc(c.name)}.</div>` : (p.chanceStreak || 0) > 0 ? `<div class="small muted">Chances taken in a row: ${p.chanceStreak}/${CHANCE_STREAK}. Make it ${CHANCE_STREAK} and he trusts you for good (+${Math.round(CHANCE_BOOST * 100)}% start chance here).</div>` : ''}
    ${!canAskChance() && chanceCooldown() && !p.chance && !chanceObjective() && startChance().start < .2 ? `<div class="small muted">You can ask ${esc(c.mgr)} for another chance in ${chanceCooldown()} week${chanceCooldown() !== 1 ? 's' : ''}.</div>` : ''}
    ${canAskChance() ? `<div class="chance-ask"><div class="small muted">Only a ${Math.round(startChance().start * 100)}% chance of starting. Ask ${esc(c.mgr)} to play you: you'll start ${Math.round(CHANCE_START * 100)}% of the next ${CHANCE_GAMES} league games, but he sets a 3-month target ${CHANCE_HARDER}× tougher than usual. Hit it and he warms to you (+7); miss it and affection drops by 6.</div><button class="btn sm primary" data-act="askChance">Ask for a chance</button></div>` : ''}</div></details></section>`;
}

function orderBox() {
  const o = S.player.order;
  if (!o) return '';
  return `<div class="order"><div class="small flood"><b>Manager's instructions</b></div><div>“${esc(o.text)}”</div>
    <div class="btns"><button class="btn sm ${o.choice === 'follow' ? 'good' : ''}" data-act="order" data-v="follow">Follow the plan</button><button class="btn sm ${o.choice === 'own' ? 'danger' : ''}" data-act="order" data-v="own">Play my own game</button></div>
    <div class="small muted">Following gives the team a small edge and pleases him. Your own game boosts your scoring chances but hurts the team: a goal or assist in a win and he forgives you, a goal or assist without a win and he is a little annoyed, neither and he is furious.</div></div>`;
}

function freeAgentView() {
  return faPrompt() + faCalendar() + faCard(true) + inboxHtml();
}

// Ten weeks without a single offer: keep trying, or call it a day.
function faPrompt() {
  const p = S.player;
  if (!p.faAsk) return '';
  return `<section class="card hero faprompt"><h2>No offers coming</h2>
    <p style="margin:0">${p.faDry} weeks have gone by without a single club calling. It does not seem like there will be any offers${ageOf(p.by) >= 37 ? ` for a ${ageOf(p.by)}-year-old` : ''}.</p>
    <div class="btns"><button class="btn primary" data-act="keepTrying">Keep trying</button><button class="btn danger" data-act="retireAsk">Retire</button></div></section>`;
}

// Without a club the weeks still go by: the month you are in, this game week marked, and the button
// that moves time on.
function faCalendar() {
  const p = S.player, d = weekDate(), y = d.getUTCFullYear(), m = d.getUTCMonth();
  const today = Math.floor(d.getTime() / DAY), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, net = weeklyNet();
  const cells = Array.from({ length: lead }, () => '<i></i>').concat(Array.from({ length: days }, (_, k) => {
    const t = Math.floor(Date.UTC(y, m, k + 1) / DAY);
    return `<i class="${t === today ? 'today' : t > today && t <= today + 6 ? 'wk' : t < today ? 'past' : ''}">${k + 1}</i>`;
  })).join('');
  return `<section class="card"><div class="row"><h2>${MONTHS[m]} ${y}</h2><span class="small muted">${seasonLabel()} · Week ${S.week} of ${SEASON_WEEKS}</span></div>
    <div class="facal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}${cells}</div>
    <div class="row small"><span class="muted">No wage · sponsors − rent, upkeep and kit</span><b class="num ${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : ''}${money(net)}/wk</b></div>
    <button class="btn primary block" data-act="faWeek" ${p.faAsk ? 'disabled' : ''}>Proceed to next week</button>
    ${p.faDry ? `<div class="small muted">${p.faDry} week${p.faDry !== 1 ? 's' : ''} in a row without a new offer.</div>` : ''}</section>`;
}

// Free agency: set an asking wage, wait out the weeks, and let clubs (and your agent) find you.
function faCard(home = false) {
  const p = S.player, guide = freeGuide(), season = S.phase === 'season';
  const searched = p.lastSearch === S.season * 100 + S.week, n = S.offers.length;
  return `<section class="card hero"><h2>Free agent</h2>
    <p class="bad" style="margin:0">${season ? 'You have no club.' : 'Your contract has run out.'} No wage comes in until you sign, but your bills still do.</p>
    <div class="kv"><div><small>Weeks without a club</small><b>${idleWeeks()}</b></div><div><small>Clubs value you at</small><b class="num">${money(guide)}/wk</b></div><div><small>Asking wage</small><b class="num">${p.askWage ? `${money(p.askWage)}/wk` : 'Open'}</b></div></div>
    <div class="field"><label for="ask-wage">Your asking wage (per week)</label><input id="ask-wage" type="number" min="0" step="100" inputmode="numeric" value="${p.askWage || ''}" placeholder="${guide}"></div>
    <button class="btn block" data-act="setAsk">Set asking wage</button>
    <div class="small muted">Each club judges you on your OVR, position and age against its league's wages, your recent form, and how long you have been without a club. Ask at or under its valuation and it pays what you ask; up to 25% over and it offers its valuation instead; any higher and it walks away. Leave it empty to take what clubs think you are worth.</div>
    ${season && !home ? `<button class="btn primary block" data-act="faWeek" ${p.faAsk ? 'disabled' : ''}>Proceed to next week</button>` : ''}
    <button class="btn block" data-act="findClubs" ${searched ? 'disabled' : ''}>${searched ? 'Your agent has made calls this week' : 'Ask your agent to find clubs'}</button>
    ${home && n ? `<button class="btn block" data-act="tab" data-v="contract">View ${n} offer${n > 1 ? 's' : ''}</button>` : ''}
    ${season ? `<div class="small muted">Offers lapse after ${FA_OFFER_WEEKS} weeks. Training is half as effective without a club. After ${FA_NET_WEEKS} weeks with nothing on the table, a lower-league club offers you a way back.</div>` : ''}
  </section>`;
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
  if (p.needsContract) return faCard() + offersHtml();
  return contractDetails() + offersHtml() + inquiriesHtml() + contractCard();
}

// The deal you are on now.
function contractDetails() {
  const p = S.player, home = club(p.loan ? p.loan.parent : p.club), mkt = marketWage(calcOVR(), myClub());
  // In the summer the season just ended has already come off the contract.
  const ends = S.season + p.years - (S.phase === 'offseason' ? 0 : 1), a = agent();
  const pct = Math.round((p.wage / Math.max(1, mkt) - 1) * 100);
  return `<section class="card hero"><div class="row"><div class="clubcell">${crest(home.id, 'small')}<div><div class="club">${home.name}</div><div class="small muted">${league(home.league).name}</div></div></div>
      <span class="chip">${p.years > 0 ? `${p.years} yr${p.years !== 1 ? 's' : ''} left` : 'Expiring'}</span></div>
    <div class="kv"><div><small>Wage</small><b class="num">${money(p.wage)}/wk</b>${p.nextWage ? `<small class="good">${money(p.nextWage)}/wk from ${seasonLabel(S.season + 1)}</small>` : ''}</div><div><small>Per year</small><b class="num">${money(p.wage * 52)}</b></div><div><small>Expires</small><b>End of ${seasonLabel(ends)}</b></div></div>
    <div class="kv"><div><small>Role</small><b class="${p.promise > 0 ? 'good' : ''}">${squadStatus()}${p.promise > 0 ? ' (promised)' : ''}</b></div><div><small>Market value</small><b class="num">${money(mkt)}/wk</b></div><div><small>vs market</small><b class="${pct >= 0 ? 'good' : 'bad'}">${pct >= 0 ? '+' : ''}${pct}%</b></div></div>
    ${p.loan ? `<div class="small flood">On loan at ${myClub().name} until the end of the season. ${home.name} still pay your wage.</div>` : ''}
    ${p.preContract && S.clubs[p.preContract.offer.club] ? (() => { const po = p.preContract.offer, pc = club(po.club); return `<div class="offer"><div class="row"><div class="clubcell">${crest(pc.id, 'small')}<div style="min-width:0"><div class="club">${esc(pc.name)}</div><div class="small muted">${league(pc.league).name}</div></div></div><span class="chip good">Pre-contract signed</span></div>
      <div class="small good">You join ${esc(pc.name)} on a free when this season ends: ${money(po.wage)}/wk as ${esc(po.status.toLowerCase())}, until the end of ${seasonLabel(S.season + po.years)}. No other offers until then.</div></div>`; })() : ''}
    <div class="small muted">Agent: ${a.name}${agentCut() ? ` · takes ${money(agentCut())}/wk` : ''}</div>
  </section>`;
}

// Clubs that got in touch with your agent while a release clause blocks bids. Listen, and they open
// talks with your club; then choose who pays the fee.
function inquiriesHtml() {
  const list = inquiries();
  if (!blockActive() || !list.length) return '';
  const fee = clauseFeeNow(), half = Math.round(fee / 2), cash = S.player.money;
  const pctClass = x => x >= .7 ? 'good' : x >= .4 ? 'mid' : 'bad';
  return `<section class="card"><h2>Agent: clubs asking about you</h2>
    <p class="small muted" style="margin:0">Your release clause blocks official bids, so these clubs came to your agent first. They wait about 6 weeks.</p>
    ${list.map(q => {
      const c = club(q.club), o = q.offer;
      if (q.talks && !q.odds) q.odds = breachOdds();
      const pay = q.talks ? `<div class="inq-opts">
          <button class="house" data-act="inqThey" data-v="${q.id}" ${q.triedThey ? 'disabled' : ''}><span><b>Ask them to pay the fee</b><br><span class="small muted">${q.triedThey ? 'They already said no.' : 'Costs you nothing.'}</span></span><span class="odds ${pctClass(q.odds.they)}">${Math.round(q.odds.they * 100)}%</span></button>
          <button class="house" data-act="inqHalf" data-v="${q.id}" ${q.triedHalf || cash < half ? 'disabled' : ''}><span><b>Split it: you pay ${money(half)}</b><br><span class="small muted">${q.triedHalf ? 'They already said no.' : cash < half ? 'Not enough money.' : 'If they say no, you lose nothing.'}</span></span><span class="odds ${pctClass(q.odds.half)}">${Math.round(q.odds.half * 100)}%</span></button>
          <button class="house" data-act="inqFull" data-v="${q.id}" ${cash < fee ? 'disabled' : ''}><span><b>Pay it all: ${money(fee)}</b><br><span class="small muted">${cash < fee ? 'Not enough money.' : 'Always works.'}</span></span><span class="odds good">100%</span></button>
        </div>
        <div class="small muted">Once the fee is settled, only ${esc(c.name)} can bid for you: every other club stays blocked by your clause. The fee is gone even if you then turn their offer down.</div>`
        : `<div class="btns"><button class="btn good sm" data-act="inqListen" data-v="${q.id}">Listen</button><button class="btn sm" data-act="inqIgnore" data-v="${q.id}">Not interested</button></div>`;
      return `<div class="offer ${q.talks ? 'talks' : ''}">
        <div class="row"><div class="clubcell">${crest(c.id, 'small')}<div style="min-width:0"><div class="club">${esc(c.name)}</div><div class="small muted">${esc(league(c.league).name)} · Team rating ${Math.round(teamStrength(c))}</div></div></div>
        <span class="chip ${q.talks ? 'good' : 'flood'}">${q.talks ? 'In talks' : 'Inquiry'}</span></div>
        <div class="small muted">They would offer about ${money(o.wage)}/wk for ${o.years} years as a ${o.status.toLowerCase()}.</div>
        ${pay}</div>`;
    }).join('')}</section>`;
}

function contractCard() {
  const p = S.player;
  if (p.loan) return '';
  // Signed elsewhere for next season: nothing to ask for here any more.
  if (p.preContract) return `<section class="card"><h2>Your options</h2><div class="small muted">You have agreed to leave for ${esc(S.clubs[p.preContract.offer.club] ? club(p.preContract.offer.club).name : 'another club')} when the season ends: no contract talks or transfer requests at ${esc(myClub().name)} until then.</div></section>`;
  const { breakout, rising } = scoutBuzz();
  return `<section class="card"><h2>Your options</h2>
    ${breakout ? '<div class="small flood">Breakout season (+8 OVR): top-flight scouts are watching.</div>' : rising ? '<div class="small flood">Rising season (+6 OVR): smaller top-flight and second-division clubs are watching.</div>' : ''}
    ${blockActive() ? `<div class="small flood"><b>Release clause</b> until about week ${lockWeekLabel(p.clauseUntil)}: other clubs can only reach you through your agent, and there are no salary talks. Breaking it costs ${money(clauseFeeNow())}${clauseFeeNow() !== (p.clauseFee || 0) ? ` (${p.board >= 75 ? 'the board knocks 25% off' : 'the board adds 25%'})` : ''}.</div>`
    : clauseActive() ? `<div class="small flood"><b>Loyalty clause</b> until the end of ${seasonLabel(Math.floor((p.clauseUntil - 1) / SEASON_WEEKS) - 1)}: no bids from other clubs, no salary talks and no transfer requests.</div>`
    : negLocked() ? `<div class="small muted">You just re-signed: no salary talks until about week ${lockWeekLabel()}.</div>` : ''}
    ${leagueGrowth() < 1 ? `<div class="small muted">Weaker league: your OVR grows about ${Math.round((1 - leagueGrowth()) * 100)}% slower here than in Europe.</div>` : ''}
    ${offerLocked() && !clauseActive() ? `<div class="small muted">Settling in: other clubs will not bid for you until about week ${lockWeekLabel(S.player.offerLock)}.</div>` : ''}
    ${p.listed ? `<div class="small flood">You are transfer-listed. ${inWindow() ? 'Clubs are bidding now.' : `Bids arrive when the window opens (week ${JAN_WINDOW[0]} or summer).`}</div>` : ''}
    ${newClub() ? `<div class="small muted">First season at ${esc(myClub().name)}: settle in before asking for a new contract or sounding out other clubs (until about week ${lockWeekLabel(p.newClubUntil)}).</div>` : ''}
    ${p.renewTask ? `<div class="obj"><div class="row small"><span><b>Board's task</b> · ${renewTaskText(p.renewTask)} for a new contract</span><span class="num">${p.renewTask.progress}/${p.renewTask.target}</span></div><div class="bar"><i class="mid" style="width:${Math.min(100, Math.round(p.renewTask.progress / p.renewTask.target * 100))}%"></i></div><div class="small muted">Until about week ${lockWeekLabel(p.renewTask.until)} · hit it and the offer is guaranteed</div></div>` : ''}
    ${!lastYear() && !newClub() && !p.needsContract ? `<div class="small muted">You can ask for a pay rise on this deal (same end date). A new contract comes in its last season (${p.years} seasons left).</div>` : ''}
    <div class="btns">
      <button class="btn sm" data-act="askContract" ${newClub() ? 'disabled' : ''}>${lastYear() ? 'Ask for new contract' : 'Ask for a pay rise'}</button>
      ${blockActive() ? `<button class="btn sm" data-act="soundOut" ${canSoundOut() ? '' : 'disabled'}>${justSigned() ? 'You just signed: your agent won\x27t ask around yet' : inWindow() ? (S.player.soundedAt === windowKey() ? 'Agent already asked around' : 'Ask agent to sound out clubs') : 'Agent can ask around in a window'}</button>` : ''}
      ${p.listed ? '<button class="btn sm" data-act="unlist">Withdraw request</button>' : `<button class="btn sm danger" data-act="listAsk" ${clauseActive() ? 'disabled' : ''}>Request transfer</button>`}
    </div></section>`;
}

// What the board's trust is doing for you right now.
function boardPerks() {
  const p = S.player, b = p.board, out = [];
  out.push(b >= 40 ? 'Will talk about a new contract' : "Won't talk about a new contract below 40");
  if (boardRoom()) out.push(boardRoom() > 0 ? `backs a pay rise up to ${Math.round(boardRoom() * 100)}% bigger` : 'pay rises 5% smaller');
  if (b >= 75) out.push('release clause 25% cheaper to break');
  else if (b < 30) out.push('release clause 25% dearer to break');
  const yrs = S.season - (p.joinedSeason || 0);
  out.push(testimonialDue() ? 'a testimonial when you leave or retire' : `testimonial after ${TESTIMONIAL_SEASONS} seasons with the board at ${TESTIMONIAL_BOARD}+ (${Math.min(yrs, TESTIMONIAL_SEASONS)}/${TESTIMONIAL_SEASONS} seasons)`);
  return out.join(' · ');
}

function inboxHtml() {
  return `<section class="card"><h2>Inbox</h2><div class="inbox">${S.inbox.slice(0, 8).map(m =>
    `<div class="msg ${m.kind}">${esc(m.text)}<small>${seasonLabel(m.season)} · Week ${Math.min(m.week, SEASON_WEEKS)}</small></div>`).join('') || '<span class="muted small">No messages.</span>'}</div></section>`;
}

function viewHome() {
  if (S.phase === 'offseason') return viewOffseason();
  if (S.phase === 'retired') return viewRetired();
  if (S.player.needsContract) return freeAgentView();
  const p = S.player, fx = leagueDone() ? null : nextFixture();
  let matchCard;
  // The week's team sheet (and any one-week position change) is settled when the week comes up.
  if (fx && !p.injured && S.phase === 'season') matchdaySelection(fx);
  const ig = intlDue();
  if (ig) matchCard = intlCard(ig);
  else if (fx) {
    const opp = club(fx.opp);
    const sel = p.injured ? '<span class="bad">Injured, you will miss this match</span>' : `Role: <b>${squadStatus()}</b>${matchPos() !== p.pos && weekPosTold() ? ` at <b>${matchPos()}</b>` : ''} · Start chance <b>${Math.round(Math.max(startChance().start, rotationStart(false, fx.opp)) * 100)}%</b>${rotationStart(false, fx.opp) > startChance().start ? ' <span class="good">(weak opponent: the manager rotates)</span>' : ''}`;
    matchCard = `<section class="card hero">
      <div class="row"><h2>Matchday ${S.week}</h2><span class="small muted">${league(myClub().league).name}</span></div>
      ${weekStrip()}
      ${derbyName(fx.home, fx.away) ? `<div class="derby">${derbyName(fx.home, fx.away)}</div>` : ''}
      <div class="fixture">
        <div class="team">${crest(fx.home)}<b>${club(fx.home).name}</b><span>${Math.round(teamStrength(club(fx.home)))} rated</span></div>
        <div class="vs">VS</div>
        <div class="team">${crest(fx.away)}<b>${club(fx.away).name}</b><span>${Math.round(teamStrength(club(fx.away)))} rated</span></div>
      </div>
      <div class="small muted" style="text-align:center">${sel} · ${opp.mgr}'s ${opp.name} ${fx.isHome ? 'visit you' : 'host you'}</div>
      ${p.slots > 0 && !p.injured ? `<div class="small flood" style="text-align:center">${p.slots} training session${p.slots > 1 ? 's' : ''} left this week</div>` + tiredNote('div') : ''}
      ${euroLine()}
      ${orderBox()}
      <button class="btn primary block" data-act="matchday">To matchday</button>
      ${refuseBtn()}
    </section>`;
  } else {
    matchCard = `<section class="card hero"><h2>Week ${S.week}</h2>${weekStrip()}<p class="muted" style="margin:0">${leagueDone() ? (midweekFixture() ? 'The league game is done. Next up: the midweek game.' : "This week's games are done.") : 'No league match this week. Rest, train and get ready.'}</p>
      ${S.phase === 'season' && !p.injured ? (p.slots > 0 ? `<div class="small flood" style="text-align:center">${p.slots} training session${p.slots > 1 ? 's' : ''} left this week</div>` + tiredNote('div') : '<div class="small bad" style="text-align:center">You have already trained this week: no sessions left until next week.</div>') : ''}
      ${euroLine()}
      ${midweekFixture() ? '<button class="btn primary block" data-act="matchday">To matchday</button>' + refuseBtn() : '<button class="btn primary block" data-act="advance">Next week</button>'}</section>`;
  }
  const form = p.form.length ? `<section class="card"><div class="row"><h2>Form</h2><span class="small muted">Season avg ${avgRating(p.st)}</span></div><div class="form">${p.form.map(r => `<span class="rate-box ${rateTier(r)}">${r.toFixed(1)}</span>`).join('')}</div>
    <div class="small muted">${p.st.apps} apps · ${p.pos === 'GK' ? `${p.st.saves || 0} saves · ${p.st.cleanAll || 0} clean sheet${p.st.cleanAll === 1 ? '' : 's'}` : `${p.st.goals} goals · ${p.st.assists} assists${TACKLERS.includes(p.pos) ? ` · ${p.st.tackles || 0} tackles` : ''}`}</div></section>` : '';
  const tbl = leagueTable(myClub().league), myPos = tbl.findIndex(r => r.id === p.club) + 1;
  const money_ = `<section class="card"><div class="row"><h2>This week</h2><span class="small">Table: <b>${S.table[p.club].p ? myPos + ordinal(myPos) : "–"}</b></span></div>
    <div class="row small"><span class="muted">Wage + sponsors − rent</span><b class="num ${weeklyNet() >= 0 ? 'good' : 'bad'}">${weeklyNet() >= 0 ? '+' : ''}${money(weeklyNet())}</b></div></section>`;
  return matchCard + offersBanner() + managerCard() + form + money_ + inboxHtml();
}

// ---------- calendar ----------
// A game week runs Saturday to Friday: the league game on Saturday, then the midweek game.
// Champions League ties are split over Tuesday and Wednesday, the Europa and Conference League play
// on Thursday, and domestic cups on Tuesday or Wednesday.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const compShort = name => /Champions/.test(name) ? 'UCL' : /Europa/.test(name) ? 'UEL' : /Conference/.test(name) ? 'UECL' : 'Cup';
function midweekOffset(e) {
  if (/Europa|Conference/.test(e.t.name)) return 5;
  return [...(e.home + e.away)].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 2 ? 3 : 4;
}
const dayAfter = n => new Date(weekDate().getTime() + n * DAY);
// The game's day: Saturday, or the midweek game's day once the league game is played.
// Red warning when training would leave you tired at the end of the week (higher injury risk).
function tiredNote(tag) {
  const now = weekEndEnergy(), next = weekEndEnergy(S.player.energy - TRAIN_ENERGY);
  const two = midweekFixture() && !leagueDone() && nextFixture() ? "this week's two games" : "this week's game";
  const text = now < TIRED_ENERGY ? `After ${two} you will be on about ${now} energy. Under ${TIRED_ENERGY} makes injuries more likely, so skip training.`
    : next < TIRED_ENERGY ? `Careful: another session leaves you on about ${next} energy after ${two}. Ending the week under ${TIRED_ENERGY} makes injuries more likely.` : '';
  return text ? (tag === 'div' ? `<div class="small bad" style="text-align:center">${text}</div>` : `<p class="bad small" style="margin:0">${text}</p>`) : '';
}
const todayDate = () => { const g = S && S.player && intlDue(); return g ? dayAfter(g.day) : leagueDone() && midweekFixture() ? dayAfter(midweekOffset(midweekFixture())) : weekDate(); };
const dayLabel = d => `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
// Your next international game, when it is the next thing on this week's calendar.
function intlDue() {
  const g = nextIntlGame();
  if (!g) return null;
  const e = midweekFixture(), clubDay = !leagueDone() && nextFixture() ? 0 : e ? midweekOffset(e) : Infinity;
  return g.day < clubDay ? g : null;
}
// This week, day by day: today is the Saturday, games marked with the opponent's crest. In an
// international break your country's games are on it too (the score once played).
function weekStrip() {
  const fx = nextFixture(), e = midweekFixture(), mo = e ? midweekOffset(e) : -1, ig = intlDue(), me = 'N:' + S.player.nat;
  const intl = intlGames(), cupDone = !e && S.intl && S.intl.key === weekKey() && S.intl.cup;
  const today = ig ? ig.day : leagueDone() ? mo : 0;
  return `<div class="week-strip">${[0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = dayAfter(i), g = intl.find(x => x.day === i);
    const game = i === 0 && fx ? { opp: fx.opp, tag: leagueDone() ? 'Played' : 'League' } : i === mo ? { opp: e.opp, tag: compShort(e.t.name) }
      : cupDone && cupDone.day === i ? { opp: cupDone.opp, tag: 'Played' }
      : g ? { opp: g.h === me ? g.a : g.h, tag: g.res ? `${g.h === me ? g.res.gh : g.res.ga}–${g.h === me ? g.res.ga : g.res.gh}` : g.kind === 'qualifier' ? 'Qual' : 'Friendly', played: !!g.res } : null;
    const past = i < today || (game && game.played && i !== today);
    return `<div class="wd${i === today ? ' today' : ''}${game ? ' game' : ''}${past ? ' past' : ''}"><small>${i === today ? 'Today' : DAY_NAMES[d.getUTCDay()]}</small><b>${d.getUTCDate()}</b>${game ? `${crest(game.opp, 'mini')}<span>${game.tag}</span>` : '<span class="rest">–</span>'}</div>`;
  }).join('')}</div>`;
}
// Your country's game, on its day: like the club's matchday card.
function intlCard(g) {
  const p = S.player, me = 'N:' + p.nat, opp = g.h === me ? g.a : g.h, sel = intlSel(g);
  const side = id => `<div class="team">${crest(id)}<b>${esc(teamName(id))}</b><span>${Math.round(teamStr(id))} rated</span></div>`;
  const role = sel.start ? '<span class="good">You start</span>' : sel.mins ? '<span class="flood">On the bench, should get on</span>' : '<span class="muted">On the bench</span>';
  const n = intlGames().indexOf(g) + 1;
  return `<section class="card hero">
      <div class="row"><h2>International break</h2><span class="small muted">${g.kind === 'qualifier' ? 'Qualifier' : 'Friendly'} ${n} of 2</span></div>
      ${weekStrip()}
      <div class="fixture">${side(g.h)}<div class="vs">VS</div>${side(g.a)}</div>
      <div class="small muted" style="text-align:center">${role} · ${esc(natCoach(p.nat))}'s ${esc(natName(p.nat))} ${g.h === me ? `host ${esc(teamName(opp))}` : `visit ${esc(teamName(opp))}`}</div>
      <button class="btn primary block" data-act="intlMatchday">To matchday</button>
    </section>`;
}

// The midweek cup game (European or domestic), shown like the league game.
function euroLine() {
  const e = midweekFixture();
  if (!e) return '';
  const tired = S.player.energy < TWO_GAME_ENERGY, side = id => `<div class="team">${crest(id)}<b>${club(id).name}</b><span>${Math.round(teamStrength(club(id)))} rated</span></div>`;
  // League day: only today's game is shown; the midweek game gets its own card on its day.
  if (nextFixture() && !leagueDone()) return `<div class="small ${tired ? 'bad' : 'muted'}" style="text-align:center">${esc(e.t.name.replace(/ \d{4}$/, ''))} on ${dayLabel(dayAfter(midweekOffset(e)))}: you need ${TWO_GAME_ENERGY}+ energy to play both games${tired ? `. You have ${Math.round(S.player.energy)}, so if you play today you will be rested for that one` : ''}.</div>`;
  return `<div class="midweek"><div class="row"><h2 class="mw-title">${esc(e.t.name.replace(/ \d{4}$/, ''))}</h2><span class="small muted">${dayLabel(dayAfter(midweekOffset(e)))}</span></div>
    <div class="small muted" style="text-align:center">${e.stage}</div>
    <div class="fixture">${side(e.home)}<div class="vs">VS</div>${side(e.away)}</div></div>`;
}

function viewOffseason() {
  const sum = S.seasonSummary, p = S.player, age = ageOf(p.by);
  const delta = sum.ovrEnd - sum.ovrStart;
  return `<section class="card hero">
      <h2>Season ${seasonLabel(sum.season)} review</h2>
      <div class="row"><b style="font:800 24px var(--display)">${sum.club}</b>${sum.free ? '' : `<span>Finished <b>${sum.pos}${ordinal(sum.pos)}</b></span>`}</div>
      ${sum.clubs && sum.clubs.length > 1 ? `<div class="small muted">This season: ${sum.clubs.map(esc).join(' → ')}. Stats cover all of them.</div>` : ''}
      <div class="${statGrid(p.pos)}"><div><b>${sum.apps}</b><small>Apps</small></div><div><b>${sum.goals}</b><small>Goals</small></div><div><b>${sum.assists}</b><small>Assists</small></div>${gkCells(p.pos, sum.saves, sum.cleanAll)}<div><b>${rateBox(sum.apps ? sum.avg : null)}</b><small>Rating</small></div></div>
      ${sum.cup && sum.cup.apps ? `<div class="small muted">Cups: ${sum.cup.apps} apps · ${sum.cup.goals} goals · ${sum.cup.assists} assists</div>` : ''}
      ${sum.missed ? `<div class="small bad">Missed ${sum.missed} league game${sum.missed !== 1 ? 's' : ''} injured</div>` : ''}
      <div class="small">OVR ${sum.ovrStart} → <b>${sum.ovrEnd}</b> <span class="${delta >= 0 ? 'good' : 'bad'}">(${delta >= 0 ? '+' : ''}${delta})</span></div>
      ${ovrBreakdown(sum)}
      ${sum.awards.map(a => `<div class="award">${esc(a)}</div>`).join('')}
    </section>
    ${honoursCard(sum)}
    ${summerCard()}
    <section class="card"><h2>Contract</h2>
      ${p.needsContract ? `<p class="bad" style="margin:0">${sum.free ? 'You are still without a club.' : 'Your contract has run out.'} Sign with a club in the Contract tab, or go into ${seasonLabel(S.season + 1)} as a free agent: the weeks go by, the bills keep coming, and clubs can still call.</p>` : `<p style="margin:0">${money(p.wage)}/week · ${p.years} year${p.years !== 1 ? 's' : ''} left at ${club(p.loan ? p.loan.parent : p.club).name}</p>`}
      ${sum.loanNext ? `<p class="small flood" style="margin:0">You made only ${sum.starts} starts, so you will be sent out on loan next season. Sign for another club to avoid it.</p>` : ''}
      ${sum.returning && p.loan ? `<p class="small muted" style="margin:0">Your loan ends. You return to ${club(p.loan.parent).name} for pre-season.</p>` : ''}
      <button class="btn block" data-act="tab" data-v="contract">${S.offers.length ? `View ${S.offers.length} offer${S.offers.length > 1 ? 's' : ''}` : 'Open Contract'}</button>
    </section>
    <section class="card">
      ${summerPending() ? `<p class="small muted" style="margin:0">Finish the ${summerPending().name} first.</p>` : ''}
      <button class="btn primary block" data-act="nextSeason" ${summerPending() ? 'disabled' : ''}>${p.needsContract ? `Proceed to ${seasonLabel(S.season + 1)} season` : `Start ${seasonLabel(S.season + 1)}`}</button>
      <button class="btn danger block" data-act="retireAsk">Retire${age < 30 ? ' early' : ''}</button>
    </section>` + inboxHtml();
}

// Why OVR moved this season: matches and training, the end-of-season review, and ageing.
function ovrBreakdown(sum) {
  const sign = v => `${v > 0 ? '+' : ''}${v}`, cls = v => v > 0 ? 'good' : v < 0 ? 'bad' : '';
  const rows = [];
  if (sum.seasonGain != null) rows.push(`Matches and training: <b class="${cls(sum.seasonGain)}">${sign(sum.seasonGain)}</b>`);
  if (sum.review) rows.push(`Performance review: <b class="${cls(sum.review.change)}">${sign(sum.review.change)}</b>${sum.review.notes.length ? ` (${esc(sum.review.notes.join(', '))})` : ''}`);
  if (sum.ageLoss > 0) rows.push(`Ageing, turning ${sum.ageTo}: <b class="bad">−${sum.ageLoss}</b>. From 34 your body slows down a little more every birthday${sum.formShield >= .05 ? `, but your strong season kept you sharp: ${Math.round(sum.formShield * 100)}% less than it would have been` : ''}.`);
  if (sum.leagueDrop > 0) rows.push(`First season in the ${esc(sum.leagueName)}: <b class="bad">−${sum.leagueDrop}</b>. The easier league takes the edge off your game.`);
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
      body = `<div class="small flood"><b>Next: ${esc(stageNameFor(t, me))}</b>${opp ? ` vs ${esc(teamName(opp))} <span class="muted">(${Math.round(teamStr(opp))} rated)</span>` : ''}</div>`;
    }
    const g = t.groups.findIndex(gr => gr.includes(me));
    const table = `<div class="tablewrap"><table><thead><tr><th>Group ${'ABCDEFGH'[g]}</th><th class="r">P</th><th class="r">GD</th><th class="r">Pts</th></tr></thead><tbody>
      ${groupTable(t, g).map((r, i) => `<tr class="${r.id === me ? 'me' : ''} ${i < 2 ? 'zone-cl' : ''}"><td class="clubname"><span class="clubcell">${crest(r.id, 'mini')}${esc(teamName(r.id))}</span></td><td class="r">${r.p}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r"><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div>`;
    const ko = t.ko.map(k => { const r = k.res.find(x => x.h === me || x.a === me); return r ? `<div class="small">${k.name}: ${esc(teamName(r.h))} ${r.gh}–${r.ga} ${esc(teamName(r.a))}${r.pens ? ` (${esc(teamName(r.pens))} win ${r.pensScore ? pensText(r) + ' ' : ''}on penalties)` : ''}</div>` : ''; }).join('');
    return `<section class="card hero"><div class="row"><h2>${esc(t.name)}</h2><span class="small">${isNation(me) ? esc(natName(me.slice(2))) : esc(teamName(me))}</span></div>
      ${body}${table}${ko}
      ${t.winner ? '' : `<div class="btns"><button class="btn primary sm" data-act="summerMatchday">To matchday</button></div>`}</section>`;
  }).join('');
}

function careerTotals(p = S.player) {
  // Season rows include cup games; the live season adds its own cup line.
  const c = p.career.concat(p === S?.player && S.phase === 'season' && p.st.cup ? [p.st.cup] : []);
  const sum = k => c.reduce((s, r) => s + (r[k] || 0), 0);
  return { apps: sum('apps'), goals: sum('goals'), assists: sum('assists'), saves: sum('saves'), cleanAll: sum('cleanAll') };
}

// Keepers also show saves and clean sheets next to goals and assists.
const gkCells = (pos, saves, clean) => pos === 'GK' ? `<div><b>${saves || 0}</b><small>Saves</small></div><div><b>${clean || 0}</b><small>Clean sheets</small></div>` : '';
const gkSpans = (pos, saves, clean) => pos === 'GK' ? `<span><b>${saves || 0}</b> Sv</span><span><b>${clean || 0}</b> CS</span>` : '';
const statGrid = pos => `bigstat${pos === 'GK' ? ' six' : ''}`;

// Summary of a finished career: the current save after retiring, or one from the past-careers list.
function retiredHtml(rec, newAct = 'menu', tables = true) {
  const t = careerTotals(rec);
  return `<section class="card hero"><h2>Career over</h2>
    <b style="font:800 28px var(--display)">${esc(rec.name)}</b>
    <div class="small muted">${POS_NAMES[rec.pos]} · ${esc(natName(rec.nat))} · Last club ${esc(rec.lastClub)} · Retired at ${rec.retiredAge}</div>
    <div class="${statGrid(rec.pos)}"><div><b>${t.apps}</b><small>Apps</small></div><div><b>${t.goals}</b><small>Goals</small></div><div><b>${t.assists}</b><small>Assists</small></div>${gkCells(rec.pos, t.saves, t.cleanAll)}<div><b>${rec.trophies.length}</b><small>Titles</small></div></div>
    <div class="small muted">Peak OVR ${rec.peak} · ${rec.caps} international caps · Earned ${money(rec.money)} in the bank</div>
    <button class="btn primary block" data-act="${newAct}">Start a new career</button></section>` + iconCardHtml(rec) + legacyCard(rec) + clubStints(rec) + (tables ? careerTables(rec) : '');
}

// The Icon card's art: a gold-rimmed card with curled top corners and a pointed base, white marble
// inside with fine gold veins, and one of three gold designs on top (ICON_STYLES). Each retired
// career gets one of them at random, kept for that career.
const IC_W = 230, IC_H = 330;
const IC_SHAPE = 'M0 46C17 46 27 36 27 17C62 19 92 13 115 3C138 13 168 19 203 17C203 36 213 46 230 46V270C230 290 214 299 190 305C160 312 132 317 115 329C98 317 70 312 40 305C16 299 0 290 0 270Z';
// A small seeded random source, so each design is drawn the same way every time.
const seededRnd = seed => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const ICON_STYLES = [
  // Gilded chevrons: two gold bars sweeping down from the top right, a white streak, a faint band.
  () => `<path d="M232 20L120 132L136 148L232 52Z" fill="url(#icGold)" opacity=".9"/>
    <path d="M232 64L150 146L160 156L232 84Z" fill="url(#icGold)" opacity=".7"/>
    <path d="M-2 196L110 84L118 92L-2 212Z" fill="#fff" opacity=".55"/>
    <path d="M-2 250L230 214V226L-2 262Z" fill="#c9a24a" opacity=".18"/>`,
  // Gold shards: a burst of angular gold splinters behind the player, lit on one face.
  () => {
    const rnd = seededRnd(41), cx = 150, cy = 118;
    const shards = Array.from({ length: 10 }, (_, i) => {
      const a = i / 10 * Math.PI * 2 + rnd() * .35, len = 55 + rnd() * 65, w = .2 + rnd() * .16;
      const p = (ang, r) => `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`;
      const tip = p(a, len), l = p(a - w, len * .45), r = p(a + w, len * .45);
      return `<path d="M${cx} ${cy}L${l}L${tip}Z" fill="url(#icGold)" opacity="${(.55 + rnd() * .4).toFixed(2)}"/><path d="M${cx} ${cy}L${r}L${tip}Z" fill="#fff4cf" opacity=".7"/>`;
    }).join('');
    return `${shards}<path d="M-2 290L232 150" stroke="#c9a24a" stroke-width="1.4" opacity=".6"/><path d="M-2 300L232 160" stroke="#fff" stroke-width="4" opacity=".6"/>`;
  },
  // Gold sunrise: thin rays fanning from the bottom left and gold rings around the top right.
  () => {
    const rays = Array.from({ length: 11 }, (_, i) => {
      const a0 = -Math.PI / 2 + i * .15, a1 = a0 + .06, R = 420;
      return `<path d="M-10 340L${(-10 + Math.cos(a0) * R).toFixed(0)} ${(340 + Math.sin(a0) * R).toFixed(0)}L${(-10 + Math.cos(a1) * R).toFixed(0)} ${(340 + Math.sin(a1) * R).toFixed(0)}Z" fill="#d9b45a" opacity="${i % 2 ? .16 : .3}"/>`;
    }).join('');
    const rings = [34, 50, 64].map((r, i) => `<circle cx="178" cy="88" r="${r}" fill="none" stroke="url(#icGold)" stroke-width="${[7, 3, 1.5][i]}" opacity="${[.85, .7, .6][i]}"/>`).join('');
    return `${rays}${rings}<path d="M-2 232L232 196V204L-2 240Z" fill="url(#icGold)" opacity=".5"/>`;
  },
];
const iconArt = (style = 0) => {
  // Gold veins: a few long wandering cracks, from a fixed seed so every card matches.
  const rnd = seededRnd(7);
  const veins = Array.from({ length: 9 }, () => {
    let x = rnd() * IC_W, y = rnd() * IC_H, d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
    const dir = rnd() * Math.PI * 2;
    for (let k = 0; k < 7; k++) { x += Math.cos(dir + (rnd() - .5) * 1.4) * 16; y += Math.sin(dir + (rnd() - .5) * 1.4) * 16; d += `L${x.toFixed(0)} ${y.toFixed(0)}`; }
    return `<path d="${d}" stroke-width="${(.4 + rnd() * .7).toFixed(2)}"/>`;
  }).join('');
  return `<svg class="ic-art" viewBox="0 0 ${IC_W} ${IC_H}" aria-hidden="true">
    <defs>
      <linearGradient id="icGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c2"/><stop offset=".3" stop-color="#d9a945"/><stop offset=".55" stop-color="#9c6a1c"/><stop offset=".8" stop-color="#f3d27e"/><stop offset="1" stop-color="#a8761f"/></linearGradient>
      <linearGradient id="icMarble" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#fbfaf6"/><stop offset=".45" stop-color="#ecebe6"/><stop offset=".7" stop-color="#f8f7f2"/><stop offset="1" stop-color="#dcdad3"/></linearGradient>
      <clipPath id="icInner"><path d="${IC_SHAPE}" transform="translate(7 7) scale(${(IC_W - 14) / IC_W} ${(IC_H - 14) / IC_H})"/></clipPath>
    </defs>
    <path d="${IC_SHAPE}" fill="url(#icGold)"/>
    <g clip-path="url(#icInner)">
      <rect width="${IC_W}" height="${IC_H}" fill="url(#icMarble)"/>
      <g fill="none" stroke="#c9a24a" opacity=".55">${veins}</g>
      ${ICON_STYLES[style % ICON_STYLES.length]()}
    </g>
    <path d="${IC_SHAPE}" transform="translate(11 11) scale(${(IC_W - 22) / IC_W} ${(IC_H - 22) / IC_H})" fill="none" stroke="#d9b45a" stroke-width="1.2" opacity=".8"/>
  </svg>`;
};
// The base card's outline: the same pointed base, but a smooth top that rises gently to the middle,
// with rounded corners.
const BC_SHAPE = 'M0 38C0 20 10 12 28 11C62 9 92 7 115 3C138 7 168 9 202 11C220 12 230 20 230 38V270C230 290 214 299 190 305C160 312 132 317 115 329C98 317 70 312 40 305C16 299 0 290 0 270Z';
// The base card's art for an ongoing career: the same frame shape, all in gold, with a soft
// triangle pattern and a wide pale-gold chevron across it.
// Gold, silver and bronze: rim, fill, the triangle pattern, the chevron, the band and the inner line.
const BASE_TIERS = {
  gold: { rim: ['#fff0b8', '#c9982f', '#8e6114', '#e9c467', '#9d6f1a'], fill: ['#f6e3a1', '#e2c172', '#c99d47'], tri: '#fff8dc', chev: '#fff6d2', band: '#a87b25', line: '#fff1c0' },
  silver: { rim: ['#ffffff', '#b9c0c8', '#6f7780', '#e3e7eb', '#7d858e'], fill: ['#f1f3f5', '#cfd5db', '#a9b1ba'], tri: '#ffffff', chev: '#ffffff', band: '#6f7780', line: '#ffffff' },
  bronze: { rim: ['#ffd9b0', '#b87333', '#7a4419', '#e0a46b', '#8a4f22'], fill: ['#f0c9a0', '#cf9a68', '#a86d3f'], tri: '#fff0dc', chev: '#ffe9cf', band: '#7a4419', line: '#ffe3c4' },
};
const baseArt = (tier = 'gold') => {
  const T = BASE_TIERS[tier] || BASE_TIERS.gold, id = `bc-${tier}`;
  const tri = [];
  for (let y = 0; y < IC_H; y += 22) for (let x = (y / 22) % 2 ? -12 : 0; x < IC_W; x += 24) {
    tri.push(`<path d="M${x} ${y + 22}L${x + 12} ${y}L${x + 24} ${y + 22}Z" opacity="${(((x * 7 + y * 3) % 5) / 40 + .03).toFixed(3)}"/>`);
  }
  const stops = (list, at) => list.map((c, i) => `<stop offset="${at[i]}" stop-color="${c}"/>`).join('');
  return `<svg class="ic-art" viewBox="0 0 ${IC_W} ${IC_H}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}Rim" x1="0" y1="0" x2="1" y2="1">${stops(T.rim, [0, .35, .6, .85, 1])}</linearGradient>
      <linearGradient id="${id}Fill" x1="0" y1="0" x2=".7" y2="1">${stops(T.fill, [0, .5, 1])}</linearGradient>
      <clipPath id="${id}Inner"><path d="${BC_SHAPE}" transform="translate(7 7) scale(${(IC_W - 14) / IC_W} ${(IC_H - 14) / IC_H})"/></clipPath>
    </defs>
    <path d="${BC_SHAPE}" fill="url(#${id}Rim)"/>
    <g clip-path="url(#${id}Inner)">
      <rect width="${IC_W}" height="${IC_H}" fill="url(#${id}Fill)"/>
      <g fill="${T.tri}">${tri.join('')}</g>
      <path d="M-4 40L115 210L234 40V82L115 252L-4 82Z" fill="${T.chev}" opacity=".35"/>
      <path d="M-4 236H234V240H-4Z" fill="${T.band}" opacity=".35"/>
    </g>
    <path d="${BC_SHAPE}" transform="translate(11 11) scale(${(IC_W - 22) / IC_W} ${(IC_H - 22) / IC_H})" fill="none" stroke="${T.line}" stroke-width="1.2" opacity=".7"/>
  </svg>`;
};
// Your card as it stands today: current OVR, positions and card stats, with your country and club.
function baseCardHtml() {
  const p = S.player, gk = p.pos === 'GK';
  const order = gk ? ['DIV', 'HAN', 'KIC', 'REF', 'PHY', 'POS'] : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
  const cells = order.map(k => [gk && k === 'PHY' ? 'SPD' : k, Math.round(p.attrs[k] || 0)]);
  const flag = typeof FLAG_DATA !== 'undefined' && FLAG_DATA[p.nat] ? `<img class="ic-flag" src="${FLAG_DATA[p.nat]}" alt="${esc(natName(p.nat))}">` : '';
  return `<section class="card"><h2>Your card</h2>
    <div class="icon-card base-card">${baseArt(calcOVR() >= 75 ? 'gold' : calcOVR() >= 65 ? 'silver' : 'bronze')}
      <div class="ic-top"><div class="ic-ovr"><b>${calcOVR()}</b><span>${p.pos}</span>${altPositions().map(a => `<i>${a}</i>`).join('')}</div></div>
      <svg class="ic-man" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="20" r="16"/><path d="M14 100V70c0-18 16-30 36-30s36 12 36 30v30z"/></svg>
      <div class="ic-foot">
        <div class="ic-name">${esc(p.name)}</div>
        <div class="ic-row" style="--n:${cells.length}">${cells.map(([k]) => `<small>${k}</small>`).join('')}${cells.map(([, v]) => `<b>${v}</b>`).join('')}</div>
        <div class="ic-badges">${flag}${p.club && !p.needsContract ? crest(p.club) : ''}</div>
      </div>
    </div>
    <p class="small muted" style="margin:0;text-align:center">Updates as you play: your OVR and card stats today.</p></section>`;
}

// Hero card art: a slim rectangular card with clipped corners and a small notch at the top, in
// one of three original designs (HERO_STYLES), picked at random per career like the Icon card.
// Each design sets its own rim colours and whether the text on it is light or dark.
const HERO_SHAPE = 'M16 0H98L106 7H124L132 0H214L230 16V314L214 330H16L0 314V16Z';
const HERO_STYLES = [
  // Tricolour shards: white marble cut by big angular red and blue panes, with thin gold lines.
  { dark: false, rim: ['#2a4fb8', '#e9edf5', '#c8202e'], draw: () => {
    const rnd = seededRnd(19);
    const panes = Array.from({ length: 7 }, (_, i) => {
      const left = i % 2 === 0, x0 = left ? -10 : 240, y0 = 20 + i * 26 + rnd() * 10, dx = (left ? 1 : -1) * (90 + rnd() * 70);
      return `<path d="M${x0} ${y0.toFixed(0)}L${(x0 + dx).toFixed(0)} ${(y0 + 18 + rnd() * 20).toFixed(0)}L${x0} ${(y0 + 50 + rnd() * 30).toFixed(0)}Z" fill="${left ? '#2747a8' : '#c41f2e'}" opacity="${(.55 + rnd() * .35).toFixed(2)}"/>`;
    }).join('');
    return `<rect width="230" height="330" fill="url(#hrMarble)"/>${panes}
      <path d="M30 150L120 110L200 160M60 200L150 140" stroke="#d6ae4f" stroke-width="1" fill="none" opacity=".8"/>
      <path d="M-5 250L235 190V206L-5 266Z" fill="#fff" opacity=".6"/>`;
  } },
  // Storm blue: a deep blue night with a glowing ball of light and forked lightning.
  { dark: true, rim: ['#1d3f73', '#9cc8f2', '#16325e'], draw: () => {
    const bolt = (x, y, s) => `<path d="M${x} ${y}l${-8 * s} ${26 * s}l${10 * s} ${-2 * s}l${-12 * s} ${30 * s}" stroke="#bfe3ff" stroke-width="${2 * s}" fill="none" stroke-linejoin="round"/>`;
    return `<rect width="230" height="330" fill="url(#hrNight)"/>
      <circle cx="78" cy="96" r="44" fill="url(#hrGlow)"/>
      <g stroke="#9ed2ff" stroke-width=".8" fill="none" opacity=".7"><circle cx="78" cy="96" r="30"/><path d="M48 96H108M78 66V126M56 76Q78 90 100 76M56 116Q78 102 100 116"/></g>
      <g opacity=".9">${bolt(150, 20, 1.2)}${bolt(190, 60, .8)}${bolt(120, 150, .7)}</g>
      <path d="M-5 210L235 170V190L-5 232Z" fill="#5fb0f0" opacity=".25"/>
      <path d="M-5 236L235 200V206L-5 242Z" fill="#bfe3ff" opacity=".5"/>`;
  } },
  // Thunder orange: a burning orange sky, white lightning over a stadium rim and a green pitch.
  { dark: true, rim: ['#b4501a', '#f6c08a', '#8a3a10'], draw: () => {
    const bolt = (x, y, s) => `<path d="M${x} ${y}l${10 * s} ${22 * s}l${-9 * s} ${3 * s}l${12 * s} ${28 * s}l${-6 * s} ${-2 * s}l${8 * s} ${20 * s}" stroke="#fff6e0" stroke-width="${2.2 * s}" fill="none" stroke-linejoin="round"/>`;
    return `<rect width="230" height="330" fill="url(#hrFire)"/>
      <circle cx="150" cy="70" r="34" fill="#fff3d6" opacity=".9"/><circle cx="150" cy="70" r="52" fill="#ffd28a" opacity=".35"/>
      <g opacity=".95">${bolt(60, 10, 1.1)}${bolt(185, 110, .8)}${bolt(20, 120, .7)}</g>
      <path d="M-5 168Q115 120 235 168V184Q115 140 -5 184Z" fill="#3a1606" opacity=".75"/>
      <path d="M-5 184Q115 150 235 184V330H-5Z" fill="url(#hrPitch)"/>
      <path d="M-5 220L235 206" stroke="#bff0a8" stroke-width="1" opacity=".4"/>`;
  } },
];
const heroArt = (style = 0) => {
  const st = HERO_STYLES[style % HERO_STYLES.length], [a, b, c] = st.rim;
  return `<svg class="ic-art" viewBox="0 0 ${IC_W} ${IC_H}" aria-hidden="true">
    <defs>
      <linearGradient id="hrRim${style}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
      <linearGradient id="hrMarble" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#fbfbf8"/><stop offset=".5" stop-color="#e9eaee"/><stop offset="1" stop-color="#d9dbe0"/></linearGradient>
      <linearGradient id="hrNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2346"/><stop offset=".6" stop-color="#123a6e"/><stop offset="1" stop-color="#071a33"/></linearGradient>
      <radialGradient id="hrGlow"><stop offset="0" stop-color="#e6f5ff"/><stop offset=".5" stop-color="#6fc0ff" stop-opacity=".7"/><stop offset="1" stop-color="#2a74c9" stop-opacity="0"/></radialGradient>
      <linearGradient id="hrFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset=".45" stop-color="#ef6a12"/><stop offset="1" stop-color="#7a2a06"/></linearGradient>
      <linearGradient id="hrPitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8f2e"/><stop offset="1" stop-color="#1d4a17"/></linearGradient>
      <clipPath id="hrInner"><path d="${HERO_SHAPE}" transform="translate(7 7) scale(${(IC_W - 14) / IC_W} ${(IC_H - 14) / IC_H})"/></clipPath>
    </defs>
    <path d="${HERO_SHAPE}" fill="url(#hrRim${style})"/>
    <g clip-path="url(#hrInner)">${st.draw()}</g>
    <path d="${HERO_SHAPE}" transform="translate(11 11) scale(${(IC_W - 22) / IC_W} ${(IC_H - 22) / IC_H})" fill="none" stroke="${b}" stroke-width="1" opacity=".7"/>
  </svg>`;
};
// A Hero design for a career, picked at random and kept for it (the same key always gives the same one).
const heroStyleFor = key => strHash(key + '|hero') % HERO_STYLES.length;
// The Hero badge, in place of the Icon badge on Hero cards: a dark hexagon with a copper rim and a
// comet streaking across it, blue to orange, with a small star at its head.
const HERO_EMBLEM = `<svg class="ic-emblem hero-emblem" viewBox="0 0 40 44" aria-label="Hero">
  <defs><linearGradient id="hbTail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3b6fd6" stop-opacity="0"/><stop offset=".45" stop-color="#5aa8ff"/><stop offset=".8" stop-color="#ff9b45"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
  <linearGradient id="hbRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf9a"/><stop offset=".5" stop-color="#b8662a"/><stop offset="1" stop-color="#f0a865"/></linearGradient></defs>
  <path d="M20 2L37 11.5V32.5L20 42L3 32.5V11.5Z" fill="#141a2b" stroke="url(#hbRim)" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M8 31Q16 25 27 15L29.5 17.5Q19 28 9.5 33Z" fill="url(#hbTail)"/>
  <path d="M28.5 10.5l1.3 2.8 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#ffe2a8"/>
</svg>`;

// The Icon badge in place of the word, in the style of EA's: a cream shield with a gold rim, three
// stars over a vintage laced ball, and a laurel wreath around it.
const ICON_EMBLEM = (() => {
  const star = (cx, cy, r) => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * .45 : r; return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * d).toFixed(2)} ${(cy + Math.sin(a) * d).toFixed(2)}`; }).join('')}Z"/>`;
  // Leaves along an arc from the bottom of the wreath up each side.
  const leaves = s => Array.from({ length: 6 }, (_, i) => {
    // deg runs from just beside the bottom (90°) round and up the side; each leaf lies along the
    // curve, tipped a little outwards.
    const deg = 90 - s * (14 + i * 23), a = deg * Math.PI / 180, x = 20 + Math.cos(a) * 11.5, y = 24 + Math.sin(a) * 11.5;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.7" ry="1.15" transform="rotate(${(deg + 90 + s * 25).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  return `<svg class="ic-emblem" viewBox="0 0 40 46" aria-label="Icon">
    <path class="ic-em-shield" d="M7 3h26a4 4 0 0 1 4 4v17c0 10-8 16-17 20C11 40 3 34 3 24V7a4 4 0 0 1 4-4z"/>
    ${star(13.5, 9.5, 2.6)}${star(20, 8, 3)}${star(26.5, 9.5, 2.6)}
    ${leaves(-1)}${leaves(1)}
    <circle cx="20" cy="24" r="7" class="ic-em-ball"/>
    <path class="ic-em-seam" d="M13.5 21.6Q20 19 26.5 21.6M13.3 26.2Q20 28.8 26.7 26.2M20 20.3V27.5M16.6 17.9Q16 19.6 16.6 21M23.4 17.9Q24 19.6 23.4 21M16.4 27Q15.9 28.6 16.6 30M23.6 27Q24.1 28.6 23.4 30M18.6 18.3h2.8M18.6 19.4h2.8"/>
  </svg>`;
})();

// The retirement Icon card: prime OVR, the three positions you played most, and your main club.
function iconCardHtml(rec) {
  const ic = iconCard(rec), t = careerTotals(rec), top = clubLegacy(rec)[0], gk = ic.pos === 'GK';
  const cs = cardStatus(rec), key = `${rec.name}|${rec.by}|${rec.retiredAge}`;
  const why = ic.prime ? `average of your ${ic.prime} season${ic.prime > 1 ? 's' : ''} aged 25 to 33` : 'your peak, as you retired before 25';
  // Like an EA card: six stats in a row, labels over numbers, averaged the same way as the OVR. Old
  // careers saved without stats show career numbers instead.
  const order = ic.stats && ('DIV' in ic.stats ? ['DIV', 'HAN', 'KIC', 'REF', 'PHY', 'POS'] : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY']);
  const label = k => 'DIV' in (ic.stats || {}) && k === 'PHY' ? 'SPD' : k;
  const cells = order ? order.map(k => [label(k), ic.stats[k]])
    : gk ? [['APP', t.apps], ['CS', t.cleanAll || 0], ['SV', t.saves || 0], ['TTL', rec.trophies.length]]
    : [['APP', t.apps], ['GOL', t.goals], ['AST', t.assists], ['TTL', rec.trophies.length]];
  const totals = gk ? `${t.apps} apps · ${t.cleanAll || 0} clean sheets · ${t.saves || 0} saves · ${rec.trophies.length} troph${rec.trophies.length === 1 ? 'y' : 'ies'}` : `${t.apps} apps · ${t.goals} goals · ${t.assists} assists · ${rec.trophies.length} troph${rec.trophies.length === 1 ? 'y' : 'ies'}`;
  const flag = typeof FLAG_DATA !== 'undefined' && FLAG_DATA[rec.nat] ? `<img class="ic-flag" src="${FLAG_DATA[rec.nat]}" alt="${esc(natName(rec.nat))}">` : '';
  // Icon: marble art, flag and the Icon badge. Hero: one of the Hero designs, flag and the club you
  // are remembered at. Otherwise a gold, silver or bronze card by peak OVR, flag and club.
  const heroStyle = heroStyleFor(key), legendClub = clubLegacy(rec).find(c => c.legend) || top;
  const look = cs.status === 'icon' ? { cls: '', art: iconArt(strHash(`${key}|style`)), badges: flag + ICON_EMBLEM, title: 'Icon card' }
    : cs.status === 'hero' ? { cls: `hero-card${HERO_STYLES[heroStyle].dark ? ' dark' : ''}`, art: heroArt(heroStyle), badges: flag + HERO_EMBLEM, title: 'Hero card' }
    : { cls: 'base-card', art: baseArt(cs.tier), badges: flag + (top ? rowCrest(top) : ''), title: `${cs.tier[0].toUpperCase() + cs.tier.slice(1)} card` };
  const verdict = cs.status === 'icon' ? 'Icon' : cs.status === 'hero' ? 'Hero' : 'Icon or Hero';
  // Only what you won is listed here (not peak OVR or caps).
  const parts = cs.parts.filter(g => !/^peak OVR|caps$/.test(g.label)).slice(0, 4).map(g => `${g.n > 1 ? `${g.n}× ` : ''}${esc(g.label)}`).join(', ');
  return `<section class="card"><h2>${look.title}</h2>
    <div class="icon-card ${look.cls}">${look.art}
      <div class="ic-top"><div class="ic-ovr"><b>${ic.ovr}</b><span>${ic.pos}</span>${ic.alts.map(a => `<i>${a}</i>`).join('')}</div></div>
      <svg class="ic-man" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="20" r="16"/><path d="M14 100V70c0-18 16-30 36-30s36 12 36 30v30z"/></svg>
      <div class="ic-foot">
        <div class="ic-name">${esc(rec.name)}</div>
        <div class="ic-row" style="--n:${cells.length}">${cells.map(([k]) => `<small>${k}</small>`).join('')}${cells.map(([, v]) => `<b>${v}</b>`).join('')}</div>
        <div class="ic-badges">${look.badges}</div>
      </div>
    </div>
    <div class="legacy-sum"><div><small>Legacy</small><b>${cs.score}</b></div><div><small>Fans' verdict</small><b>${cs.vote}%</b><span>say ${verdict}</span></div></div>
    ${parts ? `<p class="small muted" style="margin:0;text-align:center">${parts}</p>` : ''}
    <p class="small muted" style="margin:0;text-align:center">${order ? `${totals}<br>` : ''}Most games: ${ic.apps.map(([k, n]) => `${k} ${n}`).join(' · ')}</p></section>`;
}

// Short tags for a finished career: legend status, Ballon d'Ors, and the main clubs' numbers.
function legacyTags(rec) {
  const clubs = clubLegacy(rec), tags = [];
  clubs.filter(c => c.legend).forEach(c => tags.push(['legend', `${c.club} legend`]));
  ballonDors(rec).forEach(b => tags.push(['gold', `Ballon d'Or ${seasonLabel(b.season)}${b.club ? ` · ${b.club}` : ''}`]));
  // The shirt you made your own: worn in 300+ games.
  const shirt = signatureShirt(rec);
  if (shirt) tags.push(['gold', `Known for the #${shirt.no} shirt · ${shirt.apps} games`]);
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
    const need = c.legend ? '' : c.rivals.length ? `${c.earned ? 'Would have been a legend, but you' : 'You'} also played for their rivals ${c.rivals.map(esc).join(' and ')}: no legend status here` : `Legend needs ${LEGEND.seasons + 1}+ seasons, ${c.gk ? `${LEGEND.clean} clean sheets` : `${LEGEND.ga} G/A`} and ${LEGEND.apps + 1}+ apps`;
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
      last.to = r.season; last.seasons.add(r.season); if (r.no) last.nos.add(r.no);
      last.apps += r.apps; last.goals += r.goals; last.assists += r.assists; last.rsum += r.avg * r.apps; last.saves += r.saves || 0; last.clean += r.cleanAll || 0;
    } else stints.push({ club: r.club, clubId: r.clubId, league: r.league, from: r.season, to: r.season, seasons: new Set([r.season]), nos: new Set(r.no ? [r.no] : []), apps: r.apps, goals: r.goals, assists: r.assists, rsum: r.avg * r.apps, saves: r.saves || 0, clean: r.cleanAll || 0 });
  });
  if (!stints.length) return '';
  const cards = stints.slice().reverse().map(s => {
    const n = s.seasons.size, span = s.from === s.to ? seasonLabel(s.from) : `${seasonLabel(s.from)} – ${seasonLabel(s.to)}`;
    return `<div class="stint"><div class="row"><div class="clubcell">${rowCrest(s)}<div style="min-width:0"><div class="clubline"><b class="club">${esc(s.club)}</b>${[...s.nos].map(shirtTag).join("")}</div><div class="small muted">${span} · ${n} season${n !== 1 ? 's' : ''}</div></div></div></div>
      <div class="spellstats"><span><b>${s.apps}</b> apps</span><span><b>${s.goals}</b> G</span><span><b>${s.assists}</b> A</span>${gkSpans(rec.pos, s.saves, s.clean)}<span>${rateBox(s.apps ? s.rsum / s.apps : null)}</span></div></div>`;
  }).join('');
  return `<section class="card"><h2>Clubs</h2><p class="small muted" style="margin:0">Every spell at a club, all competitions added up.</p>${cards}</section>`;
}

function viewRetired() { return retiredHtml(retiredRecord()); }

// Under a nickname in another language: what it means, e.g. German for "The Bomber".
const nickMeaning = k => k && k.meaning ? `<div class="small muted" style="margin-top:-6px">${esc(LANG_NAMES[k.lang] || '')} for “${esc(k.meaning)}”</div>` : '';
// A past career's Career tab, laid out like a live one: Profile (with your nickname), Nationality and Milestones, and History.
let pastSub = 'profile';
function pastCareerHtml(rec) {
  const seg = `<div class="seg">${[['profile', 'Career'], ['history', 'History']].map(([k, l]) => `<button class="${pastSub === k ? 'on' : ''}" data-act="pastSub" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (pastSub === 'history') return seg + careerTables(rec);
  const t = careerTotals(rec), seasons = (rec.career || []).length;
  const clubs = [...new Set((rec.career || []).map(r => r.club.replace(' (loan)', '')))];
  const prev = rec.capsBy ? Object.entries(rec.capsBy).map(([n, c]) => `${natName(n)} ${c.caps} caps`).join(', ') : '';
  const ms = (rec.milestones || []).slice().reverse();
  const flags = list => list.map(n => `<span class="natchip">${natFlag(n)}${esc(natName(n))}</span>`).join('');
  const born =rec.birthNat || rec.nat, pass = rec.passports && rec.passports.length ? rec.passports : [rec.nat];
  const natLines = [
    `${rec.caps || 0} cap${rec.caps === 1 ? '' : 's'} and ${rec.intlGoals || 0} goal${rec.intlGoals === 1 ? '' : 's'} for ${esc(natName(rec.nat))}.`,
    prev ? `Before switching: ${esc(prev)}.` : '',
    rec.switched != null ? `Switched national team in ${seasonLabel(rec.switched)}.` : '',
    rec.intlRetiredSeason != null ? `Retired from international football in ${seasonLabel(rec.intlRetiredSeason)}.` : '',
  ].filter(Boolean).join(' ');
  const natCard = `<section class="card"><h2>Nationality</h2>
      <div class="kv"><div><small>Born</small><b>${flags([born])}</b></div><div><small>Passports</small><b>${flags(pass)}</b></div><div><small>National team</small><b>${flags([rec.nat])}</b></div></div>
      <div class="small muted">${natLines}</div></section>`;
  return seg + `<section class="card hero"><h2>Profile</h2>${rec.nickname ? `<div class="nick">“${esc(rec.nickname.n)}”</div>${nickMeaning(rec.nickname)}` : ''}
      <div class="kv"><div><small>Position</small><b>${POS_NAMES[rec.pos]}</b></div><div><small>Nation</small><b>${natFlag(rec.nat)} ${esc(natName(rec.nat))}</b></div>
      <div><small>Caps</small><b>${rec.caps || 0} · ${rec.intlGoals || 0} goals</b></div><div><small>Peak OVR</small><b>${rec.peak}</b></div>
      <div><small>Reputation</small><b>${rec.rep != null ? rec.rep : '–'}/100</b></div><div><small>Retired at</small><b>${rec.retiredAge}</b></div></div>
      <div class="small muted">${seasons} season${seasons !== 1 ? 's' : ''} · ${clubs.length} club${clubs.length !== 1 ? 's' : ''} · ${t.apps} apps · ${t.goals} goals · ${t.assists} assists · last club ${esc(rec.lastClub)}</div></section>
    ${natCard}
    <section class="card"><details class="mdrop" style="padding:0"><summary><h2>Milestones</h2><span class="small muted">${ms.length}</span></summary><div class="mbody">
      ${ms.length ? ms.map(m => `<div class="msrow"><b>${esc(m.t)}</b><span class="small muted">${seasonLabel(m.season)}${m.club ? ` · ${esc(m.club)}` : ''}</span></div>`).join('') : `<span class="small muted">${rec.milestones ? 'None.' : 'This career finished before milestones were kept with it.'}</span>`}
      </div></details></section>`;
}
// A past career has a small bar at the bottom: its story, what you owned, and the way back.
let pastTab = 'summary';
function pastAssetsHtml(rec) {
  const a = rec.assets;
  if (!a) return `<section class="card"><h2>Assets</h2><p class="small muted" style="margin:0">This career finished before what you owned was kept with it, so there is nothing to show here. Careers you finish from now on keep their homes, collection and shares.</p><div class="kv" style="margin-top:8px"><div><small>Bank at retirement</small><b class="num">${money(rec.money || 0)}</b></div></div></section>`;
  const homes = Object.entries(a.homes || {}).filter(([, i]) => i > 0 && HOUSING[i]);
  const items = (a.collection || []).map(c => ({ ...c, it: luxItem(c.id) })).filter(x => x.it);
  const homesWorth = homes.reduce((s, [nat, i]) => s + housePrice(nat, i), 0), itemsWorth = items.reduce((s, x) => s + x.it.price, 0);
  const total = (rec.money || 0) + (a.shares || 0) + homesWorth + itemsWorth;
  // Shares still held: priced as they were at retirement, and still yours to sell.
  const port = Object.entries(a.portfolio || {});
  const inv = `<section class="card"><div class="row"><h2>Investments</h2><span class="small muted">${money(a.shares || 0)}</span></div>${a.portfolio
    ? (port.length ? `<p class="small muted" style="margin:0">Prices as they were when you retired. Selling pays into this career's bank, less the ${Math.round(TRADE_FEE * 1000) / 10}% trading fee.</p><div class="commits">${port.map(([sym, h]) => {
      const v = h.shares * h.price, pl = h.cost ? v / h.cost - 1 : 0;
      return `<div class="commit"><div><b>${sym}</b> <span class="small muted">${esc(stock(sym) ? stock(sym).name : sym)}</span>
        <div class="small muted">${h.shares.toLocaleString()} shares · worth ${money(Math.round(v))} · <span class="${pl >= 0 ? 'good' : 'bad'}">${pctTxt(pl)}</span></div>
        <div class="btns"><button class="btn sm" data-act="pastSell" data-v="${rec.id}|${sym}|.25">Sell 25%</button><button class="btn sm" data-act="pastSell" data-v="${rec.id}|${sym}|1">Sell all</button></div></div></div>`;
    }).join('')}</div>` : '<p class="small muted" style="margin:0">No shares left: all sold.</p>')
    : `<p class="small muted" style="margin:0">${a.shares ? `Worth ${money(a.shares)} at retirement. This career finished before each holding was kept, so they can't be sold here.` : 'You held no shares.'}</p>`}</section>`;
  return `<section class="card hero"><h2>Assets at retirement</h2>
    <div class="kv"><div><small>Total worth</small><b class="num">${money(total)}</b></div><div><small>Bank</small><b class="num">${money(rec.money || 0)}</b></div><div><small>Shares</small><b class="num">${money(a.shares || 0)}</b></div></div></section>${inv}
    <section class="card"><div class="row"><h2>Homes</h2><span class="small muted">${money(homesWorth)}</span></div>${homes.length ? `<div class="commits">${homes.map(([nat, i]) => `<div class="commit"><div><b>${natFlag(nat)} ${esc(HOUSING[i].name)}</b><div class="small muted">${esc(natName(nat))} · bought for about ${money(housePrice(nat, i))}</div></div></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">You never bought a home.</p>'}</section>
    <section class="card"><div class="row"><h2>Collection</h2><span class="small muted">${items.length} item${items.length !== 1 ? 's' : ''} · ${money(itemsWorth)}</span></div>${items.length ? `<div class="commits">${items.map(x => `<div class="commit"><div class="row" style="justify-content:flex-start;gap:10px"><div style="width:84px;flex:none">${luxPic(x.it)}</div><div><b>${esc(luxName(x.it))}</b> <span class="chip">${LUX_CATS[x.it.cat]}</span><div class="small muted">Bought ${seasonLabel(x.season)} · ${money(x.it.price)}</div></div></div></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">No luxuries.</p>'}</section>`;
}
function pastNav() {
  const tabs = [['summary', 'Summary', 'home'], ['career', 'Career', 'career'], ['assets', 'Assets', 'shop'], ['back', 'Back', 'back']];
  return `<nav class="tabs"><div class="in" style="grid-template-columns:repeat(4,1fr)">${tabs.map(([k, l, ic]) => `
    <button class="${pastTab === k ? 'on' : ''}" data-act="${k === 'back' ? 'pastBack' : 'pastTab'}" data-v="${k}" aria-label="${l}">${icon(ic)}<span>${l}</span></button>`).join('')}</div></nav>`;
}
// A past career opened from the landing page.
function renderPast() {
  const rec = loadArchive().find(r => r.id === pastView);
  if (!rec) { pastView = null; landing = true; render(); return; }
  // Seasons are labelled from the year that career started.
  labelBase = rec.startYear || START_YEAR;
  try { app.innerHTML = `<div class="create wrap">${pastTab === 'assets' ? pastAssetsHtml(rec) : pastTab === 'career' ? pastCareerHtml(rec) : `${retiredHtml(rec, 'freshStart', false)}<button class="btn block" data-act="pastExport" data-v="${rec.id}">Export this career</button><button class="btn block" data-act="pastBack">Back</button>`}</div>` + pastNav(); } finally { labelBase = null; }
}
// A finished career as a file or text, to keep or share. It holds only that career's record (seasons,
// trophies, awards, card), not a save to carry on playing.
function showPastExport(id) {
  const rec = loadArchive().find(r => r.id === id);
  if (!rec) return;
  const data = JSON.stringify(rec);
  let link = '';
  try { link = URL.createObjectURL(new Blob([data], { type: 'application/json' })); } catch (e) { /* no blob support */ }
  openModal(`<h3>Export career</h3><p class="small muted" style="margin:0">Download the file, or copy the text below. It is this finished career's record, not a save to keep playing.</p>
    <textarea class="savebox" readonly>${esc(data)}</textarea>
    <div class="btns">${link ? `<a class="btn primary sm" href="${link}" download="pitch-to-legend-career-${esc(rec.name.replace(/\W+/g, '-'))}.json">Download file</a>` : ''}<button class="btn sm" data-act="copyPast" data-v="${id}">Copy text</button><button class="btn sm" data-act="close">Close</button></div>`);
}

// ---------- train ----------
function viewTrain() {
  const p = S.player, keys = attrKeys(p.pos), w = WEIGHTS[p.pos];
  const can = S.phase === 'season' && p.slots > 0 && !p.injured;
  const head = `<section class="card"><div class="row"><h2>Training</h2><span class="small"><b>${p.slots}</b>/${TRAIN_SLOTS} sessions left</span></div>
    <p class="small muted" style="margin:0">Each session uses ${TRAIN_ENERGY} energy. Your ${EQUIP_TIERS[p.equip].name.toLowerCase()} equipment gives ×${EQUIP_TIERS[p.equip].mult} XP; upgrade it in the Shop. A third of the extra XP is only earned on the pitch that week: none on the bench, more for goals and assists. Gains slow with age (a lot from 34). Match ratings, goals, assists and awards also move your OVR up or down.</p>
    <p class="small" style="margin:6px 0 0">Physicality ${Math.round(physOf())}: injury risk <b class="${injuryMult() <= 1 ? 'good' : 'bad'}">×${injuryMult().toFixed(2)}</b>, and ${Math.round(seriousChance() * 100)}% of injuries are serious. More Physicality means fewer and milder injuries.${youngBody() ? ' Includes the teenage bonus (until 19): fewer and milder injuries.' : ''}</p>
    ${can ? tiredNote('p') : ''}
    ${p.injured ? '<p class="bad small" style="margin:0">You are injured and cannot train.</p>' : ''}
    ${S.phase !== 'season' ? '<p class="small muted" style="margin:0">Training resumes when the season starts.</p>' : ''}
    ${S.phase === 'season' && !p.injured && p.slots <= 0 ? `<p class="bad small" style="margin:0">You have already trained ${TRAIN_SLOTS} times this week. Training opens again next week${leagueDone() ? ', after the midweek game' : ''}.</p>` : ''}
    ${STORE_BUILD && S.phase === 'season' && !p.injured && p.slots <= 0 && S.storeTrain !== `${S.season}-${S.week}` ? `<button class="btn block" data-act="adTrain">${isPro() ? 'Extra session this week' : 'Watch an ad for an extra session this week'}</button>` : ''}
  </section>`;
  const cards = keys.map(k => {
    const v = p.attrs[k], gain = trainGain(k), held = trainGain(k, 'pitch');
    const brief = (p.objectives || []).find(o => o.kind === 'train' && o.attr === k && o.progress < o.target);
    return `<div class="attr">
      <div><span class="name">${ATTR_NAMES[k]}</span>${w[k] >= .2 ? '<span class="key">key</span>' : ''}${brief ? `<span class="key brief">Manager ${brief.progress}/${brief.target}</span>` : ''}<div class="meta">${gain ? `+${gain.toFixed(2)} per session${held ? ` · up to +${held.toFixed(2)} on the pitch` : ''}` : 'At your peak'} · ${Math.round(w[k] * 100)}% of your OVR</div></div>
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
  const own = ownedHomes();
  const homes = [...(ownedHere() ? [] : [{ nat, house: p.house, end: p.house ? p.leaseEnd || 0 : 0, current: true }]), ...oldLeases()];
  const owned = Object.entries(own).map(([n, i]) => `<div class="commit ${n === nat && ownedHere() ? 'on' : ''}"><div><b>${natName(n)}</b> · ${HOUSING[i].name} <span class="chip good">Owned</span>${n === nat && ownedHere() ? ' <span class="chip">You live here</span>' : n === nat ? '' : ' <span class="chip">Waiting for you</span>'}
      <div class="small muted">Upkeep ${money(upkeepMonth(n, i))} a month · worth ${money(Math.round(housePrice(n, i) * SELL_BACK))} if sold</div>
      <div class="btns"><button class="btn sm" data-act="sellAsk" data-v="${n}">Sell</button></div></div>
      <b class="num bad">−${money(upkeepWeek(n, i))}/wk</b></div>`).join('');
  const rows = homes.map(h => {
    const left = Math.max(0, h.end - w);
    return `<div class="commit ${h.current ? 'on' : ''}"><div><b>${natName(h.nat)}</b> · ${HOUSING[h.house].name}${h.current ? ' <span class="chip">You live here</span>' : ' <span class="chip bad">Moved away</span>'}
      <div class="small muted">${h.bought ? `Old lease, still paid after you bought: ${left} week${left !== 1 ? 's' : ''} left` : h.house ? left ? `Lease: ${left} week${left !== 1 ? 's' : ''} left` : 'Lease done: you can move any time' : 'No lease'}</div></div>
      <b class="num bad">−${money(houseRent(h.nat, h.house))}/wk</b></div>`;
  }).join('');
  const rowsAll = owned + rows;
  const kit = kitTier() ? `<div class="commit"><div><b>${EQUIP_TIERS[kitTier()].name} training kit</b><div class="small muted">${kitTier() > p.equip ? `You trained with it this week, so this week is charged at its rate` : 'Running costs, until you switch back to Normal'}</div></div><b class="num bad">−${money(kitFee())}/wk</b></div>` : '';
  const ag = p.agent ? `<div class="commit"><div><b>${agent().name}</b><div class="small muted">${Math.round(agent().cut * 100)}% of your wage</div></div><b class="num bad">−${money(agentCut())}/wk</b></div>` : '';
  const cars = carUpkeep() ? `<div class="commit"><div><b>Cars (${collection().filter(c => luxItem(c.id).cat === 'car').length})</b><div class="small muted">Insurance and upkeep, until you sell them</div></div><b class="num bad">−${money(carUpkeep())}/wk</b></div>` : '';
  return `<section class="card"><h2>Commitments</h2>
    <p class="small muted" style="margin:0">Leases follow the country you play in. Move abroad before one ends and you keep paying it until it runs out, on top of your new home. Homes you own cost a little upkeep wherever you are, and are waiting for you when you come back.</p>
    <div class="commits">${rowsAll}${kit}${ag}${cars}</div>
    <div class="row"><span>Total per week</span><b class="num bad">−${money(weeklyCosts())}</b></div></section>`;
}

// A photo of the item (packed into js/lux-img.js), or a drawn icon when there is none.
const LUX_ICON = {
  car: '<svg viewBox="0 0 48 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 22v-5l5-2 6-6h14l7 6 7 2v5z"/><circle cx="13" cy="23" r="4"/><circle cx="36" cy="23" r="4"/><path d="M17 10l-3 5h21"/></svg>',
  watch: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M18 4h12l2 9H16zM16 35h16l-2 9H18z"/><circle cx="24" cy="24" r="11"/><path d="M24 17v7l5 3"/></svg>',
  jewel: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 8h24l8 10-20 24L4 18z"/><path d="M4 18h40M18 8l-4 10 10 24 10-24-4-10"/></svg>',
};
function luxPic(it) {
  const src = typeof LUX_IMG !== 'undefined' && LUX_IMG[it.id];
  return `<span class="lux-pic ${src ? '' : 'icon'}">${src ? `<img src="${src}" alt="" loading="lazy">` : LUX_ICON[it.cat]}</span>`;
}
// Luxury: your collection, then everything you can buy, by category.
let luxCat = 'car';
const luxName = it => `${it.brand === 'Custom' ? '' : `${it.brand} `}${it.name}`;
function luxuryView() {
  const p = S.player, mine = collection();
  const owned = mine.length ? `<div class="commits">${mine.map(c => {
    const it = luxItem(c.id);
    return `<div class="commit"><div><b>${esc(luxName(it))}</b> <span class="chip">${LUX_CATS[it.cat]}</span>
      <div class="small muted">Bought ${seasonLabel(c.season)} · worth ${money(Math.round(it.price * SELL_BACK_LUX[it.cat]))} if sold${it.cat === 'car' ? ` · upkeep ${money(Math.round(it.price * CAR_UPKEEP))}/wk` : ''}</div>
      <div class="btns"><button class="btn sm" data-act="luxSellAsk" data-v="${c.uid}">Sell</button></div></div></div>`;
  }).join('')}</div>` : '<p class="small muted" style="margin:0">Nothing yet. Treat yourself.</p>';
  const head = `<section class="card hero"><div class="row"><h2>Your collection</h2><span class="chip">${mine.length} item${mine.length !== 1 ? 's' : ''}</span></div>
    <div class="kv"><div><small>Worth</small><b class="num">${money(collectionValue())}</b></div><div><small>Car upkeep</small><b class="num bad">${money(carUpkeep())}/wk</b></div><div><small>Bank</small><b class="num">${money(p.money)}</b></div></div>
    <p class="small muted" style="margin:0">Big purchases get you talked about (a little reputation). Cars cost insurance and upkeep every week; sell cars back for 75%, watches and jewellery for 85%.</p>${owned}</section>`;
  const chips = `<div class="seg">${Object.entries(LUX_CATS).map(([k, l]) => `<button class="${luxCat === k ? 'on' : ''}" data-act="luxCat" data-v="${k}">${l}</button>`).join('')}</div>`;
  const items = LUXURY.filter(x => x.cat === luxCat).sort((a, b) => a.price - b.price).map(it => {
    const n = mine.filter(c => c.id === it.id).length;
    return `<button class="lux-card" data-act="luxAsk" data-v="${it.id}" ${p.money < it.price ? 'disabled' : ''}>${luxPic(it)}${n ? `<span class="lux-owned">Owned${n > 1 ? ` ×${n}` : ''}</span>` : ''}
      <span class="lux-brand">${esc(it.brand === 'Custom' ? 'Custom piece' : it.brand)}</span><span class="lux-name">${esc(it.name)}</span><b class="num lux-price">${money(it.price)}</b></button>`;
  }).join('');
  return head + `<section class="card"><h2>Showroom</h2>${chips}<div class="lux-grid">${items}</div><p class="small muted" style="margin:0">${luxCat === 'car' ? `Cars cost ${(CAR_UPKEEP * 100).toFixed(2)}% of their price a week in insurance and upkeep.` : 'No upkeep.'} Photos from Wikipedia and Wikimedia Commons.</p></section>`;
}

// A 26-week price line for a stock.
function sparkline(hist) {
  if (hist.length < 2) return '';
  const lo = Math.min(...hist), hi = Math.max(...hist), w = 84, h = 26, span = hi - lo || 1;
  const pts = hist.map((v, i) => `${(i / (hist.length - 1) * w).toFixed(1)},${(h - 2 - (v - lo) / span * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg class="spark ${hist.at(-1) >= hist[0] ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const pctTxt = x => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`;
const riskOf = s => s.sigma >= .06 ? ['High risk', 'bad'] : s.sigma >= .035 ? ['Medium risk', 'mid'] : ['Low risk', 'good'];
const BUY_STEPS = [10000, 100000, 1000000, 10000000];

// Investments: what you hold, then the whole market.
function investView() {
  const p = S.player, m = market(), port = portfolio(), held = Object.entries(port);
  const value = portfolioValue(), cost = held.reduce((s, [, h]) => s + h.cost, 0);
  const holdings = held.length ? `<div class="commits">${held.map(([sym, h]) => {
    const v = h.shares * sharePrice(sym), pl = h.cost ? v / h.cost - 1 : 0;
    return `<div class="commit"><div><b>${sym}</b> <span class="small muted">${esc(stock(sym).name)}</span>
      <div class="small muted">${h.shares.toLocaleString()} shares · worth ${money(Math.round(v))} · <span class="${pl >= 0 ? 'good' : 'bad'}">${pctTxt(pl)}</span></div>
      <div class="btns"><button class="btn sm" data-act="sellStock" data-v="${sym}|.25">Sell 25%</button><button class="btn sm" data-act="sellStock" data-v="${sym}|1">Sell all</button></div></div></div>`;
  }).join('')}</div>` : '<p class="small muted" style="margin:0">No shares yet. Pick a company below.</p>';
  const head = `<section class="card hero"><div class="row"><h2>Portfolio</h2><span class="chip ${value >= cost ? 'good' : 'bad'}">${cost ? pctTxt(value / cost - 1) : '–'}</span></div>
    <div class="kv"><div><small>Worth</small><b class="num">${money(Math.round(value))}</b></div><div><small>Paid in</small><b class="num">${money(cost)}</b></div><div><small>Bank</small><b class="num">${money(p.money)}</b></div></div>
    <p class="small muted" style="margin:0">Prices move every game week (and through the summer). Riskier companies can soar or halve; dividend payers pay out every quarter. Each trade costs 0.5%.</p>${holdings}</section>`;
  const rows = STOCKS.map(s => {
    const hist = m.hist[s.sym], price = sharePrice(s.sym), wk = hist.length > 1 ? price / hist.at(-2) - 1 : 0, [risk, rc] = riskOf(s);
    return `<div class="stock"><div class="row"><div><b>${s.sym}</b> <span class="small muted">${esc(s.name)} · ${s.sector}</span></div>${sparkline(hist)}</div>
      <div class="row small"><span><b class="num">€${price.toFixed(2)}</b> <span class="${wk >= 0 ? 'good' : 'bad'}">${pctTxt(wk)} this week</span></span><span><span class="${rc}">${risk}</span>${s.div ? ` · ${(s.div * 100).toFixed(1)}% dividend` : ''}</span></div>
      <div class="btns">${BUY_STEPS.map(a => `<button class="btn sm" data-act="buyStock" data-v="${s.sym}|${a}" ${p.money < price * (1 + TRADE_FEE) ? 'disabled' : ''}>Buy ${money(a)}</button>`).join('')}</div></div>`;
  }).join('');
  return head + `<section class="card"><h2>Market</h2><div class="stocks">${rows}</div></section>`;
}

let shopView = 'shop';
function viewShop() {
  const p = S.player;
  syncHousing();
  const seg = `<div class="seg">${[['shop', 'Kit & home'], ['lux', 'Luxury'], ['invest', 'Invest'], ['commit', 'Commitments']].map(([k, l]) => `<button class="${shopView === k ? 'on' : ''}" data-act="shopView" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (shopView === 'commit') return seg + commitmentsView();
  if (shopView === 'lux') return seg + luxuryView();
  if (shopView === 'invest') return seg + investView();
  const nat = homeNat(), away = oldLeases();
  const fin = `<section class="card"><h2>Finances</h2>
    <div class="row small"><span class="muted">Wage${p.needsContract ? ' (no club)' : ''}</span><b class="num">${money(paidWage())}/wk</b></div>
    <div class="row small"><span class="muted">Sponsors (${sponsorDeals().length} deal${sponsorDeals().length !== 1 ? 's' : ''} + image rights)</span><b class="num">${money(sponsorIncome())}/wk</b></div>
    <div class="row small"><span class="muted">Rent${away.length ? ` (incl. ${away.length} lease${away.length > 1 ? 's' : ''} abroad)` : ''}</span><b class="num bad">−${money(rentNow())}/wk</b></div>
    ${upkeepNow() ? `<div class="row small"><span class="muted">Home upkeep (${Object.keys(ownedHomes()).length} owned)</span><b class="num bad">−${money(upkeepNow())}/wk</b></div>` : ''}
    <div class="row small"><span class="muted">Equipment${kitTier() > p.equip ? ` (${EQUIP_TIERS[kitTier()].name}: you trained with it this week)` : ''}</span><b class="num bad">−${money(kitFee())}/wk</b></div>
    ${carUpkeep() ? `<div class="row small"><span class="muted">Car upkeep</span><b class="num bad">−${money(carUpkeep())}/wk</b></div>` : ''}
    ${p.agent ? `<div class="row small"><span class="muted">Agent (${Math.round(agent().cut * 100)}% of wage)</span><b class="num bad">−${money(agentCut())}/wk</b></div>` : ''}
    <div class="row"><span>Net per week</span><b class="num ${weeklyNet() >= 0 ? 'good' : 'bad'}">${money(weeklyNet())}</b></div>
    <div class="row small"><span class="muted">Bank</span><b class="num">${money(p.money)}</b></div>
    ${portfolioValue() || collection().length ? `<div class="row small"><span class="muted">Shares · collection</span><b class="num">${money(Math.round(portfolioValue()))} · ${money(collectionValue())}</b></div><div class="row"><span>Net worth</span><b class="num">${money(Math.round(netWorth()))}</b></div>` : ''}</section>`;
  const tiers = EQUIP_TIERS.map((t, i) => {
    const cost = equipCost(i), owned = i && !cost;
    return `<button class="house tier-${t.name.toLowerCase()} ${p.equip === i ? 'on' : ''}" data-act="equip" data-v="${i}" ${i && p.equip !== i && p.money < cost ? 'disabled' : ''}>
      <span><b class="tiername">${t.name}</b> · ×${t.mult} training XP${t.energy ? ` · +${t.energy} energy` : ''}<br><span class="small muted">${t.desc}</span></span><span class="num small r">${!i ? 'Free' : `${owned ? 'Owned' : money(cost)}<br><span class="muted">${money(t.fee)}/wk</span>`}</span></button>`;
  }).join('');
  const left = leaseLeft();
  const mine = ownedHomes()[nat] || 0;
  const houses = HOUSING.map((h, i) => {
    const isMine = mine === i && i > 0, cost = i ? buyCost(i) : 0;
    const rent = `<button class="btn sm" data-act="house" data-v="${i}" ${p.house === i || (p.house !== i && left) || mine ? 'disabled' : ''}>${p.house === i && !ownedHere() ? 'Renting' : `Rent ${money(houseRent(nat, i))}/wk`}</button>`;
    const buy = i ? (isMine ? '<span class="chip good">Owned</span>' : `<button class="btn sm good" data-act="buyAsk" data-v="${i}" ${i < mine || p.money < cost ? 'disabled' : ''}>${mine && i > mine ? `Trade up ${money(cost)}` : `Buy ${money(housePrice(nat, i))}`}</button>`) : '';
    return `<div class="house home-row ${p.house === i ? 'on' : ''}"><span><b>${h.name}</b>${isMine && ownedHere() ? ' <span class="small good">· your home</span>' : ''}<br><span class="small muted">${h.energy ? `+${h.energy} energy/week` : 'No energy bonus'}${i ? ` · upkeep ${money(upkeepMonth(nat, i))}/month if bought` : ' · No lease'}</span></span>
      <span class="home-acts">${isMine ? '' : rent}${buy}</span></div>`;
  }).join('');
  const ownNote = mine ? `<p class="small good" style="margin:0">You own a ${HOUSING[mine].name.toLowerCase()} here: no rent, just ${money(upkeepMonth(nat, mine))} a month upkeep. Trade up any time (your home sells for 90% towards it).</p>` : `<p class="small muted" style="margin:0">Rent on a one-year lease, or buy outright: no rent ever again in ${natName(nat)}, a small monthly upkeep, and it waits for you if you move abroad and come back.</p>`;
  const lease = left ? `<p class="small flood" style="margin:0">You are tied into your lease for ${left} more week${left !== 1 ? 's' : ''}. You can move once it ends.</p>`
    : `<p class="small muted" style="margin:0">Homes are let on a one-year lease: once you move in, you can't move again until it ends.</p>`;
  const awayNote = away.length ? `<p class="small bad" style="margin:0">Still paying for ${away.map(l => `a ${HOUSING[l.house].name.toLowerCase()} in ${natName(l.nat)}`).join(' and ')}. See Commitments.</p>` : '';
  return seg + fin + `<section class="card"><h2>Training equipment</h2><p class="small muted" style="margin:0">Your equipment decides how fast your OVR rises. Buy it once, then pay weekly to keep it running: each week costs the running fee of the best kit you trained with, even if you switch back down before the match. If you run out of money you drop back to Normal (you keep what you bought).</p><div class="inbox">${tiers}</div></section>` + `<section class="card"><h2>Housing in ${natName(nat)}</h2>${ownNote}${mine ? '' : lease}${awayNote}<div class="inbox">${houses}</div></section>`;
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
    ? `<div class="row"><span class="clubcell"><span class="lgcrest">${crest(p.wish, 'mini')}</span><b>${esc(w.name)}</b></span><span class="chip flood">Waiting</span></div><div class="small muted">They decide at the transfer window. Chance: ${wishOdds(p.wish).toLowerCase()}.</div>`
    : `<div class="row"><span class="clubcell"><span class="lgcrest">${crest(p.wish, 'mini')}</span><b>${esc(w.name)}</b></span>${p.wishResult === 'offer' ? '<span class="chip good">Offered</span>' : p.wishResult === 'no' ? '<span class="chip bad">No bid</span>' : `<span class="small muted">${seasonLabel(p.wishSeason)}</span>`}</div>`;
  const why = !cur ? 'You need an agent to do this.' : p.loan ? 'Not while you are on loan.' : newClub() ? `You only just joined ${esc(myClub().name)}: talking about a dream move in your first season would wreck your start here. Wait until next season.` : justRenewed() ? `You only just signed a new contract with ${esc(myClub().name)}. Announcing a dream move now would look terrible: wait until about week ${lockWeekLabel(p.renewedAt + NEG_LOCK_WEEKS)}.` : p.wishSeason === S.season ? 'You can name a dream club once per season.' : '';
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
    return `<button class="house" data-act="wishGo" data-v="${c.id}" ${isBanned(c.id) ? 'disabled' : ''}><span class="clubcell"><span class="lgcrest">${crest(c.id, 'mini')}</span><span><b>${esc(c.name)}</b><br><span class="small muted">Team rating ${Math.round(teamStrength(c))} · ${odds}</span></span></span></button>`;
  }).join('');
  openModal(`<h3>Announce your dream club</h3><select data-act="wishLeague" class="pick">${opts}</select><div class="inbox" style="max-height:50vh;overflow:auto">${list}</div><button class="btn block" data-act="close">Cancel</button>`);
}

// ---------- club ----------
// The last five league results as dots, oldest first, the latest one ringed (like Google's table).
// Only games already played are shown.
const formDots = (f = '') => `<span class="fmrow">${[...f].map((x, i, a) => `<i class="fm ${x === 'W' ? 'w' : x === 'L' ? 'l' : 'd'}${i === a.length - 1 ? ' last' : ''}"></i>`).join('')}</span>`;
// A small flag for a nationality, or its code when the game has no flag for it.
const natFlag = nat => typeof FLAG_DATA !== 'undefined' && FLAG_DATA[nat] ? `<img class="natflag" src="${FLAG_DATA[nat]}" alt="${esc(nat)}" title="${esc(natName(nat))}">` : `<span class="muted">${esc(nat)}</span>`;

function viewClub() {
  const c = myClub(), free = !!S.player.needsContract;
  // Without a club there is no manager, squad or results of your own: just the tables and the cups.
  if (free && !['table', 'cups'].includes(clubView)) clubView = 'table';
  const lid = viewLeague || c.league;
  const head = free ? `<section class="card"><div class="row"><div><b style="font:700 22px var(--display)">Free agent</b><div class="small muted">You have no club. Follow the leagues and cups while you wait for a call.</div></div></div></section>` : `<section class="card"><div class="row"><div><b style="font:700 22px var(--display)">${c.name}</b><div class="small muted">Manager: ${c.mgr} (${NATIONS[c.mgrNat] || c.mgrNat}) · Rating ${mgrOf(c).r} · ${jobLabel(mgrOf(c).job)}</div></div>${crest(c.id)}</div>
    ${parentOf(c) ? `<div class="small flood">${esc(parentOf(c).name)}'s second team: play well and get called up to their first team (team rating ${Math.round(teamStrength(parentOf(c)))}).</div>` : ''}
    <div class="small muted">${league(c.league).name} (${TIER_LABEL[clubTier(c)].toLowerCase()}) · Team rating ${Math.round(teamStrength(c))} · Your role: <b style="color:var(--chalk)">${squadStatus()}</b>${isCaptain() ? ' · <b class="good">Captain</b>' : ''}</div>${isCaptain() ? '<button class="btn sm block" data-act="capQuitAsk">Step down as captain</button>' : ''}</section>`;
  const seg = `<div class="seg">${(free ? [['table', 'Table'], ['cups', 'Cups']] : [['table', 'Table'], ['results', 'Results'], ['squad', 'Squad'], ['scorers', 'Goals'], ['assists', 'Assists'], ['clean', 'CS'], ['cups', 'Cups']]).map(([k, l]) => `<button class="${clubView === k ? 'on' : ''}" data-act="clubView" data-v="${k}"${k === 'clean' ? ' title="Clean sheets"' : ''}>${l}</button>`).join('')}</div>`;
  const countries = [...new Set(S.leagues.map(l => l.country))];
  const lgSel = ['table', 'scorers', 'assists', 'clean'].includes(clubView) ?`<select class="btn block" data-act="league" aria-label="League">${countries.map(ct => `<optgroup label="${ct}">${S.leagues.filter(l => l.country === ct).sort((a, b) => a.tier - b.tier).map(l => `<option value="${l.id}" ${l.id === lid ? 'selected' : ''}>${l.name}</option>`).join('')}</optgroup>`).join('')}</select>` : '';
  let body = '';
  // Everyone fighting for your place, shown under the squad list.
  const peckingCard = () => {
    const order = peckingOrder(), slots = formationSlots(myClub(), POS_GROUP[S.player.pos]);
    return `<section class="card"><h2>Pecking order</h2><p class="small muted" style="margin:0">Everyone fighting for the ${slots} ${{ GK: 'goalkeeper', DEF: 'defence', MID: 'midfield', FWD: 'attack' }[POS_GROUP[S.player.pos]]} spot${slots > 1 ? 's' : ''} in ${esc(myClub().mgr)}'s <b>${formationOf(myClub())}</b>. The manager picks on ability, affection and form; players whose position the shape has no place for are picked less. Above the line start.</p>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th>Pos</th><th class="r">OVR</th><th class="r">Affection</th></tr></thead><tbody>
      ${order.map((r, i) => `<tr class="${r.me ? 'me' : ''}" ${i === slots - 1 ? 'style="border-bottom:2px solid var(--flood)"' : ''}><td>${i + 1}</td><td class="clubname">${esc(r.n)}${r.inj ? ` <span class="bad small">injured ${r.inj}w</span>` : ''}</td><td><span class="pos-tag ${fitsFormation(r.pos, myClub()) ? '' : 'off'}" title="${fitsFormation(r.pos, myClub()) ? '' : 'No natural place in this formation'}">${r.pos}</span></td><td class="r">${r.r}</td><td class="r">${Math.round(r.a)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  };
  if (clubView === 'table') {
    const tbl = leagueTable(lid), n = tbl.length, tier = league(lid).tier;
    body = `<section class="card"><div class="tablewrap"><table class="lgt"><thead><tr><th>#</th><th>Club</th><th class="r">P</th><th class="r wdl">W</th><th class="r wdl">D</th><th class="r wdl">L</th><th class="r">GD</th><th class="r pts">Pts</th><th class="l5">Last 5</th></tr></thead><tbody>
      ${tbl.map((r, i) => `<tr class="${r.id === S.player.club && !free ? 'me' : ''} ${i < (tier === 1 ? 4 : PROMOTE) ? 'zone-cl' : i >= n - PROMOTE && tier < 3 ? 'zone-rel' : ''}"><td>${i + 1}</td><td class="clubname"><span class="clubcell">${crest(r.id, "mini")}${club(r.id).name}</span></td><td class="r">${r.p}</td><td class="r wdl">${r.w}</td><td class="r wdl">${r.d}</td><td class="r wdl">${r.l}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r pts"><b>${r.pts}</b></td><td class="l5">${formDots(r.f)}</td></tr>`).join('')}
      </tbody></table></div></section>` + leagueAwardsCard(lid);
  } else if (clubView === 'squad') {
    const p = S.player;
    squadNumbers(c);
    const rows = c.players.map(pl => ({ ...pl, age: ageOf(pl.by) }));
    rows.push({ n: p.name, pos: p.pos, age: ageOf(p.by), nat: p.nat, r: calcOVR(), no: p.shirt && p.shirt.club === c.id && !p.shirt.repick ? p.shirt.no : null, me: true });
    rows.sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.r - a.r);
    body = squadMovesCard() + shirtAskCard(false) + `<section class="card"><div class="tablewrap"><table><thead><tr><th class="r">#</th><th>Pos</th><th>Player</th><th>Nat</th><th class="r">Age</th><th class="r">OVR</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td class="r num">${r.no || '–'}</td><td><span class="pos-tag">${r.pos}</span></td><td class="clubname">${esc(r.n)}</td><td class="natcell">${natFlag(r.nat)}</td><td class="r">${r.age}</td><td class="r"><b>${r.r}</b></td></tr>`).join('')}
      </tbody></table></div></section>` + peckingCard();
  } else if (clubView === 'results') {
    body = `<div class="lgcrest">${resultsView()}</div>`;
  } else if (clubView === 'cups') {
    body = `<div class="lgcrest">${cupsView()}</div>`;
  } else {
    if (!['scorers', 'assists', 'clean'].includes(clubView)) clubView = 'scorers'; // an old view (the Rivals tab) falls back here
    const [list, word] = clubView === 'assists' ? [topAssists(lid, 15), 'assists'] : clubView === 'clean' ? [topCleanSheets(lid, Infinity), 'clean sheets'] : [topScorers(lid, 15), 'goals'];
    body = `<div class="lgcrest"><section class="card">${clubView === 'clean' ? '<h2>Clean sheets</h2>' : ''}<div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th class="clubcrest">Club</th><th class="r">${word === 'clean sheets' ? 'CS' : word[0].toUpperCase() + word.slice(1)}</th></tr></thead><tbody>
      ${list.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td class="clubname">${esc(r.n)}</td><td class="clubcrest" title="${esc(club(r.club).name)}">${crest(r.club, 'mini')}</td><td class="r"><b>${r.g}</b></td></tr>`).join('') || `<tr><td colspan="4" class="muted">No ${word} yet this season.</td></tr>`}
      </tbody></table></div></section></div>`;
  }
  return head + seg + lgSel + body;
}


// ---------- nation ----------
// Your national team, laid out like the Club tab: the coach and where you stand, then the squad (with
// its changes since the last one), results, your rivals for a place, tournaments and past coaches.
let natView = 'squad';
const natOpen = { v: true };
function natStatus() {
  const p = S.player, floor = callUpFloor(p.nat), ahead = natRivals().length;
  if (p.intlRetired) return ['muted', 'Retired from international football'];
  if (!holdsTeamNat()) return ['bad', `No longer a ${natName(p.nat)} citizen`];
  if ((p.natSnub || 0) > absWeek()) return ['bad', `Out of favour for ${p.natSnub - absWeek()} more weeks`];
  if (calcOVR() < floor) return ['muted', `Not picked yet: you need about ${floor} OVR`];
  if (ahead >= 2) return ['muted', `Not picked: ${ahead} ${p.pos}s ahead of you`];
  const av = p.intlAvail || 'all';
  return av === 'all' ? ['good', 'In the squad'] : av === 'friendly' ? ['good', 'In the squad (friendlies only)'] : ['bad', 'Picked, but you made yourself unavailable'];
}
// The next international window, or the next finals your country can play in.
function natNext() {
  const w = Object.keys(INTL_WINDOWS).map(Number).find(x => S.phase === 'season' && x > S.week);
  const wk = w && intlKind(w), cmp = wk === 'qualifier' && natCompOf(S.player.nat);
  const window = w ? `${INTL_MONTH[w]} window in ${w - S.week} week${w - S.week > 1 ? 's' : ''} (${cmp ? (cmp.ev ? 'qualifiers' : 'Nations League') : 'friendlies'})` : null;
  const from = baseYear() + S.season + 1;
  const ev = NAT_EVENTS.filter(e => natEventFor(e, S.player.nat)).map(e => ({ e, y: nextEventYear(e, from) })).sort((a, b) => a.y - b.y)[0];
  return [window, ev ? `${ev.e.name} ${ev.y}${ev.y === from ? ' (next summer)' : ''}` : null].filter(Boolean).join(' · ');
}
function natMovesCard() {
  const p = S.player, log = S.natMoves && S.natMoves.nat === p.nat ? S.natMoves.list : [];
  if (!log.length) return '';
  const row = (x, side) => {
    const how = side === 'in' ? 'Called up' : x.why === 'retired' ? 'Retired' : x.me ? 'Left out' : 'Dropped';
    const cl = x.club && S.clubs[x.club];
    return `<div class="sqmove${x.me ? ' me' : ''}"><span class="pos-chip">${x.pos}</span><div style="min-width:0"><div class="sqname">${esc(x.me ? p.name : x.n)} <span class="muted small">${x.age} · ${x.r}</span></div><div class="small"><span class="muted">${how}</span>${cl ? ` · ${esc(cl.name)}` : ''}</div></div>${cl ? crest(x.club, 'mini') : ''}${x.me ? '<span class="chip good">You</span>' : ''}</div>`;
  };
  const block = m => `<div class="small" style="margin-top:6px"><b>${esc(m.when)}</b> <span class="muted">${m.out.length} out · ${m.in.length} in</span></div>
    ${m.out.map(x => row(x, 'out')).join('')}${m.in.map(x => row(x, 'in')).join('')}`;
  return `<section class="card"><details class="mdrop" style="padding:0" ${natOpen.v ? 'open' : ''} ontoggle="natOpen.v = this.open"><summary><h2>Squad changes</h2><span class="small muted">${log[0].out.length} out · ${log[0].in.length} in</span></summary><div class="mbody">
    ${log.slice(0, 3).map(block).join('')}</div></details></section>`;
}
function natResultsView() {
  const p = S.player, me = 'N:' + p.nat, list = (S.natGames || []).filter(g => g.nat === p.nat).slice().reverse();
  if (!list.length) return `<section class="card"><p class="small muted" style="margin:0">${esc(natName(p.nat))} haven't played since this was added. Their next games: ${esc(natNext() || 'not set')}.</p></section>`;
  const rows = list.map(r => {
    const mine = r.h === me, gf = mine ? r.gh : r.ga, ga = mine ? r.ga : r.gh;
    const res = gf > ga || (gf === ga && r.winner === me) ? ['W', 'good'] : gf < ga || (r.winner && r.winner !== me) ? ['L', 'bad'] : ['D', 'draw'];
    const meta = `<span class="rmeta"><span class="small muted">${seasonLabel(r.season)}</span><span class="rcomp ${r.summer ? 'cup' : 'league'}">${esc(r.summer ? r.comp.replace(/ \d{4}$/, '') : r.comp)}</span><span class="small muted">${esc((r.stage || '').replace(/^(\w{3})\w* window$/, '$1').replace('Group matchday', 'Group MD'))}</span></span>
        <span class="rline">${tieRow(r.h, r.a, { gh: r.gh, ga: r.ga, pens: r.pens, pensScore: r.pensScore, winner: r.winner || (r.gh > r.ga ? r.h : r.ga > r.gh ? r.a : null) })}</span>`;
    // Games you played open like the club's results: the goals and your numbers.
    if (r.mins) {
      const goals = r.scorers && (r.scorers.length || (r.ev || []).length) ? `<div class="scorers">${goalTimeline(r.scorers, r.ev)}</div>` : r.scorers ? '<p class="small muted" style="margin:0">No goals.</p>' : '';
      return `<details class="result"><summary>${meta}<span class="rright">${resStats(r)}<span class="rbadge ${res[1]}">${res[0]}</span></span></summary>
        <div class="rbody">${goals}<div class="small muted">You: ${r.mins}'${r.start != null ? ` · ${r.start ? 'Started' : 'Sub'}` : ''} · ${r.goals || 0} G · ${r.assists || 0} A${r.rating ? ` · ${rateBox(r.rating, 1)}` : ''}</div></div></details>`;
    }
    return `<div class="result"><div class="natres">${meta}<span class="rright"><span class="small muted">–</span><span class="rbadge ${res[1]}">${res[0]}</span></span></div></div>`;
  }).join('');
  return `<section class="card"><h2>Results</h2><div class="results">${rows}</div></section>`;
}
// Asking a team-mate for his number: at the club (three asks there) or with your country (three in
// your international career). Numbers you were refused and are waiting on are listed.
function shirtAskCard(nation) {
  const p = S.player;
  let can, left, wait, where;
  if (nation) {
    if (!natInSquad() || !natNos().mine) return '';
    can = canAskNatShirt(); left = natAsksLeft(); wait = natNos().want; where = 'in your international career';
  } else {
    if (!p.shirt || p.shirt.club !== p.club || p.shirt.repick || p.loan) return '';
    can = canAskShirt(); left = shirtAsksLeft(); wait = (p.shirtWant || []).filter(w => w.club === p.club); where = 'at this club';
  }
  const mine = nation ? natNos().mine : p.shirt.no;
  return `<section class="card"><div class="row"><div><b>Your number: #${mine}</b><div class="small muted">${left} of 3 shirt request${left === 1 ? '' : 's'} left ${where}${wait.length ? ` · waiting on ${wait.map(w => `#${w.no} (${esc(w.name)})`).join(', ')}` : ''}</div></div>
    ${can ? `<button class="btn sm" style="white-space:nowrap" data-act="${nation ? 'natShirtAskList' : 'shirtAskList'}">Ask for a shirt</button>` : ''}</div></section>`;
}
// The Nation tab's table: this summer's finals (group tables, then the knockouts), or this season's
// qualifying group or Nations League group, your group first. Places that would go through now are marked.
function natGroupTable(title, rows, go, meId) {
  return `<div class="small" style="margin:8px 0 2px"><b>${esc(title)}</b></div><div class="tablewrap"><table class="lgt"><thead><tr><th>#</th><th>Team</th><th class="r">P</th><th class="r wdl">W</th><th class="r wdl">D</th><th class="r wdl">L</th><th class="r">GD</th><th class="r pts">Pts</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr class="${r.id === meId ? 'me' : ''} ${go(r.id, i) ? 'zone-cl' : ''}"><td>${i + 1}</td><td class="clubname"><span class="clubcell">${crest(r.id, 'mini')}${esc(teamName(r.id))}</span></td><td class="r">${r.p}</td><td class="r wdl">${r.w}</td><td class="r wdl">${r.d}</td><td class="r wdl">${r.l}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r pts"><b>${r.pts}</b></td></tr>`).join('')}
    </tbody></table></div>`;
}
const GROUP_LETTER = i => String.fromCharCode(65 + i);
function natTableView() {
  const p = S.player, nat = p.nat, me = 'N:' + nat;
  const nf = S.natFinals && S.natFinals.season === S.season && S.phase !== 'season' ? S.natFinals : null;
  const t = nf ? (nf.live ? (S.summer || []).find(x => x.key === nf.live) : nf) : null;
  let finals = '';
  if (t) {
    const order = t.groups.map((g, gi) => gi).sort((a, b) => (t.groups[b].includes(me) ? 1 : 0) - (t.groups[a].includes(me) ? 1 : 0));
    const ko = (t.ko || []).slice().reverse().map(k => `<div class="round"><div class="roundhead"><b>${esc(k.name)}</b></div>${k.res.map(r => tieRow(r.h, r.a, r)).join('')}</div>`).join('');
    finals = `<section class="card"><h2>${esc(t.name)}</h2><p class="small muted" style="margin:0">${t.groups.length} groups of 4; the top two go through to the knockouts.${t.winner ? ` Won by <b>${esc(teamName(t.winner))}</b>.` : ''}${t.groups.flat().includes(me) ? '' : ` ${esc(natName(nat))} did not qualify.`}</p>
      ${ko ? `<div class="lgcrest">${ko}</div>` : ''}
      <div class="lgcrest">${order.map(gi => natGroupTable(`Group ${GROUP_LETTER(gi)}`, t.groups[gi].map(id => ({ id, ...t.table[id] })).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf), (id, i) => i < 2, me)).join('')}</div></section>`;
  }
  const c = natCompOf(nat);
  if (!c) {
    const year = baseYear() + S.season + 1, ev = NAT_EVENTS.find(e => eventOn(e, year) && natEventFor(e, nat));
    const why = ev ? `every nation of the ${confedOf(nat)} in the game goes to the ${ev.name} ${year}, so there is no qualifying` : `there is no finals for the ${confedOf(nat) || 'nation'} next summer`;
    return finals + `<section class="card"><h2>${seasonLabel()}</h2><p class="small muted" style="margin:0">${esc(natName(nat))} play friendlies this season: ${why}.</p></section>`;
  }
  const go = new Set(compQualified(c)), mine = c.groups.findIndex(g => g.includes(nat));
  const order = c.groups.map((g, gi) => gi).sort((a, b) => (b === mine ? 1 : 0) - (a === mine ? 1 : 0));
  const done = c.played.length >= 6;
  return finals + `<section class="card"><h2>${esc(c.name)}</h2><p class="small muted" style="margin:0">${esc(c.format)} ${c.played.length ? `${c.played.length} of 6 matchdays played.` : 'Starts in September.'}${c.places ? ` Marked: ${done ? 'qualified' : 'in a qualifying place now'}.` : ''}</p>
    <div class="lgcrest">${order.map(gi => natGroupTable(c.league ? 'Table' : `Group ${GROUP_LETTER(gi)}`, compGroupTable(c, gi).map(n => ({ id: 'N:' + n, ...c.table[n] })), id => go.has(id.slice(2)), me)).join('')}</div></section>`;
}
function viewNation() {
  const p = S.player, nat = p.nat, id = 'N:' + nat, [cls, status] = natStatus(), since = natCoachSince(nat);
  const fav = Math.round(natFavor()), favCls = fav >= 60 ? 'good' : fav >= 40 ? '' : 'bad';
  const head = `<section class="card"><div class="row"><div><b style="font:700 22px var(--display)">${esc(natName(nat))}</b><div class="small muted">Coach: ${esc(natCoach(nat))} (rating ${natCoachR(nat)}${since != null ? `, since ${seasonLabel(since)}` : ''}) · ${confedOf(nat) || 'Independent'} · Team rating ${NATION_STR[nat] || 60}</div></div>${crest(id)}</div>
    <div class="small muted">Your status: <b class="${cls}" style="${cls === 'muted' ? 'color:var(--chalk)' : ''}">${status}</b>${natCaptain() ? ' · <b class="good">Captain</b>' : ''} · ${p.caps || 0} cap${p.caps === 1 ? '' : 's'}, ${p.intlGoals || 0} goal${p.intlGoals === 1 ? '' : 's'}</div>
    ${holdsTeamNat() && !p.intlRetired ? `<div class="energy" style="margin-top:6px"><span>Coach</span><div class="bar"><i class="${favCls}" style="width:${fav}%"></i></div><b class="num">${fav}</b></div>` : ''}
    <div class="small muted">Next: ${esc(natNext() || '–')}</div>${natCaptain() ? '<button class="btn sm block" data-act="natCapQuitAsk">Step down as captain</button>' : ''}${canRetireIntl() ? '<button class="btn sm block" data-act="intlRetireAsk">Retire from international football</button>' : ''}</section>`;
  const seg = `<div class="seg">${[['squad', 'Squad'], ['table', 'Table'], ['results', 'Results'], ['rivals', 'Rivals'], ['tours', 'Cups'], ['coaches', 'Coaches']].map(([k, l]) => `<button class="${natView === k ? 'on' : ''}" data-act="natView" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (natView === 'squad') {
    const snap = S.natSnap && S.natSnap.nat === nat && S.natSnap.list.some(x => x.no) ? S.natSnap : null;
    const rows = (snap ? snap.list.map(x => x.me ? { ...x, r: calcOVR() } : x) : natSquad(nat)).slice().sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || (a.no || 99) - (b.no || 99));
    body = natMovesCard() + shirtAskCard(true) + `<div class="lgcrest"><section class="card"><p class="small muted" style="margin:0 0 6px">${snap ? `The squad ${esc(natCoach(nat))} named for ${esc(snap.when || 'the last games')}` : `The squad ${esc(natCoach(nat))} would pick today`}: the best two in each position, three goalkeepers. Players from leagues outside the game show no club.</p><div class="tablewrap"><table><thead><tr><th class="r">#</th><th>Pos</th><th>Player</th><th class="clubcrest">Club</th><th class="r">Age</th><th class="r">OVR</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td class="r num">${r.no || '–'}</td><td><span class="pos-tag">${r.pos}</span></td><td class="clubname">${esc(r.me ? p.name : r.n)}</td><td class="clubcrest">${r.club && S.clubs[r.club] ? `<span title="${esc(club(r.club).name)}">${crest(r.club, 'mini')}</span>` : '<span class="muted">–</span>'}</td><td class="r">${ageOf(r.by)}</td><td class="r"><b>${r.r}</b></td></tr>`).join('')}
      </tbody></table></div></section></div>`;
  } else if (natView === 'table') {
    body = natTableView();
  } else if (natView === 'results') {
    body = `<div class="lgcrest">${natResultsView()}</div>`;
  } else if (natView === 'rivals') {
    const ovr = calcOVR(), floor = callUpFloor(nat), list = [];
    Object.values(S.clubs).forEach(c => c.players.forEach(pl => { if (pl.nat === nat && pl.pos === p.pos) list.push({ n: pl.n, r: pl.r, by: pl.by, club: c.id }); }));
    list.push({ n: p.name, r: ovr, by: p.by, club: p.needsContract ? null : p.club, me: true });
    list.sort((a, b) => b.r - a.r || (a.me ? -1 : 1));
    const top = list.slice(0, 15);
    if (!top.some(r => r.me)) top.push(list.find(r => r.me));
    body = `<div class="lgcrest"><section class="card"><h2>Fighting for a place</h2><p class="small muted" style="margin:0">Every ${natName(nat)} ${POS_NAMES[p.pos].toLowerCase()} at the game's clubs. The coach takes the best two who are at least ${floor} OVR; above the line go.</p>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th class="clubcrest">Club</th><th class="r">Age</th><th class="r">OVR</th></tr></thead><tbody>
      ${top.map((r, i) => `<tr class="${r.me ? 'me' : ''}" ${i === 1 ? 'style="border-bottom:2px solid var(--flood)"' : ''}><td>${list.indexOf(r) + 1}</td><td class="clubname">${esc(r.n)}${r.r < floor ? ' <span class="small muted">below the level</span>' : ''}</td><td class="clubcrest">${r.club && S.clubs[r.club] ? crest(r.club, 'mini') : '<span class="muted">–</span>'}</td><td class="r">${ageOf(r.by)}</td><td class="r"><b>${r.r}</b></td></tr>`).join('')}
      </tbody></table></div></section></div>`;
  } else if (natView === 'tours') {
    const from = baseYear() + S.season + 1;
    const next = NAT_EVENTS.filter(e => natEventFor(e, nat)).map(e => ({ e, y: nextEventYear(e, from) })).sort((a, b) => a.y - b.y);
    const past = (S.history || []).filter(h => NAT_EVENTS.some(e => e.key === h.key) && (h.nat === nat || (h.nat == null && NAT_EVENTS.some(e => e.key === h.key && natEventFor(e, nat))))).reverse();
    const reachCls = r => r === 'Winners' ? 'good' : r === 'Did not qualify' || r === 'Group stage' ? 'bad' : '';
    body = `<section class="card"><h2>Coming up</h2>${next.map(({ e, y }) => `<div class="row small" style="padding:4px 0"><span>${e.name} ${y}</span><span class="muted">${y === from ? 'Next summer' : `In ${y - from + 1} years`}</span></div>`).join('')}</section>
      <section class="card"><h2>Past tournaments</h2>${past.length ? past.map(h => `<div class="sqmove"><div style="min-width:0;flex:1"><div class="sqname">${esc(h.name)}</div><div class="small"><span class="muted">Won by</span> ${esc(teamName(h.winner))}${h.runnerUp ? ` <span class="muted">· beat</span> ${esc(teamName(h.runnerUp))}` : ''}</div></div>${crest(h.winner, 'mini')}${h.reach ? `<span class="chip ${reachCls(h.reach)}">${natFlag(nat)} ${h.reach}</span>` : ''}</div>`).join('') : '<p class="small muted" style="margin:0">None yet in your career.</p>'}</section>`;
  } else {
    const rec = (S.natCoaches || {})[nat], past = rec ? rec.past.slice().reverse() : [];
    const span = (f, t) => `${f != null ? seasonLabel(f) : 'Before you'} – ${t != null ? seasonLabel(t) : 'now'}`;
    body = `<section class="card"><h2>Coaches</h2>
      <div class="sqmove me"><div style="min-width:0;flex:1"><div class="sqname">${esc(natCoach(nat))}</div><div class="small muted">${span(since, null)} · Rating ${natCoachR(nat)}</div></div><span class="chip good">Now</span></div>
      ${past.map(c => `<div class="sqmove"><div style="min-width:0;flex:1"><div class="sqname">${esc(c.name)}</div><div class="small muted">${span(c.from, c.to)} · ${esc(c.why)}</div></div>${c.r ? `<span class="chip">${c.r}</span>` : ''}</div>`).join('')}
      <p class="small muted" style="margin:6px 0 0">A poor finals or a failure to qualify can cost the coach his job; the bigger the nation, the less patience. A new coach starts with an open mind about you.</p></section>`;
  }
  return head + seg + body;
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
const BENCH = '<svg class="ico bench" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Bench"><rect x="4" y="4" width="16" height="5" rx="1"/><path d="M7 9v4M17 9v4M2.5 13h19M5 13v7M19 13v7"/></svg>';
// Your line in a result, left of W/D/L: "2× ball" and "1× boot" boxes, then your rating. Didn't
// play: a bench box and a grey N/A. Every box is the same size.
function resStats(r) {
  if (!r.mins) return `<span class="rstat">${BENCH}</span><span class="rate-box none rr">N/A</span>`;
  // Two or three goals (or assists): that many icons, each overlapping the next. Four or more: "4×" and one.
  const box = (n, ic) => !n ? '' : n > 3 ? `<span class="rstat"><b>${n}×</b>${ic}</span>`
    : `<span class="rstat"><span class="stack">${Array.from({ length: n }, (_, i) => `<i style="z-index:${n - i}">${ic}</i>`).join('')}</span></span>`;
  return box(r.goals, BALL) + box(r.assists, BOOT) + (r.rating ? rateBox(r.rating, 1).replace('rate-box', 'rate-box rr') : '<span class="rate-box none rr">N/A</span>');
}
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
    const me = r.mins ? `${r.mins}'${myCards(r)} · ${r.start ? 'Started' : 'Sub'} · ${r.goals} G · ${r.assists} A · ${rateBox(r.rating || null, 1)}` : r.rested ? 'Rested' : 'Did not play';
    const goals = r.scorers && (r.scorers.length || (r.ev || []).length) ? `<div class="scorers">${goalTimeline(r.scorers, r.ev)}</div>` : r.scorers ? '<p class="small muted" style="margin:0">No goals.</p>' : '';
    return `<details class="result ${r.comp === 'Champions League' ? 'ucl' : ''}"><summary>
        <span class="rmeta"><span class="small muted">Wk ${Math.min(r.week, SEASON_WEEKS)}</span><span class="rcomp ${r.kind || 'league'}">${esc(r.comp || 'League')}</span>${r.derby ? `<span class="rderby">${esc(r.derby)}</span>` : ''}</span>
        <span class="rline">${tieRow(h, a, { gh, ga, pens: r.pens, pensScore: r.pensScore, winner: r.winner || (gh > ga ? h : ga > gh ? a : null) })}</span>
        <span class="rright">${resStats(r)}<span class="rbadge ${res[1]}">${res[0]}</span></span></summary>
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
  return `<div class="tie2 ${mine ? 'me' : ''}">${side(h)}<span class="tscore num">${r ? `${r.gh}–${r.ga}` : 'v'}${r && r.pens ? `<small>${r.pensScore ? pensText(r) + ' ' : ''}pens</small>` : ''}</span>${side(a, true)}</div>`;
}
const roundBlock = (name, meta, ties) => `<div class="round"><div class="roundhead"><b>${name}</b>${meta ? `<span class="muted">${meta}</span>` : ''}</div>${ties}</div>`;

// Where your team stands in a competition, in one line.
function cupStatus(t, inIt, out) {
  if (t.winner) return `<div class="cupstatus ${myTeams().includes(t.winner) ? 'good' : ''}">${crest(t.winner, 'mini')}<span>Winner: <b>${esc(teamName(t.winner))}</b></span></div>`;
  if (!inIt) return S.player.needsContract ? '' : '<div class="cupstatus muted">You are not in this competition.</div>';
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
  // A free agent has no team in any cup.
  const id = S.player.needsContract ? null : S.player.club;
  // Early rounds of a big cup have dozens of ties: show yours, plus later rounds in full
  // (without a club, the first eight of each round).
  const show = (list, getHA) => !id ? list.slice(0, 8) : list.filter(x => list.length <= 8 || getHA(x).includes(id));
  const next = t.winner ? '' : (() => {
    const list = show(t.ties, x => x);
    const meta = `week ${t.weeks[t.r]}${t.r === 0 && t.byes.length ? ` · ${t.byes.length} byes` : ''}${list.length < t.ties.length ? ` · ${t.ties.length} ties` : ''}`;
    return roundBlock(`Next: ${cupStage(t)}`, meta, list.map(([h, a]) => tieRow(h, a, null)).join('') || `<p class="small muted" style="margin:0">${id ? 'Your club is not in this round.' : 'No ties drawn yet.'}</p>`);
  })();
  const rounds = t.rounds.slice().reverse().map(rd => {
    const list = show(rd.res, r => [r.h, r.a]);
    return list.length ? roundBlock(rd.name, list.length < rd.res.length ? `${rd.res.length} ties` : '', list.map(r => tieRow(r.h, r.a, r)).join('')) : '';
  }).join('');
  const inIt = !!id && t.teams.includes(id);
  const out = !t.winner && !t.ties.some(x => x.includes(id)) && !(t.r === 0 && t.byes.includes(id));
  return `<section class="card"><div class="row"><h2>${esc(t.name)}</h2></div>${cupStatus(t, inIt, out)}${next}${rounds}</section>`;
}

function cupsView() {
  const myNat = league(myClub().league).nat;
  // Other countries' domestic cups would crowd the list out.
  const foreignCups = new Set(Object.entries(DOMESTIC).filter(([n]) => n !== myNat).flatMap(([, defs]) => defs.map(d => d.key)));
  const comps = [
    ...Object.values(S.cups || {}).filter(t => t.nat === myNat).map(t => ({ key: 'd:' + t.key, name: t.name, html: () => domesticCupHtml(t), mine: t.teams.some(id => myTeams().includes(id)) })),
    ...Object.values(S.euro || {}).map(t => ({ key: 'e:' + t.key, name: t.name, html: () => tournamentHtml(t), mine: !S.player.needsContract && t === euroComp() })),
    ...(S.summer || []).map(t => ({ key: 's:' + t.key, name: t.name, html: () => tournamentHtml(t), mine: t.groups.flat().some(id => myTeams().includes(id)) })),
  ];
  const past = (S.history || []).slice().reverse().filter(h => !foreignCups.has(h.key)).slice(0, 20);
  comps.push({ key: 'winners', name: 'Past winners', html: () => past.length ? `<section class="card"><h2>Recent winners</h2><div class="tablewrap"><table><tbody>${past.map(h => `<tr><td class="muted">${seasonLabel(h.season)}</td><td>${esc(h.name)}</td><td class="r"><span class="clubcell" style="justify-content:flex-end">${crest(h.winner, 'mini')}<b>${esc(teamName(h.winner))}</b></span></td></tr>`).join('')}</tbody></table></div></section>` : '<section class="card"><p class="small muted" style="margin:0">No winners yet: the first season is still going.</p></section>' });
  // Default to a competition you are in.
  const cur = comps.find(c => c.key === cupTab) || comps.find(c => c.mine) || comps[0];
  const chips = `<div class="cuptabs">${comps.map(c => `<button class="${c === cur ? 'on' : ''} ${c.mine ? 'mine' : ''}" data-act="cupTab" data-v="${c.key}">${esc(c.name.replace(/ \d{4}$/, ''))}</button>`).join('')}</div>`;
  const year = baseYear() + S.season + 1;
  const nextSummer = SUMMER_EVENTS.map(ev => { const y = nextEventYear(ev, year); return [y, `${ev.name} ${y}`]; }).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, 3).join(' · ');
  return chips + cur.html() + `<p class="small muted" style="margin:0 4px">Cup games are midweek. European places come from the league table. Next summer tournaments: ${nextSummer}.</p>`;
}

// ---------- career ----------
function careerTables(p = S.player) {
  return careerHistory(p) + honoursCardTabs(p);
}

// Crest for a career row. A past career may be opened with another save loaded, or none at all,
// so a club missing from the save on screen is looked up by name in the club database instead.
function rowCrest(r) {
  const name = r.club.replace(' (loan)', '');
  if (S && S.clubs) {
    const c = (r.clubId && S.clubs[r.clubId] && S.clubs[r.clubId].name === name) ? S.clubs[r.clubId] : clubByName(name);
    if (c) return crest(c.id, 'mini');
  }
  return dbCrest(name);
}

// The same crest, built straight from the club database: logo if there is one, short name if not.
const dbClubCache = {};
function dbCrest(name) {
  if (!(name in dbClubCache)) {
    let found = null;
    for (const l of DB.leagues) {
      const row = l.clubs.find(c => c[0] === name);
      // Top-flight rows from database.js carry the short code second; the other leagues put it last.
      if (row) { found = { id: `${l.id}-db`, name, short: l.tier === 1 && row.length === 5 && typeof row[4] === 'string' ? row[1] : row[5] || shortName(name) }; break; }
    }
    dbClubCache[name] = found;
  }
  const c = dbClubCache[name];
  if (!c) return `<div class="crest mini"><span>${esc(name.slice(0, 3).toUpperCase())}</span></div>`;
  const key = `db:${name}`, st = logoState[key] ?? 0;
  const img = st >= 0 ? `<img src="${logoUrl(c, LOGO_EXTS[st])}" alt=""${inkCrest(c.name)} data-club="${esc(key)}" data-ext="${st}">` : '';
  return `<div class="crest ${st >= 0 ? 'haslogo' : ''} mini">${img}<span>${esc(c.short.slice(0, 4))}</span></div>`;
}

// SofaScore-style history: one block per season, clubs side by side, tap for every competition.
// Each competition shows its logo (COMP_LOGOS, packed in js/logos-tur.js from the Comp_logos
// folder). Without one it gets a small badge instead: a short code on a colour by kind (league
// green, cup purple, European blue, national team red).
// The two MLS conferences share the league's logo.
const COMP_LOGO_ALIAS = { 'MLS Eastern Conference': 'MLS', 'MLS Western Conference': 'MLS' };
const compLogo = name => typeof COMP_LOGOS !== 'undefined' ? COMP_LOGOS[COMP_LOGO_ALIAS[name] || name] : null;
const COMP_KIND_COLOR = { league: '#2f9e62', cup: '#7b4bc4', euro: '#2f6fd1', nat: '#c8323c' };
const COMP_CODES = { 'Champions League': 'UCL', 'Europa League': 'UEL', 'Conference League': 'UECL', 'Club World Cup': 'CWC', 'World Cup': 'WC', 'European Championship': 'EURO', 'Copa América': 'CA', 'Premier League': 'PL', 'La Liga': 'LL', 'Serie A': 'SA', 'Bundesliga': 'BL', 'Ligue 1': 'L1' };
function compCode(name) {
  if (COMP_CODES[name]) return COMP_CODES[name];
  if (/qualifiers/.test(name)) return 'INT';
  const words = name.replace(/\(.*\)/, '').split(/[\s-]+/).filter(w => /^[A-Za-zÀ-ÿ0-9]/.test(w) && !['de', 'da', 'del', 'of', 'the'].includes(w.toLowerCase()));
  return words.length > 1 ? words.slice(0, 3).map(w => w[0]).join('').toUpperCase() : (words[0] || name).slice(0, 3).toUpperCase();
}
const compBadge = (name, kind) => compLogo(name)
  ? `<img class="comp-logo" src="${compLogo(name)}" alt="" title="${esc(name)}">`
  : `<span class="comp-badge" style="--cb:${COMP_KIND_COLOR[kind] || '#556'}" title="${esc(name)}">${esc(compCode(name))}</span>`;

function careerHistory(p = S.player) {
  const rows = p.career.slice();
  if (p === S?.player && S.phase === 'season' && p.st && p.st.apps + p.st.cup.apps > 0) rows.push({ ...careerRow(p.st, myClub()), live: true });
  if (!rows.length) return '<section class="card"><h2>Career history</h2><span class="small muted">Your first season is under way.</span></section>';
  const bySeason = {};
  rows.forEach(r => (bySeason[r.season] = bySeason[r.season] || []).push(r));
  const line = (n, c) => `<tr><td><span class="comp-name">${compBadge(n, c.kind)}${esc(n)}</span></td><td class="r">${c.mins != null ? c.mins : '–'}</td><td class="r">${c.apps}</td><td class="r">${c.goals}</td><td class="r">${c.assists}</td><td class="r">${rateBox(c.apps ? c.rsum / c.apps : null)}</td></tr>`;
  const compTable = list => `<div class="tablewrap"><table class="comps"><thead><tr><th><span class="comp-head">Competition<span class="comp-badges">${list.map(([n, c]) => compBadge(n, c.kind)).join('')}</span></span></th><th class="r" title="Minutes played">MP</th><th class="r">App</th><th class="r">G</th><th class="r">A</th><th class="r">Avg</th></tr></thead><tbody>${list.map(([n, c]) => line(n, c)).join('')}</tbody></table></div>`;
  const ORDER = { league: 0, cup: 1, euro: 2 };
  const seasons = Object.keys(bySeason).map(Number).sort((a, b) => b - a).map(s => {
    const spells = bySeason[s];
    const cards = spells.map(r => `<div class="spell"><div class="clubcell">${rowCrest(r)}<div style="min-width:0"><div class="clubline"><b class="club">${esc(r.club)}</b>${r.no ? shirtTag(r.no) : ""}${r.cap ? '<span class="captag" title="Captain">C</span>' : ''}</div><div class="small muted">${esc(r.league)}${(r.mgrs || []).length ? ` · <span title="Manager">${r.mgrs.map(esc).join(' → ')}</span>` : ''}</div>${r.pos ? `<div class="posline"><span class="pos-main" title="Main position">${r.pos}</span>${(r.alts || []).length ? `<span class="pos-also">also</span>${r.alts.map(x => `<span class="pos-alt" title="Secondary position">${x}</span>`).join('')}` : ''}</div>` : ''}</div></div>
      <div class="spellstats"><span><b>${r.apps}</b> apps</span><span><b>${r.goals}</b> G</span><span><b>${r.assists}</b> A</span>${gkSpans(p.pos, r.saves, r.cleanAll)}<span>${rateBox(r.apps ? r.avg : null)}</span></div></div>`).join('');
    const clubParts = spells.map(r => {
      const list = Object.entries(r.comps || {}).filter(([, c]) => c.kind !== 'nat').sort((a, b) => ORDER[a[1].kind] - ORDER[b[1].kind]);
      // Two clubs side by side are too narrow for a table: one line per competition instead.
      const compact = list.map(([n, c]) => `<div class="compline"><span class="comp-name">${compBadge(n, c.kind)}${esc(n)}</span><span class="small muted">${c.mins != null ? `${c.mins} min · ` : ''}${c.apps} apps · ${c.goals} G · ${c.assists} A</span></div>`).join('');
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
// Player of the Month awards saved before they kept their month: this season's are matched, in order,
// with the months you won (S.potm). Older ones show their season.
function potmMonths(awards) {
  const pm = S && S.potm, mine = pm ? pm.list.filter(m => m.me) : [];
  let k = 0;
  return awards.map(a => {
    if (a.month != null || !/Player of the Month/.test(a.name) || !pm || a.season !== pm.season || !mine[k]) return a;
    const month = MONTH_NAMES.indexOf(mine[k++].month);
    return month < 0 ? a : { ...a, month, year: baseYear() + a.season + (month < 7 ? 1 : 0) };
  });
}
function honoursCardTabs(p = S.player) {
  const natNames = new Set(Object.keys({ ...NATIONS, ...(typeof EXTRA_NATIONS !== 'undefined' ? EXTRA_NATIONS : {}) }).map(natName));
  const isNatTrophy = t => t.nat || natNames.has(t.club);
  // Finals lost and second places, then third places (World Cup and Euros only), listed after the wins like on
  // Wikipedia ("FA Cup runner-up: 2024–25"). They don't count towards the trophy numbers on the tabs.
  const ru = p.runnerUps || [], third = p.thirdPlaces || [];
  const groups = {
    ind: (S && p === S.player ? potmMonths(p.awards) : p.awards).filter(a => !(a.nat || NAT_EVENT.test(a.name))).map(a => ({ name: a.name, season: a.season, ord: a.month != null ? a.year * 12 + a.month : null })),
    club: [...p.trophies.filter(t => !isNatTrophy(t)).map(t => ({ name: t.name, sub: t.club, season: t.season })),
      ...ru.filter(t => !isNatTrophy(t)).map(t => ({ name: `${t.name} runner-up`, sub: t.club, season: t.season, ru: 1 }))],
    nat: [...p.trophies.filter(isNatTrophy).map(t => ({ name: t.name, season: t.season })), ...p.awards.filter(a => a.nat || NAT_EVENT.test(a.name)).map(a => ({ name: a.name, season: a.season })),
      ...ru.filter(isNatTrophy).map(t => ({ name: `${t.name} runner-up`, season: t.season, ru: 1 })),
      ...third.map(t => ({ name: `${t.name} third place`, season: t.season, ru: 2 }))],
  };
  // The same honour won more than once shows as one line with a count and every season.
  const grouped = list => {
    const m = new Map();
    list.forEach(h => { const k = h.name + '|' + (h.sub || ''); const g = m.get(k) || { ...h, seasons: [], ords: [] }; g.seasons.push(h.season); g.ords.push(h.ord ?? null); m.set(k, g); });
    return [...m.values()].sort((a, b) => (a.ru || 0) - (b.ru || 0) || b.seasons.length - a.seasons.length || Math.min(...a.seasons) - Math.min(...b.seasons));
  };
  const tabs = [['ind', 'Individual'], ['club', 'Club'], ['nat', 'Country']];
  const list = grouped(groups[honTab] || []);
  const empty = { ind: 'No individual awards yet.', club: 'No club trophies yet.', nat: 'Nothing won with your country yet.' }[honTab];
  // Club and Country read like a Wikipedia honours list: the team as a heading, then
  // "Competition: season, season" under it.
  // National tournaments are played in the summer after the season, so they show a single year.
  const label = honTab === 'nat' ? s => String(baseYear() + s + 1) : seasonLabel;
  // Player of the Month shows the month it was won in ("Sep 2025"); everything else its season.
  const hline = h => `<div class="honline"><b>${esc(h.name)}</b>: ${h.seasons.map((s, i) => ({ s, o: (h.ords || [])[i] })).sort((a, b) => a.s - b.s || (a.o || 0) - (b.o || 0)).map(x => x.o != null ? `${MONTHS[x.o % 12]} ${Math.floor(x.o / 12)}` : label(x.s)).join(', ')}</div>`;
  const teamBlock = (name, items, crestHtml = '', sub = '') => `<div class="honteam"><div class="clubcell">${crestHtml}<span><b class="honhead">${esc(name)}</b>${sub ? `<div class="small muted">${sub}</div>` : ''}</span></div>${items.map(hline).join('')}</div>`;
  let body;
  if (honTab === 'club') {
    const teams = new Map();
    list.forEach(h => { const t = teams.get(h.sub) || []; t.push(h); teams.set(h.sub, t); });
    // Clubs in the order you first won something there.
    body = [...teams.entries()].sort((a, b) => Math.min(...a[1].flatMap(h => h.seasons)) - Math.min(...b[1].flatMap(h => h.seasons)))
      .map(([name, items]) => { const c = S && S.clubs ? clubByName(name) : null; return teamBlock(name, items, c ? crest(c.id, 'mini') : ''); }).join('');
  } else if (honTab === 'nat') body = teamBlock(natName(p.nat), list, natFlag(p.nat), `${p.caps || 0} caps · ${p.intlGoals || 0} goals · ${intlAssists(p)} assist${intlAssists(p) === 1 ? '' : 's'}`);
  else body = `<div class="honteam">${list.map(hline).join('')}</div>`;
  return `<section class="card"><h2>Honours</h2><div class="seg">${tabs.map(([k, l]) => `<button class="${honTab === k ? 'on' : ''}" data-act="honTab" data-v="${k}">${l} (${grouped(groups[k]).reduce((n, g) => n + (g.ru ? 0 : g.seasons.length), 0)})</button>`).join('')}</div>
    ${list.length ? body : honTab === 'nat' ? teamBlock(natName(p.nat), [], natFlag(p.nat), `${p.caps || 0} caps · ${p.intlGoals || 0} goals · ${intlAssists(p)} assist${intlAssists(p) === 1 ? '' : 's'} · nothing won yet`) : `<span class="small muted">${empty}</span>`}</section>`;
}

function viewCareer() {
  const p = S.player, t = careerTotals();
  // In the summer this season is already in the career rows.
  const live = S.phase === 'season' ? p.st : { apps: 0, goals: 0, assists: 0 };
  const value = playerValue();
  const seg = `<div class="seg">${[['career', 'Career'], ['history', 'History']].map(([k, l]) => `<button class="${careerSub === k ? 'on' : ''}" data-act="careerSub" data-v="${k}">${l}</button>`).join('')}</div>`;
  // History: every season and every honour, on their own page.
  if (careerSub === 'history') return seg + careerTables();
  return seg + `<section class="card hero"><h2>Profile</h2>${p.nickname ? `<div class="nick" title="Since ${seasonLabel(p.nickname.season)}, for ${esc(p.nickname.why)}">“${esc(p.nickname.n)}”</div>${nickMeaning(p.nickname)}` : ""}
      <div class="kv"><div><small>Position</small><b>${POS_NAMES[p.pos]}</b></div>${p.shirt && p.shirt.club === p.club && !p.shirt.repick ? `<div><small>Shirt</small><b>#${p.shirt.no}</b></div>` : ''}<div><small>Nation</small><b>${natName(p.nat)}</b></div><div><small>Country</small><b class="${calledUp() ? 'good' : ''}">${p.intlRetired ? 'Retired' : calledUp() ? 'In squad' : u21Pick() ? 'U21s' : 'Not picked'}</b></div>${isCaptain() || natCaptain() ? `<div><small>Armband</small><b class="good">${[isCaptain() ? 'Club' : '', natCaptain() ? 'Country' : ''].filter(Boolean).join(' & ')} captain</b></div>` : ''}${spLabel() ? `<div><small>Set pieces</small><b>${spLabel()}</b></div>` : ''}
      <div><small>Reputation</small><b>${Math.round(p.rep)}/100</b></div><div title="Transfer value: OVR, position, age, reputation, contract, league and this season's form"><small>Value</small><b>${value ? money(value) : 'Free agent'}</b></div><div><small>Caps</small><b>${p.caps}${p.intlGoals ? ` (${p.intlGoals}g)` : ''}</b>${p.u21Caps ? `<small>U21: ${p.u21Caps}${p.u21Goals ? ` (${p.u21Goals}g)` : ''}</small>` : ''}</div></div>
      <div class="small muted">${nationNote()}</div></section>
    ${nationalityCard()}
    <section class="card"><h2>This season</h2><div class="${statGrid(p.pos)}"><div><b>${p.st.apps}</b><small>Apps</small></div><div><b>${p.st.goals}</b><small>Goals</small></div><div><b>${p.st.assists}</b><small>Assists</small></div>${gkCells(p.pos, p.st.saves, p.st.cleanAll)}<div><b>${avgRating(p.st)}</b><small>Rating</small></div></div>
      ${p.st.cup && p.st.cup.apps ? `<div class="small muted">Cups: ${p.st.cup.apps} apps · ${p.st.cup.goals} goals · ${p.st.cup.assists} assists</div>` : ''}
      ${(p.seasonSpells || []).length ? `<div class="small muted">These are your numbers at ${esc(myClub().name)}. Earlier spells this season have their own rows in your career history.</div>` : ''}
      <div class="small muted">Career: ${t.apps + live.apps} apps · ${t.goals + live.goals} goals · ${t.assists + live.assists} assists</div>${seasonExtras()}</section>
    ${milestonesCard()}
    ${S.phase !== 'retired' ? baseCardHtml() : ''}
    <section class="card"><h2>Game</h2><p class="small muted" style="margin:0">Progress saves automatically on this device. Export a backup to keep it safe or move it to another device.</p>
      <div class="btns"><button class="btn sm" data-act="exportSave">Export save</button><button class="btn sm" data-act="importAsk">Import save</button></div>
      <button class="btn block" data-act="menu">Main menu</button>
      ${S.phase !== 'retired' ? '<button class="btn danger block" data-act="retireAsk">Retire now</button>' : ''}
      <button class="btn ${S.phase === 'retired' ? 'primary' : 'danger'} block" data-act="${S.phase === 'retired' ? 'menu' : 'newAsk'}">Start a new career</button></section>`;
}

// Your set-piece duties at your club, for the profile.
function spLabel() {
  const p = S.player, sp = p.club ? mySetPieces(myClub()) : null;
  if (!sp || (!sp.pen && !sp.fk)) return '';
  return sp.pen && sp.fk ? 'Pens & FKs' : sp.pen ? 'Penalties' : 'Free kicks';
}
// Bookings, bans and set-piece goals this season, under the season's numbers.
function seasonExtras() {
  const p = S.player, st = p.st, bits = [];
  if (st.yellows || st.reds) bits.push(`${st.yellows || 0} yellow${st.yellows === 1 ? '' : 's'} · ${st.reds || 0} red${st.reds === 1 ? '' : 's'}`);
  if (st.pens || st.fks) bits.push(`${st.pens || 0} penalt${st.pens === 1 ? 'y' : 'ies'} · ${st.fks || 0} free kick${st.fks === 1 ? '' : 's'} scored`);
  const ban = p.ban > 0 ? `<div class="small bad">Suspended for the next ${p.ban} league game${p.ban > 1 ? 's' : ''}.</div>` : '';
  const yel = (st.lgYellows || 0) % YELLOW_BAN, warn = yel === YELLOW_BAN - 1 ? `<div class="small flood">One more league yellow and you miss a game.</div>` : '';
  return (bits.length ? `<div class="small muted">${bits.join(' · ')}</div>` : '') + ban + warn;
}
// Milestones, newest first, with the achievements button.
function milestonesCard() {
  const list = (S.player.milestones || []).slice().reverse();
  const got = Object.keys(achvList()).length;
  return `<section class="card"><details class="mdrop" style="padding:0"><summary><h2>Milestones</h2><span class="small muted">${list.length}</span></summary><div class="mbody">
    ${list.length ? list.map(m => `<div class="msrow"><b>${esc(m.t)}</b><span class="small muted">${seasonLabel(m.season)}${m.club ? ` · ${esc(m.club)}` : ''}</span></div>`).join('') : '<span class="small muted">Your debut is the first one.</span>'}
    </div></details><button class="btn sm block" data-act="achvShow">Achievements ${got}/${ACHIEVEMENTS.length}</button></section>`;
}
// Every achievement on this device, unlocked ones with who got there first.
function showAchievements() {
  const got = achvList(), n = Object.keys(got).length;
  openModal(`<h3>Achievements</h3><p class="small muted" style="margin:0">${n} of ${ACHIEVEMENTS.length} unlocked on this device, across all your careers.</p>
    <div class="achv">${ACHIEVEMENTS.map(([id, name, desc]) => { const g = got[id]; return `<div class="achvrow ${g ? 'on' : ''}"><span class="achvdot">${g ? '★' : '☆'}</span><div><b>${esc(name)}</b><div class="small muted">${esc(desc)}${g ? ` · ${esc(g.who)}, ${esc(g.season)}` : ''}</div></div></div>`; }).join('')}</div>
    <button class="btn block" data-act="close">Close</button>`);
}
// The best careers played on this device, ranked by Legacy score.
function hallOfFameCard(past) {
  if (!past.length) return '';
  const ranked = past.map(r => ({ r, c: cardStatus(r) })).sort((a, b) => b.c.score - a.c.score).slice(0, 10);
  const badge = s => s === 'icon' ? '<span class="chip good">Icon</span>' : s === 'hero' ? '<span class="chip flood">Hero</span>' : '';
  return `<section class="card"><h2>Hall of Fame</h2><p class="small muted" style="margin:0">Your best careers, by Legacy score.</p><div class="inbox">${ranked.map(({ r, c }, i) => {
    const t = careerTotals(r);
    return `<button class="house hof" data-act="viewPast" data-v="${r.id}"><span class="hofrank">${i + 1}</span><span style="flex:1;min-width:0"><b>${esc(r.name)}</b> · ${r.pos} · Peak ${r.peak}<br><span class="small muted">${t.goals} goals · ${r.trophies.length} trophies · Legacy ${Math.round(c.score)}</span></span>${badge(c.status)}</button>`;
  }).join('')}</div></section>`;
}
// Under the league table: this season's Players of the Month and the league's Players of the Season.
function leagueAwardsCard(lid) {
  const l = league(lid), months = S.potm && S.potm.season === S.season ? S.potm.list.filter(m => m.lid === lid) : [];
  const seasons = (S.lgAwards || {})[lid] || [];
  if (!months.length && !seasons.length) return '';
  const row = (label, w) => `<tr class="${w.me ? 'me' : ''}"><td>${label}</td><td class="clubname">${esc(w.n)} <small class="muted">${w.pos}</small></td><td class="clubcrest" title="${esc(S.clubs[w.club] ? club(w.club).name : '')}">${S.clubs[w.club] ? crest(w.club, 'mini') : ''}</td></tr>`;
  return `<section class="card"><h2>Awards</h2>
    ${months.length ? `<div class="small muted"><b>Player of the Month</b></div><div class="tablewrap"><table><tbody>${months.map(m => row(m.month, m)).join('')}</tbody></table></div>` : ''}
    ${seasons.length ? `<div class="small muted"><b>${esc(lgAwardName(l))}</b></div><div class="tablewrap"><table><tbody>${seasons.map(s => row(seasonLabel(s.season), s)).join('')}</tbody></table></div>` : ''}</section>`;
}

// Nationality: passports, residency towards a new one, your FIFA tie and international availability.
function nationalityCard() {
  const p = S.player, res = residency(), ts = tieState(), flags = list => list.map(n => `<span class="natchip">${natFlag(n)}${esc(natName(n))}</span>`).join('');
  let resLine = '';
  if (res && !passports().includes(res.nat)) {
    const need = citizenYears(res.nat), rule = HOST_RULES[res.nat];
    resLine = need === Infinity ? `${esc(natName(res.nat))}: ${esc(rule ? rule.why : 'residency does not lead to citizenship here')}`
      : `Living in ${esc(natName(res.nat))}: <b>${Math.min(res.years, need)} of ${need}</b> year${need > 1 ? 's' : ''} needed for citizenship${need > FIFA_YEARS ? ` (its own law; FIFA needs ${FIFA_YEARS})` : ''}.${passports().some(n => !keepsNat(n, res.nat)) ? ` You would stop being a citizen of ${passports().filter(n => !keepsNat(n, res.nat)).map(natName).join(' and ')}.` : ''}`;
  } else if (!res) resLine = 'Seasons in one country from age 18 count towards its citizenship.';
  const app = p.citApp ? `<div class="small flood">Your application for citizenship of ${esc(natName(p.citApp.nat))}: an answer in about ${Math.max(1, p.citApp.at - absWeek())} week${p.citApp.at - absWeek() > 1 ? 's' : ''}.</div>` : '';
  const applyBtn = p.citReady && !p.citApp && !passports().includes(p.citReady) ? `<button class="btn sm good block" data-act="citApply" data-v="${p.citReady}">Apply for citizenship of ${esc(natName(p.citReady))}</button>` : '';
  const switchBtns = canSwitch() ? switchTargets().map(n => `<button class="btn sm block" data-act="natSwitchAsk" data-v="${n}">Switch to ${esc(natName(n))}</button>`).join('') : '';
  const avail = p.intlAvail || 'all';
  const tie = p.switched != null ? `You switched in ${seasonLabel(p.switched)}: ${esc(natName(p.nat))} for good.` : !holdsTeamNat() ? `You are no longer a citizen of ${esc(natName(p.nat))}.` : `FIFA: ${esc(ts.why)}.`;
  return `<section class="card"><details class="mdrop" style="padding:0"><summary><h2>Nationality</h2><span class="small muted">${natFlag(p.nat)}</span></summary><div class="mbody">
    <div class="kv"><div><small>Born</small><b>${flags([birthNat()])}</b></div><div><small>Passports</small><b>${flags(passports())}</b></div><div><small>National team</small><b>${holdsTeamNat() ? flags([p.nat]) : '–'}</b></div></div>
    <div class="small muted">${tie}</div>
    <div class="small muted">${resLine}</div>${app}${applyBtn}${switchBtns}
    ${holdsTeamNat() && !p.intlRetired ? `<div class="small muted" style="margin-top:6px"><b>When ${esc(natName(p.nat))} call</b></div><div class="seg">${[['all', 'Available'], ['friendly', 'Friendlies only'], ['none', 'Unavailable']].map(([k, l]) => `<button class="${avail === k ? 'on' : ''}" data-act="intlAvail" data-v="${k}">${l}</button>`).join('')}</div><div class="small muted">Used whenever you are not asked: friendlies, and once a game can no longer change your tie. Every refusal costs the coach's goodwill.</div>` : ''}
    </div></details></section>`;
}

// Why you are (or aren't) in your national team.
function nationNote() {
  const p = S.player, nat = esc(natName(p.nat)), floor = callUpFloor(p.nat), ahead = natRivals();
  if (p.intlRetired) return `You retired from international football in ${seasonLabel(p.intlRetired.season ?? p.intlRetired)} after ${p.caps} caps and ${p.intlGoals || 0} goals.`;
  if (u21Pick()) return `Not in the senior squad yet, but you are in the ${nat} U21s.`;
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
  // Neutral news (an international break you weren't picked for, a new national coach).
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/></svg>',
  // Transfer talks: two hands shaking on a deal.
  talks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11l4-4 4 2 3-2 4 1 5 4"/><path d="M22 11l-3 3-6-4-3 3-2-2"/><path d="M6 13l4 4a1.5 1.5 0 0 0 2.2-2l1.3 1.3a1.5 1.5 0 0 0 2.2-2l.8.7a1.5 1.5 0 0 0 2-2.2L19 14"/><path d="M2 11l3 3"/></svg>',
};

function nextPopup() {
  if (!S || !modal.hidden || !fxLayer.hidden) return;
  const pop = POPUPS.shift();
  if (pop) showPopup(pop);
  else if (S.decision) showDecision();
}

// Goals and assists: one ball per goal, one boot per assist, and a show that grows with the haul.
// Keeper and defender icons: a glove per save, a sliding boot per tackle, a shield for a clean sheet.
const GLOVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Save"><path d="M7 21v-4.5L4.5 13a1.6 1.6 0 0 1 2.6-1.9L8 12.2V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5a1.5 1.5 0 0 1 3 0v6.5V8a1.5 1.5 0 0 1 3 0v8c0 2.5-2 5-5 5z"/><path d="M7 18h10"/></svg>';
const TACKLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Tackle"><path d="M6 15h6l1.5-2.5c2.5 0 5 1 6.5 2.7.6.7.8 1.4.8 2.3V18H6z"/><path d="M8 18v2M12 18v2M16 18v2"/><path d="M2 12h4M3 9h4M4 15h1"/></svg>';
const SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Clean sheet"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>';

function showHaul(pop) {
  const lvl = Math.min(pop.goals, 6);
  // Many saves or tackles: show up to 8 icons and the full count beside them.
  const icons = (svg, n, cls) => Array.from({ length: Math.min(n, 8) }, (_, i) => `<span class="${cls}" style="animation-delay:${.15 + i * .12}s">${svg}</span>`).join('') + (n > 8 ? `<b class="haul-more">×${n}</b>` : '');
  const defend = !pop.goals && !pop.assists;
  fxLayer.className = `haul ${lvl ? `lvl${lvl}` : defend ? 'defend' : 'assist'}`;
  fxLayer.innerHTML = `<canvas></canvas><div class="pop" role="dialog" aria-modal="true">
    ${pop.clean ? `<div class="haul-icons"><span class="hcs" style="animation-delay:.1s">${SHIELD}</span></div>` : ''}
    ${pop.goals ? `<div class="haul-icons">${icons(BALL, pop.goals, 'hb')}</div>` : ''}
    ${pop.assists ? `<div class="haul-icons small-row">${icons(BOOT, pop.assists, 'hs')}</div>` : ''}
    ${pop.saves ? `<div class="haul-icons small-row">${icons(GLOVE, pop.saves, 'hg')}</div>` : ''}
    ${pop.tackles ? `<div class="haul-icons small-row">${icons(TACKLE, pop.tackles, 'ht')}</div>` : ''}
    <h3>${esc(pop.title)}</h3><p>${esc(pop.text)}</p>
    <button class="btn primary block" data-act="popNext">Continue</button></div>`;
  fxLayer.hidden = false;
  startFx(fxLayer.querySelector('canvas'), 'haul', defend ? -1 : lvl);
}

function showPopup(pop) {
  if (pop.kind === 'haul') { showHaul(pop); return; }
  // Transfer talks get the celebration plus their own look.
  const fx = pop.kind === 'talks' ? 'good' : pop.kind;
  fxLayer.className = pop.kind === 'talks' ? 'good talks' : pop.kind;
  fxLayer.innerHTML = `<canvas></canvas><div class="pop" role="dialog" aria-modal="true">
    ${pop.kind === 'talks' ? '<div class="talks-tag">Transfer talks</div>' : ''}<div class="pop-icon">${POP_ICON[pop.kind] || POP_ICON.info}</div><h3>${esc(pop.title)}</h3><p>${esc(pop.text)}</p>
    <button class="btn ${fx === 'good' ? 'primary' : ''} block" data-act="popNext">${pop.kind === 'talks' ? "Let's do this" : 'Continue'}</button></div>`;
  fxLayer.hidden = false;
  startFx(fxLayer.querySelector('canvas'), fx);
}

let matchdayNext = false;
function closePopup() {
  cancelAnimationFrame(fxFrame);
  fxLayer.hidden = true;
  fxLayer.innerHTML = '';
  if (matchdayNext && !POPUPS.length) { matchdayNext = false; showMatchday(); return; }
  nextPopup();
}

function startFx(canvas, kind, lvl = 0) {
  const dpr = window.devicePixelRatio || 1, ctx = canvas.getContext('2d');
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const parts = [], balls = [];
  const haul = kind === 'haul';
  // Hauls: assists sparkle green, goals get gold, and every extra goal makes the show faster and bigger.
  const colors = haul && lvl < 0 ? ['#7cc7ff', '#eef2f7', '#b8e2ff'] : haul && !lvl ? ['#4cc38a', '#eef2f7', '#9be7c0'] : haul && lvl < 3 ? ['#ffb547', '#eef2f7', '#ffd38a'] : ['#ffb547', '#4cc38a', '#eef2f7', '#7cc7ff', '#ff9ec7'];
  const gap = haul ? [1100, 900, 650, 450, 350, 280, 200][Math.max(lvl, 0)] : 650, size = haul ? 30 + Math.max(lvl, 0) * 10 : 46;
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

// Pick your shirt number at a new club (or after giving yours away): the numbers that suit your
// position first, then every other free one. Taken numbers are not offered.
// Your team-mates and their numbers, with the chance each would hand his over. Each can be asked once.
function showShirtAskList(nation = false) {
  const p = S.player;
  if (nation ? !canAskNatShirt() : !canAskShirt()) return;
  let list, mine, left, where;
  if (nation) {
    const nn = natNos();
    list = S.natSnap.list.filter(x => !x.me).map(x => ({ ...x, key: natKey(x), done: nn.asked.includes(natKey(x)) }));
    mine = nn.mine; left = natAsksLeft(); where = `for ${natName(p.nat)}`;
  } else {
    const c = myClub(), asked = p.shirtAsked || [];
    squadNumbers(c);
    list = c.players.map(pl => ({ ...pl, key: pl.n, done: asked.includes(pl.n) }));
    mine = p.shirt.no; left = shirtAsksLeft(); where = `at ${c.name}`;
  }
  const rows = list.sort((a, b) => a.no - b.no).map(pl => `<button class="house" data-act="${nation ? 'natShirtAsk' : 'shirtAsk'}" data-v="${esc(pl.key)}" ${pl.done ? 'disabled' : ''}><span><b>#${pl.no} ${esc(pl.n)}</b> <span class="small muted">${pl.pos} ${pl.r}</span><br><span class="small muted">${pl.done ? 'Already asked' : `About ${Math.round(shirtAskOdds(pl) * 100)}% he says yes`}</span></span></button>`).join('');
  openModal(`<h3>Ask for a shirt</h3><p style="margin:0">You wear #${mine} ${esc(where)}. If he says yes you swap numbers${nation ? '' : ' and click on the pitch (scoring and assists up a touch)'}. If he says no, ${nation ? '' : "you'll be sulking for a while (down a touch), and "}the number is held for you if he ever ${nation ? 'drops out of the squad' : 'leaves'}. <b>${left} ask${left === 1 ? '' : 's'} left</b> ${nation ? 'in your international career' : 'at this club'}; each player once.</p>
    <div class="inbox">${rows}</div><button class="btn block" data-act="close">Back</button>`);
}
// Asking takes him a moment to answer.
function doShirtAsk(key, nation = false) {
  const r = nation ? askNatShirt(key) : askTeammateShirt(key);
  if (!r) return;
  const name = r.name;
  openModal(`<h3>Asking ${esc(name)}</h3><p class="flood" style="margin:0;text-align:center"><b>He's thinking about it…</b></p>`);
  setTimeout(() => {
    render();
    openModal(r.yes
      ? `<h3 class="good">He said yes</h3><p style="margin:0">${esc(name)} hands you the #${r.his} shirt and takes your #${r.mine}.${nation ? '' : ' You two click on the pitch now.'}</p><button class="btn primary block" data-act="close">Great</button>`
      : `<h3 class="bad">He said no</h3><p style="margin:0">${esc(name)} is keeping his #${r.his}.${nation ? '' : " You're not happy about it, and the dressing room can feel it for a while."} If he ever ${nation ? 'drops out of the squad' : 'leaves'}, you'll be asked if you want it.</p><button class="btn primary block" data-act="close">OK</button>`);
  }, 1500);
}
// Your first call-up: pick a national team number from those still free.
function showNatShirtPicker() {
  const p = S.player, { pref, rest } = natFreeShirts();
  const btn = n => `<button class="shirt-no ${pref.includes(n) ? 'pref' : ''}" data-act="natShirtPick" data-v="${n}">${n}</button>`;
  openModal(`<h3>Your ${esc(natName(p.nat))} number</h3><p style="margin:0">You're in the ${esc(natName(p.nat))} squad. Choose a number from the ones still free; it's yours for every squad you're in.</p>
    ${pref.length ? `<div class="small muted">Suits a ${POS_NAMES[p.pos].toLowerCase()}</div><div class="shirt-grid">${pref.map(btn).join('')}</div>` : ''}
    <div class="small muted">Other free numbers</div><div class="shirt-grid">${rest.map(btn).join('')}</div>`);
}

function showShirtPicker() {
  const p = S.player, c = myClub(), { pref, rest } = freeShirts(c);
  const btn = n => `<button class="shirt-no ${pref.includes(n) ? 'pref' : ''}" data-act="shirtPick" data-v="${n}">${n}</button>`;
  openModal(`<h3>Pick your shirt number</h3><p style="margin:0">${p.shirt && p.shirt.repick ? `You gave your shirt away. Choose a new number at ${esc(c.name)}.` : `Welcome to ${esc(c.name)}. Choose a number from the ones still free in the squad.`}</p>
    ${pref.length ? `<div class="small muted">Suits a ${POS_NAMES[p.pos].toLowerCase()}</div><div class="shirt-grid">${pref.map(btn).join('')}</div>` : ''}
    <div class="small muted">Other free numbers</div><div class="shirt-grid">${rest.map(btn).join('')}</div>`);
}

function showDecision() {
  const d = S.decision;
  const nat = S.player.nat;
  const opts = d.type === 'press' ? d.opts
    : d.type === 'captain'
    ? [['accept', 'Accept the armband', 'Reputation and board up, the team a little better with you, the manager fonder of you. Harder to leave'], ['decline', 'Turn it down', 'Stay free to move on. The manager is a little disappointed (−3)']]
    : d.type === 'citizen'
    ? [['apply', `Apply for citizenship of ${natName(d.nat)}`, 'The paperwork takes a few weeks'], ['later', 'Not now', 'You can apply later from the Career tab']]
    : d.type === 'switch'
    ? [['switch', `Play for ${natName(d.nat)}`, 'For the rest of your career: you can only switch once'], ['stay', `Stay with ${natName(nat)}`, 'You can still switch later while FIFA allows it']]
    : d.type === 'callup' && d.kind === 'qualifier'
    ? [['all', 'Accept', 'Play the qualifiers: caps, reputation and the coach happy (+4)'], ['friendly', 'Friendlies only', 'Stay free to switch, but the coach is disappointed (−5)'], ['none', 'Decline', 'The coach is upset (−12). Too many refusals and he stops calling']]
    : d.type === 'natTour'
    ? [['accept', 'Accept the call', `Play at the tournament and commit to ${natName(nat)} for good`], ['decline', 'Decline', 'Stay free to switch. The coach will not be pleased (−15)']]
    : d.type === 'position'
    ? [['accept', `Play as ${d.to}`, d.early ? `Your main position from next season (manager +3)` : `Added beside your main position (manager +3)`], ['refuse', `Stay a ${S.player.pos}`, 'He will be unhappy (−5) and play you a little less this season']]
    : d.type === 'recall'
    ? [['return', 'Go back now', 'Your loan ends and you rejoin the squad straight away'], ['stay', 'Ask to stay on loan', `${club(d.club).mgr} will be disappointed (−8 when you return)`]]
    : d.type === 'shirt'
    ? [['yes', 'Give him the shirt', 'You pick another number; you two click on the pitch (scoring and assists up a touch while you play together)'], ['no', 'Keep your number', 'He sulks: scoring and assists down a touch for about 12 weeks']]
    : d.type === 'natCaptain'
    ? [['accept', 'Accept the armband', 'Reputation up, the coach pleased (+5), you start nearly every game'], ['decline', 'Turn it down', 'The coach is a little disappointed (−3) and waits a season']]
    : d.type === 'shirtFree'
    ? [['yes', `Take the number ${d.no}`, 'Your old number goes back in the pool'], ['no', 'Keep my number', 'The shirt goes to someone else']]
    : d.type === 'rumour'
    ? [['deny', 'Deny it publicly', 'The manager likes loyalty (+3)'], ['silent', 'Say nothing', 'He wonders why you stayed quiet (−1)']]
    : [['reject', 'Reject them', `Show you are committed (+${d.rival ? 8 : 4}${d.rival ? ', rivals!' : ''})`], ['listen', 'Tell your agent to listen', 'They may bid in the window (−2)']];
  openModal(`<h3>${{ recall: 'Recalled from loan', rumour: 'Rumours', approach: 'Transfer approach', position: 'A new position?', shirt: 'He wants your shirt', shirtFree: 'A shirt is free', natCaptain: 'Captain your country', citizen: 'Citizenship', switch: 'Switch national team?', callup: 'International call-up', natTour: 'Tournament call-up', press: 'Press conference', captain: 'The armband' }[d.type]}</h3><p style="margin:0">${esc(d.text)}</p>
    <div class="inbox">${opts.map(([v, l, s]) => `<button class="house" data-act="decide" data-v="${v}"><span><b>${l}</b><br><span class="small muted">${s}</span></span></button>`).join('')}</div>`);
}

// Matchday: both team sheets in each club's formation, with the bench, and where you fit in. Fit players only.
function teamSheet(c, me, shapeKey) {
  const f = shapeKey || weekFormation(c), shape = FORMATIONS[f], ROLES = { GK: ['GK'], DEF: shape.DEF, MID: shape.MID, FWD: shape.FWD };
  // Real clubs wear shirt numbers; national teams and other made-up sides show OVR instead.
  if (S.clubs[c.id] === c) squadNumbers(c);
  const avail = c.players.filter(pl => !pl.inj).map(pl => ({ n: pl.n, pos: pl.pos, r: pl.r, no: pl.no }));
  // Fill the shape by role where the squad allows, then the best of the rest in that line.
  // Each line keeps the shape's slots in order, left to right (LM, CM, CM, RM), so a player is drawn
  // where his slot is, whatever his own position.
  const xi = {}, slots = {}, taken = new Set();
  for (const g of Object.keys(ROLES)) {
    const line = avail.filter(pl => POS_GROUP[pl.pos] === g).sort((a, b) => b.r - a.r);
    const row = ROLES[g].map(role => { const pl = line.find(x => !taken.has(x) && (!role || x.pos === role)); if (pl) taken.add(pl); return pl; });
    const filled = row.map(pl => pl || (() => { const x = line.find(y => !taken.has(y)); if (x) taken.add(x); return x; })());
    slots[g] = ROLES[g].filter((_, k) => filled[k]);
    xi[g] = filled.filter(Boolean);
  }
  // You take a slot of your role in the shape (your position, or the one you fill); failing that a
  // slot of a role close to it, else the weakest player's slot in that line.
  if (me && me.start) {
    const role = me.me && !shapeKey ? weekRole(me.pos, c) : shapeRole(me.pos, c, f), g = role === 'GK' ? 'GK' : ['DEF', 'MID', 'FWD'].find(l => shape[l].includes(role)) || POS_GROUP[me.pos];
    const row = xi[g], roles = slots[g] || [];
    const weakest = ks => ks.reduce((lo, k) => row[k].r < row[lo].r ? k : lo, ks[0]);
    const exact = roles.map((r, k) => r === role ? k : -1).filter(k => k >= 0);
    const near = roles.map((r, k) => (ROLE_FIT[role] || []).includes(r) ? k : -1).filter(k => k >= 0);
    const i = exact.length ? weakest(exact) : near.length ? weakest(near) : weakest(row.map((_, k) => k));
    if (row.length) row[i] = me; else row.push(me);
  }
  const used = new Set(Object.values(xi).flat());
  const rest = avail.filter(pl => !used.has(pl)).sort((a, b) => b.r - a.r);
  const bench = [...rest.filter(pl => pl.pos === 'GK').slice(0, 1), ...rest.filter(pl => pl.pos !== 'GK').slice(0, me && !me.start ? 5 : 6)];
  if (me && !me.start && me.squad) bench.push(me);
  return { xi, slots, bench, shape: f };
}
// How you fit a role your position is not: a full-back wide in midfield is a wing-back.
const roleText = (pos, role) => (pos === 'LB' || pos === 'RB') && (role === 'LM' || role === 'RM') ? `as a ${role === 'LM' ? 'left' : 'right'} wing-back` : `in the ${POS_NAMES[role].toLowerCase()} role`;
const shortN = n => { const w = n.split(' '); return w.length > 1 ? w.slice(1).join(' ') : n; };
function pitchHtml(sheet) {
  // Each chip is labelled with the slot it plays (a right midfielder on the right wing shows RW).
  // Matchday shows shirt numbers (OVR for sides without them).
  const chip = ({ pl, role }) => `<div class="lp-chip ${pl.me ? 'me' : ''}"><b class="num${pl.no ? ' shirt' : ''}">${pl.no || pl.r}</b><span>${esc(shortN(pl.n))}</span><small>${role || pl.pos}</small></div>`;
  const cells = g => sheet.xi[g].map((pl, k) => ({ pl, role: (sheet.slots || {})[g]?.[k] }));
  let rows = ['FWD', 'MID', 'DEF', 'GK'].map(cells);
  // A 4-2-3-1 is drawn as one: the striker, then the wide men either side of the No. 10, then the two holders.
  if (sheet.shape === '4-2-3-1') {
    const fwd = cells('FWD'), mid = cells('MID'), is = r => x => x.role === r;
    rows = [fwd.filter(is('ST')), [...fwd.filter(is('LM')), ...mid.filter(is('CAM')), ...fwd.filter(is('RM'))], mid.filter(is('CDM')), cells('DEF'), cells('GK')];
  }
  return `<div class="pitch">${rows.filter(r => r.length).map(r => `<div class="lp-row">${r.map(chip).join('')}</div>`).join('')}</div>`;
}
// Today's game: the league game, or the midweek game once the league game is done (or with no
// league game this week).
function showMatchday() {
  const p = S.player, lfx = leagueDone() ? null : nextFixture(), efx = midweekFixture();
  if (!lfx && !efx) return;
  const cup = !lfx, fx = cup ? efx : lfx, half = S.weekHalf;
  // Too tired to play twice: you sit the midweek game out if you played the league game.
  const leagueSel = lfx && !p.injured ? matchdaySelection(lfx) : null;
  // The manager tells you about a one-week position here, on matchday.
  if (leagueSel) tellWeekPos();
  const rested = cup && leagueDone() && half.user && half.user.mins && half.weekEnergy < TWO_GAME_ENERGY;
  const sel = p.injured || rested ? { mins: 0, start: false } : cup ? cupSelection(efx) : leagueSel;
  // A new role in the manager's shape gets its own alert first; the team sheet opens when you close it.
  if (sel.start && shapeRoleNote()) { tellShapeRole(); if (POPUPS.length) { matchdayNext = true; nextPopup(); return; } }
  const me = { n: p.name, pos: matchPos(), r: calcOVR(), no: p.shirt && p.shirt.club === p.club ? p.shirt.no : null, me: true, start: !!sel.start, squad: !p.injured && !sel.banned };
  const mine = teamSheet(myClub(), me), opp = teamSheet(club(fx.opp), null);
  const where = p.injured ? '<span class="bad">You are injured and miss this one.</span>'
    : sel.banned ? `<span class="bad">You are suspended for this one${p.ban > 1 ? ` (${p.ban} league games left to serve)` : ''}.</span>`
    : rested ? `<span class="bad">You need ${TWO_GAME_ENERGY}+ energy to play twice this week, so you rest for this one.</span>`
    : sel.start ? `<span class="good">You start ${matchRole() !== matchPos() ? `${roleText(matchPos(), matchRole())} in ${esc(myClub().mgr)}'s ${weekFormation(myClub())}` : `as ${POS_NAMES[matchPos()].toLowerCase()}`}.</span>`
    : sel.mins ? '<span class="flood">You start on the bench, but should get on.</span>' : '<span class="muted">You are on the bench.</span>';
  const benchHtml = s => s.bench.map(pl => `<span class="${pl.me ? 'me' : ''}">${esc(shortN(pl.n))} <small>${pl.pos} ${pl.no ? `#${pl.no}` : pl.r}</small></span>`).join('');
  const home = fx.isHome ? myClub() : club(fx.opp), away = fx.isHome ? club(fx.opp) : myClub();
  const cupName = efx && efx.t.name.replace(/ \d{4}$/, '');
  const title = cup ? `${esc(cupName)} · ${efx.stage}` : `Matchday ${S.week}`;
  // Home side first, like the fixture above.
  const sheet = (c, s) => `<div><h4>${esc(c.short)} · ${weekFormation(c)}${weekFormation(c) !== formationOf(c) ? ' <span class="small flood">plan B</span>' : ''}</h4>${pitchHtml(s)}<div class="lp-bench"><b>Bench</b>${benchHtml(s)}</div></div>`;
  const sheets = fx.isHome ? sheet(myClub(), mine) + sheet(club(fx.opp), opp) : sheet(club(fx.opp), opp) + sheet(myClub(), mine);
  openModal(`<div class="row"><h3 style="margin:0">${title}</h3><span class="small muted">${dayLabel(cup ? dayAfter(midweekOffset(efx)) : weekDate())}</span></div>
    <div class="fixture"><div class="team">${crest(home.id)}<b>${esc(home.name)}</b></div><div class="vs">VS</div><div class="team">${crest(away.id)}<b>${esc(away.name)}</b></div></div>
    <p class="small" style="margin:0;text-align:center">${where}</p>
    <div class="sheet-tabs">${sheets}</div>
    <div class="btns"><button class="btn primary block" data-act="kickoff">Kick off</button><button class="btn block" data-act="close">Back</button></div>`);
}

// A summer tournament game (Club World Cup, World Cup, Euro...): both team sheets, as on any matchday.
// National teams and clubs from outside the game's leagues use the squads from tourSide.
function showSummerMatchday() {
  const t = summerPending();
  if (!t) return;
  // The call-up needs an answer first.
  if (t.ask) { nextPopup(); return; }
  const p = S.player, me = t.mine, st = t.stages[t.stage], f = stageFixture(t, me);
  if (!f) { doSummerPlay(); return; }
  const opp = f[0] === me ? f[1] : f[0], isHome = f[0] === me, sel = summerPick(me);
  const mySide = tourSide(me), oppSide = tourSide(opp), nation = isNation(me);
  const pos = nation ? p.pos : matchPos(), role = shapeRole(pos, mySide);
  const meChip = { n: p.name, pos, r: calcOVR(), no: !nation && p.shirt && p.shirt.club === p.club ? p.shirt.no : null, me: true, start: !!sel.start, squad: !sel.free };
  const mine = teamSheet(mySide, meChip, formationOf(mySide)), theirs = teamSheet(oppSide, null, formationOf(oppSide));
  const shape = formationOf(mySide);
  const where = sel.free ? '<span class="bad">Your contract has run out, so you are not part of the squad.</span>'
    : sel.start ? `<span class="good">You start ${role !== pos ? `${roleText(pos, role)} in ${esc(mySide.mgr)}'s ${shape}` : `as ${POS_NAMES[pos].toLowerCase()}`}.</span>`
    : sel.mins ? '<span class="flood">You start on the bench, but should get on.</span>' : '<span class="muted">You are on the bench.</span>';
  const benchHtml = s => s.bench.map(pl => `<span class="${pl.me ? 'me' : ''}">${esc(shortN(pl.n))} <small>${pl.pos} ${pl.no ? `#${pl.no}` : pl.r}</small></span>`).join('');
  const sheet = (c, s) => `<div><h4>${esc(c.short)} · ${s.shape}</h4>${pitchHtml(s)}<div class="lp-bench"><b>Bench</b>${benchHtml(s)}</div></div>`;
  const sheets = isHome ? sheet(mySide, mine) + sheet(oppSide, theirs) : sheet(oppSide, theirs) + sheet(mySide, mine);
  const side = id => `<div class="team">${crest(id)}<b>${esc(teamName(id))}</b></div>`;
  openModal(`<div class="row"><h3 style="margin:0">${esc(t.name.replace(/ \d{4}$/, ''))} · ${esc(stageNameFor(t, me))}</h3><span class="small muted">${nation ? esc(natName(p.nat)) : ''}</span></div>
    <div class="fixture">${side(f[0])}<div class="vs">VS</div>${side(f[1])}</div>
    <p class="small" style="margin:0;text-align:center">${where}</p>
    <div class="sheet-tabs">${sheets}</div>
    <div class="btns"><button class="btn primary block" data-act="summerKick">Kick off</button><button class="btn block" data-act="close">Back</button></div>`);
}

// An international game: both team sheets, your country's players in their squad numbers.
function showIntlMatchday() {
  const g = intlDue();
  if (!g) return;
  const p = S.player, me = 'N:' + p.nat, opp = g.h === me ? g.a : g.h, sel = intlSel(g), nn = natNos();
  // Your side is the squad the coach named for this window, in its numbers.
  const base = tourSide(me), snap = S.natSnap && S.natSnap.nat === p.nat ? S.natSnap.list.filter(x => !x.me) : null;
  const mySide = { ...base, players: snap ? snap.map(x => ({ n: x.n, pos: x.pos, r: x.r, no: x.no })) : base.players }, oppSide = tourSide(opp);
  const role = shapeRole(p.pos, mySide);
  const meChip = { n: p.name, pos: p.pos, r: calcOVR(), no: nn.mine, me: true, start: !!sel.start, squad: true };
  const mine = teamSheet(mySide, meChip, formationOf(mySide)), theirs = teamSheet(oppSide, null, formationOf(oppSide));
  const where = sel.start ? `<span class="good">You start ${role !== p.pos ? `${roleText(p.pos, role)} in ${esc(mySide.mgr)}'s ${formationOf(mySide)}` : `as ${POS_NAMES[p.pos].toLowerCase()}`}.</span>`
    : sel.mins ? '<span class="flood">You start on the bench, but should get on.</span>' : '<span class="muted">You are on the bench.</span>';
  const benchHtml = s => s.bench.map(pl => `<span class="${pl.me ? 'me' : ''}">${esc(shortN(pl.n))} <small>${pl.pos} ${pl.no ? `#${pl.no}` : pl.r}</small></span>`).join('');
  const sheet = (c, s) => `<div><h4>${esc(c.short)} · ${s.shape}</h4>${pitchHtml(s)}<div class="lp-bench"><b>Bench</b>${benchHtml(s)}</div></div>`;
  const sheets = g.h === me ? sheet(mySide, mine) + sheet(oppSide, theirs) : sheet(oppSide, theirs) + sheet(mySide, mine);
  const side = id => `<div class="team">${crest(id)}<b>${esc(teamName(id))}</b></div>`;
  openModal(`<div class="row"><h3 style="margin:0">${g.kind === 'qualifier' ? 'Qualifier' : 'Friendly'} · ${INTL_MONTH[S.week]} window</h3><span class="small muted">${dayLabel(dayAfter(g.day))}</span></div>
    <div class="fixture">${side(g.h)}<div class="vs">VS</div>${side(g.a)}</div>
    <p class="small" style="margin:0;text-align:center">${where}</p>
    <div class="sheet-tabs">${sheets}</div>
    <div class="btns"><button class="btn primary block" data-act="intlKick">Kick off</button><button class="btn block" data-act="close">Back</button></div>`);
}
function doIntlPlay() {
  const g = intlDue();
  if (!g) return;
  const r = playIntlGame(g, true);
  render(); showSummerReport(r);
}

// Asking a top-flight club to make you a starter (33–35). The answer is decided straight away; the
// club takes a few seconds to "talk it over" on screen first.
const ROLE_ASK_WAIT = 3200;
function showRoleAsk(id) {
  const o = S.offers.find(x => x.id === id);
  if (!o || !canAskRole(o)) return;
  const c = club(o.club), r = askForStart(id);
  if (!r) return;
  openModal(`<h3>Asking to start</h3><p style="margin:0">You tell ${esc(c.mgr)} you want to start, not sit on the bench. He goes over your last season at ${esc(r.from)}: ${esc(r.line)}.</p>
    <p class="flood" style="margin:0;text-align:center"><b class="role-wait">${esc(c.name)} are talking it over</b></p>`);
  const label = modal.querySelector('.role-wait');
  let dots = 0;
  const tick = setInterval(() => { if (!label.isConnected) { clearInterval(tick); return; } dots = (dots + 1) % 4; label.textContent = `${c.name} are talking it over${'.'.repeat(dots)}`; }, 400);
  setTimeout(() => {
    clearInterval(tick);
    render();
    if (!label.isConnected) return;
    openModal(r.yes
      ? `<h3 class="good">They said yes</h3><p style="margin:0">“We've seen the numbers: ${esc(r.line)}. You've still got it at this level. Sign, and you start.” — ${esc(r.mgr)}</p><button class="btn primary block" data-act="close">Great</button>`
      : `<h3 class="bad">They said no</h3><p style="margin:0">“We respect what you did last season (${esc(r.line)}), but at this level we see you as ${r.was.toLowerCase()}. The offer stands as it is.” — ${esc(r.mgr)}</p><button class="btn primary block" data-act="close">OK</button>`);
  }, ROLE_ASK_WAIT);
}

function showOrderSheet() {
  const o = S.player.order;
  openModal(`<h3>Manager's plan</h3><p style="margin:0">Before the game, ${myClub().mgr} pulls you aside: “${esc(o.text)}”</p>
    <div class="inbox">
      <button class="house" data-act="orderGo" data-v="follow"><span><b>Follow the plan</b><br><span class="small muted">Slightly better chance of winning, same scoring chance${TACKLERS.includes(matchRole()) ? '; a slightly better chance of a clean sheet, but a few fewer tackles' : ''}. Affection +2 if you play.</span></span></button>
      <button class="house" data-act="orderGo" data-v="own"><span><b>Play my own game</b><br><span class="small muted">Better chance to score, worse chance of winning${TACKLERS.includes(matchRole()) ? '; a few more tackles, but a slightly worse chance of a clean sheet' : ''}. ${TACKLERS.includes(matchRole()) ? `Clean sheet and ${DECENT_TACKLES[matchPos()]}+ tackles: +2. Only one of them: −2. Neither: −6.` : 'Goal or assist in a win: +2. Goal or assist without winning: −2. Neither, but a win: −2. Neither and no win: −6.'}</span></span></button>
    </div>`);
}

function doAdvance() {
  // A knockout game of yours that ends level goes to a shootout you take by hand first.
  const so = prepareShootout();
  if (so) { save(); showShootout(so, 'week'); return; }
  const rep = advanceWeek(); render(); if (rep) showMatchReport(rep);
}
function doSummerPlay() {
  const so = prepareShootout();
  if (so) { save(); showShootout(so, 'summer'); return; }
  const r = playSummerStage(); render(); showSummerReport(r);
}

// ---------- penalty shootout ----------
let soMode = 'week';
function soDots(arr, n) {
  const shown = Math.max(5, n);
  return Array.from({ length: shown }, (_, i) => `<i class="${arr[i] == null ? '' : arr[i] ? 'in' : 'out'}"></i>`).join('');
}
function shootoutHtml(so) {
  const gm = so.mine.filter(Boolean).length, gt = so.theirs.filter(Boolean).length, n = Math.max(so.mine.length, so.theirs.length);
  const last = so.log[so.log.length - 1];
  const board = `<div class="so-board">
    <div class="so-row"><b>${esc(teamName(so.me))}</b><span class="so-dots">${soDots(so.mine, n)}</span><span class="num">${gm}</span></div>
    <div class="so-row"><b>${esc(teamName(so.opp))}</b><span class="so-dots">${soDots(so.theirs, n)}</span><span class="num">${gt}</span></div></div>`;
  const lastLine = last ? `<p class="so-last ${last.goal === (last.side === 'mine') ? 'good' : 'bad'}">${esc(last.text)}</p>` : `<p class="muted" style="margin:0">Level at full time. ${so.gk ? 'You are in goal: pick which way to dive for every one of their kicks.' : `You take your side's kick number ${so.myKick}.`}</p>`;
  let act;
  if (so.done) {
    const won = so.winner === so.me;
    act = `<p class="so-res ${won ? 'good' : 'bad'}">${won ? 'You win' : `${esc(teamName(so.opp))} win`} ${Math.max(gm, gt)}–${Math.min(gm, gt)} on penalties${won ? '!' : '.'}</p><button class="btn primary" data-act="soDone">Continue</button>`;
  } else {
    const nx = soNext(so);
    if (nx.you === 'shoot') {
      act = `<p class="so-ask">Your kick. Pick where to shoot:</p><div class="so-goal shoot">${[0, 1].map(r => [0, 1, 2].map(c => `<button data-act="soShoot" data-v="${c},${r}" aria-label="${SO_ROWS[r]} ${SO_COLS[c]}"></button>`).join('')).join('')}</div><p class="small muted" style="margin:0">Seen from the spot. Low and in the corner is safest; high is harder to save but can fly over.</p>`;
    } else if (nx.you === 'save') {
      act = `<p class="so-ask">You're in goal. Pick which way to dive:</p><div class="so-goal save">${[0, 1, 2].map(c => `<button data-act="soDive" data-v="${c}"><span>${c === 1 ? 'Stay' : c ? 'Dive right' : 'Dive left'}</span></button>`).join('')}</div><p class="small muted" style="margin:0">Seen from the spot, as the kicker sees it.</p>`;
    } else {
      act = `<button class="btn primary" data-act="soAuto">${esc(teamName(nx.side === 'mine' ? so.me : so.opp))} to kick</button>`;
    }
  }
  return `<div class="so"><h3>Penalty shootout</h3>${board}${lastLine}${act}</div>`;
}
function showShootout(so, mode) {
  if (mode) soMode = mode;
  const sheet = modal.querySelector('.so') && modal.querySelector('.sheet');
  if (sheet) sheet.innerHTML = shootoutHtml(so); else openModal(shootoutHtml(so));
}
function soStep(choice) {
  const so = S.preSim && S.preSim.so;
  if (!so) { closeModal(); render(); return; }
  soKick(so, choice);
  save();
  showShootout(so);
}

function openModal(html) { modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; modal.hidden = false; }
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

// One finished game: score, scorers and your own numbers.
const BALL = '<svg class="ico ball" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-label="Goal"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/><path d="M12 7.5V3M16 10.4l4.3-1.4M14.5 15.1l2.7 3.7M9.5 15.1l-2.7 3.7M8 10.4L3.7 9"/></svg>';
const BOOT = '<svg class="ico boot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Assist"><path d="M3 6h6l1 4c3.5 0 7 1 9.5 3.2 1 .9 1.5 2 1.5 3.3V18H3z"/><path d="M5 18v2M9 18v2M13 18v2M17 18v2"/></svg>';

// Goals and the game's other moments in the order they happened: home side on the left, away side on
// the right. Bookings, injuries and substitutions are smaller, under the goals' style.
const CARD = c => `<i class="mcard ${c}"></i>`;
const SUB_ON = '<svg class="ico subon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-label="On"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const SUB_OFF = '<svg class="ico suboff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-label="Off"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
const INJ = '<svg class="ico inj" viewBox="0 0 24 24" fill="currentColor" aria-label="Injury"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>';
function goalTimeline(scorers, ev = []) {
  const name = S && S.player && S.player.name;
  const items = [...scorers.map(s => ({ ...s, t: 'goal' })), ...(ev || [])];
  const list = items.some(s => s.min) ? items.sort((x, y) => (x.min || 0) - (y.min || 0) || (x.t === 'goal' ? -1 : 1)) : items;
  return list.map(s => {
    let html;
    if (s.t === 'goal') html = `<div class="g ${s.home ? '' : 'a'}">
      <div class="${s.me ? 'me' : ''}">${BALL}<span>${esc(s.n)}${s.pen ? ' <small class="muted">(pen)</small>' : s.fk ? ' <small class="muted">(FK)</small>' : ''}</span>${s.min ? `<b class="num">${s.min}'</b>` : ''}</div>
      ${s.ast ? `<div class="ast ${s.astMe ? 'me' : ''}">${BOOT}<span>${esc(s.ast)}</span></div>` : ''}</div>`;
    else if (s.t === 'sub') html = `<div class="g ev ${s.home ? '' : 'a'}">
      <div class="${s.on === name && s.me ? 'me' : ''}">${SUB_ON}<span>${esc(s.on)}</span><b class="num">${s.min}'</b></div>
      <div class="ast ${s.off === name && s.me ? 'me' : ''}">${SUB_OFF}<span>${esc(s.off)}</span></div></div>`;
    else html = `<div class="g ev ${s.home ? '' : 'a'}"><div class="${s.me ? 'me' : ''}">${s.t === 'inj' ? INJ : s.second ? CARD('y2') : CARD(s.t === 'red' ? 'r' : 'y')}<span>${esc(s.n)}${s.t === 'inj' ? ' <small class="muted">(injured)</small>' : s.second ? ' <small class="muted">(2nd yellow)</small>' : ''}</span><b class="num">${s.min}'</b></div></div>`;
    return s.home ? html + '<div></div>' : '<div></div>' + html;
  }).join('');
}
// Your card(s), beside your minutes.
const myCards = u => u && u.red === 'second' ? CARD('y') + CARD('r') : u && u.red ? CARD('r') : u && u.yellow ? CARD('y') : '';

function matchBlock(m, title, injured) {
  const u = m.user;
  const sc = goalTimeline(m.scorers, m.ev);
  const mine = m.isHome ? m.gh : m.ga, theirs = m.isHome ? m.ga : m.gh;
  const won = m.winner ? m.winner === (m.isHome ? m.h : m.a) : null;
  const verdict = mine > theirs || (mine === theirs && won) ? '<span class="good">Win</span>' : mine < theirs || won === false ? '<span class="bad">Defeat</span>' : '<span class="muted">Draw</span>';
  return `<div class="row"><h3>${title}</h3>${verdict}</div>
    ${derbyName(m.h, m.a) ? `<div class="derby">${derbyName(m.h, m.a)}</div>` : ''}
    <div class="fixture"><div class="team">${crest(m.h)}<b>${esc(teamName(m.h))}</b></div><div class="score num">${m.gh}–${m.ga}</div><div class="team">${crest(m.a)}<b>${esc(teamName(m.a))}</b></div></div>
    ${m.pens ? `<div class="small muted" style="text-align:center">${esc(teamName(m.pens))} win ${m.pensScore ? pensText(m) + ' ' : ''}on penalties</div>` : ''}
    ${m.agg ? `<div class="small muted" style="text-align:center">Aggregate ${m.agg[0]}–${m.agg[1]}: <b>${esc(teamName(m.winner))}</b> go through</div>` : ''}
    ${sc ? `<div class="scorers">${sc}</div>` : ''}
    ${u && u.mins ? `<div class="${statGrid(S.player.pos)}"><div><b>${rateBox(u.rating, 1)}</b><small>Rating</small></div><div><b>${u.mins}'${myCards(u)}</b><small>${u.start ? 'Started' : 'Sub'}</small></div><div><b>${u.goals}</b><small>Goals</small></div><div><b>${u.assists}</b><small>Assists</small></div>${S.player.pos === 'GK' ? `<div><b>${u.saves || 0}</b><small>Saves</small></div><div><b>${u.clean ? 'Yes' : 'No'}</b><small>Clean sheet</small></div>` : ''}</div>${u.tackles ? `<div class="small muted" style="text-align:center">${u.tackles} tackle${u.tackles !== 1 ? 's' : ''}</div>` : ''}`
      : `<p class="muted" style="margin:0">${injured ? 'You were out injured.' : u && u.free ? 'Your contract has run out, so you are not part of the squad. Re-sign to play again.' : u && u.rested ? `Rested: you need ${TWO_GAME_ENERGY}+ energy to play twice in a week.` : 'You stayed on the bench.'}</p>`}`;
}

function showMatchReport(rep) {
  const m = rep.match;
  const p = S.player;
  const injured = p.injured || rep.events.some(e => e.startsWith('Injured'));
  let html = '';
  if (m) html += matchBlock(m, 'Full time', injured);
  else if (!rep.cup) html += `<h3>Week ${rep.week} done</h3><p class="muted" style="margin:0">${rep.free ? 'Another week without a club.' : 'No match this week.'}</p>`;
  if (rep.cup) html += matchBlock(rep.cup, `${rep.cup.comp} · ${rep.cup.stage}`, injured);
  html += rep.events.map(e => `<div class="award">${esc(e)}</div>`).join('');
  if (rep.net != null) html += `<div class="row small"><span class="muted">Weekly income</span><b class="num ${rep.net >= 0 ? 'good' : 'bad'}">${rep.net >= 0 ? '+' : ''}${money(rep.net)}</b></div>`;
  else {
    // The week goes on: the next game, club or country, whichever comes first.
    const e = midweekFixture(), g = nextIntlGame(), me = 'N:' + p.nat;
    const eDay = e ? midweekOffset(e) : Infinity;
    if (g && g.day < eDay) html += `<div class="award">Next: ${esc(natName(p.nat))} ${g.h === me ? 'vs' : 'at'} ${esc(teamName(g.h === me ? g.a : g.h))} on ${dayLabel(dayAfter(g.day))}</div>`;
    else if (e) html += `<div class="award">Next: ${esc(e.t.name.replace(/ \d{4}$/, ''))} ${e.isHome ? 'vs' : 'at'} ${esc(club(e.opp).name)} on ${dayLabel(dayAfter(midweekOffset(e)))}</div>`;
  }
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
    case 'foot': draft.foot = v; renderCreate(); return;
    case 'tab': tab = v; window.scrollTo(0, 0); render(); return;
    case 'clubView': clubView = v; render(); return;
    case 'natView': natView = v; render(); return;
    case 'cupTab': cupTab = v; cupPart = null; render(); return;
    case 'shopView': shopView = v; render(); return;
    case 'luxCat': luxCat = v; render(); return;
    case 'luxAsk': { const it = luxItem(v); confirmSheet(`Buy the ${esc(luxName(it))}?`, `${money(it.price)}.${it.cat === 'car' ? ` Insurance and upkeep: ${money(Math.round(it.price * CAR_UPKEEP))} a week.` : ''} You can sell it back later for ${Math.round(SELL_BACK_LUX[it.cat] * 100)}%.`, 'luxBuy', 'Buy it', v); return; }
    case 'luxBuy': if (buyLuxury(v)) toast('Enjoy it!'); closeModal(); render(); return;
    case 'luxSellAsk': { const c = collection().find(x => x.uid === v), it = c && luxItem(c.id); if (it) confirmSheet(`Sell the ${esc(luxName(it))}?`, `You get ${money(Math.round(it.price * SELL_BACK_LUX[it.cat]))} back.`, 'luxSell', 'Sell', v); return; }
    case 'luxSell': if (sellLuxury(v)) toast('Sold'); closeModal(); render(); return;
    case 'buyStock': { const [sym, amt] = v.split('|'), n = buyShares(sym, +amt); toast(n ? `Bought ${n.toLocaleString()} ${sym}` : 'Not enough money'); render(); return; }
    case 'sellStock': { const [sym, fr] = v.split('|'), got = sellShares(sym, +fr); toast(got ? `Sold for ${money(got)}` : 'Nothing to sell'); render(); return; }
    case 'agentView': agentView = v; render(); return;
    case 'sponsorSign': if (signSponsor(v)) toast('Sponsor signed'); render(); return;
    case 'sponsorNo': declineSponsorReq(v); render(); return;
    case 'cupPart': cupPart = v; render(); return;
    case 'train': { const g = train(v); if (g != null) toast(g ? `${ATTR_NAMES[v]} +${g.toFixed(2)}` : `${ATTR_NAMES[v]} session done`); render(); return; }
    case 'rest': rest(); toast('Rested: +8 energy'); render(); return;
    case 'altInfo': toast(v === 'next' ? `You play ${S.player.nextPos} now; it becomes your main position next season` : `You can also play ${POS_NAMES[v]} (${v})`); return;
    // A one-week position comes first, as its own alert; the team sheet opens when you close it.
    case 'matchday': if (!weekPosTold()) { tellWeekPos(); if (POPUPS.length) { matchdayNext = true; nextPopup(); return; } } showMatchday(); return;
    case 'kickoff': closeModal(); if (S.player.order && !S.player.order.choice) showOrderSheet(); else doAdvance(); return;
    case 'advance': if (S.player.order && !S.player.order.choice) showOrderSheet(); else doAdvance(); return;
    case 'order': setOrderChoice(v); render(); return;
    case 'orderGo': setOrderChoice(v); closeModal(); doAdvance(); return;
    case 'decide': resolveDecision(v); closeModal(); render(); return;
    case 'popNext': closePopup(); return;
    case 'findClubs': toast(findClubs() ? 'Your agent is making calls' : 'Try again next week'); render(); return;
    case 'setAsk': { const el = document.getElementById('ask-wage'); if (el && setAskWage(el.value)) toast(S.player.askWage ? `Asking for ${money(S.player.askWage)}/week` : 'Asking wage cleared'); render(); return; }
    case 'faWeek': { const rep = freeAgentWeek(); render(); if (rep) showMatchReport(rep); return; }
    case 'keepTrying': keepTrying(); toast('Keep the phone on'); render(); return;
    case "equip": if (setEquip(+v)) toast(`${EQUIP_TIERS[+v].name} equipment`); render(); return;
    case 'agent': if (hireAgent(+v)) toast(+v ? `Signed: ${AGENTS[+v].name}` : 'Agent released'); render(); return;
    case 'wishAsk': showWishSheet(); return;
    case 'wishGo': if (announceWish(v)) toast('Dream move announced'); closeModal(); render(); return;
    case 'honTab': honTab = v; render(); return;
    case "refresh": refreshStartChoices(); render(); window.scrollTo(0, 0); return;
    case "refreshOffers": { const n = refreshOffers(); toast(n ? `${n} more club${n > 1 ? 's' : ''} came in` : 'No new clubs this time'); render(); return; }
    case "soundOut": { const n = soundOut(); toast(n ? `${n} club${n > 1 ? 's' : ''} want${n > 1 ? '' : 's'} to talk` : 'No luck this time'); render(); return; }
    case "inqListen": listenInquiry(v); render(); nextPopup(); return;
    case "inqIgnore": ignoreInquiry(v); render(); return;
    case "inqThey": case "inqHalf": case "inqFull": { const [id] = [v]; const r = payBreach(id, act === "inqThey" ? 'they' : act === "inqHalf" ? 'half' : 'full'); toast(r === 'ok' ? 'Release clause broken!' : r === 'no' ? 'They said no' : 'Not enough money'); render(); nextPopup(); return; }
    case "askContract": { const r = requestContract(); toast(r === "offer" ? (S.offers.some(o => o.raise) ? "Pay rise offered" : "New contract offered") : r === "overpaid" ? "Already paid above your value" : r === "refused" ? "The club said no" : r === "tooOld" ? "Not at your age, they say" : r === "soon" ? "Too soon to ask again" : r === "locked" ? (blockActive() ? "Your release clause blocks salary talks" : clauseActive() ? "Your loyalty clause blocks salary talks" : "You only just re-signed") : r === "challenge" ? "Not yet: the board set you a task" : r === "task" ? "Finish the board's task first" : r === "newclub" ? "Settle in first: not in your first season" : r === "notyet" ? "Only in the last season of your contract" : "Not possible right now"); render(); return; }
    case 'summerPlay': doSummerPlay(); return;
    case 'summerMatchday': showSummerMatchday(); return;
    case 'intlMatchday': showIntlMatchday(); return;
    case 'intlKick': closeModal(); doIntlPlay(); return;
    case 'roleAsk': showRoleAsk(v); return;
    case 'careerSub': careerSub = v; window.scrollTo(0, 0); render(); return;
    case 'shirtAskList': showShirtAskList(); return;
    case 'shirtAsk': doShirtAsk(v); return;
    case 'shirtPick': if (pickShirt(+v)) { closeModal(); toast(`Number ${v} it is`); render(); } return;
    case 'natShirtPick': if (pickNatShirt(+v)) { closeModal(); toast(`Number ${v} it is`); render(); } return;
    case 'natShirtAskList': showShirtAskList(true); return;
    case 'natShirtAsk': doShirtAsk(v, true); return;
    case 'summerKick': closeModal(); doSummerPlay(); return;
    case 'soShoot': { const [col, row] = v.split(',').map(Number); soStep({ col, row }); return; }
    case 'soDive': soStep({ col: +v }); return;
    case 'soAuto': soStep(null); return;
    case 'soDone': closeModal(); if (soMode === 'summer') doSummerPlay(); else doAdvance(); return;
    case 'summerSim': simulateSummer(); render(); return;
    case 'exportSave': showExport(); return;
    case 'pastExport': showPastExport(+v); return;
    case 'copyPast': { const r = loadArchive().find(x => x.id === +v); if (r) navigator.clipboard.writeText(JSON.stringify(r)).then(() => toast('Career copied'), () => toast('Select the text and copy it')); return; }
    case 'copySave': navigator.clipboard.writeText(exportSave()).then(() => toast('Save copied'), () => toast('Select the text and copy it')); return;
    case 'importAsk': showImport(); return;
    case 'importGo': { const ok = importSave(document.getElementById('importText').value.trim()); if (ok) { closeModal(); landing = false; tab = 'home'; toast('Career imported'); render(); } else toast('That is not a valid save'); return; }
    case 'continue': landing = false; tab = 'home'; render(); window.scrollTo(0, 0); return;
    // The career you just finished, while its save is still here: back into it, with every tab.
    case 'viewPast': if (S && S.phase === 'retired' && S.player.careerId === +v) { landing = false; pastView = null; tab = 'home'; } else { pastView = +v; pastTab = 'summary'; pastSub = 'profile'; } render(); window.scrollTo(0, 0); return;
    case 'pastTab': pastTab = v; render(); window.scrollTo(0, 0); return;
    case 'pastSub': pastSub = v; render(); window.scrollTo(0, 0); return;
    case 'pastSell': { const [id, sym, f] = v.split('|'); const back = sellPastShares(+id, sym, +f); if (back) toast(`Sold for ${money(back)}`); render(); return; }
    case 'pastBack': pastView = null; landing = true; render(); window.scrollTo(0, 0); return;
    case 'pastDelAsk': { const r = loadArchive().find(x => x.id === +v); if (r) confirmSheet(`Delete ${esc(r.name)}?`, `This career (${r.career.length} season${r.career.length !== 1 ? 's' : ''}, ${esc(r.lastClub)}) will be gone for good. This cannot be undone.`, 'pastDel', 'Delete', v); return; }
    case 'pastDel': deleteArchived(+v); closeModal(); toast('Career deleted'); pastView = null; landing = true; render(); return;
    case 'freshStart': archiveCurrent(); wipe(); pastView = null; landing = false; draft.name = ''; render(); window.scrollTo(0, 0); return;
    case 'adRoll': earnReward().then(ok => { if (ok && S.phase === 'choose') { S.adRolls = (S.adRolls || 0) + 1; S.rerolls++; save(); } render(); }); return;
    case 'adTrain': earnReward().then(ok => { if (ok && S.storeTrain !== `${S.season}-${S.week}`) { S.storeTrain = `${S.season}-${S.week}`; S.player.slots++; save(); toast('Extra session unlocked'); } render(); }); return;
    case 'proShow': showProSheet(); return;
    case 'proBuy': buyPro(); return;
    case 'proRestore': restorePro(); return;
    case 'badgeMode': setBadgeMode(BADGE_MODE === 'abstract' ? 'real' : 'abstract'); for (const k in logoState) delete logoState[k]; render(); return;
    case 'landingNew': if (!S || S.phase === 'retired') { archiveCurrent(); wipe(); landing = false; draft.name = ''; render(); window.scrollTo(0, 0); }
      else openModal(`<h3>Start a new career?</h3><p class="muted" style="margin:0">${esc(S.player.name)} has not retired yet. Put the career aside and pick it up any time from Careers in progress, or delete it for good.</p>
        <div class="btns"><button class="btn primary" data-act="pauseNew">Put it aside</button><button class="btn danger" data-act="newGame">Delete it</button><button class="btn" data-act="close">Cancel</button></div>`);
      return;
    case 'menu': landing = true; pastView = null; closeModal(); render(); window.scrollTo(0, 0); return;
    case "listAsk": confirmSheet("Request a transfer?", "The manager will freeze you out straight away, and the board will be unhappy (−20). Clubs will bid for you in the transfer windows.", "list", "Hand in request"); return;
    case "list": requestTransfer(); closeModal(); render(); return;
    case "unlist": withdrawTransferRequest(); render(); return;
    case 'house': if (setHouse(+v)) toast(HOUSING[+v].name); render(); return;
    case 'askChance': if (askChance()) { toast('You got your chance!'); } render(); nextPopup(); return;
    case 'buyAsk': { const i = +v, nat = homeNat(); confirmSheet(`Buy a ${HOUSING[i].name.toLowerCase()}?`, `${money(housePrice(nat, i))} in ${natName(nat)}${ownedHomes()[nat] ? ` (your current home sells for ${money(Math.round(housePrice(nat, ownedHomes()[nat]) * SELL_BACK))}, so you pay ${money(buyCost(i))})` : ''}. No rent here again, just ${money(upkeepMonth(nat, i))} a month upkeep.${leaseLeft() && !ownedHere() ? ' Your current lease still has to be paid until it ends.' : ''}`, 'buyHouse', 'Buy it', v); return; }
    case 'buyHouse': if (buyHouse(+v)) toast('Home bought!'); closeModal(); render(); return;
    case 'sellAsk': { const i = ownedHomes()[v]; if (i) confirmSheet(`Sell your ${HOUSING[i].name.toLowerCase()}?`, `You get ${money(Math.round(housePrice(v, i) * SELL_BACK))} (90% of what it cost) and stop paying upkeep.${v === homeNat() ? ' You move back into a shared flat.' : ''}`, 'sellHouse', 'Sell', v); return; }
    case 'sellHouse': if (sellHouse(v)) toast('Home sold'); closeModal(); render(); return;
    case 'choose': chooseStart(v); tab = 'home'; render(); window.scrollTo(0, 0); return;
    case 'accept': {
      const o = S.offers.find(x => x.id === v), burned = o && o.type === 'transfer' ? rivalBetrayal(o.club) : [];
      if (burned.length) { const names = burned.map(id => esc(club(id).name)).join(' and '); confirmSheet(`Join ${esc(club(o.club).name)}?`, `They are rivals of ${names}. If you join them, ${names} fans and board will hate you, and they will never approach you again.`, 'acceptGo', 'Sign anyway', v); return; }
      { const r = acceptOffer(v); toast(r === 'blocked' ? 'Move blocked by your club' : r === 'pre' ? 'Pre-contract signed' : 'Contract signed'); render(); nextPopup(); } return;
    }
    case 'refusePlay': confirmSheet('Refuse to play?', `${esc(myClub().mgr)} will freeze you out at once (affection −30) and the board will be furious (−25). You will not play, not even from the bench, until the next transfer window opens. Then the club puts you on the transfer list.`, 'refuseGo', 'Refuse to play'); return;
    case 'refuseGo': refusePlay(); closeModal(); render(); nextPopup(); return;
    case 'payRelease': { const r = payRelease(v === 'half'); toast(r === 'moved' ? 'You are on your way' : r === 'no' ? 'They said no' : 'Not enough money'); render(); nextPopup(); } return;
    case 'acceptGo': { const r = acceptOffer(v); closeModal(); toast(r === 'blocked' ? 'Move blocked by your club' : r === 'pre' ? 'Pre-contract signed' : 'Contract signed'); render(); nextPopup(); } return;
    case 'negAsk': showNegotiate(v); return;
    case 'neg': { const [id, i] = v.split(':'); const r = negotiate(id, +i); closeModal(); toast(r === 'accepted' ? 'They agreed!' : r === 'withdrawn' ? 'Offer withdrawn' : 'They said no'); render(); return; }
    case 'decline': declineOffer(v); render(); return;
    case 'nextSeason': { const wait = STORE_BUILD ? seasonWaitLeft() : 0; if (wait > 0) { showWaitSheet(wait); return; } }
      if (startNextSeason()) { tab = 'home'; window.scrollTo(0, 0); } render(); return;
    case 'intlRetireAsk': confirmSheet('Retire from international football?', `You stop playing for ${esc(natName(S.player.nat))} for good: no more call-ups or tournaments. In return your body ages a little slower. This cannot be undone.`, 'intlRetire', 'Retire from internationals'); return;
    case 'intlRetire': retireIntl(); closeModal(); render(); nextPopup(); return;
    case 'achvShow': showAchievements(); return;
    case 'capQuitAsk': confirmSheet('Step down as captain?', `You hand back the ${esc(myClub().name)} armband. ${esc(myClub().mgr)} (−5) and the board (−3) will be disappointed, and he will not offer it again this season.`, 'capQuit', 'Step down'); return;
    case 'capQuit': stepDownCaptain(); closeModal(); render(); return;
    case 'natCapQuitAsk': confirmSheet('Step down as captain?', `You hand back the ${esc(natName(S.player.nat))} armband. The coach (−8) will be disappointed and will not offer it again this season.`, 'natCapQuit', 'Step down'); return;
    case 'natCapQuit': stepDownNatCaptain(); closeModal(); render(); return;
    case 'citApply': applyCitizenship(v); render(); return;
    case 'natSwitchAsk': confirmSheet(`Play for ${esc(natName(v))}?`, `You switch national team from ${esc(natName(S.player.nat))} to ${esc(natName(v))} for the rest of your career. FIFA allows only one switch.`, 'natSwitch', `Switch to ${esc(natName(v))}`, v); return;
    case 'natSwitch': switchNation(v); closeModal(); render(); nextPopup(); return;
    case 'intlAvail': S.player.intlAvail = v; save(); render(); return;
    case 'retireAsk': confirmSheet('Retire?', 'Your career ends now, whatever your age, and you will see your final summary. Export a save first if you might want to come back.', 'retire', 'Retire'); return;
    case 'retire': retire(); closeModal(); tab = 'home'; render(); return;
    case 'newAsk': confirmSheet('Start over?', 'This deletes your current career save on this device.', 'newGame', 'Delete and start over'); return;
    case 'newGame': wipe(); closeModal(); landing = false; draft.name = ''; render(); return;
    case 'pauseNew': pauseCurrent().then(ok => { closeModal(); if (!ok) { toast('Could not put it aside on this device'); render(); return; } landing = false; draft.name = ''; render(); window.scrollTo(0, 0); toast('Career put aside'); }); return;
    case 'resume': resumePaused(+v).then(ok => { if (!ok) { toast('Could not load that career'); render(); return; } landing = false; tab = 'home'; render(); window.scrollTo(0, 0); }); return;
    case 'pausedDelAsk': { const r = pausedList().find(x => x.id === +v); if (r) confirmSheet(`Delete ${esc(r.name)}?`, `This unfinished career (${esc(r.club)}, ${esc(r.season)}) will be gone for good. This cannot be undone.`, 'pausedDel', 'Delete', v); return; }
    case 'pausedDel': deletePaused(+v).then(() => { closeModal(); toast('Career deleted'); render(); }); return;
    case 'close': closeModal(); render(); return;
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.act === 'league') { viewLeague = e.target.value; render(); }
  if (e.target.dataset && e.target.dataset.act === 'wishLeague') { wishLeague = e.target.value; showWishSheet(); }
});

// A shootout can't be closed halfway.
modal.addEventListener('click', e => { if (e.target === modal && !modal.querySelector('.so')) { closeModal(); render(); } });

// Service worker only works over http(s), not when opened as a local file.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

load();
// The IndexedDB copy may be newer than localStorage's (see save): wait a moment for it before the first screen.
let booted = false;
const boot = () => { if (!booted) { booted = true; render(); } };
moneyInit();
Promise.all([loadNewest().catch(() => false), loadArchiveStore().catch(() => {})]).then(() => { if (booted) render(); boot(); });
setTimeout(boot, 1500);
