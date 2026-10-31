// UI: renders screens from engine state and handles taps.

const app = document.getElementById('app');
const modal = document.getElementById('modal');
let tab = 'home';
let clubView = 'table';
let viewLeague = null;
const draft = { name: '', nat: 'ENG', pos: 'ST' };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avgRating = st => st.apps ? (st.rsum / st.apps).toFixed(2) : '–';
const ratingClass = r => r >= 7.5 ? 'hi' : r < 6 ? 'lo' : '';

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  train: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  shop: '<path d="M4 8h16l-1.5 11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM9 8V6a3 3 0 0 1 6 0v2"/>',
  club: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  career: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
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
    <p class="small muted">15 leagues across England, Spain, Italy, Germany and France. Squads and managers are based on the 2025-26 season. Ratings are game estimates.</p>
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
  const tabs = [['home', 'Home'], ['train', 'Train'], ['shop', 'Shop'], ['club', 'Club'], ['career', 'Career']];
  return `<nav class="tabs"><div class="in">${tabs.map(([k, l]) => `
    <button class="${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" aria-label="${l}">
      ${icon(k)}<span>${l}</span>${k === 'home' && S.offers.length ? '<i class="dot"></i>' : ''}${k === 'train' && S.phase === 'season' && S.player.slots > 0 && !S.player.injured ? '<i class="dot" style="background:var(--flood)"></i>' : ''}
    </button>`).join('')}</div></nav>`;
}

function render() {
  if (!S) { renderCreate(); return; }
  if (S.phase === 'choose') { renderChoose(); return; }
  const scrollY = window.scrollY;
  const views = { home: viewHome, train: viewTrain, shop: viewShop, club: viewClub, career: viewCareer };
  app.innerHTML = topbar() + `<main class="wrap">${views[tab]()}</main>` + nav();
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
  if (!S.offers.length) return '';
  return `<section class="card"><h2>Contract offers</h2>${S.offers.map(o => {
    const c = club(o.club);
    return `<div class="offer">
      <div class="row"><div class="clubcell">${crest(c.id, "small")}<div style="min-width:0"><div class="club">${c.name}</div><div class="small muted">${league(c.league).name} · Team rating ${Math.round(teamStrength(c))}</div></div></div>
      <span class="chip ${o.type === 'renew' ? '' : 'flood'}">${o.type === 'renew' ? 'Renewal' : 'Transfer'}</span></div>
      <div class="kv"><div><small>Wage</small><b class="num">${money(o.wage)}/wk</b></div><div><small>Years</small><b>${o.years}</b></div><div><small>Role</small><b>${o.status}</b></div></div>
      <div class="small muted">Current wage ${money(S.player.wage)}/wk${o.pen ? ` · Manager affection −${o.pen} at first from haggling` : ''}</div>
      <div class="btns"><button class="btn good sm" data-act="accept" data-v="${o.id}">Sign</button><button class="btn sm" data-act="negAsk" data-v="${o.id}" ${o.rounds >= 2 ? 'disabled' : ''}>Negotiate</button><button class="btn sm" data-act="decline" data-v="${o.id}">Decline</button></div>
    </div>`;
  }).join('')}</section>`;
}

function showNegotiate(id) {
  const o = S.offers.find(x => x.id === id), c = club(o.club);
  const who = o.type === 'renew' ? `${c.mgr} will be annoyed with you for a while` : `${c.mgr} will start out cooler towards you if you sign`;
  const chanceLabel = ch => ch >= .7 ? 'Likely' : ch >= .4 ? 'Risky' : 'Long shot';
  openModal(`<h3>Negotiate</h3>
    <p class="muted" style="margin:0">${c.name} offer ${money(o.wage)}/week. Asking for more lowers manager affection whatever happens: ${who}. Push too hard and they may walk away. ${2 - o.rounds} attempt${2 - o.rounds !== 1 ? 's' : ''} left.</p>
    <div class="inbox">${ASKS.map((a, i) => {
      const ch = negotiateChance(o, a);
      return `<button class="house" data-act="neg" data-v="${o.id}:${i}"><span><b>Ask ${a.label}</b> · ${money(o.wage * (1 + a.pct))}/wk<br><span class="small muted">${chanceLabel(ch)} (${Math.round(ch * 100)}%) · affection −${a.pen}</span></span></button>`;
    }).join('')}</div>
    <button class="btn block" data-act="close">Cancel</button>`);
}

