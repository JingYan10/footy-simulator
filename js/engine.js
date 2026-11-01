// Game engine: world setup, simulation, economy, manager, transfers. No DOM code here.

const SAVE_KEY = 'ptl_save_v3';
const START_YEAR = 2026;
const START_AGE = 16;
const SEASON_WEEKS = 46;
const JAN_WINDOW = [23, 26];
const TRAIN_SLOTS = 3;
const TRAIN_ENERGY = 10;
const PROMOTE = 3;
const MAX_OVR = 91;
const NEG_LOCK_WEEKS = 26; // about six months without salary talks after re-signing
const OFFER_LOCK_WEEKS = 26; // and no transfer offers for six months after joining a club
const TIER_OVR = { 1: [58, 91], 2: [55, 80], 3: [48, 72] };
const SQUAD_TARGET = { GK: 3, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2, LM: 1, RM: 1, LW: 2, RW: 2, ST: 2 };

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const POS_NAMES = { GK: 'Goalkeeper', CB: 'Centre-back', LB: 'Left-back', RB: 'Right-back', CDM: 'Defensive mid', CM: 'Central mid', CAM: 'Attacking mid', LM: 'Left midfielder', RM: 'Right midfielder', LW: 'Left winger', RW: 'Right winger', ST: 'Striker' };
const POS_GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD' };
const GROUP_SLOTS = { GK: 1, DEF: 4, MID: 3, FWD: 3 };
const GOAL_SHARE = { GK: 0, CB: .04, LB: .03, RB: .03, CDM: .04, CM: .08, CAM: .14, LM: .11, RM: .11, LW: .18, RW: .18, ST: .3 };
const ASSIST_SHARE = { GK: .01, CB: .03, LB: .1, RB: .1, CDM: .06, CM: .14, CAM: .22, LM: .2, RM: .2, LW: .18, RW: .18, ST: .1 };

const OUT_ATTRS = ['PAC', 'SHO', 'DRI', 'PAS', 'DEF', 'PHY'];
const GK_ATTRS = ['HAN', 'DIV', 'REF', 'KIC', 'PHY', 'POS'];
const ATTR_NAMES = { PAC: 'Pace', SHO: 'Shooting', DRI: 'Dribbling', PAS: 'Passing', DEF: 'Defending', PHY: 'Physicality', HAN: 'Handling', DIV: 'Diving', REF: 'Reflexes', KIC: 'Kicking', POS: 'Positioning' };

// OVR follows EA's method: each position weights detailed sub-attributes (in %), and each
// sub-attribute belongs to one of the six face stats. Summing the sub-weights per face stat
// gives the weights below. Headline weights per position come from EA's published formulas.
const FACE_OF = {
  Acceleration: 'PAC', 'Sprint Speed': 'PAC',
  Finishing: 'SHO', 'Att. Positioning': 'SHO', 'Shot Power': 'SHO', 'Long Shots': 'SHO', Volleys: 'SHO',
  Vision: 'PAS', Crossing: 'PAS', 'Short Passing': 'PAS', 'Long Passing': 'PAS',
  Agility: 'DRI', Reactions: 'DRI', 'Ball Control': 'DRI', Dribbling: 'DRI', Composure: 'DRI',
  Interceptions: 'DEF', 'Heading Accuracy': 'DEF', 'Def. Awareness': 'DEF', 'Standing Tackle': 'DEF', 'Sliding Tackle': 'DEF',
  Jumping: 'PHY', Stamina: 'PHY', Strength: 'PHY', Aggression: 'PHY',
  'GK Reflexes': 'REF', 'GK Diving': 'DIV', 'GK Positioning': 'POS', 'GK Handling': 'HAN', 'GK Kicking': 'KIC', 'GK Physical': 'PHY',
};
const WINGER = { Dribbling: 16, 'Ball Control': 14, Crossing: 10, Acceleration: 7, 'Sprint Speed': 6, Reactions: 7, Finishing: 8, Agility: 6, 'Short Passing': 7, Vision: 6, 'Long Shots': 5, 'Shot Power': 4, 'Att. Positioning': 4 };
// EA's wide midfielder (RM/LM) formula: like a winger, but more passing and stamina, less finishing.
const WIDE_MID = { Dribbling: 15, 'Ball Control': 13, 'Short Passing': 11, Crossing: 10, 'Att. Positioning': 8, Vision: 7, Reactions: 7, Acceleration: 7, 'Sprint Speed': 6, Finishing: 6, Stamina: 5, 'Long Passing': 5 };
const FULLBACK = { Interceptions: 12, 'Standing Tackle': 11, 'Sliding Tackle': 11, Crossing: 9, 'Def. Awareness': 8, Stamina: 8, Reactions: 8, 'Sprint Speed': 7, 'Short Passing': 7, 'Ball Control': 7, Acceleration: 5, 'Heading Accuracy': 4, Dribbling: 3 };
const SUB_WEIGHTS = {
  ST: { Finishing: 20, 'Att. Positioning': 12, Dribbling: 11, 'Ball Control': 10, 'Shot Power': 10, Reactions: 8, Composure: 6, 'Sprint Speed': 6, Acceleration: 5, Strength: 5, 'Long Shots': 4, Volleys: 3 },
  LW: WINGER, RW: WINGER, LM: WIDE_MID, RM: WIDE_MID,
  CAM: { 'Ball Control': 15, Dribbling: 13, 'Short Passing': 12, Vision: 12, 'Att. Positioning': 9, Reactions: 7, Finishing: 7, 'Long Shots': 5, 'Shot Power': 5, Agility: 4, Acceleration: 4, 'Long Passing': 4, Composure: 3 },
  CM: { 'Short Passing': 15, 'Long Passing': 13, Vision: 12, 'Ball Control': 11, Dribbling: 8, Reactions: 8, Interceptions: 6, 'Standing Tackle': 6, Stamina: 6, 'Long Shots': 5, Composure: 5, 'Att. Positioning': 5 },
  CDM: { Interceptions: 14, 'Standing Tackle': 12, 'Def. Awareness': 12, 'Short Passing': 12, 'Long Passing': 10, Strength: 10, 'Ball Control': 8, Reactions: 7, Stamina: 6, Aggression: 6, 'Sliding Tackle': 3 },
  CB: { 'Def. Awareness': 15, 'Standing Tackle': 15, 'Sliding Tackle': 15, Interceptions: 13, 'Heading Accuracy': 10, Strength: 10, Aggression: 7, Reactions: 5, 'Short Passing': 5, Jumping: 3, Composure: 2 },
  LB: FULLBACK, RB: FULLBACK,
  GK: { 'GK Reflexes': 24, 'GK Diving': 21, 'GK Positioning': 21, 'GK Handling': 21, 'GK Kicking': 5, 'GK Physical': 8 },
};
const WEIGHTS = Object.fromEntries(Object.entries(SUB_WEIGHTS).map(([pos, subs]) => {
  const w = Object.fromEntries((pos === 'GK' ? GK_ATTRS : OUT_ATTRS).map(k => [k, 0]));
  for (const s in subs) w[FACE_OF[s]] += subs[s] / 100;
  return [pos, w];
}));

// Training equipment: bought once, then paid weekly to keep running. Better kit means faster
// attribute gains, but it is priced so a lower-league wage takes a long time to afford it.
const EQUIP_TIERS = [
  { name: 'Normal', buy: 0, fee: 0, mult: 1, energy: 0, desc: 'Club-issue kit and the public gym.' },
  { name: 'Bronze', buy: 40000, fee: 2000, mult: 1.6, energy: 2, desc: 'Proper boots, a home gym and a ball machine.' },
  { name: 'Silver', buy: 150000, fee: 6000, mult: 2.3, energy: 4, desc: 'Personal trainer, video analysis and recovery tools.' },
  { name: 'Gold', buy: 750000, fee: 20000, mult: 3.2, energy: 6, desc: 'Elite performance team, nutritionist and cryo suite.' },
];

// Agents: a one-off fee to sign, then a cut of your wage every week. Better agents get you
// bigger offers, more clubs calling and better odds in salary talks. The best only take
// players who are already good.
const AGENTS = [
  { name: 'No agent', fee: 0, cut: 0, neg: 0, wage: 0, offers: 1, minOvr: 0, desc: 'You handle your own deals.' },
  { name: 'Local agent', fee: 5000, cut: .03, neg: .04, wage: .03, offers: 1.05, minOvr: 0, desc: 'A family friend who knows a few club secretaries.' },
  { name: 'Regional agent', fee: 40000, cut: .05, neg: .08, wage: .06, offers: 1.15, minOvr: 60, desc: 'Has contacts at most clubs in the lower leagues.' },
  { name: 'National agency', fee: 200000, cut: .07, neg: .12, wage: .1, offers: 1.3, minOvr: 68, desc: 'Lawyers and scouts across the country.' },
  { name: 'International agency', fee: 1000000, cut: .08, neg: .17, wage: .15, offers: 1.45, minOvr: 74, desc: 'Offices in several countries and friends at the big clubs.' },
  { name: 'Elite agency', fee: 5000000, cut: .1, neg: .22, wage: .2, offers: 1.6, minOvr: 80, desc: 'Represents internationals and knows every sporting director.' },
  { name: 'Super-agent', fee: 20000000, cut: .12, neg: .28, wage: .27, offers: 1.8, minOvr: 85, desc: 'The most feared negotiator in football.' },
];
const agent = () => AGENTS[S.player.agent || 0];
const cardTier = ovr => ovr >= 75 ? 'Gold' : ovr >= 65 ? 'Silver' : 'Bronze';

const HOUSING = [
  { name: 'Shared flat', rent: 150, energy: 0 },
  { name: 'City apartment', rent: 600, energy: 4 },
  { name: 'Family house', rent: 2500, energy: 8 },
  { name: 'Countryside villa', rent: 10000, energy: 12 },
  { name: 'Mansion', rent: 40000, energy: 16 },
];

// Salary negotiation asks: wage rise, and how much manager affection it costs for a while.
const ASKS = [{ pct: .1, label: '+10%', pen: 5 }, { pct: .25, label: '+25%', pen: 10 }, { pct: .5, label: '+50%', pen: 18 }];

const FOREIGN = ['BRA', 'POR', 'NED', 'ARG', 'SEN', 'CIV', 'BRA', 'FRA', 'ESP'];
const SHORT_SKIP = ['FC', 'SC', 'AC', 'SV', 'VfL', 'VfB', 'TSG', 'TSV', 'SSV', 'AFC', 'CF', 'de', 'La', 'Real', 'Club', 'II', 'B'];

// Real rivalries by club name. Joining a rival of a club you played for means that club never wants you back.
const RIVALRIES = [
  ['Real Madrid', 'Barcelona'], ['Real Madrid', 'Atlético Madrid'], ['Barcelona', 'Espanyol'], ['Sevilla', 'Real Betis'], ['Athletic Club', 'Real Sociedad'], ['Valencia', 'Levante'],
  ['Manchester United', 'Manchester City'], ['Manchester United', 'Liverpool'], ['Liverpool', 'Everton'], ['Arsenal', 'Tottenham Hotspur'], ['Chelsea', 'Tottenham Hotspur'], ['Arsenal', 'Chelsea'],
  ['Newcastle United', 'Sunderland'], ['Aston Villa', 'Birmingham City'], ['Sheffield United', 'Sheffield Wednesday'], ['Nottingham Forest', 'Derby County'], ['Leeds United', 'Manchester United'], ['West Ham United', 'Millwall'],
  ['Inter', 'AC Milan'], ['Inter', 'Juventus'], ['Roma', 'Lazio'], ['Napoli', 'Juventus'], ['Juventus', 'Torino'], ['Genoa', 'Sampdoria'],
  ['Bayern Munich', 'Borussia Dortmund'], ['Borussia Dortmund', 'Schalke 04'], ['Hamburger SV', 'Werder Bremen'], ['1. FC Köln', 'Borussia Mönchengladbach'], ['Hamburger SV', 'FC St. Pauli'],
  ['Paris Saint-Germain', 'Marseille'], ['Lyon', 'Saint-Étienne'], ['Lens', 'Lille'], ['Nice', 'Monaco'],
  ['Benfica', 'Sporting CP'], ['Benfica', 'Porto'], ['Porto', 'Sporting CP'], ['Braga', 'Vitória SC'],
  ['Ajax', 'Feyenoord'], ['Ajax', 'PSV'], ['PSV', 'Feyenoord'],
  ['Al Hilal', 'Al Nassr'], ['Al Ittihad', 'Al Ahli'], ['Al Hilal', 'Al Ittihad'], ['Al Nassr', 'Al Shabab'],
  ['LA Galaxy', 'LAFC'], ['Seattle Sounders', 'Portland Timbers'], ['New York City FC', 'New York Red Bulls'], ['Inter Miami', 'Orlando City'], ['Columbus Crew', 'FC Cincinnati'],
];
const areRivals = (a, b) => { const x = club(a).name, y = club(b).name; return RIVALRIES.some(([p, q]) => (p === x && q === y) || (p === y && q === x)); };

let S = null;

// ---------- helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weightedPick(items, w) { const total = items.reduce((s, it) => s + w(it), 0); let r = Math.random() * total; for (const it of items) { r -= w(it); if (r <= 0) return it; } return items[items.length - 1]; }

const yearNow = () => START_YEAR + S.season;
const seasonLabel = (season = S.season) => `${START_YEAR + season}/${String((START_YEAR + season + 1) % 100).padStart(2, '0')}`;
const ageOf = by => yearNow() - by;
const attrKeys = pos => pos === 'GK' ? GK_ATTRS : OUT_ATTRS;
const club = id => S.clubs[id];
const league = id => S.leagues.find(l => l.id === id);
const myClub = () => club(S.player.club);
const clubTier = c => league(c.league).tier;

