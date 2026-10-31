// Cups: European club competitions during the season, and summer tournaments
// (Club World Cup, World Cup, Euro, Copa América, Asian Cup). No DOM code here.

// Nations that only appear in tournaments (not offered as a player nationality).
const EXTRA_NATIONS = {
  ECU: 'Ecuador', CHI: 'Chile', PER: 'Peru', PAR: 'Paraguay', VEN: 'Venezuela', BOL: 'Bolivia',
  PAN: 'Panama', CRC: 'Costa Rica', JAM: 'Jamaica',
  IRN: 'Iran', KSA: 'Saudi Arabia', QAT: 'Qatar', IRQ: 'Iraq', UAE: 'UAE', UZB: 'Uzbekistan', JOR: 'Jordan',
  ALG: 'Algeria', TUN: 'Tunisia', RSA: 'South Africa',
};
const natName = k => NATIONS[k] || EXTRA_NATIONS[k] || k;

// Rough national-team strength (average of the best XI), 2025-26.
const NATION_STR = {
  ESP: 87, FRA: 86, ENG: 86, ARG: 86, POR: 85, BRA: 84, GER: 83, NED: 83, ITA: 82, BEL: 81,
  CRO: 80, URU: 80, COL: 80, MAR: 79, NOR: 79, DEN: 78, SUI: 78, SEN: 78, AUT: 78, TUR: 78,
  USA: 77, MEX: 77, JPN: 77, ECU: 77, CIV: 77, SWE: 76, POL: 76, SRB: 76, UKR: 76, KOR: 76, NGA: 76,
  SCO: 75, CAN: 75, EGY: 75, PAR: 75, ALG: 75, CMR: 74, IRN: 74, CHI: 74, WAL: 73, IRL: 73, GHA: 73, AUS: 73,
  TUN: 72, PER: 72, KSA: 71, VEN: 71, PAN: 71, RSA: 70, UZB: 70, CRC: 70, QAT: 69, IRQ: 68, JOR: 68, JAM: 68,
  UAE: 67, BOL: 67, CHN: 64, IDN: 64, THA: 63, VIE: 62, MAS: 61, SGP: 55,
};

const CONFED = {
  UEFA: ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BEL', 'SCO', 'WAL', 'IRL', 'NOR', 'SWE', 'DEN', 'SUI', 'AUT', 'CRO', 'SRB', 'POL', 'TUR', 'UKR'],
  CONMEBOL: ['BRA', 'ARG', 'URU', 'COL', 'ECU', 'CHI', 'PER', 'PAR', 'VEN', 'BOL'],
  CONCACAF: ['USA', 'MEX', 'CAN', 'PAN', 'CRC', 'JAM'],
  AFC: ['JPN', 'KOR', 'CHN', 'MAS', 'SGP', 'IDN', 'THA', 'VIE', 'AUS', 'IRN', 'KSA', 'QAT', 'IRQ', 'UAE', 'UZB', 'JOR'],
  CAF: ['NGA', 'SEN', 'CIV', 'GHA', 'MAR', 'EGY', 'CMR', 'ALG', 'TUN', 'RSA'],
};
const confedOf = nat => Object.keys(CONFED).find(k => CONFED[k].includes(nat));

// Club World Cup sides from outside Europe: name, nationality (for generated names), strength.
const WORLD_CLUBS = [
  ['Flamengo', 'BRA', 79], ['Palmeiras', 'BRA', 78], ['Botafogo', 'BRA', 76], ['Fluminense', 'BRA', 75],
  ['River Plate', 'ARG', 77], ['Boca Juniors', 'ARG', 76], ['Monterrey', 'MEX', 74], ['Pachuca', 'MEX', 71],
  ['Inter Miami', 'USA', 74], ['LAFC', 'USA', 72], ['Seattle Sounders', 'USA', 70], ['Al Hilal', 'KSA', 79],
  ['Al Ahly', 'EGY', 72], ['Urawa Red Diamonds', 'JPN', 70], ['Ulsan HD', 'KOR', 69], ['Al Ain', 'UAE', 70],
  ['Espérance de Tunis', 'TUN', 69], ['Mamelodi Sundowns', 'RSA', 71], ['Wydad AC', 'MAR', 68], ['Auckland City', 'AUS', 58],
];