const BAND_NOTE = {
  elite: 'He loves you. Salary talks can go well above market value.',
  great: 'He rates you highly. A little room above market value in salary talks.',
  good: 'He is happy with you. Only a slim chance above market value.',
  ok: 'He is satisfied, but salary talks will not go above market value.',
  poor: 'You miss too many targets. His patience is wearing thin.',
  new: 'Hit his targets to build trust. It decides how far salary talks can go.',
};

function managerCard() {
  const p = S.player, c = myClub(), eff = Math.round(effAff()), band = objBand(), rate = objRate();
  const mood = eff >= 75 ? 'Loves you' : eff >= 60 ? 'Trusts you' : eff >= 45 ? 'Neutral' : eff >= 30 ? 'Unconvinced' : eff >= 15 ? 'Frozen out' : 'On the brink';
  const cls = eff >= 60 ? '' : eff >= 40 ? 'mid' : 'low';
  const objs = (p.objectives || []).map(o => {
    const pct = Math.min(100, Math.round(o.progress / o.target * 100));
    return `<div class="obj"><div class="row small"><span><b>${OBJ_SPAN[o.span].label}</b> · ${o.target} ${objWord(o.kind, o.target)}</span><span class="num ${o.progress >= o.target ? 'good' : ''}">${o.progress}/${o.target}</span></div>
      <div class="bar"><i class="${o.progress >= o.target ? '' : 'mid'}" style="width:${pct}%"></i></div>
      <div class="small muted">${o.span === 'season' ? 'Ends with the season' : `Until week ${o.endWeek}`} · ${o.games} games</div></div>`;
  }).join('') || '<p class="small muted" style="margin:0">No objectives right now.</p>';
  return `<section class="card"><div class="row"><h2>Manager</h2><span class="small">${c.mgr}</span></div>
    <div class="energy" style="margin:0"><span>${mood}</span><div class="bar"><i class="${cls}" style="width:${eff}%"></i></div><b class="num">${eff}</b></div>
    ${p.affPen >= 1 ? `<div class="small bad">−${Math.round(p.affPen)} from contract talks, fading each week</div>` : ''}
    ${eff < 15 ? '<div class="small bad"><b>Warning:</b> if affection reaches 0 your contract will be terminated.</div>' : ''}
    <div class="energy" style="margin:0"><span>Board</span><div class="bar"><i class="${p.board >= 60 ? '' : p.board >= 40 ? 'mid' : 'low'}" style="width:${p.board}%"></i></div><b class="num">${Math.round(p.board)}</b></div>
    <div class="row small"><span class="muted">Objectives hit</span><b>${rate === null ? '–' : Math.round(rate * 100) + '%'} <span class="muted">(${(p.objHist || []).length} so far)</span></b></div>
    <div class="small ${band === 'poor' ? 'bad' : band === 'elite' || band === 'great' ? 'good' : 'muted'}">${BAND_NOTE[band]}</div>
    ${objs}</section>`;
}

function orderBox() {
  const o = S.player.order;
  if (!o) return '';
  return `<div class="order"><div class="small flood"><b>Manager's instructions</b></div><div>“${esc(o.text)}”</div>
    <div class="btns"><button class="btn sm ${o.choice === 'follow' ? 'good' : ''}" data-act="order" data-v="follow">Follow the plan</button><button class="btn sm ${o.choice === 'own' ? 'danger' : ''}" data-act="order" data-v="own">Play my own game</button></div>
    <div class="small muted">Following gives the team a small edge and pleases him. Your own game boosts your goal chances but he will hate it.</div></div>`;
}

function freeAgentView() {
  return `<section class="card hero"><h2>Free agent</h2><p style="margin:0">You have no club. You can't play until you sign for someone, but free agents can sign at any time.</p>
    <button class="btn block" data-act="findClubs">Ask your agent to find clubs</button></section>` + offersHtml() + inboxHtml();
}