function randomName(nat) {
  const pool = NAME_POOLS[nat] || NAME_POOLS[pick(['ENG', 'BRA', 'FRA', 'ESP'])];
  return `${pick(pool[0])} ${pick(pool[1])}`;
}

function shortName(name) {
  const words = name.replace(/[0-9.]/g, '').split(/[\s-]+/).filter(w => w && !SHORT_SKIP.includes(w));
  if (words.length >= 3) return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  return (words[0] || name).slice(0, 3).toUpperCase();
}

// ---------- world ----------
function genPlayer(pos, base, homeNat, minAge = 18, maxAge = 32) {
  const nat = Math.random() < .6 ? homeNat : pick(FOREIGN);
  const age = randi(minAge, maxAge);
  const youthPenalty = age < 21 ? (21 - age) * 1.5 : 0;
  return { n: randomName(nat), pos, by: START_YEAR + (S ? S.season : 0) - age, nat, r: Math.round(clamp(base + gauss() * 3 - youthPenalty, 40, 86)), g: 0, a: randi(40, 75) };
}

function fillSquad(players, homeNat, level) {
  const listed = players.filter(p => p.r > 0);
  const base = level || (listed.length ? listed.reduce((s, p) => s + p.r, 0) / listed.length - 6 : 70);
  for (const pos of POSITIONS) {
    const have = players.filter(p => p.pos === pos).length;
    for (let i = have; i < SQUAD_TARGET[pos]; i++) players.push(genPlayer(pos, base, homeNat));
  }
}

function parsePlayers(str) {
  return (str || '').split(';').filter(Boolean).map(s => {
    const [n, pos, by, nat, r] = s.split(',');
    return { n: n.trim(), pos: pos.trim(), by: +by, nat: nat.trim(), r: +r, g: 0, a: randi(50, 80) };
  }).filter(p => p.r > 0 && POS_GROUP[p.pos]);
}

// One league from the database. The original five top flights list full squads; every other
// league uses the shorter row (notable players plus a squad level).
function buildLeague(L, clubs) {
  const ids = [];
  L.clubs.forEach((c, i) => {
    const id = `${L.id}-${i}`;
    let name, short, mgr, mgrNat, plStr, level;
    if (L.tier === 1 && c.length === 5 && typeof c[4] === 'string') [name, short, mgr, mgrNat, plStr] = c;
    else { [name, mgr, mgrNat, plStr, level, short] = c; short = short || shortName(name); }
    const players = parsePlayers(plStr);
    fillSquad(players, L.nat, level);
    const genMgr = !mgr;
    if (genMgr) { mgr = randomName(L.nat); mgrNat = L.nat; }
    clubs[id] = { id, name, short, mgr, mgrNat, genMgr, league: L.id, players };
    ids.push(id);
  });
  return { id: L.id, name: L.name, country: L.country, nat: L.nat, tier: L.tier, closed: !!L.closed, clubs: ids };
}

function buildWorld() {
  const clubs = {};
  const leagues = DB.leagues.map(L => buildLeague(L, clubs));
  return { leagues, clubs };
}

const clubByName = name => Object.values(S.clubs).find(c => c.name === name);

// Average rating of the best XI (1-4-3-3). Optionally include the user with their OVR.
function teamStrength(c, userOvr = null, userPos = null) {
  const groups = { GK: [], DEF: [], MID: [], FWD: [] };
  c.players.forEach(p => groups[POS_GROUP[p.pos]].push(p.r));
  if (userOvr != null) groups[POS_GROUP[userPos]].push(userOvr);
  let sum = 0, n = 0;
  for (const g in groups) {
    const top = groups[g].sort((a, b) => b - a).slice(0, GROUP_SLOTS[g]);
    top.forEach(r => { sum += r; n++; });
  }
  return n ? sum / n : 60;
}

function roundRobin(ids) {
  const t = shuffle(ids.slice());
  if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const md = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a && b) md.push(r % 2 ? [a, b] : [b, a]);
    }
    rounds.push(md);
    t.splice(1, 0, t.pop());
  }
  return rounds.concat(rounds.map(md => md.map(([h, a]) => [a, h])));
}

// Spread a league's matchdays evenly over the season's weeks; -1 means no match that week.
// A league added to a save mid-season fits its matchdays into the weeks left (from).
function weekMap(matchdays, from = 1, skip = 0) {
  const arr = Array(SEASON_WEEKS).fill(-1), left = SEASON_WEEKS - from + 1, n = matchdays - skip;
  for (let k = 0; k < n; k++) arr[from - 1 + Math.floor(k * left / n)] = skip + k;
  return arr;
}

function matchdayFor(lid, week = S.week) {
  const k = S.mdMap[lid][week - 1];
  return k >= 0 ? S.fixtures[lid][k] : null;
}

