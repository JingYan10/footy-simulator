// UI: renders screens from engine state and handles taps.

const app = document.getElementById('app');
const modal = document.getElementById('modal');
let tab = 'home';
let clubView = 'table';
let viewLeague = null;
let honTab = 'ind';
const draft = { name: '', nat: 'ENG', pos: 'ST', birth: '2010-01-01', foot: 'R' };

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
    <div class="field"><label for="f-birth">Date of birth</label><input id="f-birth" type="date" min="1960-01-01" max="2015-12-31" value="${draft.birth}" required><span class="small muted">Your career starts in the summer of ${+draft.birth.slice(0, 4) + START_AGE}, the year you turn ${START_AGE}.</span></div>
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
    if (e.target.id === 'f-birth' && e.target.value) { draft.birth = e.target.value; renderCreate(); document.getElementById('f-birth').focus(); }
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
    <p class="lede">${esc(S.player.name)}, ${POS_NAMES[S.player.pos].toLowerCase()}, age ${realAge()}, OVR <b style="color:var(--chalk)">${ovr}</b>. Five clubs have offered a 3-year youth contract.</p>
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
  // Some crests are packed into one script (js/logos-tur.js) instead of separate files.
  const packed = typeof LOGO_DATA !== 'undefined' && LOGO_DATA[`${dir}/${c.name}`];
  if (packed) return packed;
  return `Club_logos/${encodeURIComponent(dir)}/${encodeURIComponent(c.name)}.${ext}`;
}

function crest(id, size = '') {
  // National teams show their flag (js/flags.js), or their code if there is none.
  const flag = isNation(id) && typeof FLAG_DATA !== 'undefined' && FLAG_DATA[id.slice(2)];
  if (flag) return `<div class="crest ${size} nation hasflag"><img src="${flag}" alt=""><span>${teamCode(id).slice(0, 4)}</span></div>`;
  if (!isClub(id)) return `<div class="crest ${size} ${isNation(id) ? 'nation' : ''}"><span>${teamCode(id).slice(0, 4)}</span></div>`;
  const c = club(id), st = logoState[id] ?? 0;
  const img = st >= 0 ? `<img src="${logoUrl(c, LOGO_EXTS[st])}" alt="" data-club="${id}" data-ext="${st}">` : '';
  return `<div class="crest ${id === S.player.club ? 'me' : ''} ${st >= 0 ? 'haslogo' : ''} ${size}">${img}<span>${c.short.slice(0, 4)}</span></div>`;
}