function contractCard() {
  const p = S.player;
  if (p.loan) return `<section class="card"><h2>Contract</h2><p class="small" style="margin:0">On loan from ${club(p.loan.parent).name} · ${money(p.wage)}/wk · ${p.years} year${p.years !== 1 ? 's' : ''} left</p></section>`;
  const { breakout } = scoutBuzz();
  return `<section class="card"><div class="row"><h2>Contract</h2><span class="small">${money(p.wage)}/wk · ${p.years} yr${p.years !== 1 ? 's' : ''}</span></div>
    <div class="small muted">Market value for you here: about ${money(marketWage(calcOVR(), myClub()))}/wk${breakout ? ' · <span class="flood">Breakout season: top-flight scouts are watching</span>' : ''}</div>
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
      ${orderBox()}
      <button class="btn primary block" data-act="advance">Play matchday</button>
    </section>`;
  } else {
    matchCard = `<section class="card hero"><h2>Week ${S.week}</h2><p class="muted" style="margin:0">No league match this week. Rest, train and get ready.</p>
      <button class="btn primary block" data-act="advance">Next week</button></section>`;
  }
  const form = p.form.length ? `<section class="card"><div class="row"><h2>Form</h2><span class="small muted">Season avg ${avgRating(p.st)}</span></div><div class="form">${p.form.map(r => `<span class="${ratingClass(r)}">${r.toFixed(1)}</span>`).join('')}</div>
    <div class="small muted">${p.st.apps} apps · ${p.st.goals} goals · ${p.st.assists} assists</div></section>` : '';
  const tbl = leagueTable(myClub().league), myPos = tbl.findIndex(r => r.id === p.club) + 1;
  const money_ = `<section class="card"><div class="row"><h2>This week</h2><span class="small">Table: <b>${S.table[p.club].p ? myPos + ordinal(myPos) : "–"}</b></span></div>
    <div class="row small"><span class="muted">Wage + sponsors − rent</span><b class="num ${weeklyNet() >= 0 ? 'good' : 'bad'}">${weeklyNet() >= 0 ? '+' : ''}${money(weeklyNet())}</b></div></section>`;
  return matchCard + offersHtml() + managerCard() + contractCard() + form + money_ + inboxHtml();
}

function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }

function viewOffseason() {
  const sum = S.seasonSummary, p = S.player, age = ageOf(p.by);
  const delta = sum.ovrEnd - sum.ovrStart;
  return `<section class="card hero">
      <h2>Season ${seasonLabel(sum.season)} review</h2>
      <div class="row"><b style="font:800 24px var(--display)">${sum.club}</b><span>Finished <b>${sum.pos}${ordinal(sum.pos)}</b></span></div>
      <div class="bigstat"><div><b>${sum.apps}</b><small>Apps</small></div><div><b>${sum.goals}</b><small>Goals</small></div><div><b>${sum.assists}</b><small>Assists</small></div><div><b>${sum.apps ? sum.avg.toFixed(1) : '–'}</b><small>Rating</small></div></div>
      <div class="small">OVR ${sum.ovrStart} → <b>${sum.ovrEnd}</b> <span class="${delta >= 0 ? 'good' : 'bad'}">(${delta >= 0 ? '+' : ''}${delta})</span></div>
      ${sum.awards.map(a => `<div class="award">${esc(a)}</div>`).join('')}
    </section>
    <section class="card"><h2>Contract</h2>
      ${p.needsContract ? '<p class="bad" style="margin:0">Your contract has run out. Sign with a club below to continue.</p>' : `<p style="margin:0">${money(p.wage)}/week · ${p.years} year${p.years !== 1 ? 's' : ''} left at ${club(p.loan ? p.loan.parent : p.club).name}</p>`}
      ${sum.loanNext ? `<p class="small flood" style="margin:0">You made only ${sum.starts} starts, so you will be sent out on loan next season. Sign for another club to avoid it.</p>` : ''}
      ${sum.returning && p.loan ? `<p class="small muted" style="margin:0">Your loan ends. You return to ${club(p.loan.parent).name} for pre-season.</p>` : ''}
    </section>
    ${offersHtml()}
    ${p.needsContract ? "" : contractCard()}
    <section class="card">
      <button class="btn primary block" data-act="nextSeason" ${p.needsContract ? 'disabled' : ''}>Start ${seasonLabel(S.season + 1)}</button>
      ${age >= 33 ? '<button class="btn danger block" data-act="retireAsk">Retire</button>' : ''}
    </section>` + inboxHtml();
}