function makeSeason() {
  S.fixtures = {};
  S.mdMap = {};
  S.table = {};
  S.leagues.forEach(l => {
    S.fixtures[l.id] = roundRobin(l.clubs);
    S.mdMap[l.id] = weekMap(S.fixtures[l.id].length);
    l.clubs.forEach(id => { S.table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
  });
  Object.values(S.clubs).forEach(c => c.players.forEach(p => { p.g = 0; p.as = 0; }));
  S.player.st = newStats();
  S.player.seasonSpells = [];
  S.week = 1;
  S.phase = 'season';
  S.results = [];
  S.euro = buildEuro();
  S.cups = buildCups();
  S.cupWins = [];
}

// League numbers, plus a separate line for cup games. missed = league games missed injured.
// comps splits every game by competition (league, each cup, the national team) for the career history.
function newStats() { return { apps: 0, starts: 0, goals: 0, assists: 0, rsum: 0, motm: 0, clean: 0, missed: 0, cup: { apps: 0, goals: 0, assists: 0, rsum: 0 }, comps: {} }; }

// kind: 'league', 'cup', 'euro' or 'nat'.
function addComp(comps, name, kind, apps, goals, assists, rsum) {
  const c = comps[name] = comps[name] || { kind, apps: 0, goals: 0, assists: 0, rsum: 0 };
  c.apps += apps; c.goals += goals; c.assists += assists; c.rsum += rsum;
}

// ---------- spells: moving club mid-season ----------
// Like SofaScore, each club you play for in a season gets its own career row. The season's
// totals (for awards and the OVR review) add the earlier spells to the current one.
function closeSpell() {
  const p = S.player, st = p.st, c = myClub();
  if (S.phase !== 'season' || !st) return;
  if (st.apps + st.cup.apps > 0) p.career.push(careerRow(st, c));
  (p.seasonSpells = p.seasonSpells || []).push({ ...st, cup: { ...st.cup }, comps: undefined, league: c.league, club: c.id });
  p.st = newStats();
}

function careerRow(st, c) {
  const p = S.player;
  return { season: S.season, club: c.name + (p.loan && p.club === c.id ? ' (loan)' : ''), clubId: c.id, league: league(c.league).name, apps: st.apps + st.cup.apps, goals: st.goals + st.cup.goals, assists: st.assists + st.cup.assists, avg: Math.round((st.apps ? st.rsum / st.apps : 0) * 100) / 100, ovr: calcOVR(), pos: p.pos, comps: JSON.parse(JSON.stringify(st.comps || {})) };
}

function seasonTotals() {
  const p = S.player, all = [...(p.seasonSpells || []), p.st];
  const t = newStats();
  all.forEach(s => {
    ['apps', 'starts', 'goals', 'assists', 'rsum', 'motm', 'clean', 'missed'].forEach(k => { t[k] += s[k] || 0; });
    ['apps', 'goals', 'assists', 'rsum'].forEach(k => { t.cup[k] += (s.cup && s.cup[k]) || 0; });
  });
  return t;
}

// League goals or assists this season in one league, across spells.
function leagueTally(lid, key) {
  const p = S.player;
  return (p.seasonSpells || []).filter(s => s.league === lid).reduce((n, s) => n + s[key], 0) + (myClub().league === lid ? p.st[key] : 0);
}
const absWeek = () => S.season * SEASON_WEEKS + Math.min(S.week, SEASON_WEEKS + 1);

// ---------- player ----------
function calcOVR(p = S.player) {
  const w = WEIGHTS[p.pos];
  let s = 0;
  for (const k in w) s += w[k] * p.attrs[k];
  return p === S.player ? Math.min(MAX_OVR, Math.round(s)) : Math.round(s);
}

// Shift every attribute by d, which moves OVR by d (the weights add up to 1).
function nudgeOvr(d) {
  const p = S.player;
  if (!d || (d > 0 && calcOVR() >= MAX_OVR)) return;
  attrKeys(p.pos).forEach(k => { p.attrs[k] = clamp(p.attrs[k] + d, 20, 99); });
}

// OVR change from one game: good ratings, goals and assists build it, poor games cost a little.
// Gains slow down with age and near 91; bad games hurt more as you get older.
function perfDelta(rating, user) {
  const d = ((rating - 6.7) * .03 + user.goals * .015 + user.assists * .01) * user.mins / 90;
  return d > 0 ? d * growthFactor() : d * declineFactor();
}

// How much harder drops hit with age: from 30 an OVR loss is bigger, from 34 twice as big.
function declineFactor(age = ageOf(S.player.by)) { return age >= 34 ? 2 : age >= 32 ? 1.5 : age >= 30 ? 1.25 : 1; }

function initAttrs(pos, target) {
  const w = WEIGHTS[pos], keys = attrKeys(pos), avgW = 1 / keys.length;
  const attrs = {};
  keys.forEach(k => { attrs[k] = target + (w[k] - avgW) * 45 + rand(-4, 4); });
  const p = { pos, attrs };
  const diff = target - calcOVR(p);
  keys.forEach(k => { attrs[k] = clamp(attrs[k] + diff, 25, 99); });
  return attrs;
}

// Step 1: build the world and offer five clubs to choose from.
function prepareGame({ name, nat, pos }) {
  S = { v: 3, season: 0, week: 1, phase: 'choose', rerolls: 3 };
  Object.assign(S, buildWorld());
  const ovr = 55;
  S.player = {
    name, nat, pos, by: START_YEAR - START_AGE, attrs: initAttrs(pos, ovr), pot: randi(78, 94),
    club: null, wage: 0, years: 3, money: 1000, energy: 100, rep: 2, injured: 0,
    slots: TRAIN_SLOTS, equip: 0, house: 0,
    form: [], career: [], trophies: [], awards: [], ovrAtSign: ovr, joinedSeason: 0, caps: 0,
    aff: 50, affPen: 0, board: 50, objectives: [], objHist: [], order: null, loan: null, listed: false,
    clubsPlayed: [], banned: [], offerLock: 0, seasonSpells: [],
  };
  S.inbox = [];
  S.offers = [];
  S.startChoices = startingClubs();
  S.player.st = newStats();
}

// 10% top flight, 30% second tier, 60% third tier, for each of the five offers.
function startingClubs() {
  const all = Object.values(S.clubs), used = new Set(), out = [];
  while (out.length < 5) {
    const r = Math.random(), tier = r < .1 ? 1 : r < .4 ? 2 : 3;
    const c = pick(all.filter(x => clubTier(x) === tier && !used.has(x.id)));
    used.add(c.id);
    out.push(c.id);
  }
  return out.sort((a, b) => clubTier(club(a)) - clubTier(club(b)));
}

function refreshStartChoices() {
  if (S.phase !== 'choose' || S.rerolls <= 0) return false;
  S.rerolls--;
  S.startChoices = startingClubs();
  return true;
}

function startWage(clubId) { return Math.max(100, Math.round(marketWage(calcOVR(), club(clubId)) * .9 / 10) * 10); }

// Step 2: sign for the chosen club and start the first season.
function chooseStart(clubId) {
  const p = S.player, c = club(clubId);
  p.club = clubId;
  p.wage = startWage(clubId);
  p.clubsPlayed = [clubId];
  S.lastMatch = null;
  S.ovrSeasonStart = calcOVR();
  delete S.startChoices;
  makeSeason();
  p.offerLock = absWeek() + OFFER_LOCK_WEEKS;
  msg(`Welcome to ${c.name}! ${c.mgr} has handed you a 3-year youth contract at ${money(p.wage)}/week.`, 'good');
  msg('Win the manager over: hit his objectives, follow his match plans and play well. Low affection means fewer starts, and at zero you are released.');
  setObjectives();
  maybeOrder();
  save();
}

function msg(text, kind = 'info') {
  S.inbox.unshift({ text, kind, week: S.week, season: S.season });
  S.inbox = S.inbox.slice(0, 30);
}

function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }

function money(v) {
  const a = Math.abs(v), sign = v < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}€${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${sign}€${Math.round(a / 1e3)}K`;
  if (a >= 1e3) return `${sign}€${(a / 1e3).toFixed(1)}K`;
  return `${sign}€${Math.round(a)}`;
}

function clubPrestige(c) { return clamp((teamStrength(c) - 70) / 18, 0, 1); }

// Where a club sits in its own league by squad strength, 0 (weakest) to 1 (strongest).
function tierPrestige(c) {
  const ids = league(c.league).clubs, s = teamStrength(c);
  const below = ids.filter(id => teamStrength(club(id)) < s).length;
  return ids.length > 1 ? below / (ids.length - 1) : .5;
}

// Market wage from Salaries.xlsx: lowest-to-highest range for the league and position,
// placed by OVR within the tier and by how big the club is in its league.
function marketWage(ovr, c, pos = S.player.pos, age = ageOf(S.player.by)) {
  const l = league(c.league), table = SALARIES[l.nat], [lo, hi] = table[l.tier][pos];
  const fx = table.currency === 'GBP' ? GBP_TO_EUR : table.currency === 'USD' ? USD_TO_EUR : 1;
  const [a, b] = TIER_OVR[l.tier];
  const t = clamp((ovr - a) / (b - a), 0, 1);
  const x = clamp(t * .8 + tierPrestige(c) * .2, 0, 1);
  const youth = age <= 17 ? .45 : age === 18 ? .65 : age === 19 ? .85 : 1;
  return lo * Math.pow(hi / lo, Math.pow(x, 1.1)) * fx * youth;
}

// ---------- manager affection ----------
const effAff = () => clamp(S.player.aff - S.player.affPen, 0, 100);
function changeAff(d) { S.player.aff = clamp(S.player.aff + d, 0, 100); }
function changeBoard(d) { S.player.board = clamp(S.player.board + d, 0, 100); }

function formBonus() {
  const f = S.player.form;
  if (!f.length) return 0;
  return clamp((f.reduce((a, b) => a + b, 0) / f.length - 6.5) * 1.5, -3, 3);
}

function selScore(r, a, bonus = 0) { return r + (a - 50) * .2 + bonus; }

// Everyone competing for your position group, best first, as the manager sees it.
function peckingOrder(c = myClub(), ovr = calcOVR(), aff = effAff(), withForm = true) {
  const g = POS_GROUP[S.player.pos];
  // Injured rivals drop to the bottom until they are fit.
  const list = c.players.filter(pl => POS_GROUP[pl.pos] === g).map(pl => ({ n: pl.n, pos: pl.pos, r: pl.r, a: pl.a, inj: pl.inj || 0, score: pl.inj ? -99 : selScore(pl.r, pl.a) }));
  list.push({ n: S.player.name, pos: S.player.pos, r: ovr, a: aff, score: selScore(ovr, aff, withForm ? formBonus() : 0), me: true });
  return list.sort((x, y) => y.score - x.score);
}

function myRank(c = myClub(), ovr = calcOVR(), aff = effAff(), withForm = true) {
  return peckingOrder(c, ovr, aff, withForm).findIndex(x => x.me) + 1;
}

function squadStatus(c = myClub(), ovr = calcOVR(), aff = c === myClub() ? effAff() : 50) {
  const rank = myRank(c, ovr, aff, c === myClub()), slots = GROUP_SLOTS[POS_GROUP[S.player.pos]];
  if (rank === 1) return 'Key Player';
  if (rank <= slots) return 'Starter';
  if (rank <= slots + 2) return 'Rotation';
  return 'Reserve';
}

// Chance of starting the next match, and share of the rest where you come off the bench.
function startChance() {
  const p = S.player, c = myClub(), ovr = calcOVR(), eff = effAff();
  const slots = GROUP_SLOTS[POS_GROUP[p.pos]];
  // A club that promised you a starting role keeps its word for a while, unless you fall out.
  const promised = p.promise > 0 && eff >= 30;
  const rank = promised ? Math.min(myRank(), slots) : myRank();
  let start, subShare;
  if (clubTier(c) === 1) {
    start = rank <= slots ? .85 : rank === slots + 1 ? .3 : rank === slots + 2 ? .12 : .03;
    start *= clamp(.5 + eff / 100, .5, 1.3);
    subShare = rank <= slots ? .7 : rank <= slots + 2 ? .55 : .25;
  } else {
    start = ovr < 50 ? .1 : ovr < 55 ? .3 : ovr < 60 ? .55 : ovr < 65 ? .775 : ovr < 70 ? .87 : .93;
    start *= clamp(.6 + eff / 125, .6, 1.25);
    if (rank > slots + 2) start *= .85;
    if (promised) start = Math.max(start, .82);
    subShare = .5;
  }
  if (p.energy < 25) start *= .4;
  return { start: clamp(start, 0, .97), subShare };
}

// ---------- pop-up events ----------
// The UI shows these one by one with a celebration (good) or a gloomy (bad) animation.
const POPUPS = [];
function notify(kind, title, text) {
  POPUPS.push({ kind, title, text });
  if (POPUPS.length > 12) POPUPS.shift();
}

// ---------- manager objectives ----------
// Targets for this month, the next 3 months and the season. Forwards get goals, midfielders
// goals + assists, defenders and keepers clean sheets. Higher leagues demand more.
const OBJ_SPAN = {
  month: { weeks: 4, label: 'This month', win: 4, lose: 2, weight: 1 },
  quarter: { weeks: 12, label: 'Next 3 months', win: 7, lose: 4, weight: 2 },
  season: { weeks: SEASON_WEEKS, label: 'This season', win: 12, lose: 8, weight: 3 },
  // Off-the-ball tasks: what to work on in training, or keeping fresh for matchdays.
  drill: { weeks: 4, label: 'Training brief', win: 2, lose: 2, weight: .5 },
};
const OBJ_ORDER = ['month', 'quarter', 'season', 'drill'];
const OBJ_RATE = { ST: .4, LW: .3, RW: .3, CAM: .35, CM: .2, CDM: .12 };
const TIER_DEMAND = { 1: 1.15, 2: 1, 3: .9 };
const OBJ_WORDS = { goals: ['goal', 'goals'], ga: ['goal or assist', 'goals + assists'], clean: ['clean sheet', 'clean sheets'] };
const objWord = (kind, n) => OBJ_WORDS[kind][n === 1 ? 0 : 1];
function objText(o) {
  if (o.kind === 'train') return `Train ${ATTR_NAMES[o.attr]} ${o.target} times`;
  if (o.kind === 'energy') return `Start ${o.target} matchdays with ${o.min}+ energy`;
  return `${o.target} ${objWord(o.kind, o.target)}`;
}

// Share of objectives hit at this club decides how much the manager loves you and how far
// above market value he will let a salary negotiation go.
const BANDS = {
  elite: { min: .95, label: 'Hits 95%+ of targets', cap: 1.6, chance: .15, bonus: 3 },
  great: { min: .8, label: 'Hits 80–95% of targets', cap: 1.35, chance: .07, bonus: 1.5 },
  good: { min: .7, label: 'Hits 70–80% of targets', cap: 1.12, chance: .02, bonus: .5 },
  ok: { min: .6, label: 'Hits 60–70% of targets', cap: 1, chance: 0, bonus: 0 },
  poor: { min: 0, label: 'Misses too many targets', cap: 1, chance: -.05, bonus: -2 },
  new: { label: 'No track record yet', cap: 1, chance: 0, bonus: 0 },
};

const objKind = (pos = S.player.pos) => ({ FWD: 'goals', MID: 'ga' }[POS_GROUP[pos]] || 'clean');

function gamesBetween(from, to) {
  const lid = myClub().league, id = S.player.club;
  let n = 0;
  for (let w = from; w <= Math.min(to, SEASON_WEEKS); w++) {
    const md = matchdayFor(lid, w);
    if (md && md.some(f => f.includes(id))) n++;
  }
  return n;
}

function makeDrill() {
  const p = S.player, to = Math.min(SEASON_WEEKS, S.week + 3);
  if (to - S.week < 2) return null;
  const games = gamesBetween(S.week, to);
  if (Math.random() < .55 || games < 3) {
    // Usually a stat that matters for your position, sometimes your weakest one.
    const keys = attrKeys(p.pos), w = WEIGHTS[p.pos];
    const attr = Math.random() < .65 ? weightedPick(keys, k => w[k] + .01) : keys.slice().sort((a, b) => p.attrs[a] - p.attrs[b])[0];
    return { span: 'drill', kind: 'train', attr, target: randi(4, 6) + ((p.objHard || 0) >= .2 ? 1 : 0), progress: 0, endWeek: to, games };
  }
  return { span: 'drill', kind: 'energy', min: 60, target: games - 1, progress: 0, endWeek: to, games };
}

function makeObjective(span) {
  if (span === 'drill') return makeDrill();
  const p = S.player, to = Math.min(SEASON_WEEKS, span === 'season' ? SEASON_WEEKS : S.week + OBJ_SPAN[span].weeks - 1);
  const games = gamesBetween(S.week, to);
  if (games < 2) return null;
  const { start, subShare } = startChance();
  const play = clamp(start + (1 - start) * subShare * .35, .15, 1);
  const c = myClub(), str = teamStrength(c), kind = objKind();
  let perGame;
  if (kind === 'clean') {
    // Clean sheets depend on how strong your team is compared with the rest of the league.
    const ids = league(c.league).clubs, avg = ids.reduce((s, id) => s + teamStrength(club(id)), 0) / ids.length;
    perGame = clamp(.25 + (str - avg) / 35, .1, .55);
  } else {
    perGame = OBJ_RATE[p.pos] * clamp(Math.pow(calcOVR() / str, 3), .5, 1.6);
  }
  // Set a little below what you should manage, scaled up in bigger leagues. No short-term
  // target when you would barely expect to reach one (a reserve, or a holding midfielder).
  // After a pay rise the manager expects a little more.
  const expected = games * play * perGame * TIER_DEMAND[clubTier(c)] * (1 + (p.objHard || 0));
  if (span !== 'season' && expected < 1.1) return null;
  const target = Math.max(1, Math.floor(expected * .7 + .3));
  return { span, kind, target, progress: 0, endWeek: to, games };
}

// While you are injured the manager sets no targets; new ones come when you are fit again.
function setObjectives(spans = OBJ_ORDER) {
  const p = S.player;
  p.objectives = (p.objectives || []).filter(o => !spans.includes(o.span));
  if (!p.injured) spans.forEach(s => { const o = makeObjective(s); if (o) p.objectives.push(o); });
  p.objectives.sort((a, b) => OBJ_ORDER.indexOf(a.span) - OBJ_ORDER.indexOf(b.span));
}

// History holds +weight for a hit and -weight for a miss, so longer objectives count for more.
function objRate() {
  const h = S.player.objHist || [];
  if (h.length < 3) return null;
  const total = h.reduce((s, v) => s + Math.abs(v), 0);
  return h.reduce((s, v) => s + Math.max(0, v), 0) / total;
}
function objBand() { const r = objRate(); return r === null ? 'new' : ['elite', 'great', 'good', 'ok', 'poor'].find(k => r >= BANDS[k].min); }

function resolveObjective(o) {
  const p = S.player, ok = o.progress >= o.target, sp = OBJ_SPAN[o.span];
  p.objHist = [...(p.objHist || []), ok ? sp.weight : -sp.weight].slice(-16);
  const d = (ok ? sp.win : -sp.lose) + BANDS[objBand()].bonus;
  changeAff(d);
  const what = `${objText(o)} (${sp.label.toLowerCase()})`;
  const sign = d >= 0 ? '+' : '−';
  msg(`${ok ? 'Objective hit' : 'Objective missed'}: ${what}, you managed ${o.progress}. Affection ${sign}${Math.abs(Math.round(d))}.`, ok ? 'good' : 'bad');
  notify(ok ? 'good' : 'bad', ok ? 'Objective complete!' : 'Objective missed', `${myClub().mgr} wanted ${what}. You got ${o.progress}. Affection ${sign}${Math.abs(Math.round(d))}.`);
}

// After each week: settle objectives whose window has closed and set the next ones.
function tickObjectives() {
  const p = S.player, ended = (p.objectives || []).filter(o => o.span !== 'season' && o.endWeek < S.week);
  ended.forEach(resolveObjective);
  if (ended.length) setObjectives(ended.map(o => o.span));
}

// ---------- match instructions ----------
const ORDERS = {
  FWD: ['Press their centre-backs from the first whistle.', 'Stay central and attack the box, don\'t drift wide.', 'Make runs in behind their back line.', 'Hold the ball up and bring others into play.'],
  MID: ['Keep it simple: short passes, no risks.', 'Get forward and support the striker.', 'Sit deeper and protect the back four.', 'Switch play to the wings at every chance.'],
  DEF: ['Stay compact and don\'t bomb forward.', 'Play out from the back, no long balls.', 'Man-mark their most dangerous forward.', 'Hold a high line and squeeze the space.'],
  GK: ['Distribute short to the full-backs.', 'Come off your line and sweep behind the defence.', 'Organise the wall and the defensive line loudly.'],
};

// Now and then the manager gives you a specific plan for the next game.
function maybeOrder() {
  const p = S.player;
  p.order = null;
  if (S.phase !== 'season' || p.needsContract || p.injured || !nextFixture()) return;
  if (startChance().start < .25 || Math.random() > .3) return;
  p.order = { text: pick(ORDERS[POS_GROUP[p.pos]]), choice: null };
}

function setOrderChoice(choice) { if (S.player.order) S.player.order.choice = choice; save(); }

// ---------- rumours and approaches ----------
// A real derby rival, or a club of similar strength in the same league.
const isRival = c => areRivals(c.id, S.player.club) || (c.league === myClub().league && Math.abs(teamStrength(c) - teamStrength(myClub())) <= 5);

// Six months after joining a club, nobody bids for you. Clubs you betrayed never do.
const offerLocked = () => (S.player.offerLock || 0) > absWeek();
const isBanned = id => (S.player.banned || []).includes(id);

// Former clubs that would turn their back on you for good if you joined this one.
function rivalBetrayal(id) {
  const p = S.player;
  return (p.clubsPlayed || []).filter(x => x !== id && !isBanned(x) && areRivals(x, id));
}

function interestedClub() {
  const ovr = calcOVR(), mine = teamStrength(myClub());
  const pool = Object.values(S.clubs).filter(c => c.id !== S.player.club && !isBanned(c.id) && teamStrength(c) >= mine - 3 && teamStrength(c) <= ovr + 4);
  return pool.length ? pick(pool) : null;
}

function maybeDecision() {
  const p = S.player;
  if (S.decision || p.needsContract || p.loan || Math.random() > .07) return;
  const c = myClub();
  if (Math.random() < .5 || offerLocked()) {
    const texts = [`A tabloid claims you are unhappy at ${c.name} and want out.`, `A pundit says you have fallen out with ${c.mgr} behind the scenes.`, 'Social media is full of stories that you skipped extra training to go partying.'];
    S.decision = { type: 'rumour', text: pick(texts) };
  } else {
    const other = interestedClub();
    if (!other) return;
    S.decision = { type: 'approach', club: other.id, rival: isRival(other), text: `${other.name} (${league(other.league).name}) have contacted your agent about a move.${isRival(other) ? ' They are direct rivals of your club.' : ''}` };
  }
}

// On loan, your parent club can call you back: when you are flying, or when injuries
// leave them short in your position.
function maybeRecall() {
  const p = S.player;
  if (!p.loan || S.decision || p.loan.asked || S.week < 8 || S.week > 40) return;
  const parent = club(p.loan.parent), g = POS_GROUP[p.pos];
  const injured = parent.players.filter(pl => POS_GROUP[pl.pos] === g && pl.inj).length;
  const avg = p.st.apps ? p.st.rsum / p.st.apps : 0, good = p.st.apps >= 6 && avg >= 7.3;
  const chance = (injured >= 3 ? .25 : injured === 2 ? .08 : 0) + (good ? .04 + (avg - 7.3) * .15 : 0);
  if (Math.random() >= chance) return;
  p.loan.asked = true;
  const why = good && injured < 3 ?`They have been impressed by your form (${avg.toFixed(2)} average).` : `Injuries have left them short in ${{ GK: 'goal', DEF: 'defence', MID: 'midfield', FWD: 'attack' }[g]}.`;
  S.decision = { type: 'recall', club: parent.id, text: `${parent.mgr} wants to cancel your loan and bring you back to ${parent.name}. ${why}` };
}

function recallLoan() {
  const p = S.player, from = myClub().name;
  p.loan.result = p.st.apps ? p.st.rsum / p.st.apps : 6.5;
  closeSpell();
  endLoan();
  p.order = null;
  setObjectives();
  maybeOrder();
  msg(`Your loan at ${from} was cancelled. You are back in the ${myClub().name} squad.`, 'good');
  notify('good', 'Recalled from loan', `${myClub().mgr} wants you back. You return to ${myClub().name} straight away.`);
}

function resolveDecision(choice) {
  const d = S.decision, p = S.player;
  if (!d) return;
  if (d.type === 'recall') {
    if (choice === 'return') recallLoan();
    else { p.loan.parentAff = clamp(p.loan.parentAff - 8, 0, 100); msg(`You asked to stay on loan. ${club(d.club).mgr} is disappointed (−8 when you return).`, 'bad'); }
  } else if (d.type === 'rumour') {
    if (choice === 'deny') { changeAff(3); msg('You publicly denied the rumours. The manager appreciated it (+3).', 'good'); }
    else { changeAff(-1); msg('You stayed silent on the rumours. The manager is not impressed (−1).'); }
  } else {
    const c = club(d.club);
    if (choice === 'reject') {
      const gain = d.rival ? 8 : 4;
      changeAff(gain);
      msg(`You turned down ${c.name}${d.rival ? ', a rival club,' : ''} and said you are happy here. Affection +${gain}.`, 'good');
    } else {
      changeAff(-2);
      p.interested = d.club;
      msg(`You told your agent to listen to ${c.name}. ${inWindow() ? 'They have made an offer.' : 'They will bid when the window opens.'} Your manager heard about it (−2).`);
      if (inWindow()) { S.offers.push(makeOffer(c, 'transfer')); p.interested = null; }
    }
  }
  S.decision = null;
  checkTermination();
  save();
}

// ---------- termination ----------
function checkTermination() {
  const p = S.player;
  if (p.needsContract || effAff() > 0) return;
  const c = myClub();
  if (p.loan) {
    msg(`${c.mgr} has had enough of you. ${c.name} have sent you back early.`, 'bad');
    notify('bad', 'Loan cut short', `${c.name} ended your loan. You are back at ${club(p.loan.parent).name}.`);
    p.loan.result = 5.5;
    closeSpell();
    endLoan();
    setObjectives();
    return;
  }
  p.needsContract = true;
  p.free = true;
  p.wage = 0;
  p.listed = false;
  p.order = null;
  S.offers = [];
  msg(`${c.mgr} has had enough. ${c.name} have terminated your contract. You are a free agent.`, 'bad');
  notify('bad', 'Contract terminated', `Manager affection hit zero. ${c.name} have released you. Sign for a new club to keep playing.`);
  generateOffers(randi(2, 4), true);
}

// Free agents can look for a club at any time, once a week.
function findClubs() {
  const p = S.player, wk = S.season * 100 + S.week;
  if (!p.needsContract || p.lastSearch === wk) return false;
  p.lastSearch = wk;
  generateOffers(randi(1, 3), true);
  save();
  return true;
}

// ---------- training ----------
function equipMult() { return EQUIP_TIERS[S.player.equip].mult; }

// No hidden potential cap: the only ceiling is 91 OVR, and the last points come slowly.
// Below 65 a young player levels up quicker; from 30 every point is harder to earn.
// Saudi and US football is less competitive: the money is big, the development is slow.
const SLOW_GROWTH = { KSA: .6, USA: .6 };
const leagueGrowth = (c = myClub()) => SLOW_GROWTH[league(c.league).nat] || 1;
function growthFactor(lowBoost = true) {
  const age = ageOf(S.player.by), ovr = calcOVR();
  const ageF = age <= 21 ? 1.2 : age <= 25 ? 1 : age <= 29 ? .75 : age <= 31 ? .5 : age <= 33 ? .4 : .2;
  const low = !lowBoost ? 1 : ovr < 60 ? 1.5 : ovr < 65 ? 1.3 : 1;
  return ageF * low * leagueGrowth() * clamp(Math.pow(Math.max(0, MAX_OVR - ovr) / 20, 1.3), .06, 1);
}

// High attributes get harder to raise, but a session always gives something until 91.
function trainGain(attr) {
  if (calcOVR() >= MAX_OVR) return 0;
  const v = S.player.attrs[attr], ceiling = 1 - Math.max(0, v - 80) / 25;
  return Math.max(.01, .06 * equipMult() * growthFactor() * Math.max(.1, ceiling) * (S.player.energy < 30 ? .6 : 1));
}

function train(attr) {
  const p = S.player;
  if (S.phase !== 'season' || p.slots <= 0 || p.injured || p.energy < TRAIN_ENERGY) return null;
  const gain = trainGain(attr);
  p.attrs[attr] = clamp(p.attrs[attr] + gain, 1, 99);
  p.slots--;
  p.energy -= TRAIN_ENERGY;
  p.trainedThisWeek = (p.trainedThisWeek || 0) + 1;
  (p.objectives || []).forEach(o => { if (o.kind === 'train' && o.attr === attr) o.progress++; });
  changeAff(.1);
  save();
  return gain;
}

function rest() {
  const p = S.player;
  if (S.phase !== 'season' || p.slots <= 0) return;
  p.energy = Math.min(100, p.energy + 8);
  p.slots--;
  save();
}

// Kit you have bought stays yours; you only pay its price the first time.
const equipCost = i => i <= (S.player.equipOwned || 0) ? 0 : EQUIP_TIERS[i].buy;
function setEquip(i) {
  const p = S.player, t = EQUIP_TIERS[i], cost = equipCost(i);
  if (i > 0 && p.money < cost + t.fee) return false;
  p.money -= cost;
  p.equipOwned = Math.max(p.equipOwned || 0, i);
  p.equip = i;
  msg(i ? `${cost ? `Bought ${t.name} training equipment for ${money(cost)}` : `Switched to ${t.name} training equipment`} (${money(t.fee)}/week to run).` : 'Switched back to normal training equipment.', i ? 'good' : 'info');
  save();
  return true;
}

// ---------- agents ----------
function hireAgent(i) {
  const p = S.player, a = AGENTS[i];
  if (i === (p.agent || 0) || calcOVR() < a.minOvr || p.money < a.fee) return false;
  p.money -= a.fee;
  p.agent = i;
  msg(i ? `You signed with a ${a.name.toLowerCase()} for ${money(a.fee)}. They take ${Math.round(a.cut * 100)}% of your wage.` : 'You let your agent go. You will handle your own deals from now on.', i ? 'good' : 'info');
  save();
  return true;
}

// Your agent's messages to you, newest last, shown in the Agent tab.
function agentSay(text, kind = 'info') {
  const p = S.player;
  p.agentLog = [...(p.agentLog || []), { text, kind, season: S.season, week: S.week }].slice(-30);
  msg(`Agent: ${text}`, kind);
}

const canAnnounce = () => (S.player.agent || 0) > 0 && S.player.wishSeason !== S.season && !S.player.loan;

// Your agent tells the press which club you dream of joining: any club in the game. Your manager
// and board take it badly. The club still decides for itself at the next transfer window; going
// public only makes them a bit more likely to bid than they would be anyway.
function announceWish(id) {
  const p = S.player;
  if (!canAnnounce() || id === p.club || !club(id)) return false;
  p.wish = id;
  p.wishSeason = S.season;
  p.wishPending = true;
  p.wishResult = null;
  p.wishAt = absWeek();
  changeAff(-10);
  changeBoard(-12);
  msg(`You told the press you would love to play for ${club(id).name}. ${myClub().mgr} and the board are not happy (manager −10, board −12).`, 'bad');
  agentSay(`I have let ${club(id).name} know you want to join. They will decide ${inWindow() ? 'in the next couple of weeks' : 'when the next transfer window opens'}; I will tell you what they say.`);
  // In the summer there are no weeks to wait through: they answer straight away.
  if (S.phase === 'offseason') resolveWish();
  checkTermination();
  save();
  return true;
}

// How likely the club is to bid: about what it would be anyway, plus a little for going public.
// A club far above your level is very unlikely to come, however loudly you ask.
function wishChance(id = S.player.wish) {
  const p = S.player, c = club(id);
  if (!c || isBanned(id)) return 0;
  const s = teamStrength(c), reach = calcOVR() + 2 + p.rep / 30;
  const normal = s <= reach ? .3 + p.rep / 300 : Math.max(0, .3 - (s - reach) * .05);
  return clamp(normal * (1.25 + (p.agent || 0) * .04), .01, .75);
}
const wishOdds = id => { const c = wishChance(id); return c >= .4 ? 'Good' : c >= .25 ? 'Fair' : c >= .1 ? 'Low' : c > .01 ? 'Very low' : 'Almost none'; };

// At the transfer window the club makes up its mind, and your agent tells you why.
function resolveWish() {
  const p = S.player, c = club(p.wish);
  if (!p.wishPending || !c) return;
  if (p.wish === p.club) { p.wishPending = false; return; }
  if (isBanned(p.wish)) { p.wishPending = false; agentSay(`${c.name} will not talk to us. They have not forgiven you for joining their rivals.`, 'bad'); return; }
  if (offerLocked()) { agentSay(`Clubs will not bid while you are settling in at ${myClub().name}. ${c.name} will look again at the next window.`); return; }
  p.wishPending = false;
  if (S.offers.some(o => o.club === p.wish)) { p.wishResult = 'offer'; agentSay(`${c.name} already have an offer on the table for you.`, 'good'); return; }
  if (Math.random() < wishChance()) {
    S.offers.push(makeOffer(c, 'transfer'));
    p.wishResult = 'offer';
    agentSay(`Great news: ${c.name} have made you an offer! It is on your Home screen.`, 'good');
    notify('good', `${c.name} want you!`, 'Your agent says your dream club have made an offer.');
    return;
  }
  const gap = teamStrength(c) - calcOVR();
  const why = gap > 8 ? `they think you are not ready for their level yet (team rating ${Math.round(teamStrength(c))}, you are ${calcOVR()})`
    : gap > 3 ? 'they like you, but went for a more experienced player'
    : pick(['they are happy with the players they have in your position', 'the board would not approve the budget', 'their manager prefers another target']);
  p.wishResult = 'no';
  agentSay(`${c.name} have decided not to bid: ${why}. You can name a dream club again next season.`, 'bad');
  notify('bad', 'No move to your dream club', `${c.name} decided not to make an offer.`);
}

function setHouse(i) { S.player.house = i; msg(`Moved into a ${HOUSING[i].name.toLowerCase()} (${money(HOUSING[i].rent)}/week).`); save(); }

function sponsorIncome() { const r = S.player.rep; return Math.round(r * r * 4.5); }
const agentCut = () => Math.round(S.player.wage * agent().cut);
function weeklyCosts() { const p = S.player; return HOUSING[p.house].rent + EQUIP_TIERS[p.equip].fee + agentCut(); }
function weeklyNet() { return S.player.wage + sponsorIncome() - weeklyCosts(); }
function energyRegen() { const p = S.player; return 30 + HOUSING[p.house].energy + EQUIP_TIERS[p.equip].energy; }

// ---------- matches ----------
function nextFixture() {
  const p = S.player, md = matchdayFor(myClub().league);
  if (!md) return null;
  const f = md.find(([h, a]) => h === p.club || a === p.club);
  if (!f) return null;
  return { home: f[0], away: f[1], isHome: f[0] === p.club, opp: f[0] === p.club ? f[1] : f[0] };
}

function selection() {
  const p = S.player;
  if (p.injured) return { mins: 0, start: false };
  const { start, subShare } = startChance();
  const r = Math.random();
  if (r < start) return { mins: randi(75, 90), start: true };
  if (r < start + (1 - start) * subShare) return { mins: randi(12, 35), start: false };
  return { mins: 0, start: false };
}

function aiScorer(c) { return weightedPick(c.players, pl => GOAL_SHARE[pl.pos] * Math.pow(pl.r / 70, 8) + .001); }
function aiAssister(c, scorer) { return weightedPick(c.players.filter(pl => pl !== scorer), pl => ASSIST_SHARE[pl.pos] * Math.pow(pl.r / 70, 8) + .001); }

function recordResult(h, a, gh, ga) {
  const th = S.table[h], ta = S.table[a];
  th.p++; ta.p++; th.gf += gh; th.ga += ga; ta.gf += ga; ta.ga += gh;
  if (gh > ga) { th.w++; ta.l++; th.pts += 3; } else if (gh < ga) { ta.w++; th.l++; ta.pts += 3; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
}

function playFixture(h, a, user) {
  const ch = club(h), ca = club(a);
  let sh = teamStrength(ch), sa = teamStrength(ca);
  const ovr = calcOVR(), p = S.player;
  if (user && user.mins) {
    const mineHome = h === p.club;
    const base = mineHome ? sh : sa;
    const withMe = teamStrength(myClub(), ovr, p.pos);
    // Following the manager's plan gives the team a small edge; it is no guarantee.
    const adj = base + (withMe - base) * user.mins / 90 + (user.follow ? 1.5 : 0);
    if (mineHome) sh = adj; else sa = adj;
  }
  const gh = poisson(1.45 * Math.exp((sh - sa + 2) / 13));
  const ga = poisson(1.15 * Math.exp((sa - sh - 2) / 13));
  recordResult(h, a, gh, ga);
  const scorers = [];
  const credit = (c, goals, mine) => {
    for (let i = 0; i < goals; i++) {
      let s = null, myAssist = false;
      if (mine && user.mins) {
        const teamStr = teamStrength(c);
        const pGoal = clamp(GOAL_SHARE[p.pos] * Math.pow(ovr / teamStr, 3) * user.mins / 90 * (user.own ? 1.3 : 1), 0, .7);
        if (Math.random() < pGoal) { user.goals++; scorers.push({ n: p.name, me: true, home: c.id === h }); }
        else {
          const pAst = clamp(ASSIST_SHARE[p.pos] * Math.pow(ovr / teamStr, 2) * user.mins / 90 * 1.3 * (user.own ? 1.3 : 1), 0, .7);
          if (Math.random() < pAst) { user.assists++; myAssist = true; }
          s = aiScorer(c);
        }
      } else s = aiScorer(c);
      if (s) { s.g++; scorers.push({ n: s.n, home: c.id === h }); }
      // Most goals have an assist; credit a teammate unless it was yours.
      if (!myAssist && Math.random() < .7) { const a = aiAssister(c, s); if (a) a.as = (a.as || 0) + 1; }
    }
  };
  credit(ch, gh, user && h === p.club);
  credit(ca, ga, user && a === p.club);
  return { h, a, gh, ga, scorers };
}

function matchRating(user, res) {
  const p = S.player, mine = res.h === p.club;
  const gf = mine ? res.gh : res.ga, gaa = mine ? res.ga : res.gh;
  const teamStr = teamStrength(myClub());
  const g = POS_GROUP[p.pos];
  let r = 6.4 + (calcOVR() - teamStr) / 30 + user.goals * .9 + user.assists * .6;
  r += gf > gaa ? .3 : gf < gaa ? -.3 : 0;
  if ((g === 'GK' || g === 'DEF') && gaa === 0 && user.mins >= 60) r += .6;
  if (g === 'GK' || g === 'DEF') r -= gaa * .15;
  if (p.energy < 30) r -= .4;
  r += gauss() * .45;
  if (user.mins < 45) r = 6 + (r - 6) * .6;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

// Your stats, form, fitness, reputation, OVR and objectives after a game you played in.
function applyUserMatch(user, res, isHome, cup, report, comp = null) {
  const p = S.player, rating = matchRating(user, res);
  user.rating = rating;
  const st = p.st, line = cup ? st.cup : st;
  line.apps++; line.goals += user.goals; line.assists += user.assists; line.rsum += rating;
  addComp(st.comps = st.comps || {}, comp ? comp.name : league(myClub().league).name, comp ? comp.kind : 'league', 1, user.goals, user.assists, rating);
  if (!cup && user.start) st.starts++;
  const conceded = isHome ? res.ga : res.gh;
  const clean = conceded === 0 && ['GK', 'DEF'].includes(POS_GROUP[p.pos]) && user.mins >= 60;
  if (clean && !cup) st.clean++;
  if (rating >= 8.3) { if (!cup) st.motm++; report.events.push(cup ? 'Player of the Match in the cup!' : 'Player of the Match!'); }
  p.form.push(rating); p.form = p.form.slice(-5);
  p.energy -= Math.round(user.mins / 90 * 22);
  p.rep = clamp(p.rep + (rating - 6.4) * .5 * (0.6 + clubPrestige(myClub())) * (cup ? 1.3 : 1) + user.goals * .25, 0, 100);
  changeAff(rating >= 7.5 ? 2 : rating >= 7 ? 1 : rating < 6 ? -2 : 0);
  nudgeOvr(perfDelta(rating, user));
  // Goals, assists and clean sheets in every competition count towards objectives.
  (p.objectives || []).forEach(o => { o.progress += o.kind === 'goals' ? user.goals : o.kind === 'ga' ? user.goals + user.assists : o.kind === 'clean' && clean ? 1 : 0; });
}

// ---------- weekly loop ----------
function advanceWeek() {
  const p = S.player;
  if (S.phase !== 'season' || p.needsContract) return null;
  const report = { week: S.week, season: S.season, match: null, events: [] };
  const fx = nextFixture();
  let user = null;

  if (fx) {
    // Manager's fitness brief: count the matchdays you turn up fresh for.
    if (!p.injured) (p.objectives || []).forEach(o => { if (o.kind === 'energy' && p.energy >= o.min) o.progress++; });
    else p.st.missed = (p.st.missed || 0) + 1;
    user = { ...selection(), goals: 0, assists: 0 };
    // The manager's plan only matters if you actually play.
    if (p.order && user.mins) { user.follow = p.order.choice !== 'own'; user.own = p.order.choice === 'own'; }
  }

  for (const l of S.leagues) {
    const md = matchdayFor(l.id);
    if (!md) continue;
    for (const [h, a] of md) {
      const involved = h === p.club || a === p.club;
      const res = playFixture(h, a, involved ? user : null);
      if (involved) report.match = res;
    }
  }

  if (fx && report.match) {
    const res = report.match;
    report.match.user = user;
    report.match.isHome = fx.isHome;
    if (user.mins) {
      applyUserMatch(user, res, fx.isHome, false, report);
      if (user.follow) { changeAff(2); report.events.push('You followed the manager\x27s plan. Affection +2'); }
      if (user.own) { changeAff(-6); report.events.push('You ignored the manager\x27s plan. He is furious: affection −6'); }
    }
    if (p.promise > 0) p.promise--;
    S.results.unshift({ week: S.week, opp: fx.opp, isHome: fx.isHome, gf: fx.isHome ? res.gh : res.ga, ga: fx.isHome ? res.ga : res.gh, rating: user.rating || null, goals: user.goals, assists: user.assists, mins: user.mins });
  }
  p.order = null;

  // Midweek cup game (European or domestic), picked on how fresh you are after the weekend.
  const efx = midweekFixture();
  const cupUser = efx ? { ...selection(), goals: 0, assists: 0 } : null;
  const euroRes = euroWeek(efx && efx.euro ? cupUser : null);
  const homeRes = cupWeek(efx && !efx.euro ? cupUser : null);
  const cupRes = euroRes || homeRes;
  if (efx && cupRes) {
    report.cup = { ...cupRes, user: cupUser, isHome: efx.isHome, stage: efx.stage };
    if (cupUser.mins) {
      applyUserMatch(cupUser, cupRes, efx.isHome, true, report, { name: efx.t.name.replace(/ \d{4}$/, ''), kind: efx.euro ? 'euro' : 'cup' });
      // Your numbers in this competition, for its end-of-tournament awards.
      const my = efx.t.my = efx.t.my || { apps: 0, goals: 0, assists: 0, rsum: 0 };
      my.apps++; my.goals += cupUser.goals; my.assists += cupUser.assists; my.rsum += cupUser.rating;
    }
  }

  // Finances
  const net = weeklyNet();
  p.money += net;
  report.net = net;
  if (p.money < 0 && p.equip > 0) {
    p.equip = 0;
    msg('You could not pay for your training equipment, so you are back on normal kit.', 'bad');
  }
  if (p.money < 0 && p.house > 0) {
    p.house = 0;
    msg('You ran out of money and had to move back into a shared flat.', 'bad');
  }

  // Injury. Every week out costs a little sharpness, more as you get older; the big
  // judgement comes in the end-of-season review, based on how many games you missed.
  if (p.injured) {
    p.injured--;
    nudgeOvr(-.03 * declineFactor());
    if (!p.injured) {
      msg('You are fit again and back in training.', 'good');
      setObjectives(OBJ_ORDER.filter(s => s !== 'season' || !p.objectives.some(o => o.span === 'season')));
    }
  } else {
    let chance = .012 + (p.energy < 30 ? .05 : 0) + (p.trainedThisWeek || 0) * .004 + (user && user.mins ? .01 : 0) + (cupUser && cupUser.mins ? .01 : 0);
    chance *= (1 - .1 * p.equip) * (ageOf(p.by) >= 32 ? 1.3 : 1);
    if (Math.random() < chance) {
      // Most knocks are short; about one in ten is a serious injury.
      const serious = Math.random() < .1;
      p.injured = serious ? randi(8, 20) : randi(1, 6);
      const kind = serious ? pick(['torn knee ligament', 'broken foot', 'torn hamstring', 'ruptured achilles', 'fractured ankle']) : pick(['hamstring strain', 'ankle sprain', 'calf tightness', 'knee knock', 'groin strain', 'thigh bruise']);
      msg(`Injury: ${kind}. Out for ${p.injured} week${p.injured > 1 ? 's' : ''}.`, 'bad');
      notify('bad', serious ? 'Serious injury' : 'Injured', `You picked up a ${kind} and will be out for ${p.injured} week${p.injured > 1 ? 's' : ''}.${serious ? ' Missing a big part of the season will cost you OVR.' : ''}`);
      report.events.push(`Injured for ${p.injured} week${p.injured > 1 ? 's' : ''}`);
      // Short-term targets are dropped without penalty; the season target stays.
      if ((p.objectives || []).some(o => o.span !== 'season')) {
        p.objectives = p.objectives.filter(o => o.span === 'season');
        msg(`${myClub().mgr} has put your objectives on hold until you are fit.`);
      }
    }
  }

  p.energy = clamp(p.energy + energyRegen(), 0, 100);
  p.slots = TRAIN_SLOTS;
  p.trainedThisWeek = 0;
  p.affPen = Math.max(0, p.affPen - 1.5);
  p.aff += (50 - p.aff) * .04; // Goodwill fades unless you keep earning it.
  // Rivals' standing with the manager drifts week to week.
  const g = POS_GROUP[p.pos];
  myClub().players.forEach(pl => { if (POS_GROUP[pl.pos] === g) pl.a = clamp(pl.a + rand(-1.5, 1.5) + (pl.a < 55 ? .3 : -.3), 20, 95); });
  // Teammates (and your parent club's players while on loan) pick up knocks too.
  [p.club, p.loan && p.loan.parent].filter(Boolean).forEach(id => club(id).players.forEach(pl => {
    if (pl.inj) pl.inj--; else if (Math.random() < .012) pl.inj = randi(1, 8);
  }));

  randomEvent(report);
  checkContractBoost();
  veteranRenewal();
  const card = cardTier(calcOVR());
  if (card !== 'Bronze' && !(p.cards || []).includes(card)) {
    p.cards = [...(p.cards || []), card];
    msg(card === 'Silver' ? 'You reached a silver rating (65)! Top-flight scouts are taking notice, and second-tier clubs will bid for you.' : 'You reached a gold rating (75)! You are now one of the most wanted players around.', 'good');
    notify('good', `${card} rating!`, card === 'Silver' ? 'You hit 65 OVR. Top-flight scouts are watching and second-tier clubs will bid for you.' : 'You hit 75 OVR. You are one of the most wanted players around.');
  }

  // January transfer window
  if (S.week === JAN_WINDOW[0]) { msg('The January transfer window is open.'); windowOffers(); }
  else if (S.week > JAN_WINDOW[0] && S.week <= JAN_WINDOW[1] && Math.random() < (p.listed ? .7 : .35)) generateOffers(1);
  // A dream club named during the window answers within two weeks, or before it shuts.
  if (p.wishPending && S.week > JAN_WINDOW[0] && S.week <= JAN_WINDOW[1] && (absWeek() - p.wishAt >= 2 || S.week === JAN_WINDOW[1])) resolveWish();
  if (S.week === JAN_WINDOW[1] + 1) { expireOffers('transfer'); msg('The January transfer window has closed.'); }

  S.lastMatch = report;
  S.week++;
  if (S.week === CUP_WEEKS.playoff[0]) buildPlayoffs();
  if (S.week > SEASON_WEEKS) endSeason(report);
  else {
    tickObjectives();
    maybeOrder();
    maybeDecision();
    maybeRecall();
    checkTermination();
  }
  save();
  return report;
}

// A manager who adores a veteran (affection 95+, age 33+) usually offers an extension himself.
function veteranRenewal() {
  const p = S.player;
  if (S.week !== 30 || p.loan || p.vetAsked === S.season || ageOf(p.by) <= 32 || effAff() < 95) return;
  if (S.offers.some(o => o.type === 'renew')) return;
  p.vetAsked = S.season;
  if (Math.random() >= .7) return;
  S.offers.push(makeOffer(myClub(), 'renew'));
  msg(`${myClub().mgr} wants you to stay and has offered you a new contract.`, 'good');
  notify('good', 'The manager wants you to stay', `${myClub().mgr} came to you with a new contract. Check your Home screen.`);
}

function randomEvent(report) {
  const p = S.player;
  if (Math.random() > .14) return;
  const events = [
    () => { if (p.rep < 15) return; const v = Math.round(p.rep * 600); p.money += v; msg(`A boot brand paid you ${money(v)} for a photoshoot.`, 'good'); },
    () => { p.rep = clamp(p.rep + 1.5, 0, 100); msg('Your visit to a children\'s hospital went viral. Reputation up.', 'good'); },
    () => { const v = Math.round(Math.max(150, p.wage * rand(.3, .8))); p.money -= v; msg(`Your car needed repairs: ${money(v)}.`, 'bad'); },
    () => { p.energy = clamp(p.energy - 15, 0, 100); msg('You slept badly before training. Energy down.', 'bad'); },
    () => { const k = pick(attrKeys(p.pos)); p.attrs[k] = clamp(p.attrs[k] + .8, 1, 99); msg(`A senior teammate gave you extra ${ATTR_NAMES[k].toLowerCase()} tips after training.`, 'good'); },
    () => { changeAff(-3); msg('You were late to a team meeting. Manager affection −3.', 'bad'); },
    () => { changeAff(3); msg('The manager praised your attitude in front of the squad. Affection +3.', 'good'); },
    () => { if (p.rep < 30) return; const v = Math.round(p.rep * 1500); p.money += v; msg(`You signed a social media deal worth ${money(v)}.`, 'good'); },
  ];
  pick(events)();
}

function checkContractBoost() {
  const p = S.player, ovr = calcOVR();
  if (p.loan || p.years < 1 || ovr - p.ovrAtSign < 4 || effAff() < 45 || negLocked()) return;
  if (S.offers.some(o => o.type === 'renew')) return;
  if (p.wage > marketWage(ovr, myClub()) * .8) return;
  S.offers.push(makeOffer(myClub(), 'renew'));
  msg(`${myClub().name} want to reward your progress with an improved contract.`, 'good');
}

// Renewals pay around market value; rival clubs bid above it to tempt you away.
function makeOffer(c, type) {
  const ovr = calcOVR();
  const range = type === 'renew' ? [.85, 1] : [1.05, 1.35];
  const wage = Math.round(marketWage(ovr, c) * rand(...range) * (1 + agent().wage) / 10) * 10;
  const age = ageOf(S.player.by);
  const years = age >= 32 ? randi(1, 2) : randi(2, 5);
  let status = squadStatus(c, ovr), promised = false;
  // Buying clubs sometimes promise a starting place, more often when you are close to their level.
  if (type === 'transfer' && (status === 'Rotation' || status === 'Reserve') && Math.random() < clamp(.45 - (teamStrength(c) - ovr) * .04, .1, .6)) {
    status = 'Starter';
    promised = true;
  }
  // Buying clubs only haggle a set number of times (1 to 3) before walking away.
  const maxRounds = (type === 'transfer' ? randi(1, 3) : 2) + ((S.player.agent || 0) >= 4 ? 1 : 0);
  return { id: Math.random().toString(36).slice(2, 9), club: c.id, type, wage, years, status, promised, week: S.week, season: S.season, rounds: 0, maxRounds, pen: 0 };
}

const maxRounds = o => o.maxRounds || 2;
const negLocked = () => (S.player.negLock || 0) > absWeek();

// Scouting signals: a 5+ OVR jump this season, and a silver (65+) rating.
function scoutBuzz() {
  const ovr = calcOVR();
  return { breakout: ovr - (S.ovrSeasonStart || ovr) >= 5, silver: ovr >= 65 };
}

function generateOffers(count, guarantee = false) {
  const p = S.player, ovr = calcOVR(), { breakout, silver } = scoutBuzz();
  // Free agents always hear from someone; otherwise clubs leave you to settle in for six months.
  if (!guarantee && offerLocked()) return;
  const reach = ovr + 2 + p.rep / 30;
  const home = p.loan ? p.loan.parent : p.club;
  const free = c => c.id !== p.club && c.id !== home && !isBanned(c.id) && !S.offers.some(o => o.club === c.id);
  const pool = Object.values(S.clubs).filter(c => {
    if (!free(c)) return false;
    const s = teamStrength(c), top = clubTier(c) === 1;
    // Top-flight scouts stretch further for a breakout or silver-rated player.
    return s <= reach + (top && breakout ? 5 : 0) + (top && silver ? 2 : 0) && s >= ovr - 10;
  });
  // Prefer the strongest clubs that rate you.
  pool.sort((a, b) => teamStrength(b) - teamStrength(a));
  const base = (.25 + p.rep / 200) * (p.listed ? 1.8 : 1) * agent().offers;
  let added = 0;
  const names = [];
  const add = c => { S.offers.push(makeOffer(c, 'transfer')); added++; names.push(c.name); msg(`${c.name} (${league(c.league).name}) have made you an offer.`, 'good'); };
  for (const c of pool.slice(0, 24)) {
    if (added >= count) break;
    // Silver: second-tier clubs are much keener, top-flight clubs a little.
    const w = clubTier(c) === 1 ? (breakout ? 3 : 1) * (silver ? 1.3 : 1) : clubTier(c) === 2 && silver ? 1.5 : 1;
    if (Math.random() < (guarantee ? .5 : base) * w) add(c);
  }
  // A silver-rated player in the lower leagues always gets a second-tier (or better) offer.
  if (silver && clubTier(myClub()) >= 2 && !S.offers.some(o => o.type === 'transfer' && clubTier(club(o.club)) <= 2)) {
    const better = Object.values(S.clubs).filter(c => free(c) && clubTier(c) <= 2 && teamStrength(c) <= reach + 2)
      .sort((a, b) => teamStrength(b) - teamStrength(a));
    if (better.length) add(pick(better.slice(0, 6)));
  }
  if (guarantee && added === 0) {
    const weakest = Object.values(S.clubs).filter(free).sort((a, b) => teamStrength(a) - teamStrength(b));
    add(pick(weakest.slice(0, 20)));
  }
  if (added) notify('good', added > 1 ? `${added} clubs want you!` : 'A club wants you!', `${names.join(', ')} ${added > 1 ? 'have' : 'has'} made you an offer. Check your Home screen.`);
}

// Offers when a window opens: more for a breakout season or a transfer request.
function windowOffers() {
  const { breakout } = scoutBuzz(), p = S.player;
  resolveWish();
  if (offerLocked()) { msg('Clubs are leaving you to settle in at your new club: no transfer offers this window.'); return; }
  // A club you agreed to listen to comes back with a bid.
  if (p.interested && p.interested !== p.club && !isBanned(p.interested) && !S.offers.some(o => o.club === p.interested)) S.offers.push(makeOffer(club(p.interested), 'transfer'));
  p.interested = null;
  generateOffers(randi(1, 3) + (breakout ? 2 : 0) + (S.player.listed ? 2 : 0));
}

function expireOffers(type) { S.offers = S.offers.filter(o => o.type !== type); }

// How far above market value a deal can go depends on your objective hit rate at this club.
function wageCap(o) {
  const mkt = marketWage(calcOVR(), club(o.club)), cap = BANDS[objBand()].cap;
  return (o.type === 'renew' ? mkt * cap : mkt * (cap + .3)) * (1 + agent().wage);
}

function negotiateChance(o, ask) {
  const c = club(o.club), ovr = calcOVR();
  const aff = o.type === 'renew' ? effAff() : 50;
  const board = o.type === 'renew' ? (S.player.board - 50) / 200 : 0;
  const over = o.wage * (1 + ask.pct) > wageCap(o) ? .35 : 0;
  return clamp(.85 - ask.pct * 1.3 + (aff - 50) / 120 + board + (ovr - teamStrength(c)) / 30 - o.rounds * .15 + (o.type === 'renew' ? BANDS[objBand()].chance : 0) - over + agent().neg, .05, .95);
}

const canNegotiate = o => o.rounds < maxRounds(o) && !(o.type === 'renew' && negLocked());

// Ask for more money. With your own club it costs manager affection whatever the outcome,
// and a pay rise makes him expect more. A buying club walks away if talks fail, but their
// manager's affection only starts once you have joined.
function negotiate(id, i) {
  const o = S.offers.find(x => x.id === id), ask = ASKS[i], p = S.player;
  if (!o || !canNegotiate(o)) return null;
  const ok = Math.random() < negotiateChance(o, ask);
  o.rounds++;
  const renew = o.type === 'renew';
  if (renew) { p.affPen += ask.pen; changeBoard(-2); }
  let result;
  if (ok) {
    o.wage = Math.round(Math.min(o.wage * (1 + ask.pct), Math.max(o.wage, wageCap(o))) / 10) * 10;
    o.negotiated = true;
    result = 'accepted';
    // Even when he agrees, the manager resents being squeezed: affection drops by a fifth.
    if (renew) changeAff(-p.aff * .2);
  } else if (!renew || Math.random() < ask.pct * 1.2) { S.offers = S.offers.filter(x => x.id !== id); result = 'withdrawn'; }
  else result = 'rejected';
  if (renew && result !== 'accepted') changeAff(-3);
  if (result === 'withdrawn') notify('bad', 'Offer withdrawn', `${club(o.club).name} ${renew ? 'were offended by your demands' : 'would not meet your demands'} and walked away.`);
  checkTermination();
  const name = club(o.club).name;
  msg(result === 'accepted' ? `${name} agreed to ${money(o.wage)}/week.` : result === 'withdrawn' ? `${name} were offended and withdrew their offer.` : `${name} refused to raise their offer.`, result === 'accepted' ? 'good' : 'bad');
  save();
  return result;
}

function acceptOffer(id) {
  const o = S.offers.find(x => x.id === id);
  if (!o) return;
  const p = S.player;
  if (o.type === 'transfer') {
    const from = myClub().name;
    // Joining a rival of a former club: that club will never come for you again.
    const betrayed = rivalBetrayal(o.club);
    if (betrayed.length) {
      p.banned = [...(p.banned || []), ...betrayed];
      const names = betrayed.map(id => club(id).name).join(' and ');
      msg(`${names} will never forgive you for joining ${club(o.club).name}. They will not approach you again.`, 'bad');
      notify('bad', 'Burned bridges', `You joined ${names}'s rivals. ${names} fans and board will hate you: they will never make you an offer again.`);
    }
    // Your stats so far this season stay with your old club as their own career row.
    closeSpell();
    p.club = o.club;
    p.clubsPlayed = [...new Set([...(p.clubsPlayed || []), o.club])];
    p.offerLock = absWeek() + OFFER_LOCK_WEEKS;
    p.loan = null;
    p.joinedSeason = S.season;
    p.aff = o.promised ? 60 : 50;
    p.affPen = 0;
    p.board = 50;
    p.listed = false;
    p.objHist = [];
    p.objHard = o.negotiated ? .1 : 0;
    p.promise = o.promised ? 15 : 0;
    p.negLock = 0;
    if (o.promised) msg(`${club(o.club).mgr} has promised you a starting place. Keep him happy and it is yours.`, 'good');
    if (S.seasonSummary) S.seasonSummary.loanNext = false;
    msg(`Signed for ${club(o.club).name} from ${from}: ${money(o.wage)}/week for ${o.years} years.`, 'good');
    notify('good', 'Welcome to ' + club(o.club).name + '!', `You signed a ${o.years}-year deal worth ${money(o.wage)} a week.`);
    p.rep = clamp(p.rep + 2, 0, 100);
  } else {
    msg(`Signed a new ${o.years}-year deal at ${money(o.wage)}/week. No more salary talks for about six months.`, 'good');
    notify('good', 'New contract signed!', `${o.years} more years at ${club(o.club).name}, ${money(o.wage)} a week.`);
    p.negLock = absWeek() + NEG_LOCK_WEEKS;
    if (o.negotiated) {
      p.objHard = Math.min(.3, (p.objHard || 0) + .1);
      msg(`${myClub().mgr} expects more after your pay rise. His objectives will be a little harder.`);
    }
  }
  p.wage = o.wage;
  p.years = o.years;
  p.ovrAtSign = calcOVR();
  p.needsContract = false;
  S.offers = [];
  p.free = false;
  if (S.phase === 'season') { setObjectives(); maybeOrder(); }
  save();
}