// European club competitions: 16 clubs each, four groups of four (home and away), then
// quarter-finals, semi-finals and a final, all one-off games. Played midweek.
const EURO_COMPS = [
  { key: 'UCL', name: 'Champions League' },
  { key: 'UEL', name: 'Europa League' },
  { key: 'UECL', name: 'Conference League' },
];
const EURO_WEEKS = [5, 8, 11, 14, 17, 20, 30, 36, 44];

// Summer tournaments, by the calendar year they are played in (the summer after a season).
const SUMMER_EVENTS = [
  { key: 'CWC', name: 'Club World Cup', every: 4, first: 2029 },
  { key: 'WC', name: 'World Cup', every: 4, first: 2030 },
  { key: 'EURO', name: 'European Championship', every: 4, first: 2028, confed: ['UEFA'] },
  { key: 'COPA', name: 'Copa América', every: 4, first: 2028, confed: ['CONMEBOL', 'CONCACAF'] },
  { key: 'ASIA', name: 'AFC Asian Cup', every: 4, first: 2027, confed: ['AFC'] },
];

// ---------- teams ----------
// A team id is a club id ("ENG-0"), a nation ("N:ENG") or a world club ("W:3").
const isNation = id => id.startsWith('N:');
const isWorld = id => id.startsWith('W:');
const isClub = id => !isNation(id) && !isWorld(id);
function teamName(id) { return isNation(id) ? natName(id.slice(2)) : isWorld(id) ? WORLD_CLUBS[+id.slice(2)][0] : club(id).name; }
function teamCode(id) { return isNation(id) ? id.slice(2) : isWorld(id) ? shortName(WORLD_CLUBS[+id.slice(2)][0]) : club(id).short; }
function teamStr(id) { return isNation(id) ? NATION_STR[id.slice(2)] || 60 : isWorld(id) ? WORLD_CLUBS[+id.slice(2)][2] : teamStrength(club(id)); }

// The national team picks you once you are good enough for your country.
const callUpOvr = nat => clamp(Math.round((NATION_STR[nat] || 60) - 7), 60, 82);
const calledUp = () => calcOVR() >= callUpOvr(S.player.nat);
const myTeams = () => [S.player.club, ...(calledUp() ? ['N:' + S.player.nat] : [])];