function careerTotals() {
  const c = S.player.career;
  return { apps: c.reduce((s, r) => s + r.apps, 0), goals: c.reduce((s, r) => s + r.goals, 0), assists: c.reduce((s, r) => s + r.assists, 0) };
}

function viewRetired() {
  const p = S.player, t = careerTotals();
  return `<section class="card hero"><h2>Career over</h2>
    <b style="font:800 28px var(--display)">${esc(p.name)}</b>
    <div class="bigstat"><div><b>${t.apps}</b><small>Apps</small></div><div><b>${t.goals}</b><small>Goals</small></div><div><b>${t.assists}</b><small>Assists</small></div><div><b>${p.trophies.length}</b><small>Titles</small></div></div>
    <div class="small muted">Peak OVR ${Math.max(...p.career.map(r => r.ovr), calcOVR())} · ${p.caps} international caps · Earned ${money(p.money)} in the bank</div>
    <button class="btn primary block" data-act="newAsk">Start a new career</button></section>` + careerTables();
}

// ---------- train ----------
function viewTrain() {
  const p = S.player, keys = attrKeys(p.pos), w = WEIGHTS[p.pos];
  const can = S.phase === 'season' && p.slots > 0 && !p.injured;
  const head = `<section class="card"><div class="row"><h2>Training</h2><span class="small"><b>${p.slots}</b>/${TRAIN_SLOTS} sessions left</span></div>
    <p class="small muted" style="margin:0">Each session uses ${TRAIN_ENERGY} energy. Your ${EQUIP_TIERS[p.equip].name.toLowerCase()} equipment gives ×${EQUIP_TIERS[p.equip].mult} XP; upgrade it in the Shop. Gains slow with age and as you near your potential. Your OVR is weighted the way EA rates a ${POS_NAMES[p.pos].toLowerCase()}.</p>
    ${p.injured ? '<p class="bad small" style="margin:0">You are injured and cannot train.</p>' : ''}
    ${S.phase !== 'season' ? '<p class="small muted" style="margin:0">Training resumes when the season starts.</p>' : ''}
  </section>`;
  const cards = keys.map(k => {
    const v = p.attrs[k], gain = trainGain(k);
    return `<div class="attr">
      <div><span class="name">${ATTR_NAMES[k]}</span>${w[k] >= .2 ? '<span class="key">key</span>' : ''}<div class="meta">+${gain.toFixed(2)} per session · ${Math.round(w[k] * 100)}% of your OVR</div></div>
      <div class="val num">${Math.floor(v)}<small class="dec">.${Math.floor((v % 1) * 10)}</small></div>
      <div class="bar"><i style="width:${v}%"></i></div>
      <button class="btn sm" style="grid-column:1/-1" data-act="train" data-v="${k}" ${can && p.energy >= TRAIN_ENERGY ? '' : 'disabled'}>Train ${ATTR_NAMES[k]}</button>
    </div>`;
  }).join('');
  return head + `<div class="attrs">${cards}</div>` + `<button class="btn block" data-act="rest" ${S.phase === 'season' && p.slots > 0 ? '' : 'disabled'}>Rest instead (+8 energy)</button>`;
}