function declineOffer(id) {
  const o = S.offers.find(x => x.id === id);
  if (o && o.type === 'renew') { changeAff(-4); changeBoard(-4); }
  // Turning down other clubs shows loyalty, especially rivals.
  if (o && o.type === 'transfer' && !S.player.needsContract) changeAff(isRival(club(o.club)) ? 5 : 2);
  S.offers = S.offers.filter(x => x.id !== id);
  save();
}

const inWindow = () => S.phase === 'offseason' || (S.week >= JAN_WINDOW[0] && S.week <= JAN_WINDOW[1]);

// Hand in a transfer request: the manager and the board take it badly, but clubs hear you are available.
function requestTransfer() {
  const p = S.player;
  if (p.listed || p.loan) return false;
  p.listed = true;
  changeAff(-15);
  changeBoard(-20);
  msg(`You handed in a transfer request. ${myClub().mgr} and the board are unhappy (manager −15, board −20).`, 'bad');
  if (inWindow()) generateOffers(randi(1, 3));
  else msg('Clubs will make offers when the next transfer window opens.');
  checkTermination();
  save();
  return true;
}

function withdrawTransferRequest() {
  const p = S.player;
  if (!p.listed) return;
  p.listed = false;
  changeBoard(5);
  msg('You withdrew your transfer request. The board appreciates it (+5).', 'good');
  save();
}