// Try the next file type, then give up and show the short name.
// In the league table, results, cups and career history every crest gets about the same visible area, like Google's standings: a tall
// crest (Juventus) is drawn a little smaller and a wide one (Lazio) a little bigger, within a 22px square.
const LGT_BOX = 22, LGT_AREA = 16 * 16;
document.addEventListener('load', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('table.lgt, .lgcrest, .spell, .stint') || img.closest('.nation') || !img.naturalWidth) return;
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
    img.dataset.ext = next;
    img.src = logoUrl(id.startsWith('db:') ? dbClubCache[id.slice(3)] : club(id), LOGO_EXTS[next]);
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
      : o.type === 'renew' && S.phase === 'season' && !negLocked() && !o.talksOver ? '<div class="small muted">Starts next season: you finish this season on your current deal.</div>'
      : o.talksOver ? '<div class="small bad">Talks broke down. You can still sign this offer or decline it, but not negotiate.</div>'
      : negLocked() ? `<div class="small muted">Salary talks are locked until about week ${lockWeekLabel()}. You can still sign.</div>` : '';
    return `<div class="offer">
      <div class="row"><div class="clubcell">${crest(c.id, "small")}<div style="min-width:0"><div class="club">${c.name}</div><div class="small muted">${league(c.league).name} · Team rating ${Math.round(teamStrength(c))}</div></div></div>
      <span class="chip ${o.clause ? 'good' : o.type === 'renew' ? '' : 'flood'}">${o.clause ? 'Loyalty deal' : o.raise ? 'Pay rise' : o.type === 'renew' ? 'Renewal' : 'Transfer'}</span></div>
      <div class="kv"><div><small>Wage</small><b class="num">${money(o.wage)}/wk</b></div><div><small>Years</small><b>${o.years}</b><small>until end of ${seasonLabel(offerEnds(o))}</small></div><div><small>Role</small><b class="${o.promised ? 'good' : dropped ? 'bad' : ''}">${role}${o.promised ? ' (promised)' : ''}</b></div></div>
      ${o.type === 'transfer' ? signRoleNote(c) : ''}
      <div class="small muted">Current wage ${money(S.player.wage)}/wk${o.promised ? ' · They promise you a starting place' : ''}</div>
      ${o.type === 'renew' && !o.raise && ROLE_RANK[role] >= 2 ? `<div class="small good">Sign as ${role.toLowerCase()} and your starting place is protected for ${RENEW_PROMISE} games.</div>` : ''}
      ${dropped ? `<div class="small bad">Was offered as ${o.status.toLowerCase()}: your contract talks cost you affection with ${esc(c.mgr)}, and your place with it.</div>` : ''}
      ${o.type === 'transfer' && rivalBetrayal(o.club).length ? `<div class="small bad"><b>Rivals of ${rivalBetrayal(o.club).map(id => esc(club(id).name)).join(' and ')}.</b> Join them and ${rivalBetrayal(o.club).length > 1 ? 'those clubs' : 'that club'} will hate you and never approach you again. You could never be a legend at either club.</div>` : ''}
      ${o.type === 'transfer' && leagueGrowth(c) < 1 ? '<div class="small flood">Big money, weaker league: your OVR will grow more slowly here.</div>' : ''}
      ${o.block ? `<div class="small flood"><b>Release clause:</b> for ${o.block} year${o.block > 1 ? 's' : ''} after you sign, ${esc(c.name)} block any move and salary talks. Breaking it costs ${money(o.blockFee)}.</div>` : ''}
      <div class="loyal ${o.type === 'transfer' ? 'away' : ''}"><p>"${offerPitch(o, c)}"</p><span>— ${esc(c.mgr)}, ${esc(c.name)}</span></div>
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
  return `<section class="card"><div class="row"><h2>Manager</h2><span class="small">${c.mgr}</span></div>
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
    ${canAskChance() ? `<div class="chance-ask"><div class="small muted">Only a ${Math.round(startChance().start * 100)}% chance of starting. Ask ${esc(c.mgr)} to play you: you'll start ${Math.round(CHANCE_START * 100)}% of the next ${CHANCE_GAMES} league games, but he sets a 3-month target ${CHANCE_HARDER}× tougher than usual. Hit it and he warms to you (+7); miss it and affection drops by 6.</div><button class="btn sm primary" data-act="askChance">Ask for a chance</button></div>` : ''}</section>`;
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
  if (fx) {
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
    </section>`;
  } else {
    matchCard = `<section class="card hero"><h2>Week ${S.week}</h2>${weekStrip()}<p class="muted" style="margin:0">${leagueDone() ? 'The league game is done. Next up: the midweek game.' : 'No league match this week. Rest, train and get ready.'}</p>
      ${S.phase === 'season' && !p.injured ? (p.slots > 0 ? `<div class="small flood" style="text-align:center">${p.slots} training session${p.slots > 1 ? 's' : ''} left this week</div>` + tiredNote('div') : '<div class="small bad" style="text-align:center">You have already trained this week: no sessions left until next week.</div>') : ''}
      ${euroLine()}
      ${midweekFixture() ? '<button class="btn primary block" data-act="matchday">To matchday</button>' : '<button class="btn primary block" data-act="advance">Next week</button>'}</section>`;
  }
  const form = p.form.length ? `<section class="card"><div class="row"><h2>Form</h2><span class="small muted">Season avg ${avgRating(p.st)}</span></div><div class="form">${p.form.map(r => `<span class="${ratingClass(r)}">${r.toFixed(1)}</span>`).join('')}</div>
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
const todayDate = () => leagueDone() && midweekFixture() ? dayAfter(midweekOffset(midweekFixture())) : weekDate();
const dayLabel = d => `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
// This week, day by day: today is the Saturday, games marked with the opponent's crest.
function weekStrip() {
  const fx = nextFixture(), e = midweekFixture(), mo = e ? midweekOffset(e) : -1, today = leagueDone() ? mo : 0;
  return `<div class="week-strip">${[0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = dayAfter(i), game = i === 0 && fx ? { opp: fx.opp, tag: leagueDone() ? 'Played' : 'League' } : i === mo ? { opp: e.opp, tag: compShort(e.t.name) } : null;
    return `<div class="wd${i === today ? ' today' : ''}${game ? ' game' : ''}${i < today ? ' past' : ''}"><small>${i === today ? 'Today' : DAY_NAMES[d.getUTCDay()]}</small><b>${d.getUTCDate()}</b>${game ? `${crest(game.opp, 'mini')}<span>${game.tag}</span>` : '<span class="rest">–</span>'}</div>`;
  }).join('')}</div>`;
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
      <div class="row"><b style="font:800 24px var(--display)">${sum.club}</b><span>Finished <b>${sum.pos}${ordinal(sum.pos)}</b></span></div>
      ${sum.clubs && sum.clubs.length > 1 ? `<div class="small muted">This season: ${sum.clubs.map(esc).join(' → ')}. Stats cover all of them.</div>` : ''}
      <div class="${statGrid(p.pos)}"><div><b>${sum.apps}</b><small>Apps</small></div><div><b>${sum.goals}</b><small>Goals</small></div><div><b>${sum.assists}</b><small>Assists</small></div>${gkCells(p.pos, sum.saves, sum.cleanAll)}<div><b>${sum.apps ? sum.avg.toFixed(1) : '–'}</b><small>Rating</small></div></div>
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
  if (sum.review) rows.push(`Performance review: <b class="${cls(sum.review.change)}">${sign(sum.review.change)}</b>${sum.review.notes.length ? ` (${esc(sum.review.notes.join(', '))})` : ''}`);
  if (sum.ageLoss > 0) rows.push(`Ageing, turning ${sum.ageTo}: <b class="bad">−${sum.ageLoss}</b>. From 34 your body slows down a little more every birthday.`);
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
    const ko = t.ko.map(k => { const r = k.res.find(x => x.h === me || x.a === me); return r ? `<div class="small">${k.name}: ${esc(teamName(r.h))} ${r.gh}–${r.ga} ${esc(teamName(r.a))}${r.pens ? ` (${esc(teamName(r.pens))} win ${r.pensScore ? pensText(r) + ' ' : ''}on penalties)` : ''}</div>` : ''; }).join('');
    return `<section class="card hero"><div class="row"><h2>${esc(t.name)}</h2><span class="small">${isNation(me) ? esc(natName(me.slice(2))) : esc(teamName(me))}</span></div>
      ${body}${table}${ko}
      ${t.winner ? '' : `<div class="btns"><button class="btn primary sm" data-act="summerPlay">Play ${st.name.toLowerCase()}</button><button class="btn sm" data-act="summerSim">Simulate the rest</button></div>`}</section>`;
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
function retiredHtml(rec, newAct = 'menu') {
  const t = careerTotals(rec);
  return `<section class="card hero"><h2>Career over</h2>
    <b style="font:800 28px var(--display)">${esc(rec.name)}</b>
    <div class="small muted">${POS_NAMES[rec.pos]} · ${esc(natName(rec.nat))} · Last club ${esc(rec.lastClub)} · Retired at ${rec.retiredAge}</div>
    <div class="${statGrid(rec.pos)}"><div><b>${t.apps}</b><small>Apps</small></div><div><b>${t.goals}</b><small>Goals</small></div><div><b>${t.assists}</b><small>Assists</small></div>${gkCells(rec.pos, t.saves, t.cleanAll)}<div><b>${rec.trophies.length}</b><small>Titles</small></div></div>
    <div class="small muted">Peak OVR ${rec.peak} · ${rec.caps} international caps · Earned ${money(rec.money)} in the bank</div>
    <button class="btn primary block" data-act="${newAct}">Start a new career</button></section>` + iconCardHtml(rec) + legacyCard(rec) + clubStints(rec) + careerTables(rec);
}

// The retirement Icon card: prime OVR, the three positions you played most, and your main club.
function iconCardHtml(rec) {
  const ic = iconCard(rec), t = careerTotals(rec), top = clubLegacy(rec)[0], gk = ic.pos === 'GK';
  const nums = gk ? [[t.apps, 'APP'], [t.cleanAll || 0, 'CS'], [t.saves || 0, 'SV'], [rec.trophies.length, 'TTL']]
    : [[t.apps, 'APP'], [t.goals, 'GOL'], [t.assists, 'AST'], [rec.trophies.length, 'TTL']];
  const why = ic.prime ? `average of your ${ic.prime} season${ic.prime > 1 ? 's' : ''} aged 25 to 33` : 'your peak, as you retired before 25';
  // Like an EA card: six stats in two columns, averaged the same way as the OVR. Old careers saved
  // without stats show career numbers instead.
  const order = ic.stats && ('DIV' in ic.stats ? ['DIV', 'HAN', 'KIC', 'REF', 'PHY', 'POS'] : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY']);
  const label = k => 'DIV' in (ic.stats || {}) && k === 'PHY' ? 'SPD' : k;
  const statsHtml = order ? `<div class="ic-stats">${[order.slice(0, 3), order.slice(3)].map(col => `<div>${col.map(k => `<div><b>${ic.stats[k]}</b><small>${label(k)}</small></div>`).join('')}</div>`).join('')}</div>` : '';
  const totals = gk ? `${t.apps} apps · ${t.cleanAll || 0} clean sheets · ${t.saves || 0} saves · ${rec.trophies.length} troph${rec.trophies.length === 1 ? 'y' : 'ies'}` : `${t.apps} apps · ${t.goals} goals · ${t.assists} assists · ${rec.trophies.length} troph${rec.trophies.length === 1 ? 'y' : 'ies'}`;
  return `<section class="card"><h2>Icon card</h2>
    <div class="icon-card">
      <div class="ic-top"><div class="ic-ovr"><b>${ic.ovr}</b><span>${ic.pos}</span>${ic.alts.map(a => `<i>${a}</i>`).join('')}</div>
        <div class="ic-side">${top ? rowCrest(top) : ''}<span class="ic-tag">ICON</span></div></div>
      <svg class="ic-man" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="34" r="20"/><path d="M12 100c0-24 17-38 38-38s38 14 38 38z"/></svg>
      <div class="ic-name">${esc(rec.name)}</div>
      ${statsHtml || `<div class="ic-nums">${nums.map(([v, k]) => `<div><b>${v}</b><small>${k}</small></div>`).join('')}</div>`}
      <div class="ic-nat">${typeof FLAG_DATA !== 'undefined' && FLAG_DATA[rec.nat] ? `<img src="${FLAG_DATA[rec.nat]}" alt="">` : ''}${esc(natName(rec.nat))}</div>
    </div>
    <p class="small muted" style="margin:0;text-align:center">OVR ${ic.ovr}${statsHtml ? ' and card stats' : ''}: ${why}.<br>${statsHtml ? `${totals}<br>` : ''}Most games: ${ic.apps.map(([k, n]) => `${k} ${n}`).join(' · ')}</p></section>`;
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
      last.to = r.season; last.seasons.add(r.season);
      last.apps += r.apps; last.goals += r.goals; last.assists += r.assists; last.rsum += r.avg * r.apps; last.saves += r.saves || 0; last.clean += r.cleanAll || 0;
    } else stints.push({ club: r.club, clubId: r.clubId, league: r.league, from: r.season, to: r.season, seasons: new Set([r.season]), apps: r.apps, goals: r.goals, assists: r.assists, rsum: r.avg * r.apps, saves: r.saves || 0, clean: r.cleanAll || 0 });
  });
  if (!stints.length) return '';
  const cards = stints.slice().reverse().map(s => {
    const n = s.seasons.size, span = s.from === s.to ? seasonLabel(s.from) : `${seasonLabel(s.from)} – ${seasonLabel(s.to)}`;
    return `<div class="stint"><div class="row"><div class="clubcell">${rowCrest(s)}<div style="min-width:0"><b class="club">${esc(s.club)}</b><div class="small muted">${span} · ${n} season${n !== 1 ? 's' : ''}</div></div></div></div>
      <div class="spellstats"><span><b>${s.apps}</b> apps</span><span><b>${s.goals}</b> G</span><span><b>${s.assists}</b> A</span>${gkSpans(rec.pos, s.saves, s.clean)}<span><b>${s.apps ? (s.rsum / s.apps).toFixed(2) : '–'}</b></span></div></div>`;
  }).join('');
  return `<section class="card"><h2>Clubs</h2><p class="small muted" style="margin:0">Every spell at a club, all competitions added up.</p>${cards}</section>`;
}