// ---------- shop ----------
function viewShop() {
  const p = S.player;
  const fin = `<section class="card"><h2>Finances</h2>
    <div class="row small"><span class="muted">Wage</span><b class="num">${money(p.wage)}/wk</b></div>
    <div class="row small"><span class="muted">Sponsors (reputation ${Math.round(p.rep)})</span><b class="num">${money(sponsorIncome())}/wk</b></div>
    <div class="row small"><span class="muted">Rent</span><b class="num bad">−${money(HOUSING[p.house].rent)}/wk</b></div>
    <div class="row small"><span class="muted">Equipment</span><b class="num bad">−${money(EQUIP_TIERS[p.equip].fee)}/wk</b></div>
    <div class="row"><span>Net per week</span><b class="num ${weeklyNet() >= 0 ? 'good' : 'bad'}">${money(weeklyNet())}</b></div></section>`;
  const tiers = EQUIP_TIERS.map((t, i) => `<button class="house tier-${t.name.toLowerCase()} ${p.equip === i ? 'on' : ''}" data-act="equip" data-v="${i}" ${i && p.equip !== i && p.money < t.fee ? 'disabled' : ''}>
      <span><b class="tiername">${t.name}</b> · ×${t.mult} training XP${t.energy ? ` · +${t.energy} energy` : ''}<br><span class="small muted">${t.desc}</span></span><span class="num small">${t.fee ? `${money(t.fee)}/wk` : 'Free'}</span></button>`).join('');
  const houses = HOUSING.map((h, i) => `<button class="house ${p.house === i ? 'on' : ''}" data-act="house" data-v="${i}">
      <span><b>${h.name}</b><br><span class="small muted">${h.energy ? `+${h.energy} energy/week` : 'No energy bonus'}</span></span><span class="num small">${money(h.rent)}/wk</span></button>`).join('');
  return fin + `<section class="card"><h2>Training equipment</h2><p class="small muted" style="margin:0">Your equipment decides how fast your OVR rises. Paid weekly; if you run out of money you drop back to Normal.</p><div class="inbox">${tiers}</div></section>` + `<section class="card"><h2>Housing</h2><div class="inbox">${houses}</div></section>`;
}