// Ask the club for a new deal. Needs the board and manager on side; otherwise it backfires a little.
function requestContract() {
  const p = S.player, wk = S.season * 100 + S.week;
  if (p.loan || p.needsContract || S.offers.some(o => o.type === 'renew')) return 'busy';
  if (negLocked()) return 'locked';
  if (p.lastAsk && wk - p.lastAsk < 10) return 'soon';
  p.lastAsk = wk;
  if (p.board >= 40 && effAff() >= 50) {
    S.offers.push(makeOffer(myClub(), 'renew'));
    msg(`${myClub().name} have put a new contract on the table.`, 'good');
    save();
    return 'offer';
  }
  changeBoard(-3);
  msg('The board refused to discuss a new contract. Board −3.', 'bad');
  save();
  return 'refused';
}

// ---------- season end ----------
function leagueTable(lid) {
  return league(lid).clubs.map(id => ({ id, ...S.table[id] }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

// Goals (or assists) in a league this season. Your goals for every club you played for in
// that league this season count, like they would in real life.
function leagueChart(lid, key, n) {
  const p = S.player, list = [], aiKey = key === 'goals' ? 'g' : 'as';
  league(lid).clubs.forEach(id => club(id).players.forEach(pl => { if (pl[aiKey]) list.push({ n: pl.n, club: id, g: pl[aiKey] }); }));
  const mine = S.phase === 'season' || S.phase === 'offseason' ? leagueTally(lid, key) : 0;
  if (mine) list.push({ n: p.name, club: p.club, g: mine, me: true });
  return list.sort((a, b) => b.g - a.g).slice(0, n);
}
const topScorers = (lid, n = 10) => leagueChart(lid, 'goals', n);
const topAssists = (lid, n = 10) => leagueChart(lid, 'assists', n);

// How much each kind of award lifts your OVR in the end-of-season review. Each award counts
// once, under the first line it matches (so a young player award is never a senior one too).
const AWARD_OVR = [
  [/Young Player|Kopa|Golden Boy/, .6], [/Ballon d'Or|The Best/, 1], [/Golden Shoe|Golden Boot|Gerd Müller|Top Scorer/, .8],
  [/Player of the (Season|Year)|Golden Ball/, .8], [/Top Assists/, .6], [/Yashin/, .8], [/World 11|Team of the Season/, .3],
];
const awardValue = a => (AWARD_OVR.find(([re]) => re.test(a)) || [0, 0])[1];

// End-of-season OVR review: ratings, goals, awards and injuries move your OVR like they would in real life.
function performanceReview(st, avg, awards) {
  const p = S.player, age = ageOf(p.by), notes = [];
  let d = 0;
  if (st.apps >= 10) {
    const r = avg >= 7.5 ? 1.5 : avg >= 7 ? .8 : avg >= 6.5 ? .2 : avg >= 6 ? -.6 : -1.2;
    d += r;
    notes.push(`${avg.toFixed(2)} average rating`);
  } else if (age >= 22 && !st.missed) { d -= .6; notes.push('too few games'); }
  const g = POS_GROUP[p.pos];
  const ga = st.goals + st.assists + (st.cup ? st.cup.goals + st.cup.assists : 0);
  const gaPar = { FWD: 18, MID: 12, DEF: 4, GK: 0 }[g];
  if (gaPar && ga >= gaPar) { d += .7; notes.push(`${ga} goals + assists`); }
  awards.forEach(a => { const v = awardValue(a); if (v) { d += v; notes.push(a); } });
  // A great season is worth up to about 3 OVR before age and level scale it.
  d = Math.min(d, 3);
  // Teenagers are judged gently; a poor season costs more as you get older.
  d = d > 0 ? d * growthFactor(false) / .9 : d * (age <= 20 ? .3 : declineFactor(age));
  // Injuries: missing a quarter of the league games always costs OVR, more the longer you
  // were out and the older you are. A shorter spell out only hurts if you came back below par.
  const games = (league(myClub().league).clubs.length - 1) * 2, missed = st.missed || 0, share = games ? missed / games : 0;
  if (share >= .25) {
    d -= (1 + (share - .25) * 6) * declineFactor(age) * (age <= 21 ? .6 : 1);
    notes.push(`missed ${missed} games injured`);
  } else if (missed >= 3 && st.apps >= 5 && avg < 6.9) {
    d -= (avg < 6.5 ? .6 : .3) * declineFactor(age);
    notes.push(`below par after ${missed} games out injured`);
  } else if (missed >= 5) notes.push(`bounced back from ${missed} games out injured`);
  if (d > 0 && calcOVR() >= MAX_OVR) d = 0;
  nudgeOvr(d);
  return { change: Math.round(d * 10) / 10, notes };
}

// ---------- individual accolades ----------
// The Ballon d'Or and friends are decided against the best players in the world (the AI
// squads), on rating, goals, assists and team success.
const GOLDEN_SHOE_COEF = { ENG: 2, ESP: 2, ITA: 2, GER: 2, FRA: 2, POR: 1.5, NED: 1.5 };
const BIG_TROPHY = [[/World Cup$/, 12], [/Champions League/, 10], [/European Championship|Copa América|Africa Cup|Asian Cup/, 6], [/champion$/, 6], [/Cup|Copa|Coppa|Coupe|Pokal|Taça|Shield|Super/, 2]];

// Goals in a weaker league impress the voters less.
function leagueWeight(l) {
  if (l.tier === 3) return .3;
  if (l.tier === 2) return .45;
  return GOLDEN_SHOE_COEF[l.nat] === 2 ? 1 : GOLDEN_SHOE_COEF[l.nat] ? .8 : .7;
}

function worldCandidates() {
  const champs = new Set(S.leagues.filter(l => l.tier === 1).map(l => leagueTable(l.id)[0].id));
  const ucl = (S.history || []).find(h => h.key === 'UCL' && h.season === S.season);
  const out = [];
  S.leagues.filter(l => l.tier === 1).forEach(l => l.clubs.forEach(id => club(id).players.forEach(pl => {
    if (pl.r < 80) return;
    const team = (champs.has(id) ? 6 : 0) + (ucl && ucl.winner === id ? 10 : 0), w = leagueWeight(l);
    out.push({ n: pl.n, club: id, pos: pl.pos, age: ageOf(pl.by), base: (pl.r - 84) * 2.2 + (pl.g * .9 + (pl.as || 0) * .5) * w + team, r: pl.r, g: pl.g, team, euro: !!GOLDEN_SHOE_COEF[l.nat] });
  })));
  return out;
}

function myCandidate(tot, avg) {
  const p = S.player, ovr = calcOVR();
  const won = p.trophies.filter(t => t.season >= S.season - 1);
  const team = won.reduce((s, t) => s + ((BIG_TROPHY.find(([re]) => re.test(t.name)) || [0, 0])[1]), 0);
  const clean = ['GK', 'DEF'].includes(POS_GROUP[p.pos]) ? tot.clean * .3 : 0;
  const w = leagueWeight(league(myClub().league));
  const base = (ovr - 84) * 2.2 + (tot.goals * .8 + tot.cup.goals * .4 + tot.assists * .45 + tot.cup.assists * .25 + (tot.apps >= 15 ? (avg - 7) * 4 : -10) + clean) * w + team - 4;
  return { n: p.name, club: p.club, pos: p.pos, age: ageOf(p.by), base, r: ovr, me: true, euro: !!GOLDEN_SHOE_COEF[league(myClub().league).nat] };
}

// Rank everyone for one award; each award gets its own bit of luck.
function rankFor(list, noise = 4) { return list.map(c => ({ ...c, s: c.base + gauss() * noise })).sort((a, b) => b.s - a.s); }

function accolades(tot, avg) {
  const p = S.player, mine = [], honours = [];
  const all = worldCandidates(), me = myCandidate(tot, avg);
  const award = (name, ranked, extra = '') => {
    const w = ranked[0];
    if (!w) return;
    honours.push({ name, winner: w.n, club: w.club, me: !!w.me, note: extra });
    if (w.me) mine.push(name);
  };
  const ballon = rankFor([...all, me]);
  const myRank = ballon.findIndex(c => c.me) + 1;
  award("Ballon d'Or", ballon, myRank > 1 && myRank <= 30 ? `You finished ${myRank}${ordinal(myRank)}` : '');
  award('The Best FIFA Men\'s Player', rankFor([...all, me]));
  if (rankFor([...all, me], 3).findIndex(c => c.me) < 11 && me.base > -5) mine.push('FIFPRO World 11');
  const young = c => c.age <= 21;
  award('Kopa Trophy', rankFor([...all.filter(young), ...(young(me) ? [me] : [])]));
  award('Golden Boy', rankFor([...all.filter(c => young(c) && c.euro), ...(young(me) && me.euro ? [me] : [])]));
  const keepers = all.filter(c => c.pos === 'GK').map(c => ({ ...c, base: (c.r - 84) * 2.5 + c.team }));
  if (p.pos === 'GK') keepers.push({ ...me, base: (me.r - 84) * 2.5 + tot.clean * .5 });
  award('Yashin Trophy', rankFor(keepers));
  // European Golden Shoe: league goals, doubled in the top five leagues.
  const shoe = [];
  S.leagues.forEach(l => {
    const k = GOLDEN_SHOE_COEF[l.nat] ? (l.tier === 1 ? GOLDEN_SHOE_COEF[l.nat] : 1) : 0;
    if (k) l.clubs.forEach(id => club(id).players.forEach(pl => { if (pl.g >= 10) shoe.push({ n: pl.n, club: id, s: pl.g * k }); }));
  });
  const myShoe = [...(p.seasonSpells || []), { ...p.st, league: myClub().league }].reduce((s, sp) => {
    const l = league(sp.league), k = GOLDEN_SHOE_COEF[l.nat] ? (l.tier === 1 ? GOLDEN_SHOE_COEF[l.nat] : 1) : 0;
    return s + sp.goals * k;
  }, 0);
  if (myShoe) shoe.push({ n: p.name, club: p.club, s: myShoe, me: true });
  shoe.sort((a, b) => b.s - a.s || (b.me ? 1 : -1));
  award('European Golden Shoe', shoe, shoe[0] ? `${shoe[0].s} points` : '');
  // Gerd Müller Trophy: the most goals in all competitions.
  const aiTop = Math.round(Math.max(0, ...all.map(c => c.g)) * 1.2);
  if (tot.goals + tot.cup.goals > aiTop && tot.goals + tot.cup.goals >= 20) mine.push('Gerd Müller Trophy');
  return { mine, honours, myRank };
}

// Three up, three down between each pair of tiers in a country.
function promotionRelegation() {
  const moves = [], byNat = {};
  S.leagues.forEach(l => (byNat[l.nat] = byNat[l.nat] || []).push(l));
  for (const nat in byNat) {
    // US soccer is a closed system: no promotion or relegation.
    if (byNat[nat].some(l => l.closed)) continue;
    const tiers = byNat[nat].sort((a, b) => a.tier - b.tier);
    for (let i = 0; i < tiers.length - 1; i++) {
      const up = tiers[i], down = tiers[i + 1];
      leagueTable(up.id).slice(-PROMOTE).forEach(r => moves.push({ id: r.id, from: up.id, to: down.id, up: false }));
      leagueTable(down.id).slice(0, PROMOTE).forEach(r => moves.push({ id: r.id, from: down.id, to: up.id, up: true }));
    }
  }
  return moves;
}

function applyMoves(moves) {
  moves.forEach(m => {
    const from = league(m.from), to = league(m.to);
    from.clubs = from.clubs.filter(id => id !== m.id);
    to.clubs.push(m.id);
    club(m.id).league = m.to;
  });
}

function endSeason() {
  const p = S.player, c = myClub(), lid = c.league, st = p.st, L = league(lid);
  const table = leagueTable(lid);
  const pos = table.findIndex(r => r.id === c.id) + 1;
  // Awards and the review judge your whole season, every club you played for.
  const tot = seasonTotals();
  const avg = tot.apps ? tot.rsum / tot.apps : 0;
  const age = ageOf(p.by);
  const awards = [];
  const give = (short, full, rep) => { awards.push(short); p.awards.push({ name: full, season: S.season }); p.rep = clamp(p.rep + rep, 0, 100); };
  if (pos === 1) { awards.push(`${L.name} champion`); p.trophies.push({ name: L.name, club: c.name, season: S.season }); p.rep = clamp(p.rep + 6, 0, 100); }
  const scorers = topScorers(lid, 1);
  if (scorers[0] && scorers[0].me) give('Golden Boot', `${L.name} Golden Boot`, 4);
  const assisters = topAssists(lid, 1);
  if (assisters[0] && assisters[0].me) give('Top Assists', `${L.name} Top Assists`, 3);
  // England's awards are the PFA's; elsewhere the league names its own.
  const pfa = L.nat === 'ENG' && L.tier === 1;
  if (tot.apps >= 20 && avg >= 7.8) give(pfa ? 'PFA Player of the Year' : 'Player of the Season', pfa ? 'PFA Player of the Year' : `${L.name} Player of the Season`, 4);
  else if (age <= 21 && tot.apps >= 15 && avg >= 7.1) give(pfa ? 'PFA Young Player of the Year' : 'Young Player of the Season', pfa ? 'PFA Young Player of the Year' : `${L.name} Young Player`, 3);
  if (tot.apps >= 18 && avg >= 7.3) give('Team of the Season', `${L.name} Team of the Season`, 1);
  // World awards, decided against the best players in the world.
  const acc = accolades(tot, avg);
  const ACC_REP = { "Ballon d'Or": 8, "The Best FIFA Men's Player": 6, 'European Golden Shoe': 5, 'Kopa Trophy': 4, 'Golden Boy': 4, 'Yashin Trophy': 5, 'Gerd Müller Trophy': 4, 'FIFPRO World 11': 2 };
  acc.mine.forEach(a => give(a, a, ACC_REP[a] || 2));
  if (calledUp()) {
    const caps = randi(4, 8), rate = { FWD: .35, MID: .15 }[POS_GROUP[p.pos]] || .02;
    let g = 0, a = 0;
    for (let i = 0; i < caps; i++) { if (Math.random() < rate) g++; if (Math.random() < rate * .7) a++; }
    p.caps += caps;
    p.intlGoals = (p.intlGoals || 0) + g;
    addComp(st.comps = st.comps || {}, `${natName(p.nat)} (qualifiers & friendlies)`, 'nat', caps, g, a, caps * rand(6.6, 7.2));
    awards.push(`${caps} caps for ${natName(p.nat)} (qualifiers and friendlies)`);
  }
  (S.cupWins || []).forEach(w => awards.push(w));
  const review = performanceReview(tot, avg, awards);
  const ovr = calcOVR();
  // Remember the final top-flight tables for next season's European places.
  S.lastStandings = {};
  S.leagues.filter(l => l.tier === 1).forEach(l => { S.lastStandings[l.nat] = leagueTable(l.id).map(r => r.id); });

  S.moves = promotionRelegation();
  const myMove = S.moves.find(m => m.id === c.id);
  if (myMove) awards.push(myMove.up ? `Promoted to ${league(myMove.to).name}` : `Relegated to ${league(myMove.to).name}`);
  if (pos === 1) notify('good', `${league(lid).name} champions!`, `${c.name} won the league. You were part of it.`);
  if (myMove) notify(myMove.up ? 'good' : 'bad', myMove.up ? 'Promoted!' : 'Relegated', `${c.name} ${myMove.up ? 'go up' : 'go down'} to the ${league(myMove.to).name}.`);
  const personal = awards.filter(awardValue);
  if (personal.length) notify('good', 'Award winner!', personal.join(' · '));
  // The board judges the season: results and your own performances.
  changeBoard((pos === 1 ? 10 : 0) + (myMove ? (myMove.up ? 8 : -8) : 0) + (st.apps >= 10 ? (avg >= 7 ? 5 : avg < 6.2 ? -4 : 1) : 0));

  // This club's row; earlier clubs this season already have theirs.
  if (st.apps + st.cup.apps > 0 || !(p.seasonSpells || []).length) p.career.push(careerRow(st, c));
  const clubs = [...(p.seasonSpells || []).map(s => club(s.club).name), c.name].filter((n, i, a) => a.indexOf(n) === i);
  S.seasonSummary = { season: S.season, club: c.name, clubs, pos, apps: tot.apps, goals: tot.goals, assists: tot.assists, avg, awards, ovrStart: S.ovrSeasonStart || ovr, ovrEnd: ovr, clean: tot.clean, starts: st.starts, missed: tot.missed, loanNext: false, returning: false, cup: tot.cup, review, honours: acc.honours };

  // Ageing for the player (applied at the birthday that comes with the new season).
  // A gentle decline from 31 that speeds up sharply from 34.
  const nextAge = age + 1;
  if (nextAge >= 31) {
    const slow = 1 - .06 * p.equip, rate = nextAge >= 34 ? (nextAge - 32) * 1.2 : (nextAge - 30) * .45;
    attrKeys(p.pos).forEach(k => {
      const fast = ['PAC', 'REF'].includes(k) ? 1.5 : 1;
      p.attrs[k] = clamp(p.attrs[k] - rand(.6, 1.4) * rate * fast * slow, 20, 99);
    });
  }
  p.energy = 100;
  S.cupWins = [];

  // Loans: a loan ends with the season; a young player who barely started at a top-flight club goes out on loan.
  if (p.loan) {
    S.seasonSummary.returning = true;
    p.loan.result = avg;
  } else if (clubTier(c) === 1 && st.starts < 10 && nextAge <= 23) {
    S.seasonSummary.loanNext = true;
    msg(`${c.mgr} wants you to get first-team football. You will go out on loan next season.`);
  }

  p.years--;
  S.phase = 'offseason';
  (p.objectives || []).forEach(resolveObjective);
  p.objectives = [];
  p.order = null;
  expireOffers('transfer');
  if (p.years <= 0) {
    if (p.loan) endLoan();
    S.offers = [];
    S.seasonSummary.loanNext = false;
    p.needsContract = true;
    const home = myClub();
    if ((effAff() >= 35 && p.board >= 30) || squadStatus() === 'Key Player') {
      S.offers.push(makeOffer(home, 'renew'));
      msg(`Your contract has expired. ${home.name} have offered you a new deal.`);
    } else {
      msg(`Your contract has expired and ${home.name} will not renew it. Find a new club.`, 'bad');
    }
    generateOffers(randi(2, 4), true);
  } else {
    msg('The summer transfer window is open.');
    if (!S.seasonSummary.loanNext || p.listed) windowOffers();
  }
  buildSummer();
}

function endLoan() {
  const p = S.player, l = p.loan, loanClub = myClub().name;
  p.club = l.parent;
  p.aff = clamp(l.parentAff + ((l.result || 6.5) - 6.5) * 12, 0, 100);
  p.affPen = 0;
  p.objHist = [];
  p.loan = null;
  msg(`Your loan at ${loanClub} is over. You are back at ${myClub().name}.`);
}

// 20% top flight (a smaller club), 30% second tier, 50% third tier. Usually in the same country.
function pickLoanClub(parent) {
  const r = Math.random(), tier = r < .2 ? 1 : r < .5 ? 2 : 3;
  let pool = Object.values(S.clubs).filter(c => c.id !== parent.id && clubTier(c) === tier);
  const home = pool.filter(c => league(c.league).nat === league(parent.league).nat);
  if (home.length && Math.random() < .6) pool = home;
  if (tier === 1) pool = pool.sort((a, b) => teamStrength(a) - teamStrength(b)).slice(0, Math.ceil(pool.length / 2));
  return pick(pool);
}

function startLoan() {
  const p = S.player, parent = myClub(), dest = pickLoanClub(parent);
  p.loan = { parent: parent.id, parentAff: p.aff };
  p.listed = false;
  p.club = dest.id;
  p.aff = 55;
  p.affPen = 0;
  p.objHist = [];
  notify('good', 'Loan move', `You join ${dest.name} (${league(dest.league).name}) on loan for the season.`);
  msg(`You have joined ${dest.name} (${league(dest.league).name}) on a season-long loan from ${parent.name}. ${parent.name} keep paying your wages.`, 'good');
}

function ageWorld() {
  // AI squads age, improve or decline, and old players retire and get replaced.
  Object.values(S.clubs).forEach(c => {
    const homeNat = league(c.league).nat;
    const base = teamStrength(c) - 6;
    c.players = c.players.map(pl => {
      const age = ageOf(pl.by);
      const limit = pl.pos === 'GK' ? 39 : 36;
      if (age >= limit || (age >= limit - 2 && Math.random() < .35)) return genPlayer(pl.pos, base, homeNat, 17, 20);
      const d = age <= 21 ? rand(0, 4) : age <= 24 ? rand(-.5, 2.5) : age <= 28 ? rand(-1, 1) : age <= 31 ? rand(-2, .5) : rand(-4, -1);
      pl.r = Math.round(clamp(pl.r + d, 40, 94));
      pl.inj = 0;
      return pl;
    });
  });
}

function startNextSeason() {
  if (S.phase !== 'offseason' || S.player.needsContract || summerPending()) return false;
  const p = S.player, sum = S.seasonSummary;
  applyMoves(S.moves || []);
  S.moves = [];
  S.season++;
  ageWorld();
  if (p.loan) {
    endLoan();
    // Still not in the manager's plans? Out on loan again.
    const c = myClub(), slots = GROUP_SLOTS[POS_GROUP[p.pos]];
    if (clubTier(c) === 1 && myRank() > slots + 1 && ageOf(p.by) <= 23) startLoan();
  } else if (sum.loanNext) startLoan();
  makeSeason();
  S.offers = [];
  S.ovrSeasonStart = calcOVR();
  const age = ageOf(p.by);
  msg(`Season ${seasonLabel()} begins. You are ${age}.`);
  setObjectives();
  maybeOrder();
  if (age >= 40) retire();
  save();
  return true;
}

// You can hang up your boots at any age, even mid-season.
function retire() {
  const p = S.player, st = p.st;
  if (S.phase === 'season' && st && st.apps + st.cup.apps > 0) p.career.push(careerRow(st, myClub()));
  S.offers = [];
  S.decision = null;
  S.phase = 'retired';
  msg('You have retired from professional football.');
  archiveCurrent();
  save();
}

// ---------- save ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function load() { try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = JSON.parse(raw); } catch (e) { S = null; } if (S && S.v !== 3) S = null;
  if (S) migrate();
  return S; }

// Bring older saves up to date without losing anything.
function migrate() {
  const p = S.player;
  if (p.st && !p.st.cup) p.st.cup = { apps: 0, goals: 0, assists: 0, rsum: 0 };
  if (p.st && p.st.missed == null) p.st.missed = 0;
  p.seasonSpells = p.seasonSpells || [];
  p.banned = p.banned || [];
  if (p.st && !p.st.comps) {
    // Games played before the split by competition existed: league and one line for all cups.
    p.st.comps = {};
    if (p.club && p.st.apps) addComp(p.st.comps, league(myClub().league).name, 'league', p.st.apps, p.st.goals, p.st.assists, p.st.rsum);
    if (p.st.cup.apps) addComp(p.st.comps, 'Cups', 'cup', p.st.cup.apps, p.st.cup.goals, p.st.cup.assists, p.st.cup.rsum);
  }
  // Equipment used to be rented only: what you already use counts as bought.
  if (p.equipOwned == null) p.equipOwned = p.equip || 0;
  addNewLeagues();
  // Wide midfielders arrived later: give every squad one on each side.
  Object.values(S.clubs).forEach(c => ['LM', 'RM'].forEach(pos => {
    if (!c.players.some(pl => pl.pos === pos)) c.players.push(genPlayer(pos, teamStrength(c) - 6, league(c.league).nat));
  }));
  if (!p.clubsPlayed) {
    // Rebuild the list of clubs you have played for from your career rows (loans don't count).
    const names = p.career.filter(r => !/\(loan\)$/.test(r.club)).map(r => r.club);
    p.clubsPlayed = [...new Set([...names.map(n => clubByName(n)).filter(Boolean).map(c => c.id), ...(p.club && !p.loan ? [p.club] : []), ...(p.loan ? [p.loan.parent] : [])])];
  }
  if (!p.club || S.phase !== 'season') return;
  // Domestic cups: rounds whose week has already gone are played without you.
  if (!S.cups) {
    S.cups = buildCups();
    Object.values(S.cups).forEach(t => { while (!t.winner && t.weeks[t.r] < S.week) playCupRound(t, null); });
    if (S.week > CUP_WEEKS.playoff[0]) buildPlayoffs();
  }
  // Saves from before manager objectives existed get a fresh set; older ones get a training brief.
  if (!p.objectives) setObjectives();
  else if (!p.objectives.some(o => o.span === 'drill')) setObjectives(['drill']);
  // European competitions start straight away if the group stage has not begun yet.
  if (!S.euro && S.week <= EURO_WEEKS[0]) S.euro = buildEuro();
}

// Leagues added to the game after this save was made join the world straight away. Mid-season
// they squeeze their fixtures into the weeks left (simulating any that do not fit).
function addNewLeagues() {
  DB.leagues.filter(L => !S.leagues.some(l => l.id === L.id)).forEach(L => {
    const l = buildLeague(L, S.clubs);
    S.leagues.push(l);
    l.clubs.forEach(id => { S.table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    if (S.phase !== 'season' || !S.fixtures) return;
    S.fixtures[l.id] = roundRobin(l.clubs);
    const mds = S.fixtures[l.id].length, skip = Math.max(0, mds - (SEASON_WEEKS - S.week + 1));
    for (let k = 0; k < skip; k++) S.fixtures[l.id][k].forEach(([h, a]) => playFixture(h, a, null));
    S.mdMap[l.id] = weekMap(mds, S.week, skip);
  });
}

// Retired careers are kept in a small list of their own (just the player's story, not the
// whole world), so starting a new career never deletes them.
const ARCHIVE_KEY = 'ptl_careers_v1';
function loadArchive() { try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || []; } catch (e) { return []; } }
function retiredRecord() {
  const p = S.player;
  return {
    id: p.careerId || (p.careerId = Date.now()), name: p.name, nat: p.nat, pos: p.pos, career: p.career, trophies: p.trophies, awards: p.awards,
    caps: p.caps, intlGoals: p.intlGoals || 0, money: p.money, lastClub: p.club ? myClub().name : '–', retiredAge: ageOf(p.by),
    peak: Math.max(calcOVR(), ...p.career.map(r => r.ovr)),
  };
}
function archiveCurrent() {
  if (!S || S.phase !== 'retired') return;
  const rec = retiredRecord(), list = loadArchive().filter(r => r.id !== rec.id);
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify([rec, ...list])); } catch (e) { /* storage full or unavailable */ }
}
// Delete a past career for good. If it is the retired save still on this device, that goes
// too, or it would be put straight back on the list.
function deleteArchived(id) {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(loadArchive().filter(r => r.id !== id))); } catch (e) { /* storage unavailable */ }
  if (S && S.phase === 'retired' && S.player.careerId === id) wipe();
}

// Back up or move a career between devices.
function exportSave() { return JSON.stringify(S); }
function importSave(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return false; }
  if (!data || data.v !== 3 || !data.player) return false;
  S = data;
  migrate();
  save();
  return true;
}
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } S = null; }