function viewRetired() { return retiredHtml(retiredRecord()); }

// A past career opened from the landing page.
function renderPast() {
  const rec = loadArchive().find(r => r.id === pastView);
  if (!rec) { pastView = null; landing = true; render(); return; }
  // Seasons are labelled from the year that career started.
  labelBase = rec.startYear || START_YEAR;
  try { app.innerHTML = `<div class="create wrap">${retiredHtml(rec, 'freshStart')}<button class="btn block" data-act="pastBack">Back</button></div>`; } finally { labelBase = null; }
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
    <div class="row small"><span class="muted">Wage</span><b class="num">${money(p.wage)}/wk</b></div>
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
    ? `<div class="row"><span class="clubcell">${crest(p.wish, 'mini')}<b>${esc(w.name)}</b></span><span class="chip flood">Waiting</span></div><div class="small muted">They decide at the transfer window. Chance: ${wishOdds(p.wish).toLowerCase()}.</div>`
    : `<div class="row"><span class="clubcell">${crest(p.wish, 'mini')}<b>${esc(w.name)}</b></span>${p.wishResult === 'offer' ? '<span class="chip good">Offered</span>' : p.wishResult === 'no' ? '<span class="chip bad">No bid</span>' : `<span class="small muted">${seasonLabel(p.wishSeason)}</span>`}</div>`;
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
    return `<button class="house" data-act="wishGo" data-v="${c.id}" ${isBanned(c.id) ? 'disabled' : ''}><span class="clubcell">${crest(c.id, 'mini')}<span><b>${esc(c.name)}</b><br><span class="small muted">Team rating ${Math.round(teamStrength(c))} · ${odds}</span></span></span></button>`;
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
  const c = myClub();
  const lid = viewLeague || c.league;
  const head = `<section class="card"><div class="row"><div><b style="font:700 22px var(--display)">${c.name}</b><div class="small muted">Manager: ${c.mgr} (${NATIONS[c.mgrNat] || c.mgrNat})</div></div>${crest(c.id)}</div>
    <div class="small muted">${league(c.league).name} (${TIER_LABEL[clubTier(c)].toLowerCase()}) · Team rating ${Math.round(teamStrength(c))} · Your role: <b style="color:var(--chalk)">${squadStatus()}</b></div></section>`;
  const seg = `<div class="seg">${[['table', 'Table'], ['results', 'Results'], ['rivals', 'Rivals'], ['squad', 'Squad'], ['scorers', 'Goals'], ['assists', 'Assists'], ['cups', 'Cups']].map(([k, l]) => `<button class="${clubView === k ? 'on' : ''}" data-act="clubView" data-v="${k}">${l}</button>`).join('')}</div>`;
  const countries = [...new Set(S.leagues.map(l => l.country))];
  const lgSel = ['table', 'scorers', 'assists'].includes(clubView) ?`<select class="btn block" data-act="league" aria-label="League">${countries.map(ct => `<optgroup label="${ct}">${S.leagues.filter(l => l.country === ct).sort((a, b) => a.tier - b.tier).map(l => `<option value="${l.id}" ${l.id === lid ? 'selected' : ''}>${l.name}</option>`).join('')}</optgroup>`).join('')}</select>` : '';
  let body = '';
  if (clubView === 'rivals') {
    const order = peckingOrder(), slots = formationSlots(myClub(), POS_GROUP[S.player.pos]);
    body = `<section class="card"><h2>Pecking order</h2><p class="small muted" style="margin:0">Everyone fighting for the ${slots} ${{ GK: 'goalkeeper', DEF: 'defence', MID: 'midfield', FWD: 'attack' }[POS_GROUP[S.player.pos]]} spot${slots > 1 ? 's' : ''} in ${esc(myClub().mgr)}'s <b>${formationOf(myClub())}</b>. The manager picks on ability, affection and form; players whose position the shape has no place for are picked less. Above the line start.</p>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th>Pos</th><th class="r">OVR</th><th class="r">Affection</th></tr></thead><tbody>
      ${order.map((r, i) => `<tr class="${r.me ? 'me' : ''}" ${i === slots - 1 ? 'style="border-bottom:2px solid var(--flood)"' : ''}><td>${i + 1}</td><td class="clubname">${esc(r.n)}${r.inj ? ` <span class="bad small">injured ${r.inj}w</span>` : ''}</td><td><span class="pos-tag ${fitsFormation(r.pos, myClub()) ? '' : 'off'}" title="${fitsFormation(r.pos, myClub()) ? '' : 'No natural place in this formation'}">${r.pos}</span></td><td class="r">${r.r}</td><td class="r">${Math.round(r.a)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  } else if (clubView === 'table') {
    const tbl = leagueTable(lid), n = tbl.length, tier = league(lid).tier;
    body = `<section class="card"><div class="tablewrap"><table class="lgt"><thead><tr><th>#</th><th>Club</th><th class="r">P</th><th class="r wdl">W</th><th class="r wdl">D</th><th class="r wdl">L</th><th class="r">GD</th><th class="r pts">Pts</th><th class="l5">Last 5</th></tr></thead><tbody>
      ${tbl.map((r, i) => `<tr class="${r.id === S.player.club ? 'me' : ''} ${i < (tier === 1 ? 4 : PROMOTE) ? 'zone-cl' : i >= n - PROMOTE && tier < 3 ? 'zone-rel' : ''}"><td>${i + 1}</td><td class="clubname"><span class="clubcell">${crest(r.id, "mini")}${club(r.id).name}</span></td><td class="r">${r.p}</td><td class="r wdl">${r.w}</td><td class="r wdl">${r.d}</td><td class="r wdl">${r.l}</td><td class="r">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="r pts"><b>${r.pts}</b></td><td class="l5">${formDots(r.f)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  } else if (clubView === 'squad') {
    const p = S.player;
    const rows = c.players.map(pl => ({ ...pl, age: ageOf(pl.by) }));
    rows.push({ n: p.name, pos: p.pos, age: ageOf(p.by), nat: p.nat, r: calcOVR(), me: true });
    rows.sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.r - a.r);
    body = `<section class="card"><div class="tablewrap"><table><thead><tr><th>Pos</th><th>Player</th><th>Nat</th><th class="r">Age</th><th class="r">OVR</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td><span class="pos-tag">${r.pos}</span></td><td class="clubname">${esc(r.n)}</td><td class="natcell">${natFlag(r.nat)}</td><td class="r">${r.age}</td><td class="r"><b>${r.r}</b></td></tr>`).join('')}
      </tbody></table></div></section>`;
  } else if (clubView === 'results') {
    body = `<div class="lgcrest">${resultsView()}</div>`;
  } else if (clubView === 'cups') {
    body = `<div class="lgcrest">${cupsView()}</div>`;
  } else {
    const assists = clubView === 'assists', list = assists ? topAssists(lid, 15) : topScorers(lid, 15);
    body = `<div class="lgcrest"><section class="card"><div class="tablewrap"><table><thead><tr><th>#</th><th>Player</th><th class="clubcrest">Club</th><th class="r">${assists ? 'Assists' : 'Goals'}</th></tr></thead><tbody>
      ${list.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td class="clubname">${esc(r.n)}</td><td class="clubcrest" title="${esc(club(r.club).name)}">${crest(r.club, 'mini')}</td><td class="r"><b>${r.g}</b></td></tr>`).join('') || `<tr><td colspan="4" class="muted">No ${assists ? 'assists' : 'goals'} yet this season.</td></tr>`}
      </tbody></table></div></section></div>`;
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
    return `<details class="result ${r.comp === 'Champions League' ? 'ucl' : ''}"><summary>
        <span class="rmeta"><span class="small muted">Wk ${Math.min(r.week, SEASON_WEEKS)}</span><span class="rcomp ${r.kind || 'league'}">${esc(r.comp || 'League')}</span>${r.derby ? `<span class="rderby">${esc(r.derby)}</span>` : ''}</span>
        <span class="rline">${tieRow(h, a, { gh, ga, pens: r.pens, pensScore: r.pensScore, winner: r.winner || (gh > ga ? h : ga > gh ? a : null) })}</span>
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
  return `<div class="tie2 ${mine ? 'me' : ''}">${side(h)}<span class="tscore num">${r ? `${r.gh}–${r.ga}` : 'v'}${r && r.pens ? `<small>${r.pensScore ? pensText(r) + ' ' : ''}pens</small>` : ''}</span>${side(a, true)}</div>`;
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
  const img = st >= 0 ? `<img src="${logoUrl(c, LOGO_EXTS[st])}" alt="" data-club="${esc(key)}" data-ext="${st}">` : '';
  return `<div class="crest ${st >= 0 ? 'haslogo' : ''} mini">${img}<span>${esc(c.short.slice(0, 4))}</span></div>`;
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
    const cards = spells.map(r => `<div class="spell"><div class="clubcell">${rowCrest(r)}<div style="min-width:0"><b class="club">${esc(r.club)}</b><div class="small muted">${esc(r.league)}</div>${r.pos ? `<div class="posline"><span class="pos-main" title="Main position">${r.pos}</span>${(r.alts || []).length ? `<span class="pos-also">also</span>${r.alts.map(x => `<span class="pos-alt" title="Secondary position">${x}</span>`).join('')}` : ''}</div>` : ''}</div></div>
      <div class="spellstats"><span><b>${r.apps}</b> apps</span><span><b>${r.goals}</b> G</span><span><b>${r.assists}</b> A</span>${gkSpans(p.pos, r.saves, r.cleanAll)}<span><b>${r.apps ? r.avg.toFixed(2) : '–'}</b></span></div></div>`).join('');
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
  const label = honTab === 'nat' ? s => String(baseYear() + s + 1) : seasonLabel;
  const hline = h => `<div class="honline"><b>${esc(h.name)}</b>: ${h.seasons.slice().sort((a, b) => a - b).map(label).join(', ')}</div>`;
  const teamBlock = (name, items, crestHtml = '', sub = '') => `<div class="honteam"><div class="clubcell">${crestHtml}<span><b class="honhead">${esc(name)}</b>${sub ? `<div class="small muted">${sub}</div>` : ''}</span></div>${items.map(hline).join('')}</div>`;
  let body;
  if (honTab === 'club') {
    const teams = new Map();
    list.forEach(h => { const t = teams.get(h.sub) || []; t.push(h); teams.set(h.sub, t); });
    // Clubs in the order you first won something there.
    body = [...teams.entries()].sort((a, b) => Math.min(...a[1].flatMap(h => h.seasons)) - Math.min(...b[1].flatMap(h => h.seasons)))
      .map(([name, items]) => { const c = S && S.clubs ? clubByName(name) : null; return teamBlock(name, items, c ? crest(c.id, 'mini') : ''); }).join('');
  } else if (honTab === 'nat') body = teamBlock(natName(p.nat), list, '', `${p.caps || 0} caps · ${p.intlGoals || 0} goals · ${intlAssists(p)} assist${intlAssists(p) === 1 ? '' : 's'}`);
  else body = `<div class="honteam">${list.map(hline).join('')}</div>`;
  return `<section class="card"><h2>Honours</h2><div class="seg">${tabs.map(([k, l]) => `<button class="${honTab === k ? 'on' : ''}" data-act="honTab" data-v="${k}">${l} (${grouped(groups[k]).reduce((n, g) => n + g.seasons.length, 0)})</button>`).join('')}</div>
    ${list.length ? body : honTab === 'nat' ? teamBlock(natName(p.nat), [], '', `${p.caps || 0} caps · ${p.intlGoals || 0} goals · ${intlAssists(p)} assist${intlAssists(p) === 1 ? '' : 's'} · nothing won yet`) : `<span class="small muted">${empty}</span>`}</section>`;
}

function viewCareer() {
  const p = S.player, t = careerTotals();
  // In the summer this season is already in the career rows.
  const live = S.phase === 'season' ? p.st : { apps: 0, goals: 0, assists: 0 };
  const value = playerValue();
  return `<section class="card hero"><h2>Profile</h2>
      <div class="kv"><div><small>Position</small><b>${POS_NAMES[p.pos]}</b></div><div><small>Nation</small><b>${natName(p.nat)}</b></div><div><small>Country</small><b class="${calledUp() ? 'good' : ''}">${calledUp() ? 'In squad' : 'Not picked'}</b></div>
      <div><small>Reputation</small><b>${Math.round(p.rep)}/100</b></div><div title="Transfer value: OVR, position, age, reputation, contract, league and this season's form"><small>Value</small><b>${value ? money(value) : 'Free agent'}</b></div><div><small>Caps</small><b>${p.caps}${p.intlGoals ? ` (${p.intlGoals}g)` : ''}</b></div></div>
      <div class="small muted">${nationNote()}</div></section>
    <section class="card"><h2>This season</h2><div class="${statGrid(p.pos)}"><div><b>${p.st.apps}</b><small>Apps</small></div><div><b>${p.st.goals}</b><small>Goals</small></div><div><b>${p.st.assists}</b><small>Assists</small></div>${gkCells(p.pos, p.st.saves, p.st.cleanAll)}<div><b>${avgRating(p.st)}</b><small>Rating</small></div></div>
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
    ${pop.kind === 'talks' ? '<div class="talks-tag">Transfer talks</div>' : ''}<div class="pop-icon">${POP_ICON[pop.kind]}</div><h3>${esc(pop.title)}</h3><p>${esc(pop.text)}</p>
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

function showDecision() {
  const d = S.decision;
  const opts = d.type === 'position'
    ? [['accept', `Play as ${d.to}`, d.early ? `Your main position from next season (manager +3)` : `Added beside your main position (manager +3)`], ['refuse', `Stay a ${S.player.pos}`, 'He will be unhappy (−5) and play you a little less this season']]
    : d.type === 'recall'
    ? [['return', 'Go back now', 'Your loan ends and you rejoin the squad straight away'], ['stay', 'Ask to stay on loan', `${club(d.club).mgr} will be disappointed (−8 when you return)`]]
    : d.type === 'rumour'
    ? [['deny', 'Deny it publicly', 'The manager likes loyalty (+3)'], ['silent', 'Say nothing', 'He wonders why you stayed quiet (−1)']]
    : [['reject', 'Reject them', `Show you are committed (+${d.rival ? 8 : 4}${d.rival ? ', rivals!' : ''})`], ['listen', 'Tell your agent to listen', 'They may bid in the window (−2)']];
  openModal(`<h3>${{ recall: 'Recalled from loan', rumour: 'Rumours', approach: 'Transfer approach', position: 'A new position?' }[d.type]}</h3><p style="margin:0">${esc(d.text)}</p>
    <div class="inbox">${opts.map(([v, l, s]) => `<button class="house" data-act="decide" data-v="${v}"><span><b>${l}</b><br><span class="small muted">${s}</span></span></button>`).join('')}</div>`);
}

// Matchday: both team sheets in each club's formation, with the bench, and where you fit in. Fit players only.
function teamSheet(c, me) {
  const f = weekFormation(c), shape = FORMATIONS[f], ROLES = { GK: ['GK'], DEF: shape.DEF, MID: shape.MID, FWD: shape.FWD };
  const avail = c.players.filter(pl => !pl.inj).map(pl => ({ n: pl.n, pos: pl.pos, r: pl.r }));
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
    const role = me.me ? weekRole(me.pos, c) : shapeRole(me.pos, c, f), g = role === 'GK' ? 'GK' : ['DEF', 'MID', 'FWD'].find(l => shape[l].includes(role)) || POS_GROUP[me.pos];
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
  const chip = ({ pl, role }) => `<div class="lp-chip ${pl.me ? 'me' : ''}"><b class="num">${pl.r}</b><span>${esc(shortN(pl.n))}</span><small>${role || pl.pos}</small></div>`;
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
  const me = { n: p.name, pos: matchPos(), r: calcOVR(), me: true, start: !!sel.start, squad: !p.injured };
  const mine = teamSheet(myClub(), me), opp = teamSheet(club(fx.opp), null);
  const where = p.injured ? '<span class="bad">You are injured and miss this one.</span>'
    : rested ? `<span class="bad">You need ${TWO_GAME_ENERGY}+ energy to play twice this week, so you rest for this one.</span>`
    : sel.start ? `<span class="good">You start ${matchRole() !== matchPos() ? `${roleText(matchPos(), matchRole())} in ${esc(myClub().mgr)}'s ${weekFormation(myClub())}` : `as ${POS_NAMES[matchPos()].toLowerCase()}`}.</span>`
    : sel.mins ? '<span class="flood">You start on the bench, but should get on.</span>' : '<span class="muted">You are on the bench.</span>';
  const benchHtml = s => s.bench.map(pl => `<span class="${pl.me ? 'me' : ''}">${esc(shortN(pl.n))} <small>${pl.pos} ${pl.r}</small></span>`).join('');
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
    ${derbyName(m.h, m.a) ? `<div class="derby">${derbyName(m.h, m.a)}</div>` : ''}
    <div class="fixture"><div class="team">${crest(m.h)}<b>${esc(teamName(m.h))}</b></div><div class="score num">${m.gh}–${m.ga}</div><div class="team">${crest(m.a)}<b>${esc(teamName(m.a))}</b></div></div>
    ${m.pens ? `<div class="small muted" style="text-align:center">${esc(teamName(m.pens))} win ${m.pensScore ? pensText(m) + ' ' : ''}on penalties</div>` : ''}
    ${m.agg ? `<div class="small muted" style="text-align:center">Aggregate ${m.agg[0]}–${m.agg[1]}: <b>${esc(teamName(m.winner))}</b> go through</div>` : ''}
    ${sc ? `<div class="scorers">${sc}</div>` : ''}
    ${u && u.mins ? `<div class="${statGrid(S.player.pos)}"><div><b>${u.rating.toFixed(1)}</b><small>Rating</small></div><div><b>${u.mins}'</b><small>${u.start ? 'Started' : 'Sub'}</small></div><div><b>${u.goals}</b><small>Goals</small></div><div><b>${u.assists}</b><small>Assists</small></div>${S.player.pos === 'GK' ? `<div><b>${u.saves || 0}</b><small>Saves</small></div><div><b>${u.clean ? 'Yes' : 'No'}</b><small>Clean sheet</small></div>` : ''}</div>${u.tackles ? `<div class="small muted" style="text-align:center">${u.tackles} tackle${u.tackles !== 1 ? 's' : ''}</div>` : ''}`
      : `<p class="muted" style="margin:0">${injured ? 'You were out injured.' : u && u.free ? 'Your contract has run out, so you are not part of the squad. Re-sign to play again.' : u && u.rested ? `Rested: you need ${TWO_GAME_ENERGY}+ energy to play twice in a week.` : 'You stayed on the bench.'}</p>`}`;
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
  if (rep.net != null) html += `<div class="row small"><span class="muted">Weekly income</span><b class="num ${rep.net >= 0 ? 'good' : 'bad'}">${rep.net >= 0 ? '+' : ''}${money(rep.net)}</b></div>`;
  else if (leagueDone()) { const e = midweekFixture(); html += `<div class="award">Next: ${esc(e.t.name.replace(/ \d{4}$/, ''))} ${e.isHome ? 'vs' : 'at'} ${esc(club(e.opp).name)} on ${dayLabel(dayAfter(midweekOffset(e)))}</div>`; }
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
    case 'soShoot': { const [col, row] = v.split(',').map(Number); soStep({ col, row }); return; }
    case 'soDive': soStep({ col: +v }); return;
    case 'soAuto': soStep(null); return;
    case 'soDone': closeModal(); if (soMode === 'summer') doSummerPlay(); else doAdvance(); return;
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
render();