// ---------- club ----------
function viewClub() {
  const c = myClub();
  const lid = viewLeague || c.league;
  const head = `<section class="card"><div class="row"><div><b style="font:700 22px var(--display)">${c.name}</b><div class="small muted">Manager: ${c.mgr} (${NATIONS[c.mgrNat] || c.mgrNat})</div></div>${crest(c.id)}</div>
    <div class="small muted">${league(c.league).name} (${TIER_LABEL[clubTier(c)].toLowerCase()}) · Team rating ${Math.round(teamStrength(c))} · Your role: <b style="color:var(--chalk)">${squadStatus()}</b></div></section>`;
  const seg = `<div class="seg">${[['table', 'Table'], ['rivals', 'Rivals'], ['squad', 'Squad'], ['scorers', 'Scorers']].map(([k, l]) => `<button class="${clubView === k ? 'on' : ''}" data-act="clubView" data-v="${k}">${l}</button>`).join('')}</div>`;
  const countries = [...new Set(S.leagues.map(l => l.country))];
  const lgSel = clubView === 'table' || clubView === 'scorers' ? `<select class="btn block" data-act="league" aria-label="League">${countries.map(ct => `<optgroup label="${ct}">${S.leagues.filter(l => l.country === ct).sort((a, b) => a.tier - b.tier).map(l => `<option value="${l.id}" ${l.id === lid ? 'selected' : ''}>${l.name}</option>`).join('')}</optgroup>`).join('')}</select>` : '';
  let body = '';
  if (clubView === 'rivals') {
    const order = peckingOrder(), slots = GROUP_SLOTS[POS_GROUP[S.player.pos]];
    body = `<section class="card"><h2>Pecking order</h2><p class="small muted" style="margin:0">Everyone fighting for the ${slots} ${{ GK: 'goalkeeper', DEF: 'defence', MID: 'midfield', FWD: 'attack' }[POS_GROUP[S.player.pos]]} spot${slots > 1 ? 's' : ''}. The manager picks on ability, affection and form. Above the line start.</p>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th>Pos</th><th class="r">OVR</th><th class="r">Affection</th></tr></thead><tbody>
      ${order.map((r, i) => `<tr class="${r.me ? 'me' : ''}" ${i === slots - 1 ? 'style="border-bottom:2px solid var(--flood)"' : ''}><td>${i + 1}</td><td class="clubname">${esc(r.n)}</td><td><span class="pos-tag">${r.pos}</span></td><td class="r">${r.r}</td><td class="r">${Math.round(r.a)}</td></tr>`).join('')}
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
  } else {
    const list = topScorers(lid, 15);
    body = `<section class="card"><div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th>Club</th><th class="r">Goals</th></tr></thead><tbody>
      ${list.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td class="clubname">${esc(r.n)}</td><td class="muted">${club(r.club).short}</td><td class="r"><b>${r.g}</b></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No goals yet this season.</td></tr>'}
      </tbody></table></div></section>`;
  }
  return head + seg + lgSel + body;
}

// ---------- career ----------
function careerTables() {
  const p = S.player;
  const rows = p.career.slice().reverse().map(r => `<tr><td>${seasonLabel(r.season)}</td><td class="clubname">${r.club}</td><td class="r">${r.apps}</td><td class="r">${r.goals}</td><td class="r">${r.assists}</td><td class="r">${r.apps ? r.avg.toFixed(2) : '–'}</td><td class="r">${r.ovr}</td></tr>`).join('');
  const honours = [...p.trophies.map(t => `${t.name} (${t.club})`), ...p.awards.map(a => a.name)];
  const seasons = [...p.trophies.map(t => t.season), ...p.awards.map(a => a.season)];
  return `<section class="card"><h2>Career history</h2>${rows ? `<div class="tablewrap"><table><thead><tr><th>Season</th><th>Club</th><th class="r">App</th><th class="r">G</th><th class="r">A</th><th class="r">Avg</th><th class="r">OVR</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<span class="small muted">Your first season is under way.</span>'}</section>
    <section class="card"><h2>Honours</h2>${honours.length ? `<div class="inbox">${honours.map((h, i) => `<div class="award">${esc(h)} <span class="small muted">${seasonLabel(seasons[i])}</span></div>`).join('')}</div>` : '<span class="small muted">No trophies yet.</span>'}</section>`;
}

function potentialRange() {
  const p = S.player, spread = Math.max(2, 6 - p.career.length);
  return `${clamp(p.pot - spread, 1, 99)}–${clamp(p.pot + Math.floor(spread / 2), 1, 99)}`;
}

function viewCareer() {
  const p = S.player, t = careerTotals();
  const value = Math.round(marketWage(calcOVR(), myClub()) * 52 * Math.max(1, 30 - ageOf(p.by)) / 3 / 1e4) * 1e4;
  return `<section class="card hero"><h2>Profile</h2>
      <div class="kv"><div><small>Position</small><b>${POS_NAMES[p.pos]}</b></div><div><small>Nation</small><b>${NATIONS[p.nat] || p.nat}</b></div><div><small>Potential</small><b>${potentialRange()}</b></div>
      <div><small>Reputation</small><b>${Math.round(p.rep)}/100</b></div><div><small>Value</small><b>${money(value)}</b></div><div><small>Caps</small><b>${p.caps}</b></div></div></section>
    <section class="card"><h2>This season</h2><div class="bigstat"><div><b>${p.st.apps}</b><small>Apps</small></div><div><b>${p.st.goals}</b><small>Goals</small></div><div><b>${p.st.assists}</b><small>Assists</small></div><div><b>${avgRating(p.st)}</b><small>Rating</small></div></div>
      <div class="small muted">Career: ${t.apps + p.st.apps} apps · ${t.goals + p.st.goals} goals · ${t.assists + p.st.assists} assists</div></section>
    ${careerTables()}
    <section class="card"><h2>Game</h2><p class="small muted" style="margin:0">Progress saves automatically on this device.</p><button class="btn danger block" data-act="newAsk">Start a new career</button></section>`;
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

function showPopup(pop) {
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

function startFx(canvas, kind) {
  const dpr = window.devicePixelRatio || 1, ctx = canvas.getContext('2d');
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const parts = [];
  const colors = ['#ffb547', '#4cc38a', '#eef2f7', '#7cc7ff', '#ff9ec7'];
  let last = 0;
  const burst = () => {
    const x = W * rand(.15, .85), y = H * rand(.12, .45), col = pick(colors);
    for (let i = 0; i < 46; i++) {
      const a = Math.PI * 2 * i / 46, s = rand(1.5, 4.2) * dpr;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col, r: rand(1.5, 2.6) * dpr });
    }
  };
  const drops = kind === 'bad' ? Array.from({ length: 90 }, () => ({ x: rand(0, W), y: rand(0, H), v: rand(4, 9) * dpr, l: rand(10, 26) * dpr })) : [];
  const frame = t => {
    ctx.clearRect(0, 0, W, H);
    if (kind === 'good') {
      if (t - last > 650) { burst(); last = t; }
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
  fxFrame = requestAnimationFrame(frame);
}

function showDecision() {
  const d = S.decision;
  const opts = d.type === 'rumour'
    ? [['deny', 'Deny it publicly', 'The manager likes loyalty (+3)'], ['silent', 'Say nothing', 'He wonders why you stayed quiet (−1)']]
    : [['reject', 'Reject them', `Show you are committed (+${d.rival ? 8 : 4}${d.rival ? ', rivals!' : ''})`], ['listen', 'Tell your agent to listen', 'They may bid in the window (−2)']];
  openModal(`<h3>${d.type === 'rumour' ? 'Rumours' : 'Transfer approach'}</h3><p style="margin:0">${esc(d.text)}</p>
    <div class="inbox">${opts.map(([v, l, s]) => `<button class="house" data-act="decide" data-v="${v}"><span><b>${l}</b><br><span class="small muted">${s}</span></span></button>`).join('')}</div>`);
}

function showOrderSheet() {
  const o = S.player.order;
  openModal(`<h3>Manager's plan</h3><p style="margin:0">Before the game, ${myClub().mgr} pulls you aside: “${esc(o.text)}”</p>
    <div class="inbox">
      <button class="house" data-act="orderGo" data-v="follow"><span><b>Follow the plan</b><br><span class="small muted">Small boost to the team's chances. Affection +2 if you play.</span></span></button>
      <button class="house" data-act="orderGo" data-v="own"><span><b>Play my own game</b><br><span class="small muted">Better chance to score or assist. Affection −6 if you play.</span></span></button>
    </div>`);
}

function doAdvance() { const rep = advanceWeek(); render(); if (rep) showMatchReport(rep); }

function openModal(html) { modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; modal.hidden = false; }
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

function showMatchReport(rep) {
  const m = rep.match;
  const p = S.player;
  let html = '';
  if (m) {
    const u = m.user;
    const home = m.scorers.filter(s => s.home), away = m.scorers.filter(s => !s.home);
    const lines = Math.max(home.length, away.length);
    let sc = '';
    for (let i = 0; i < lines; i++) sc += `<span class="${home[i] && home[i].me ? 'me' : ''}">${home[i] ? esc(home[i].n) : ''}</span><span class="a ${away[i] && away[i].me ? 'me' : ''}">${away[i] ? esc(away[i].n) : ''}</span>`;
    const mine = m.isHome ? m.gh : m.ga, theirs = m.isHome ? m.ga : m.gh;
    const verdict = mine > theirs ? '<span class="good">Win</span>' : mine < theirs ? '<span class="bad">Defeat</span>' : '<span class="muted">Draw</span>';
    html += `<div class="row"><h3>Full time</h3>${verdict}</div>
      <div class="fixture"><div class="team">${crest(m.h)}<b>${club(m.h).name}</b></div><div class="score num">${m.gh}–${m.ga}</div><div class="team">${crest(m.a)}<b>${club(m.a).name}</b></div></div>
      ${sc ? `<div class="scorers">${sc}</div>` : ''}
      ${u.mins ? `<div class="bigstat"><div><b>${u.rating.toFixed(1)}</b><small>Rating</small></div><div><b>${u.mins}'</b><small>${u.start ? 'Started' : 'Sub'}</small></div><div><b>${u.goals}</b><small>Goals</small></div><div><b>${u.assists}</b><small>Assists</small></div></div>`
        : `<p class="muted" style="margin:0">${p.injured || rep.events.some(e => e.startsWith('Injured')) ? 'You were out injured.' : 'You stayed on the bench.'}</p>`}`;
  } else {
    html += `<h3>Week ${rep.week} done</h3><p class="muted" style="margin:0">No match this week.</p>`;
  }
  html += rep.events.map(e => `<div class="award">${esc(e)}</div>`).join('');
  html += `<div class="row small"><span class="muted">Weekly income</span><b class="num ${rep.net >= 0 ? 'good' : 'bad'}">${rep.net >= 0 ? '+' : ''}${money(rep.net)}</b></div>`;
  html += `<button class="btn primary block" data-act="close">${S.phase === 'offseason' ? 'See season review' : 'Continue'}</button>`;
  openModal(html);
}

function confirmSheet(title, text, act, label) {
  openModal(`<h3>${title}</h3><p class="muted" style="margin:0">${text}</p><div class="btns"><button class="btn danger" data-act="${act}">${label}</button><button class="btn" data-act="close">Cancel</button></div>`);
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
    case 'train': { const g = train(v); if (g != null) toast(`${ATTR_NAMES[v]} +${g.toFixed(2)}`); render(); return; }
    case 'rest': rest(); toast('Rested: +8 energy'); render(); return;
    case 'advance': if (S.player.order && !S.player.order.choice) showOrderSheet(); else doAdvance(); return;
    case 'order': setOrderChoice(v); render(); return;
    case 'orderGo': setOrderChoice(v); closeModal(); doAdvance(); return;
    case 'decide': resolveDecision(v); closeModal(); render(); return;
    case 'popNext': closePopup(); return;
    case 'findClubs': toast(findClubs() ? 'Your agent is making calls' : 'Try again next week'); render(); return;
    case "equip": if (setEquip(+v)) toast(`${EQUIP_TIERS[+v].name} equipment`); render(); return;
    case "refresh": refreshStartChoices(); render(); window.scrollTo(0, 0); return;
    case "askContract": { const r = requestContract(); toast(r === "offer" ? "New contract offered" : r === "refused" ? "The board said no" : r === "soon" ? "Too soon to ask again" : "Not possible right now"); render(); return; }
    case "listAsk": confirmSheet("Request a transfer?", "The manager (−15) and the board (−20) will be unhappy. Clubs will bid for you in the transfer windows.", "list", "Hand in request"); return;
    case "list": requestTransfer(); closeModal(); render(); return;
    case "unlist": withdrawTransferRequest(); render(); return;
    case 'house': setHouse(+v); render(); return;
    case 'choose': chooseStart(v); tab = 'home'; render(); window.scrollTo(0, 0); return;
    case 'accept': acceptOffer(v); toast('Contract signed'); render(); return;
    case 'negAsk': showNegotiate(v); return;
    case 'neg': { const [id, i] = v.split(':'); const r = negotiate(id, +i); closeModal(); toast(r === 'accepted' ? 'They agreed!' : r === 'withdrawn' ? 'Offer withdrawn' : 'They said no'); render(); return; }
    case 'decline': declineOffer(v); render(); return;
    case 'nextSeason': if (startNextSeason()) { tab = 'home'; window.scrollTo(0, 0); } render(); return;
    case 'retireAsk': confirmSheet('Retire?', 'Your career will end and you will see your final summary.', 'retire', 'Retire'); return;
    case 'retire': retire(); closeModal(); render(); return;
    case 'newAsk': confirmSheet('Start over?', 'This deletes your current career save on this device.', 'newGame', 'Delete and start over'); return;
    case 'newGame': wipe(); closeModal(); draft.name = ''; render(); return;
    case 'close': closeModal(); render(); return;
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.act === 'league') { viewLeague = e.target.value; render(); }
});

modal.addEventListener('click', e => { if (e.target === modal) { closeModal(); render(); } });

// Service worker only works over http(s), not when opened as a local file.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

load();
render();