// ---------- generic tournament ----------
function blankRow() { return { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; }

// Seeded draw: the strongest teams are spread across groups.
function makeTournament(key, name, teams, opts = {}) {
  const nGroups = teams.length / 4;
  const sorted = teams.slice().sort((a, b) => teamStr(b) - teamStr(a));
  const groups = Array.from({ length: nGroups }, () => []);
  for (let pot = 0; pot < 4; pot++) shuffle(sorted.slice(pot * nGroups, (pot + 1) * nGroups)).forEach((id, g) => groups[g].push(id));
  const rr = groups.map(g => { const r = roundRobin(g); return opts.double ? r : r.slice(0, 3); });
  const mds = rr[0].length;
  const table = {};
  teams.forEach(id => { table[id] = blankRow(); });
  const koNames = { 16: 'Round of 16', 8: 'Quarter-final', 4: 'Semi-final', 2: 'Final' };
  const stages = [];
  for (let k = 0; k < mds; k++) stages.push({ type: 'group', md: k, name: `Group matchday ${k + 1}` });
  for (let n = nGroups * 2; n >= 2; n /= 2) stages.push({ type: 'ko', name: koNames[n] });
  return { key, name, season: S.season, groups, rr, table, stages, stage: 0, ko: [], winner: null, home: !!opts.double, goals: 0 };
}

function groupTable(t, g) {
  return t.groups[g].map(id => ({ id, ...t.table[id] }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

// Group winners meet runners-up from the neighbouring group: A1-B2, B1-A2, C1-D2, ...
function firstKnockout(t) {
  const ties = [];
  for (let g = 0; g < t.groups.length; g += 2) {
    const A = groupTable(t, g), B = groupTable(t, g + 1);
    ties.push([A[0].id, B[1].id], [B[0].id, A[1].id]);
  }
  return ties;
}

// Still in it: every team plays the group stage, then only those left in the draw.
function alive(t, id) {
  const st = t.stages[t.stage];
  if (!st || t.winner) return false;
  return st.type === 'group' || pendingTies(t).some(x => x.includes(id));
}

// The fixture a team plays in the next stage, if any.
function stageFixture(t, id) {
  const st = t.stages[t.stage];
  if (!st || t.winner) return null;
  if (st.type === 'group') {
    for (const md of t.rr) { const f = md[st.md].find(x => x.includes(id)); if (f) return f; }
    return null;
  }
  const ties = pendingTies(t);
  return ties.find(x => x.includes(id)) || null;
}

function pendingTies(t) {
  const st = t.stages[t.stage];
  if (!st || st.type !== 'ko') return [];
  const last = t.ko[t.ko.length - 1];
  if (last && last.name === st.name) return last.ties;
  if (!last) return firstKnockout(t);
  const w = last.res.map(r => r.winner), ties = [];
  for (let i = 0; i < w.length; i += 2) ties.push([w[i], w[i + 1]]);
  return ties;
}

// Play one stage of a tournament. userFor(h, a) returns the user's match object when they
// are involved. Returns the user's result for the match report.
function playStage(t, userFor) {
  const st = t.stages[t.stage];
  if (!st || t.winner) return null;
  let mine = null;
  if (st.type === 'group') {
    t.rr.forEach(md => md[st.md].forEach(([h, a]) => {
      const u = userFor(h, a);
      const r = simTeams(h, a, u, t.home ? 2 : 0);
      const th = t.table[h], ta = t.table[a];
      th.p++; ta.p++; th.gf += r.gh; th.ga += r.ga; ta.gf += r.ga; ta.ga += r.gh;
      if (r.gh > r.ga) { th.w++; ta.l++; th.pts += 3; } else if (r.gh < r.ga) { ta.w++; th.l++; ta.pts += 3; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
      if (u) mine = r;
    }));
  } else {
    const ties = pendingTies(t), res = [];
    ties.forEach(([h, a]) => {
      const u = userFor(h, a);
      const r = simTeams(h, a, u, 0);
      if (r.gh === r.ga) {
        // Penalties: close to a coin toss, the stronger side slightly favoured.
        const ph = clamp(.5 + (teamStr(h) - teamStr(a)) / 60, .35, .65);
        r.pens = Math.random() < ph ? h : a;
      }
      r.winner = r.gh > r.ga ? h : r.gh < r.ga ? a : r.pens;
      res.push(r);
      if (u) mine = r;
    });
    t.ko.push({ name: st.name, ties, res });
    if (st.name === 'Final') t.winner = res[0].winner;
  }
  t.stage++;
  return mine;
}

// One match between any two teams. home is the home advantage in rating points.
function simTeams(h, a, user, home = 2) {
  const p = S.player;
  let sh = teamStr(h), sa = teamStr(a);
  const mineHome = user && user.team === h;
  const ovr = calcOVR();
  if (user && user.mins) {
    const base = mineHome ? sh : sa, id = mineHome ? h : a;
    const withMe = isClub(id) ? teamStrength(club(id), ovr, p.pos) : base + (ovr - base) / 11;
    const adj = base + (withMe - base) * user.mins / 90;
    if (mineHome) sh = adj; else sa = adj;
  }
  const gh = poisson(1.35 * Math.exp((sh - sa + home) / 13));
  const ga = poisson(1.35 * Math.exp((sa - sh - home) / 13));
  const scorers = [];
  const credit = (id, goals, mine) => {
    const str = mine ? (mineHome ? sh : sa) : 0;
    for (let i = 0; i < goals; i++) {
      if (mine && user.mins) {
        const pGoal = clamp(GOAL_SHARE[p.pos] * Math.pow(ovr / str, 3) * user.mins / 90, 0, .7);
        if (Math.random() < pGoal) { user.goals++; scorers.push({ n: p.name, me: true, home: id === h }); continue; }
        const pAst = clamp(ASSIST_SHARE[p.pos] * Math.pow(ovr / str, 2) * user.mins / 90 * 1.3, 0, .7);
        if (Math.random() < pAst) user.assists++;
      }
      scorers.push({ n: scorerName(id), home: id === h });
    }
  };
  credit(h, gh, user && mineHome);
  credit(a, ga, user && !mineHome);
  return { h, a, gh, ga, scorers };
}

function scorerName(id) {
  if (isClub(id)) return aiScorer(club(id)).n;
  return randomName(isNation(id) ? id.slice(2) : WORLD_CLUBS[+id.slice(2)][1]);
}

// ---------- European competitions ----------
// Qualification from last season's final tables (squad strength in the first season).
// All top-flight clubs are queued by league position, the bigger leagues first on a tie,
// then the queue is cut into 16 for each competition.
function buildEuro() {
  const order = ['ENG', 'ESP', 'ITA', 'GER', 'FRA'];
  const tops = S.leagues.filter(l => l.tier === 1).sort((a, b) => order.indexOf(a.nat) - order.indexOf(b.nat));
  const ranked = tops.map(l => {
    const prev = S.lastStandings && S.lastStandings[l.nat];
    const ids = prev ? prev.filter(id => club(id).league === l.id) : [];
    const rest = l.clubs.filter(id => !ids.includes(id)).sort((a, b) => teamStrength(club(b)) - teamStrength(club(a)));
    return ids.concat(rest);
  });
  const queue = [];
  for (let pos = 0; pos < 20; pos++) ranked.forEach(r => { if (r[pos]) queue.push(r[pos]); });
  const out = {};
  EURO_COMPS.forEach((c, i) => {
    const teams = queue.slice(i * 16, i * 16 + 16);
    if (teams.length === 16) out[c.key] = makeTournament(c.key, c.name, teams, { double: true });
  });
  return out;
}

function euroComp(id = S.player.club) {
  return S.euro ? Object.values(S.euro).find(t => Object.prototype.hasOwnProperty.call(t.table, id)) : null;
}

// Your European game this week, if there is one.
function euroFixture() {
  const k = EURO_WEEKS.indexOf(S.week);
  if (k < 0 || !S.euro) return null;
  const t = euroComp();
  if (!t || t.stage !== k) return null;
  const f = stageFixture(t, S.player.club);
  if (!f) return null;
  const isHome = f[0] === S.player.club;
  return { t, home: f[0], away: f[1], isHome, opp: isHome ? f[1] : f[0], stage: t.stages[t.stage].name };
}

// Plays every European game this week. Returns the user's match, if they had one.
function euroWeek(userMatch) {
  const k = EURO_WEEKS.indexOf(S.week);
  if (k < 0 || !S.euro) return null;
  let mine = null;
  Object.values(S.euro).forEach(t => {
    if (t.stage !== k) return;
    const id = S.player.club;
    const r = playStage(t, (h, a) => (userMatch && (h === id || a === id)) ? Object.assign(userMatch, { team: id }) : null);
    if (r) mine = { ...r, comp: t.name };
    if (t.winner) finishTournament(t);
  });
  return mine;
}

// ---------- summer tournaments ----------
function summerTeams(ev) {
  const noisy = list => list.slice().sort((a, b) => (NATION_STR[b] + gauss() * 3) - (NATION_STR[a] + gauss() * 3));
  if (ev.key === 'CWC') {
    // Europe sends its last four Champions League winners plus the strongest top-flight clubs.
    const winners = (S.history || []).filter(h => h.key === 'UCL' && h.season > S.season - 4 && isClub(h.winner)).map(h => h.winner);
    const strongest = Object.values(S.clubs).filter(c => clubTier(c) === 1).sort((a, b) => teamStrength(b) - teamStrength(a)).map(c => c.id);
    const europe = [...new Set([...winners, ...strongest])].slice(0, 12);
    return europe.concat(WORLD_CLUBS.map((_, i) => 'W:' + i));
  }
  if (ev.key === 'WC') {
    const quota = { UEFA: 13, CONMEBOL: 5, CONCACAF: 3, AFC: 5, CAF: 6 };
    return Object.entries(quota).flatMap(([k, n]) => noisy(CONFED[k]).slice(0, n)).map(n => 'N:' + n);
  }
  const pool = ev.confed.flatMap(k => CONFED[k]);
  return noisy(pool).slice(0, 16).map(n => 'N:' + n);
}

// Called at the end of a season: set up the tournaments of the coming summer.
// Tournaments you are not part of are played straight away.
function buildSummer() {
  const year = START_YEAR + S.season + 1, p = S.player;
  S.summer = [];
  SUMMER_EVENTS.filter(ev => (year - ev.first) % ev.every === 0).forEach(ev => {
    const teams = summerTeams(ev);
    const t = makeTournament(ev.key, `${ev.name} ${year}`, teams);
    t.teams = teams;
    const mineIds = myTeams().filter(id => teams.includes(id));
    t.mine = mineIds[0] || null;
    if (!isClub(teams[0]) && calledUp() && !t.mine && (!ev.confed || ev.confed.includes(confedOf(p.nat)))) {
      msg(`${natName(p.nat)} failed to qualify for the ${t.name}.`, 'bad');
    }
    if (t.mine) {
      const why = isNation(t.mine) ? `You have been named in the ${natName(p.nat)} squad.` : `${teamName(t.mine)} are taking part.`;
      msg(`${t.name}: ${why}`, 'good');
      notify('good', t.name, `${why} Play it from the Home screen before the new season.`);
      S.summer.push(t);
    } else {
      while (!t.winner) playStage(t, () => null);
      finishTournament(t);
    }
  });
}

const summerPending = () => (S.summer || []).find(t => t.mine && !t.winner);

// Play the next round of your summer tournament. Once you are knocked out, the rest is simulated.
function playSummerStage() {
  const t = summerPending();
  if (!t) return null;
  const p = S.player, st = t.stages[t.stage], me = t.mine;
  const user = { ...summerSelection(me), goals: 0, assists: 0, team: me };
  const res = playStage(t, (h, a) => (h === me || a === me) ? user : null);
  let report = null;
  if (res) {
    report = { stage: st.name, comp: t.name, match: { ...res, user, isHome: res.h === me } };
    if (user.mins) {
      const rating = summerRating(user, res, me);
      user.rating = rating;
      if (isNation(me)) { p.caps++; p.intlGoals = (p.intlGoals || 0) + user.goals; }
      t.goals += user.goals;
      p.rep = clamp(p.rep + (rating - 6.4) * .6 + user.goals * .3, 0, 100);
      nudgeOvr(perfDelta(rating, user) * .5);
    }
  }
  if (!t.winner && !alive(t, me)) {
    msg(`${teamName(me)} are out of the ${t.name}.`, 'bad');
    while (!t.winner) playStage(t, () => null);
  }
  if (t.winner) finishTournament(t);
  save();
  return report;
}

function summerSelection(me) {
  if (isClub(me)) return selection();
  const ovr = calcOVR(), str = NATION_STR[me.slice(2)] || 60;
  const start = ovr >= str + 2 ? .9 : ovr >= str - 2 ? .65 : ovr >= str - 5 ? .35 : .15;
  const r = Math.random();
  if (r < start) return { mins: randi(70, 90), start: true };
  if (r < start + (1 - start) * .5) return { mins: randi(10, 30), start: false };
  return { mins: 0, start: false };
}

function summerRating(user, res, me) {
  const mine = res.h === me, gf = mine ? res.gh : res.ga, gaa = mine ? res.ga : res.gh;
  const g = POS_GROUP[S.player.pos];
  let r = 6.4 + (calcOVR() - teamStr(me)) / 30 + user.goals * .9 + user.assists * .6 + (gf > gaa ? .3 : gf < gaa ? -.3 : 0);
  if ((g === 'GK' || g === 'DEF') && gaa === 0 && user.mins >= 60) r += .6;
  if (g === 'GK' || g === 'DEF') r -= gaa * .15;
  r += gauss() * .45;
  if (user.mins < 45) r = 6 + (r - 6) * .6;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

// Finish the rest of your summer tournaments without playing them match by match.
function simulateSummer() {
  let guard = 0;
  while (summerPending() && guard++ < 20) playSummerStage();
}

// Record the winner, and celebrate if it was you.
function finishTournament(t) {
  if (t.done) return;
  t.done = true;
  S.history = [...(S.history || []), { key: t.key, name: t.name, season: t.season, winner: t.winner }].slice(-60);
  const p = S.player, mine = t.winner === p.club || (isNation(t.winner) && t.winner === t.mine);
  if (mine) {
    const label = t.name.replace(/ \d{4}$/, '');
    p.trophies.push({ name: label, club: teamName(t.winner), season: t.season });
    p.rep = clamp(p.rep + (t.key === 'UCL' || t.key === 'WC' ? 8 : 5), 0, 100);
    nudgeOvr(.5 * growthFactor());
    msg(`You won the ${t.name}!`, 'good');
    notify('good', `${label} winners!`, `${teamName(t.winner)} won the ${t.name}, and you were part of it.`);
    if (S.seasonSummary && S.phase === 'offseason') S.seasonSummary.awards.push(`${t.name} winner`);
    else (S.cupWins = S.cupWins || []).push(`${t.name.replace(/ \d{4}$/, '')} winner`);
  } else {
    msg(`${teamName(t.winner)} won the ${t.name}.`);
  }
}
