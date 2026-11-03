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
const RENEW_PROMISE = 15; // games your starting place is protected after re-signing as a starter
const PACE_BRIEF = .4; // share of outfield training briefs that ask you to work on Pace
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
  // Strikers lean a little less on shooting (41%) and more on pace (19%) than EA's formula.
  ST: { Finishing: 17, 'Att. Positioning': 11, Dribbling: 10, 'Sprint Speed': 10, Acceleration: 9, 'Ball Control': 9, 'Shot Power': 8, Reactions: 8, Composure: 5, Strength: 5, Agility: 3, 'Long Shots': 3, Volleys: 2 },
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
  { name: 'Bronze', buy: 32000, fee: 1600, mult: 1.6, energy: 2, desc: 'Proper boots, a home gym and a ball machine.' },
  { name: 'Silver', buy: 120000, fee: 5000, mult: 2.3, energy: 4, desc: 'Personal trainer, video analysis and recovery tools.' },
  { name: 'Gold', buy: 600000, fee: 16000, mult: 3.2, energy: 6, desc: 'Elite performance team, nutritionist and cryo suite.' },
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
  { name: 'Shared flat', energy: 0 },
  { name: 'City apartment', energy: 4 },
  { name: 'Family house', energy: 8 },
  { name: 'Countryside villa', energy: 12 },
  { name: 'Mansion', energy: 16 },
];
// Weekly rent in euros for each home, by country: roughly what a room, a city flat, a family
// home, a villa and a footballer's mansion cost to rent around the big clubs (London and
// Manchester, Madrid and Barcelona, Milan, Munich, Paris, Lisbon, Amsterdam, LA and Miami, Riyadh).
const HOUSE_RENT = {
  ENG: [250, 800, 3500, 12000, 35000],
  ESP: [180, 550, 2200, 7000, 22000],
  ITA: [170, 500, 2000, 6500, 20000],
  GER: [200, 600, 2000, 6000, 18000],
  FRA: [220, 700, 2800, 8500, 26000],
  POR: [130, 400, 1300, 4000, 12000],
  TUR: [150, 450, 1500, 5000, 15000],
  NED: [200, 650, 2000, 5500, 15000],
  USA: [280, 900, 3200, 10000, 30000],
  KSA: [150, 550, 1800, 6000, 20000],
};
const houseRent = (nat, i) => (HOUSE_RENT[nat] || HOUSE_RENT.ESP)[i];

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
  ['Galatasaray', 'Fenerbahçe'], ['Galatasaray', 'Beşiktaş'], ['Fenerbahçe', 'Beşiktaş'], ['Trabzonspor', 'Fenerbahçe'],
  ['Al Hilal', 'Al Nassr'], ['Al Ittihad', 'Al Ahli'], ['Al Hilal', 'Al Ittihad'], ['Al Nassr', 'Al Shabab'],
  ['LA Galaxy', 'LAFC'], ['Seattle Sounders', 'Portland Timbers'], ['New York City FC', 'New York Red Bulls'], ['Inter Miami', 'Orlando City'], ['Columbus Crew', 'FC Cincinnati'],
];
const areRivals = (a, b) => { const x = club(a).name, y = club(b).name; return RIVALRIES.some(([p, q]) => (p === x && q === y) || (p === y && q === x)); };

// What a rivalry's games are called. Rivalries without a famous name are just "derby".
const DERBY_NAMES = {
  'Real Madrid|Barcelona': 'El Clásico', 'Real Madrid|Atlético Madrid': 'Madrid derby', 'Barcelona|Espanyol': 'Barcelona derby', 'Sevilla|Real Betis': 'Seville derby', 'Athletic Club|Real Sociedad': 'Basque derby', 'Valencia|Levante': 'Valencian derby',
  'Manchester United|Manchester City': 'Manchester derby', 'Manchester United|Liverpool': 'North West derby', 'Liverpool|Everton': 'Merseyside derby', 'Arsenal|Tottenham Hotspur': 'North London derby', 'Chelsea|Tottenham Hotspur': 'London derby', 'Arsenal|Chelsea': 'London derby',
  'Newcastle United|Sunderland': 'Tyne–Wear derby', 'Aston Villa|Birmingham City': 'Second City derby', 'Sheffield United|Sheffield Wednesday': 'Steel City derby', 'Nottingham Forest|Derby County': 'East Midlands derby', 'Leeds United|Manchester United': 'Roses rivalry', 'West Ham United|Millwall': 'Dockers derby',
  'Inter|AC Milan': 'Derby della Madonnina', 'Inter|Juventus': "Derby d'Italia", 'Roma|Lazio': 'Derby della Capitale', 'Juventus|Torino': 'Derby della Mole', 'Genoa|Sampdoria': 'Derby della Lanterna',
  'Bayern Munich|Borussia Dortmund': 'Der Klassiker', 'Borussia Dortmund|Schalke 04': 'Revierderby', 'Hamburger SV|Werder Bremen': 'Nordderby', '1. FC Köln|Borussia Mönchengladbach': 'Rhine derby', 'Hamburger SV|FC St. Pauli': 'Hamburg derby',
  'Paris Saint-Germain|Marseille': 'Le Classique', 'Lyon|Saint-Étienne': 'Derby du Rhône', 'Lens|Lille': 'Derby du Nord', 'Nice|Monaco': "Derby de la Côte d'Azur",
  'Benfica|Sporting CP': 'Lisbon derby', 'Benfica|Porto': 'O Clássico', 'Porto|Sporting CP': 'O Clássico', 'Braga|Vitória SC': 'Minho derby',
  'Ajax|Feyenoord': 'De Klassieker', 'Ajax|PSV': 'De Topper', 'PSV|Feyenoord': 'Dutch derby',
  'Galatasaray|Fenerbahçe': 'Intercontinental Derby', 'Galatasaray|Beşiktaş': 'Istanbul derby', 'Fenerbahçe|Beşiktaş': 'Istanbul derby', 'Trabzonspor|Fenerbahçe': 'Black Sea rivalry',
  'Al Hilal|Al Nassr': 'Riyadh derby', 'Al Ittihad|Al Ahli': 'Jeddah derby', 'Al Hilal|Al Ittihad': 'Saudi Clásico', 'Al Nassr|Al Shabab': 'Riyadh derby',
  'LA Galaxy|LAFC': 'El Tráfico', 'Seattle Sounders|Portland Timbers': 'Cascadia derby', 'New York City FC|New York Red Bulls': 'Hudson River derby', 'Inter Miami|Orlando City': 'Florida derby', 'Columbus Crew|FC Cincinnati': 'Hell is Real',
};
function derbyName(a, b) {
  if (!S.clubs[a] || !S.clubs[b] || !areRivals(a, b)) return null;
  const x = club(a).name, y = club(b).name;
  return DERBY_NAMES[`${x}|${y}`] || DERBY_NAMES[`${y}|${x}`] || 'Derby';
}

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
function newStats() { return { apps: 0, starts: 0, goals: 0, assists: 0, rsum: 0, motm: 0, clean: 0, cleanAll: 0, tackles: 0, saves: 0, missed: 0, cup: { apps: 0, goals: 0, assists: 0, rsum: 0 }, comps: {} }; }

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
  return { season: S.season, club: c.name + (p.loan && p.club === c.id ? ' (loan)' : ''), clubId: c.id, league: league(c.league).name, apps: st.apps + st.cup.apps, tackles: st.tackles || 0, cleanAll: st.cleanAll || 0, saves: st.saves || 0, goals: st.goals + st.cup.goals, assists: st.assists + st.cup.assists, avg: Math.round((st.apps ? st.rsum / st.apps : 0) * 100) / 100, ovr: calcOVR(), pos: p.pos, comps: JSON.parse(JSON.stringify(st.comps || {})) };
}

function seasonTotals() {
  const p = S.player, all = [...(p.seasonSpells || []), p.st];
  const t = newStats();
  all.forEach(s => {
    ['apps', 'starts', 'goals', 'assists', 'rsum', 'motm', 'clean', 'cleanAll', 'tackles', 'saves', 'missed'].forEach(k => { t[k] += s[k] || 0; });
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
// OVR before rounding and before the 91 cap: attributes can sit above it.
function rawOVR(p = S.player) {
  const w = WEIGHTS[p.pos];
  let s = 0;
  for (const k in w) s += w[k] * p.attrs[k];
  return s;
}

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
// Performance gains, from games and the season review, count 80%: a great season still shows, but
// more slowly.
const PERF_GAIN = .8;
function perfDelta(rating, user) {
  const d = ((rating - 6.7) * .03 + user.goals * .015 + user.assists * .01) * user.mins / 90;
  return d > 0 ? d * growthFactor() * PERF_GAIN : d * declineFactor() * vetLeagueEase();
}

// How much harder drops hit with age: from 34 an OVR loss is 1.2× bigger, growing a little each year.
// The body holds up until 33. After that every year makes OVR easier to lose and games harder.
const VET_AGE = 33;
const vetYears = (age = ageOf(S.player.by)) => Math.max(0, age - VET_AGE);
// Scoring and assist chances: 8% lower for each year past 33, down to half.
const vetForm = (age = ageOf(S.player.by)) => Math.max(.5, 1 - vetYears(age) * .08);
// Back from injury but short of match sharpness ("rust", in weeks): ratings drop and chances
// dry up, most in the first week back and fading as the rust wears off.
const rustLevel = () => Math.min(S.player.rust || 0, 5) / 5;
const rustPenalty = () => (S.player.rust > 0 ? .3 + rustLevel() * .5 : 0);
const rustForm = () => (S.player.rust > 0 ? .8 - rustLevel() * .2 : 1);
const matchForm = () => vetForm() * rustForm();
function declineFactor(age = ageOf(S.player.by)) { return age > VET_AGE ? 1.2 + (age - VET_AGE - 1) * .15 : 1; }
// Saudi and MLS football is gentler on an old body: veterans decline about 30% slower there.
const vetLeagueEase = () => S.player.club && richLeague(myClub()) ? .7 : 1;
// OVR lost at each birthday from 34 (before kit and league): a slow fade, then a steep fall at 38+.
const BIRTHDAY_DROP = { 34: .8, 35: 1.5, 36: 2, 37: 2.5, 38: 4.5, 39: 6 };

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
    clubsPlayed: [], banned: [], offerLock: 0, seasonSpells: [], sponsorV2: true,
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
    const r = Math.random(), tier = r < .05 ? 1 : r < .35 ? 2 : 3;
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

function startWage(clubId) { return Math.max(minWage(club(clubId)), Math.round(marketWage(calcOVR(), club(clubId)) * .9 / 10) * 10); }

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

// A tagged message replaces the one with the same tag from this week, so repeated clicks don't pile up.
function msg(text, kind = 'info', tag = null) {
  if (tag) S.inbox = S.inbox.filter(m => !(m.tag === tag && m.week === S.week && m.season === S.season));
  S.inbox.unshift({ text, kind, week: S.week, season: S.season, ...(tag ? { tag } : {}) });
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
  return Math.max(minWage(c), lo * Math.pow(hi / lo, Math.pow(x, 1.1)) * fx * youth);
}
// No club pays less than a little above the cheapest place to live in its country (20% over a
// shared flat's rent), so even a 16-year-old in the third tier can cover a roof.
const minWage = c => Math.ceil(houseRent(league(c.league).nat, 0) * 1.2 / 10) * 10;

// ---------- reputation ----------
// Fame takes time to build: every gain counts 85%, while a poor game still costs in full.
const REP_GAIN = .85;
function addRep(d) { S.player.rep = clamp(S.player.rep + (d > 0 ? d * REP_GAIN : d), 0, 100); }

// ---------- manager affection ----------
const effAff = () => clamp(S.player.aff - S.player.affPen, 0, 100);
// At 25 the manager freezes you out of the team; at 15 he tears up your contract.
const FROZEN_AFF = 25, SACK_AFF = 15;
const frozenOut = () => !S.player.needsContract && effAff() <= FROZEN_AFF;
// Affection is earned a little slowly: every gain counts 90%, while every setback counts in full.
const AFF_GAIN = .9;
function changeAff(d) { S.player.aff = clamp(S.player.aff + (d > 0 ? d * AFF_GAIN : d), 0, 100); }
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
  // Top-flight managers trust proven stars: below 86 OVR you are judged harder, from 86 a little kinder.
  const topAdj = clubTier(c) === 1 ? (ovr >= STAR_OVR ? 1 : -2.5) : 0;
  list.push({ n: S.player.name, pos: S.player.pos, r: ovr, a: aff, score: selScore(ovr, aff, (withForm ? formBonus() : 0) + topAdj), me: true });
  return list.sort((x, y) => y.score - x.score);
}

function myRank(c = myClub(), ovr = calcOVR(), aff = effAff(), withForm = true) {
  return peckingOrder(c, ovr, aff, withForm).findIndex(x => x.me) + 1;
}

function squadStatus(c = myClub(), ovr = calcOVR(), aff = c === myClub() ? effAff() : 50) {
  const mine = c === myClub(), slots = GROUP_SLOTS[POS_GROUP[S.player.pos]];
  if (mine && frozenOut()) return 'Reserve';
  // A promised starting place holds while the manager keeps faith (affection 30+), like in selection.
  const promised = mine && S.player.promise > 0 && effAff() >= 30;
  const rank = promised ? Math.min(myRank(c, ovr, aff, true), slots) : myRank(c, ovr, aff, mine);
  if (rank === 1) return 'Key Player';
  if (rank <= slots) return 'Starter';
  if (rank <= slots + 2) return 'Rotation';
  return 'Reserve';
}

const STAR_OVR = 86;

// Chance of starting the next match, and share of the rest where you come off the bench.
function startChance() {
  const p = S.player, c = myClub(), ovr = calcOVR(), eff = effAff();
  const slots = GROUP_SLOTS[POS_GROUP[p.pos]];
  // A club that promised you a starting role keeps its word for a while, unless you fall out.
  const promised = p.promise > 0 && eff >= 30;
  const rank = promised ? Math.min(myRank(), slots) : myRank();
  let start, subShare;
  if (clubTier(c) === 1) {
    start = rank <= slots ? .8 : rank === slots + 1 ? .25 : rank === slots + 2 ? .1 : .03;
    start *= clamp(.5 + eff / 100, .5, 1.3) * (ovr >= STAR_OVR ? 1.08 : 1);
    subShare = rank <= slots ? .7 : rank <= slots + 2 ? .55 : .25;
  } else {
    start = ovr < 50 ? .1 : ovr < 55 ? .3 : ovr < 60 ? .55 : ovr < 65 ? .775 : ovr < 70 ? .87 : .93;
    start *= clamp(.6 + eff / 125, .6, 1.25);
    if (rank > slots + 2) start *= .85;
    if (promised) start = Math.max(start, .82);
    subShare = .5;
  }
  // You asked the manager for a chance: he starts you most games (80%) for the next 10 league games.
  if (p.chance > 0) start = Math.max(start, CHANCE_START);
  // A loan club wants to see you play: at least a 40% start chance.
  if (p.loan) start = Math.max(start, .4);
  if (p.energy < 25) start *= .4;
  // Frozen out: you train with the reserves and only get the odd late cameo.
  if (frozenOut()) { start = 0; subShare = .1; }
  // Just back from injury: the manager eases you in.
  if (p.rust > 0) start *= .75;
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
// Targets for this month, the next 3 months and the season. Strikers get goals, wingers goals +
// assists, midfielders assists, defenders tackles and keepers clean sheets. Higher leagues demand more.
const OBJ_SPAN = {
  month: { weeks: 4, label: 'This month', win: 4, lose: 2, weight: 1 },
  quarter: { weeks: 12, label: 'Next 3 months', win: 7, lose: 4, weight: 2 },
  season: { weeks: SEASON_WEEKS, label: 'This season', win: 12, lose: 8, weight: 3 },
  // Off-the-ball tasks: what to work on in training, or keeping fresh for matchdays.
  drill: { weeks: 4, label: 'Training brief', win: 2, lose: 2, weight: .5 },
  // Asked the manager for a chance: a tougher 3-month target. Miss it and he loses faith (−6).
  chance: { weeks: 12, label: 'Prove yourself', win: 7, lose: 6, weight: 2 },
};
const OBJ_ORDER = ['month', 'quarter', 'season', 'drill'];
const OBJ_RATE = { ST: .4, LW: .3, RW: .3, CAM: .35, CM: .2, CDM: .12 };
// Assists a midfielder can expect per game before OVR and team strength.
const OBJ_AST_RATE = { CAM: .3, LM: .25, RM: .25, CM: .18, CDM: .08, LW: .18, RW: .18 };
const TIER_DEMAND = { 1: 1.15, 2: 1, 3: .9 };
const OBJ_WORDS = { goals: ['goal', 'goals'], assists: ['assist', 'assists'], tackles: ['tackle', 'tackles'], ga: ['goal or assist', 'goals + assists'], clean: ['clean sheet', 'clean sheets'] };
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

// Wingers are judged on goals and assists together; other forwards on goals. Midfielders get goals +
// assists 80% of the time and assists alone otherwise.
const MID_GA = .8;
const objKind = (pos = S.player.pos) => ['LW', 'RW'].includes(pos) ? 'ga' : POS_GROUP[pos] === 'MID' ? (Math.random() < MID_GA ? 'ga' : 'assists') : ({ FWD: 'goals', DEF: 'tackles' }[POS_GROUP[pos]] || 'clean');

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
    // Managers love pace: 40% of outfield training briefs are Pace. Otherwise usually a stat that
    // matters for your position, sometimes your weakest one.
    const keys = attrKeys(p.pos), w = WEIGHTS[p.pos];
    const attr = keys.includes('PAC') && Math.random() < PACE_BRIEF ? 'PAC' : Math.random() < .65 ? weightedPick(keys, k => w[k] + .01) : keys.slice().sort((a, b) => p.attrs[a] - p.attrs[b])[0];
    return { span: 'drill', kind: 'train', attr, target: randi(4, 6) + ((p.objHard || 0) >= .2 ? 1 : 0), progress: 0, endWeek: to, games };
  }
  return { span: 'drill', kind: 'energy', min: 60, target: games - 1, progress: 0, endWeek: to, games };
}

const objVetEase = (age = ageOf(S.player.by)) => Math.max(.6, 1 - Math.max(0, age - 34) * .08);
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
  } else if (kind === 'tackles') {
    // What your Defending stat gives over 90 minutes (see matchTackles).
    perGame = Math.max(1, 2 + ((p.attrs.DEF || 40) - 50) * .2) * (TACKLE_ROLE[p.pos] || 1);
  } else if (kind === 'ga') {
    // A winger's (or midfielder's) goals plus assists.
    perGame = (OBJ_RATE[p.pos] || .12) * clamp(Math.pow(calcOVR() / str, 3), .5, 1.6) + (OBJ_AST_RATE[p.pos] || .15) * clamp(Math.pow(calcOVR() / str, 2), .5, 1.6);
  } else if (kind === 'assists') {
    perGame = (OBJ_AST_RATE[p.pos] || .15) * clamp(Math.pow(calcOVR() / str, 2), .5, 1.6);
  } else {
    perGame = OBJ_RATE[p.pos] * clamp(Math.pow(calcOVR() / str, 3), .5, 1.6);
  }
  // Set a little below what you should manage, scaled up in bigger leagues. No short-term
  // target when you would barely expect to reach one (a reserve, or a holding midfielder).
  // After a pay rise the manager expects a little more.
  // At a top-flight club the season target is tougher for a starter, tougher still for a key player.
  const status = squadStatus();
  const star = span === 'season' && clubTier(c) === 1 ? (status === 'Key Player' ? 1.3 : status === 'Starter' ? 1.15 : 1) : 1;
  const expected = games * play * perGame * TIER_DEMAND[clubTier(c)] * (1 + (p.objHard || 0)) * star;
  if (span !== 'season' && expected < 1.1) return null;
  // Tackles come steadily every game, so that target sits much closer to what you should manage.
  // After 34 the manager slowly eases off: 8% lower targets for every year past 34, down to 60%.
  const target = Math.max(1, Math.floor(expected * (kind === 'tackles' ? .85 : .7) * objVetEase() + .3));
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
  const d = (ok ? sp.win : -sp.lose) + (o.span === 'chance' ? 0 : BANDS[objBand()].bonus);
  changeAff(d);
  const what = `${objText(o)} (${sp.label.toLowerCase()})`;
  const sign = d >= 0 ? '+' : '−';
  msg(`${ok ? 'Objective hit' : 'Objective missed'}: ${what}, you managed ${o.progress}. Affection ${sign}${Math.abs(Math.round(d))}.`, ok ? 'good' : 'bad');
  notify(ok ? 'good' : 'bad', ok ? 'Objective complete!' : 'Objective missed', `${myClub().mgr} wanted ${what}. You got ${o.progress}. Affection ${sign}${Math.abs(Math.round(d))}.`);
}

// Ask for a chance: with under a 20% start chance you can ask the manager to play you. He starts
// you 80% of the time for the next 10 league games, but sets a 3-month target 1.5× tougher than
// usual. Hit it for +7 affection; miss it and he loses faith (−6).
const CHANCE_START = .8, CHANCE_GAMES = 10, CHANCE_HARDER = 1.5;
const chanceObjective = () => (S.player.objectives || []).find(o => o.span === 'chance');
function canAskChance() {
  const p = S.player;
  if (S.phase !== 'season' || p.loan || p.injured || p.needsContract || frozenOut() || p.chance > 0 || chanceObjective()) return false;
  return startChance().start < .2 && gamesBetween(S.week, Math.min(SEASON_WEEKS, S.week + 11)) >= 3;
}
function askChance() {
  const p = S.player;
  if (!canAskChance()) return false;
  p.chance = CHANCE_GAMES;
  const o = makeObjective('chance') || { span: 'chance', kind: objKind(), target: 1, progress: 0, endWeek: Math.min(SEASON_WEEKS, S.week + 11), games: gamesBetween(S.week, Math.min(SEASON_WEEKS, S.week + 11)) };
  o.target = Math.max(2, Math.ceil(o.target * CHANCE_HARDER));
  p.objectives = [...(p.objectives || []), o];
  msg(`${myClub().mgr} agreed to give you a chance: you'll start most of the next ${CHANCE_GAMES} league games. In return he wants ${objText(o)} in the next 3 months.`, 'good');
  notify('good', 'Your chance has come!', `${myClub().mgr} will start you in most of the next ${CHANCE_GAMES} league games. Prove him right: ${objText(o)} in 3 months, or affection −6.`);
  save();
  return true;
}

// After each week: settle objectives whose window has closed and set the next ones.
function tickObjectives() {
  const p = S.player, ended = (p.objectives || []).filter(o => o.span !== 'season' && o.endWeek < S.week);
  ended.forEach(resolveObjective);
  p.objectives = p.objectives.filter(o => !(o.span === 'chance' && ended.includes(o)));
  const next = ended.map(o => o.span).filter(s => s !== 'chance');
  if (next.length) setObjectives(next);
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

// Breaking into a top flight takes 85 OVR, or a breakout season (+8 OVR). From 78 every club
// outside a league's top fifth will look at you. A rising season (+6 or +7) opens the bottom half
// of top-flight leagues. Players already at a top-flight club are exempt.
const TOP_FLIGHT_OVR = 85, MID_TOP_FLIGHT_OVR = 78, BREAKOUT_OVR = 8, RISING_OVR = 6;
const eliteTopFlight = c => clubTier(c) === 1 && tierPrestige(c) >= .8;
function topFlightOpen(c) {
  const p = S.player, home = club(p.loan ? p.loan.parent : p.club);
  const nat = league(c.league).nat;
  if (clubTier(c) === 1 && vetYears() > 0) {
    if ([...VET_LEAGUES, 'POR'].includes(nat)) return true;
    if (!vetTopFlight(c)) return false;
  }
  const buzz = scoutBuzz();
  return clubTier(c) !== 1 || calcOVR() >= TOP_FLIGHT_OVR || (calcOVR() >= MID_TOP_FLIGHT_OVR && !eliteTopFlight(c)) || buzz.breakout || (buzz.rising && smallTopFlight(c)) || (!p.needsContract && home && clubTier(home) === 1);
}

// Leagues that chase big-name veterans, and the most you have ever been paid.
const VET_LEAGUES = ['KSA', 'USA'];
// After 33 the big top-flight clubs lose interest fast: 15% as keen at 34, 5% at 35, gone at 36.
// Saudi, MLS and Portuguese clubs don't count here.
const bigTopFlight = c => clubTier(c) === 1 && ![...VET_LEAGUES, 'POR'].includes(league(c.league).nat);
function vetTopFlight(c) {
  if (!bigTopFlight(c)) return 1;
  return [1, .15, .05][vetYears()] ?? 0;
}
const primeWage = () => Math.max(S.player.peakWage || 0, S.player.wage || 0);

// Clubs you turned down stay away for six months. About one in eight is eager and is allowed
// one more try; after that it waits like the rest. A dream club that said no stays away a season.
const DECLINE_WEEKS = 26, EAGER = .12;
const declinedUntil = id => { const d = (S.player.declined || {})[id]; return !d ? 0 : typeof d === 'number' ? d : d.until; };
function coolingOff(id) {
  const p = S.player, w = absWeek();
  if (((p.wishNo || {})[id] || 0) > w) return true;
  const d = (p.declined || {})[id];
  return declinedUntil(id) > w && !(d && d.eager);
}

function interestedClub() {
  const ovr = calcOVR(), mine = teamStrength(myClub());
  const pool = Object.values(S.clubs).filter(c => c.id !== S.player.club && !isBanned(c.id) && topFlightOpen(c) && !coolingOff(c.id) && (!bigTopFlight(c) || Math.random() < vetTopFlight(c)) && teamStrength(c) >= mine - 3 && teamStrength(c) <= ovr + 4);
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
  if (p.needsContract) return;
  const c = myClub();
  // Tell the player when they drop out of (or win back) the manager's plans.
  if (frozenOut() !== !!p.frozen) {
    p.frozen = frozenOut();
    if (p.frozen) { msg(`${c.mgr} has frozen you out. You train with the reserves until you win him back (affection above ${FROZEN_AFF}).`, 'bad'); notify('bad', 'Frozen out', `${c.mgr} has dropped you to the reserves. At ${SACK_AFF} affection he will tear up your contract.`); }
    else msg(`${c.mgr} has brought you back into the first-team picture.`, 'good');
  }
  if (effAff() > SACK_AFF) return;
  p.frozen = false;
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
  p.clauseUntil = 0;
  p.offerLock = 0;
  p.order = null;
  S.offers = [];
  msg(`${c.mgr} has had enough. ${c.name} have terminated your contract. You are a free agent.`, 'bad');
  notify('bad', 'Contract terminated', `Manager affection fell to ${SACK_AFF}. ${c.name} have released you. Sign for a new club to keep playing.`);
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
// Below 60 a young player levels up quicker; from 30 every point is harder to earn.
// Saudi and US football is less competitive: the money is big, the development is slow.
// MLS a further 30% slower than that.
const SLOW_GROWTH = { KSA: .6, USA: .42 };
const GK_GROWTH = 1.25;
const leagueGrowth = (c = myClub()) => SLOW_GROWTH[league(c.league).nat] || 1;
function growthFactor(lowBoost = true) {
  const age = ageOf(S.player.by), ovr = calcOVR();
  const ageF = age <= 21 ? 1.2 : age <= 25 ? 1 : age <= 29 ? .75 : age <= VET_AGE ? .6 : Math.max(.05, .3 - (age - VET_AGE - 1) * .06);
  const low = !lowBoost ? 1 : ovr < 60 ? 2.2 : 1;
  // Keeper ratings are spread differently, so goalkeepers level up about 25% faster.
  return ageF * low * leagueGrowth() * clamp(Math.pow(Math.max(0, MAX_OVR - ovr) / 20, 1.3), .06, 1) * (S.player.pos === 'GK' ? GK_GROWTH : 1);
}

// High attributes get harder to raise, but a session always gives something until 91.
// A third of what training equipment adds is only banked on the pitch: the session gives the
// rest, and the held-back part waits for that week's games (see pitchXp).
const EQUIP_PITCH = 1 / 3;
function trainGain(attr, part = 'train') {
  if (calcOVR() >= MAX_OVR) return 0;
  const v = S.player.attrs[attr], ceiling = 1 - Math.max(0, v - 80) / 25, extra = equipMult() - 1;
  const mult = part === 'pitch' ? extra * EQUIP_PITCH : 1 + extra * (1 - EQUIP_PITCH);
  if (part === 'pitch' && !extra) return 0;
  return Math.max(part === 'pitch' ? 0 : .01, .06 * mult * growthFactor() * Math.max(.1, ceiling) * (S.player.energy < 30 ? .6 : 1));
}

// How much of the held-back equipment XP a game earns, 0 to 1. The bench earns nothing; minutes
// earn a little, and goals and assists (clean sheets, saves and tackles at the back) earn the most.
function pitchShare(u) {
  if (!u || !u.mins) return 0;
  const grp = POS_GROUP[S.player.pos];
  const ga = (u.goals || 0) + (u.assists || 0)
    + (grp === 'GK' ? (u.clean ? 1 : 0) + (u.saves || 0) / 4 : grp === 'DEF' ? (u.clean ? .6 : 0) + (u.tackles || 0) / 4 : 0);
  return clamp(u.mins / 90 * .3 + ga * .3 + Math.max(0, (u.rating || 6) - 6.5) * .1, 0, 1);
}

// After the week's games, bank the equipment XP they earned. With no game that week it waits.
function pitchXp(games, report) {
  const p = S.player, pool = p.pitchPool || {};
  if (!games.length || !Object.keys(pool).length) return;
  const share = Math.min(1, games.reduce((s, u) => s + pitchShare(u), 0));
  let total = 0;
  for (const [k, v] of Object.entries(pool)) { p.attrs[k] = clamp(p.attrs[k] + v * share, 1, 99); total += v * share; }
  p.pitchPool = {};
  if (total > 0) report.events.push(`Training kit paid off on the pitch: +${total.toFixed(2)} attribute XP (${Math.round(share * 100)}%)`);
  else report.events.push('No game time, so the pitch half of your training kit XP was lost');
}

function train(attr) {
  const p = S.player;
  if (S.phase !== 'season' || p.slots <= 0 || p.injured || p.energy < TRAIN_ENERGY) return null;
  const gain = trainGain(attr), held = trainGain(attr, 'pitch');
  if (held) p.pitchPool = { ...(p.pitchPool || {}), [attr]: ((p.pitchPool || {})[attr] || 0) + held };
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
  if (i === p.equip || (i > 0 && p.money < cost)) return false;
  p.money -= cost;
  p.equipOwned = Math.max(p.equipOwned || 0, i);
  p.equip = i;
  msg(i ? `${cost ? `Bought ${t.name} training equipment for ${money(cost)}` : `Switched to ${t.name} training equipment`} (${money(t.fee)}/week to run).` : 'Switched back to normal training equipment.', i ? 'good' : 'info', 'equip');
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

// ---------- sponsors ----------
// One deal per category. Your reputation decides which level of brand will talk to you; a better
// agent gets bigger fees, an extra slot and brands coming to you sooner. Famous players also get
// unsolicited requests from reputation 25 (small brands at first), which pay a quarter more.
const SPONSOR_CATS = [
  { key: 'boots', label: 'Boots', brands: ['Strikeline', 'Volt Boots', 'Apex Studs', 'Kinetic'] },
  { key: 'kit', label: 'Sportswear', brands: ['Northpeak Athletic', 'Sprintwear', 'Fieldform'] },
  { key: 'drink', label: 'Energy drink', brands: ['Rush Energy', 'Bolt Fuel', 'Hydra Max'] },
  { key: 'watch', label: 'Watches', brands: ['Valcourt', 'Meridian & Co', 'Chronex'] },
  { key: 'car', label: 'Cars', brands: ['Aurex Motors', 'Velaro', 'Strada'] },
  { key: 'gaming', label: 'Gaming', brands: ['Pixelforge', 'Nova Play', 'Respawn Arena'] },
];
const SPONSOR_LEVELS = [
  { name: 'Local', minRep: 0, base: 60, old: 150 },
  { name: 'National', minRep: 30, base: 400, old: 1500 },
  { name: 'Global', minRep: 60, base: 1500, old: 12000 },
  { name: 'Icon', minRep: 85, base: 3500, old: 60000 },
];
// However famous you get, sponsors and image rights together pay at most €20k a week.
const SPONSOR_CAP = 20000;
const sponsorAgentMult = () => 1 + (S.player.agent || 0) * .08;
const sponsorSlots = () => Math.min(6, 2 + Math.floor(S.player.rep / 35) + ((S.player.agent || 0) >= 3 ? 1 : 0));
const sponsorReqRep = () => 25 - (S.player.agent || 0) * 2;
// Weekly chance a brand comes to you: a small one now and then from reputation 25 (about 1.5%
// a week), rising steadily with fame (about 10% at 100), plus a little more with a good agent.
const sponsorReqChance = () => .015 + Math.max(0, S.player.rep - 25) * .0012 + (S.player.agent || 0) * .008;
const sponsorDeals = () => S.player.sponsors || [];
const sponsorLevel = () => SPONSOR_LEVELS.filter(l => S.player.rep >= l.minRep).length - 1;

function makeSponsor(cat, request = false) {
  const p = S.player, top = sponsorLevel();
  // Usually the best level that will have you, sometimes one below.
  const li = Math.max(0, top - (Math.random() < .35 ? 1 : 0)), lv = SPONSOR_LEVELS[li];
  const weekly = Math.round(lv.base * (1 + (p.rep - lv.minRep) / 50) * sponsorAgentMult() * rand(.85, 1.15) * (request ? 1.25 : 1) / 10) * 10;
  const seasons = randi(1, 2);
  return { id: Math.random().toString(36).slice(2, 9), cat: cat.key, brand: pick(cat.brands), level: lv.name, weekly, weeks: seasons * SEASON_WEEKS,
    // Boot deals pay a bonus for every goal.
    goalBonus: cat.key === 'boots' ? Math.round(weekly * .1 / 10) * 10 : 0, request };
}

// The brands open to you this season, one per category you have no deal in.
function sponsorMarket() {
  const p = S.player, taken = new Set(sponsorDeals().map(d => d.cat));
  if (!p.sponsorMarket || p.sponsorMarket.season !== S.season || p.sponsorMarket.level !== sponsorLevel() || p.sponsorMarket.agent !== (p.agent || 0))
    p.sponsorMarket = { season: S.season, level: sponsorLevel(), agent: p.agent || 0, offers: SPONSOR_CATS.map(c => makeSponsor(c)) };
  return p.sponsorMarket.offers.filter(o => !taken.has(o.cat));
}

function signSponsor(id) {
  const p = S.player, o = [...sponsorMarket(), ...(p.sponsorReqs || [])].find(x => x.id === id);
  if (!o || sponsorDeals().length >= sponsorSlots() || sponsorDeals().some(d => d.cat === o.cat)) return false;
  p.sponsors = [...sponsorDeals(), { ...o }];
  p.sponsorReqs = (p.sponsorReqs || []).filter(x => x.cat !== o.cat);
  msg(`Signed with ${o.brand}: ${money(o.weekly)}/week for ${o.weeks / SEASON_WEEKS} season${o.weeks > SEASON_WEEKS ? 's' : ''}${o.goalBonus ? `, plus ${money(o.goalBonus)} per goal` : ''}.`, 'good');
  save();
  return true;
}

function declineSponsorReq(id) { const p = S.player; p.sponsorReqs = (p.sponsorReqs || []).filter(x => x.id !== id); save(); }

// Weekly: deals tick down, requests expire, and a famous player may hear from a new brand.
function sponsorWeek() {
  const p = S.player;
  p.sponsors = sponsorDeals().map(d => ({ ...d, weeks: d.weeks - 1 })).filter(d => {
    if (d.weeks > 0) return true;
    msg(`Your deal with ${d.brand} has ended. Find a new ${SPONSOR_CATS.find(c => c.key === d.cat).label.toLowerCase()} sponsor in the Agent tab.`);
    return false;
  });
  p.sponsorReqs = (p.sponsorReqs || []).map(r => ({ ...r, expires: r.expires - 1 })).filter(r => r.expires > 0);
  if (p.rep < sponsorReqRep() || sponsorDeals().length >= sponsorSlots()) return;
  if (Math.random() >= sponsorReqChance()) return;
  const open = SPONSOR_CATS.filter(c => !sponsorDeals().some(d => d.cat === c.key) && !(p.sponsorReqs || []).some(r => r.cat === c.key));
  if (!open.length) return;
  const r = { ...makeSponsor(pick(open), true), expires: 4 };
  p.sponsorReqs = [...(p.sponsorReqs || []), r];
  msg(`${r.brand} want you as the face of their brand: ${money(r.weekly)}/week. Answer within 4 weeks (Agent tab).`, 'good');
  notify('good', 'Sponsor request', `${r.brand} (${SPONSOR_CATS.find(c => c.key === r.cat).label}) want to sponsor you for ${money(r.weekly)} a week. See the Agent tab.`);
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
  if (!c || isBanned(id) || !topFlightOpen(c) || ((p.wishNo || {})[id] || 0) > absWeek()) return 0;
  const s = teamStrength(c), reach = calcOVR() + 2 + p.rep / 30;
  const normal = s <= reach ? .3 + p.rep / 300 : Math.max(0, .3 - (s - reach) * .05);
  return clamp(normal * (1.25 + (p.agent || 0) * .04) * (clubTier(c) === 1 ? vetTopFlight(c) : 1), .01, .75);
}
const wishOdds = id => { const c = wishChance(id); return c >= .4 ? 'Good' : c >= .25 ? 'Fair' : c >= .1 ? 'Low' : c > .01 ? 'Very low' : 'Almost none'; };

// At the transfer window the club makes up its mind, and your agent tells you why.
function resolveWish() {
  const p = S.player, c = club(p.wish);
  if (!p.wishPending || !c) return;
  if (p.wish === p.club) { p.wishPending = false; return; }
  if (isBanned(p.wish)) { p.wishPending = false; agentSay(`${c.name} will not talk to us. They have not forgiven you for joining their rivals.`, 'bad'); return; }
  if (clauseActive() && !blockActive()) { agentSay(`Your loyalty clause at ${myClub().name} stops any club from bidding. ${c.name} will have to wait.`); return; }
  if (offerLocked() && !blockActive()) { agentSay(`Clubs will not bid while you are settling in at ${myClub().name}. ${c.name} will look again at the next window.`); return; }
  p.wishPending = false;
  if (S.offers.some(o => o.club === p.wish)) { p.wishResult = 'offer'; agentSay(`${c.name} already have an offer on the table for you.`, 'good'); return; }
  if (Math.random() < wishChance()) {
    if (blockActive()) {
      addInquiry(c);
      p.wishResult = 'offer';
      agentSay(`Great news: ${c.name} want you! Your release clause blocks a bid, so they came to me first. Listen to them in the Contract tab.`, 'good');
      notify('good', `${c.name} want you!`, 'Your dream club contacted your agent. Your release clause is in the way, but they want to talk.');
      return;
    }
    S.offers.push(makeOffer(c, 'transfer'));
    p.wishResult = 'offer';
    agentSay(`Great news: ${c.name} have made you an offer! It is on your Home screen.`, 'good');
    notify('good', `${c.name} want you!`, 'Your agent says your dream club have made an offer.');
    return;
  }
  const gap = teamStrength(c) - calcOVR();
  const why = ((p.wishNo || {})[p.wish] || 0) > absWeek() ? 'they already turned you down and have not changed their minds'
    : vetYears() && clubTier(c) === 1 && vetTopFlight(c) < 1 ? 'they are wary of signing a player your age'
    : !topFlightOpen(c) ? `${eliteTopFlight(c) ? `the top top-flight clubs only sign players rated ${TOP_FLIGHT_OVR}+` : `top-flight clubs only sign players rated ${MID_TOP_FLIGHT_OVR}+`} (or after a +${BREAKOUT_OVR} OVR breakout season), and you are ${calcOVR()}`
    : gap > 8 ? `they think you are not ready for their level yet (team rating ${Math.round(teamStrength(c))}, you are ${calcOVR()})`
    : gap > 3 ? 'they like you, but went for a more experienced player'
    : pick(['they are happy with the players they have in your position', 'the board would not approve the budget', 'their manager prefers another target']);
  p.wishResult = 'no';
  p.wishNo = { ...(p.wishNo || {}), [p.wish]: absWeek() + SEASON_WEEKS };
  agentSay(`${c.name} have decided not to bid: ${why}. They won't come in for you for a season. You can name a dream club again next season.`, 'bad');
  notify('bad', 'No move to your dream club', `${c.name} decided not to make an offer.`);
}

// Homes are let on a one-year lease (the shared flat has none): you can't move until it ends.
// Your home is in the country you play in. Move abroad before a lease ends and you keep paying
// it until it runs out, on top of a new home in the new country.
const LEASE_WEEKS = SEASON_WEEKS;
const homeNat = () => league(myClub().league).nat;
const leaseLeft = () => S.player.house ? Math.max(0, (S.player.leaseEnd || 0) - absWeek()) : 0;
const oldLeases = () => (S.player.oldLeases || []).filter(l => l.end > absWeek());
// Homes you own, one per country: { ENG: 3, ... } (the HOUSING tier). You live in yours rent-free.
const ownedHomes = () => S.player.homes || {};
const ownedHere = () => S.player.house > 0 && ownedHomes()[homeNat()] === S.player.house;
const rentNow = () => (ownedHere() ? 0 : houseRent(homeNat(), S.player.house)) + oldLeases().reduce((s, l) => s + houseRent(l.nat, l.house), 0);

// What a home costs to buy outright (euros), by country: a flat, a family house, a villa and a
// footballer's mansion around the big clubs (London, Madrid, Milan, Munich, Paris, Lisbon, Amsterdam,
// LA and Miami, Riyadh, Istanbul). Upkeep is about 1% of the price a year, paid monthly.
const HOUSE_PRICE = {
  ENG: [0, 450000, 1400000, 4000000, 12000000],
  ESP: [0, 300000, 900000, 2500000, 7000000],
  ITA: [0, 300000, 850000, 2400000, 6500000],
  GER: [0, 380000, 1000000, 2600000, 6000000],
  FRA: [0, 450000, 1300000, 3500000, 9000000],
  POR: [0, 250000, 650000, 1600000, 4000000],
  NED: [0, 400000, 1000000, 2400000, 5000000],
  USA: [0, 550000, 1500000, 4000000, 12000000],
  KSA: [0, 300000, 900000, 2500000, 8000000],
  TUR: [0, 200000, 600000, 1800000, 5000000],
};
const housePrice = (nat, i) => (HOUSE_PRICE[nat] || HOUSE_PRICE.ESP)[i];
const upkeepMonth = (nat, i) => Math.round(housePrice(nat, i) * .01 / 12 / 10) * 10;
const upkeepWeek = (nat, i) => Math.round(upkeepMonth(nat, i) * 12 / 52);
const upkeepNow = () => Object.entries(ownedHomes()).reduce((s, [nat, i]) => s + upkeepWeek(nat, i), 0);
// Selling a home (or trading up) gets back 90% of what it cost.
const SELL_BACK = .9;
const buyCost = i => housePrice(homeNat(), i) - (ownedHomes()[homeNat()] ? Math.round(housePrice(homeNat(), ownedHomes()[homeNat()]) * SELL_BACK) : 0);

// Buy a home outright in the country you play in. A better one replaces the one you own there (sold
// for 90%). A lease you are still in keeps being paid until it ends.
function buyHouse(i) {
  const p = S.player, nat = homeNat(), cost = buyCost(i);
  syncHousing();
  if (!i || ownedHomes()[nat] >= i || p.money < cost) return false;
  if (p.house && leaseLeft() && !ownedHere()) p.oldLeases = [...oldLeases(), { nat, house: p.house, end: p.leaseEnd, bought: true }];
  const old = ownedHomes()[nat];
  p.money -= cost;
  p.homes = { ...ownedHomes(), [nat]: i };
  p.house = i;
  p.leaseEnd = 0;
  msg(`Bought a ${HOUSING[i].name.toLowerCase()} in ${natName(nat)} for ${money(housePrice(nat, i))}${old ? ` (your ${HOUSING[old].name.toLowerCase()} sold for ${money(Math.round(housePrice(nat, old) * SELL_BACK))})` : ''}. No more rent here: upkeep is ${money(upkeepMonth(nat, i))} a month.`, 'good', 'house');
  save();
  return true;
}

// Sell a home you own, anywhere. If you live in it you move back to a shared flat.
function sellHouse(nat) {
  const p = S.player, i = ownedHomes()[nat];
  if (!i) return false;
  const back = Math.round(housePrice(nat, i) * SELL_BACK);
  p.money += back;
  const homes = { ...ownedHomes() }; delete homes[nat]; p.homes = homes;
  if (nat === homeNat() && p.house === i && !leaseLeft()) { p.house = 0; p.leaseEnd = 0; }
  msg(`Sold your ${HOUSING[i].name.toLowerCase()} in ${natName(nat)} for ${money(back)}.`, 'info', 'house');
  save();
  return true;
}

function setHouse(i) {
  const p = S.player;
  syncHousing();
  if (i === p.house || leaseLeft()) return false;
  // Own a home here and you live in it: no renting on top.
  if (ownedHomes()[homeNat()]) return false;
  p.house = i;
  p.leaseEnd = i ? absWeek() + LEASE_WEEKS : 0;
  msg(`Moved into a ${HOUSING[i].name.toLowerCase()} in ${natName(homeNat())} (${money(houseRent(homeNat(), i))}/week${i ? ', one-year lease' : ''}).`, 'info', 'house');
  save();
  return true;
}

// Called whenever your club might have changed country, and every week.
function syncHousing() {
  const p = S.player, nat = homeNat();
  p.oldLeases = oldLeases();
  if (!p.homeNat) p.homeNat = nat;
  if (p.homeNat === nat) return;
  const from = p.homeNat;
  // The home you leave behind stays yours (and on your bill) until its lease ends.
  if (p.house && leaseLeft() && ownedHomes()[from] !== p.house) {
    p.oldLeases.push({ nat: from, house: p.house, end: p.leaseEnd });
    msg(`You still owe rent on your ${HOUSING[p.house].name.toLowerCase()} in ${natName(from)}: ${money(houseRent(from, p.house))}/week until the lease ends in ${leaseLeft()} weeks.`, 'bad');
  }
  // Coming back to a country where you own a home, or still hold a lease: it is waiting for you.
  const back = p.oldLeases.find(l => l.nat === nat && !l.bought), own = ownedHomes()[nat];
  if (own) {
    p.house = own; p.leaseEnd = 0;
    msg(`Welcome home: you moved back into your own ${HOUSING[own].name.toLowerCase()} in ${natName(nat)}. No rent to pay.`, 'good');
  } else if (back) {
    p.house = back.house; p.leaseEnd = back.end;
    p.oldLeases = p.oldLeases.filter(l => l !== back);
    msg(`You moved back into your ${HOUSING[p.house].name.toLowerCase()} in ${natName(nat)}.`);
  } else {
    p.house = 0; p.leaseEnd = 0;
    msg(`You need a home in ${natName(nat)}. For now you are in a shared flat: pick a place in the Shop.`, 'info');
    notify('good', `New country: ${natName(nat)}`, `You need somewhere to live. You start in a shared flat; lease a better home in the Shop.${p.oldLeases.length ? ' Your old lease abroad still has to be paid until it ends.' : ''}`);
  }
  p.homeNat = nat;
}

// Signed deals plus a little from appearances and image rights.
const imageRights = () => Math.round(S.player.rep * 15);
const sponsorGross = () => sponsorDeals().reduce((s, d) => s + d.weekly, 0) + imageRights();
function sponsorIncome() { return Math.min(SPONSOR_CAP, sponsorGross()); }
const agentCut = () => Math.round(S.player.wage * agent().cut);
function weeklyCosts() { const p = S.player; return rentNow() + upkeepNow() + EQUIP_TIERS[p.equip].fee + agentCut(); }
function weeklyNet() { return S.player.wage + sponsorIncome() - weeklyCosts(); }
// Physicality protects you: a strong body gets injured less often, and less badly.
// 50 PHY is about normal risk; 90 is roughly half the injuries and a third of the serious ones.
const physOf = () => S.player.attrs.PHY || 50;
// Teenagers (16 to 19) bounce back: about 45% fewer injuries and 55% fewer serious ones.
const youngBody = () => ageOf(S.player.by) <= 19;
// Everyone also gets about 30% fewer injuries, and 30% fewer serious ones, than the base rates.
const INJURY_EASE = .7;
// Goalkeepers take far fewer knocks: about 60% fewer injuries and half as many serious ones.
const GK_INJURY = .4, GK_SERIOUS = .5;
const injuryMult = () => clamp(1.15 - (physOf() - 50) * .015, .5, 1.45) * (youngBody() ? .55 : 1) * INJURY_EASE * (S.player.pos === 'GK' ? GK_INJURY : 1);
// After one serious injury, a second in the same season is far less likely (40% of the usual odds).
const seriousChance = () => clamp(.12 - (physOf() - 60) * .0025, .03, .18) * (youngBody() ? .45 : 1) * INJURY_EASE
  * (S.player.seriousSeason === S.season ? .4 : 1) * (S.player.pos === 'GK' ? GK_SERIOUS : 1);
function energyRegen() { const p = S.player; return 30 + HOUSING[p.house].energy + EQUIP_TIERS[p.equip].energy; }

// ---------- matches ----------
function nextFixture() {
  const p = S.player, md = matchdayFor(myClub().league);
  if (!md) return null;
  const f = md.find(([h, a]) => h === p.club || a === p.club);
  if (!f) return null;
  return { home: f[0], away: f[1], isHome: f[0] === p.club, opp: f[0] === p.club ? f[1] : f[0] };
}

const TWO_GAME_ENERGY = 50;

// The minutes you were on the pitch: from kick-off as a starter, the closing spell as a sub.
const userMinutes = u => !u || !u.mins ? [1, 90] : u.start ? [1, Math.min(90, u.mins)] : [Math.max(1, 91 - u.mins), 90];

// The manager rotates reserve and rotation players in: they start most domestic cup games (75%,
// or 90% against a side at least 3 rating points weaker), and most games of any kind against a side
// 18+ points weaker (80%, 92% in a domestic cup). Europe is otherwise picked like the league.
const BENCH_ROLES = ['Reserve', 'Rotation'];
function rotationStart(domesticCup, opp) {
  const p = S.player;
  if (p.energy < 25 || frozenOut() || !BENCH_ROLES.includes(squadStatus())) return 0;
  const gap = opp && S.clubs[opp] ? teamStrength(myClub()) - teamStrength(club(opp)) : 0;
  if (gap >= 18) return domesticCup ? .92 : .8;
  if (domesticCup) return gap >= 3 ? .9 : .75;
  return 0;
}

function selection(domesticCup = false, opp = null) {
  const p = S.player;
  if (p.injured) return { mins: 0, start: false };
  let { start, subShare } = startChance();
  start = Math.max(start, rotationStart(domesticCup, opp));
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
    // Following the manager's plan gives the team a small edge; playing your own game costs it one.
    const adj = base + (withMe - base) * user.mins / 90 + (user.follow ? 1.5 : user.own ? -1.5 : 0);
    if (mineHome) sh = adj; else sa = adj;
  }
  const gh = poisson(1.45 * Math.exp((sh - sa + 2) / 13));
  const ga = poisson(1.15 * Math.exp((sa - sh - 2) / 13));
  recordResult(h, a, gh, ga);
  const scorers = [], onPitch = userMinutes(user);
  const credit = (c, goals, mine) => {
    for (let i = 0; i < goals; i++) {
      let s = null, myAssist = false, goal = null;
      if (mine && user.mins) {
        const teamStr = teamStrength(c);
        const pGoal = clamp(GOAL_SHARE[p.pos] * Math.pow(ovr / teamStr, 3) * user.mins / 90 * (user.own ? 1.3 : 1) * matchForm(), 0, .7);
        if (Math.random() < pGoal) { user.goals++; goal = { n: p.name, me: true, home: c.id === h, min: randi(...onPitch) }; }
        else {
          const pAst = clamp(ASSIST_SHARE[p.pos] * Math.pow(ovr / teamStr, 2) * user.mins / 90 * 1.3 * (user.own ? 1.3 : 1) * matchForm(), 0, .7);
          if (Math.random() < pAst) { user.assists++; myAssist = true; }
          s = aiScorer(c);
        }
      } else s = aiScorer(c);
      if (s) { s.g++; goal = { n: s.n, home: c.id === h, min: myAssist ? randi(...onPitch) : randi(1, 90) }; }
      if (!goal) continue;
      // Most goals have an assist; credit a teammate unless it was yours.
      if (myAssist) { goal.ast = p.name; goal.astMe = true; }
      else if (Math.random() < .7) { const a = aiAssister(c, s); if (a) { a.as = (a.as || 0) + 1; goal.ast = a.n; } }
      scorers.push(goal);
    }
  };
  credit(ch, gh, user && h === p.club);
  credit(ca, ga, user && a === p.club);
  scorers.sort((x, y) => x.min - y.min);
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
  // Every save lifts a keeper's rating, so a busy, solid afternoon scores well.
  if (g === 'GK') r += (user.saves || 0) * .18;
  if (p.energy < 30) r -= .4;
  r -= vetYears() * .06; // a step slower every year past 33
  r -= rustPenalty(); // short of match sharpness after an injury
  r += gauss() * .45;
  if (user.mins < 45) r = 6 + (r - 6) * .6;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

// Your stats, form, fitness, reputation, OVR and objectives after a game you played in.
// Tackles in one game: mostly your Defending stat, scaled by position and minutes. A
// defender with 80 Defending averages about 8 over 90 minutes; keepers make none.
const TACKLE_ROLE = { CB: 1, LB: 1, RB: 1, CDM: .8, CM: .5, LM: .35, RM: .35, CAM: .25, LW: .25, RW: .25, ST: .15, GK: 0 };
function matchTackles(user, p = S.player) {
  const role = TACKLE_ROLE[p.pos] || 0;
  if (!role || !user.mins) return 0;
  const base = Math.max(0, 2 + ((p.attrs.DEF || 40) - 50) * .2) * role * user.mins / 90;
  return Math.max(0, Math.round(base + gauss() * 1.3));
}

// Saves in one game, for a keeper: the stronger the opponent compared with your team, the busier
// the afternoon (about 2.5 a game against an equal side, up to 6 against a much better one).
function matchSaves(user, oppStr, myStr, p = S.player) {
  if (p.pos !== 'GK' || !user.mins) return 0;
  return poisson(clamp(2.5 + (oppStr - myStr) / 6, .8, 6) * user.mins / 90);
}

// A celebration for your goals and assists in a game; the bigger the haul, the bigger the show.
const HAUL_NAME = ['', 'Goal!', 'Brace!', 'Hat-trick!', 'Haul! Four goals', 'Five-goal haul!', 'Double hat-trick!'];
// Keepers also celebrate saves and defenders tackles, and both a clean sheet.
function notifyHaul(user, compName) {
  const g = user.goals || 0, a = user.assists || 0, grp = POS_GROUP[S.player.pos];
  const sv = grp === 'GK' ? user.saves || 0 : 0, tk = grp === 'DEF' ? user.tackles || 0 : 0;
  const cs = (grp === 'GK' || grp === 'DEF') && !!user.clean;
  if (!g && !a && !sv && !tk && !cs) return;
  const title = g ? HAUL_NAME[Math.min(g, 6)] : a ? (a === 1 ? 'Assist!' : a === 2 ? 'Double assist!' : `${a} assists!`)
    : cs ? 'Clean sheet!' : sv ? `${sv} save${sv > 1 ? 's' : ''}!` : `${tk} tackle${tk > 1 ? 's' : ''}!`;
  const parts = [g && `${g} goal${g > 1 ? 's' : ''}`, a && `${a} assist${a > 1 ? 's' : ''}`, sv && `${sv} save${sv > 1 ? 's' : ''}`,
    tk && `${tk} tackle${tk > 1 ? 's' : ''}`, cs && 'a clean sheet'].filter(Boolean);
  const text = `${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0]} in the ${compName} game.`;
  // Shown before any other news from the same week, in the order the games were played.
  const at = POPUPS.findIndex(x => x.kind !== 'haul');
  POPUPS.splice(at < 0 ? POPUPS.length : at, 0, { kind: 'haul', title, text: text.charAt(0).toUpperCase() + text.slice(1), goals: g, assists: a, saves: sv, tackles: tk, clean: cs });
}

function applyUserMatch(user, res, isHome, cup, report, comp = null) {
  const p = S.player, opp = isHome ? res.a : res.h;
  // A keeper's saves are worked out first, because they count towards the match rating.
  const sv = matchSaves(user, S.clubs[opp] ? teamStrength(club(opp)) : 75, teamStrength(myClub()));
  user.saves = sv;
  const rating = matchRating(user, res);
  user.rating = rating;
  const boots = sponsorDeals().find(d => d.goalBonus);
  if (boots && user.goals) p.money += boots.goalBonus * user.goals;
  const st = p.st, line = cup ? st.cup : st;
  line.apps++; line.goals += user.goals; line.assists += user.assists; line.rsum += rating;
  addComp(st.comps = st.comps || {}, comp ? comp.name : league(myClub().league).name, comp ? comp.kind : 'league', 1, user.goals, user.assists, rating);
  if (!cup && user.start) st.starts++;
  const conceded = isHome ? res.ga : res.gh;
  const clean = conceded === 0 && ['GK', 'DEF'].includes(POS_GROUP[p.pos]) && user.mins >= 60;
  if (clean && !cup) st.clean++;
  if (clean) st.cleanAll = (st.cleanAll || 0) + 1;
  const tk = matchTackles(user);
  user.tackles = tk;
  st.tackles = (st.tackles || 0) + tk;
  user.clean = clean;
  st.saves = (st.saves || 0) + sv;
  notifyHaul(user, comp ? comp.name : league(myClub().league).name);
  if (rating >= 8.3) { if (!cup) st.motm++; report.events.push(cup ? 'Player of the Match in the cup!' : 'Player of the Match!'); }
  p.form.push(rating); p.form = p.form.slice(-5);
  p.energy -= Math.round(user.mins / 90 * 22);
  addRep((rating - 6.4) * .5 * (0.6 + clubPrestige(myClub())) * (cup ? 1.3 : 1) + user.goals * .25);
  changeAff(rating >= 7.5 ? 2 : rating >= 7 ? 1 : rating < 6 ? -2 : 0);
  nudgeOvr(perfDelta(rating, user));
  derbyStakes(user, res, isHome, report);
  renewTaskGame(user, clean);
  // Goals, assists, tackles and clean sheets in every competition count towards objectives.
  (p.objectives || []).forEach(o => {
    o.progress += o.kind === 'goals' ? user.goals : o.kind === 'assists' ? user.assists : o.kind === 'tackles' ? user.tackles || 0
      : o.kind === 'ga' ? user.goals + user.assists : o.kind === 'clean' && clean ? 1 : 0;
  });
}

// Derbies matter more: beating your rivals lifts the manager (+4), the board (+3) and your name,
// and every goal against them counts extra. Losing one costs affection (−4) and board trust (−3).
function derbyStakes(user, res, isHome, report) {
  const name = derbyName(res.h, res.a);
  if (!name) return;
  const mine = isHome ? res.gh : res.ga, theirs = isHome ? res.ga : res.gh;
  const won = mine > theirs || (mine === theirs && res.winner === (isHome ? res.h : res.a));
  const lost = mine < theirs || (mine === theirs && res.winner && !won);
  if (user.goals) { addRep(user.goals * .6); report.events.push(`${user.goals > 1 ? `${user.goals} goals` : 'A goal'} in the ${name}: the fans will not forget it`); }
  if (won) { changeAff(4); changeBoard(3); addRep(1.5); report.events.push(`${name} won! Manager +4, board +3, reputation up`); }
  else if (lost) { changeAff(-4); changeBoard(-3); report.events.push(`${name} lost. Manager −4, board −3`); }
}

// One finished game for the Results list: both teams, the score, every goal and your numbers.
function resultRow(res, isHome, user, comp, kind, stage = '') {
  return {
    week: S.week, comp, kind, stage, derby: derbyName(res.h, res.a), h: res.h, a: res.a, gh: res.gh, gaH: res.ga, pens: res.pens || null, pensScore: res.pensScore || null, winner: res.winner || null,
    scorers: (res.scorers || []).map(s => ({ ...s })), opp: isHome ? res.a : res.h, isHome,
    gf: isHome ? res.gh : res.ga, ga: isHome ? res.ga : res.gh,
    rating: user.rating || null, goals: user.goals, assists: user.assists, mins: user.mins, start: !!user.start, rested: !!user.rested,
  };
}

// ---------- weekly loop ----------
function advanceWeek() {
  const p = S.player;
  if (S.phase !== 'season' || p.needsContract) return null;
  const report = { week: S.week, season: S.season, match: null, events: [] };
  const fx = nextFixture(), weekEnergy = p.energy;
  sponsorWeek();
  (p.oldLeases || []).filter(l => l.end <= absWeek()).forEach(l => msg(`Your lease on the ${HOUSING[l.house].name.toLowerCase()} in ${natName(l.nat)} has ended. No more rent to pay there.`, 'good'));
  syncHousing();
  let user = null;

  if (fx) {
    // Manager's fitness brief: count the matchdays you turn up fresh for.
    if (!p.injured) (p.objectives || []).forEach(o => { if (o.kind === 'energy' && p.energy >= o.min) o.progress++; });
    else p.st.missed = (p.st.missed || 0) + 1;
    user = { ...selection(false, fx.opp), goals: 0, assists: 0 };
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
      if (user.own) {
        // He forgives a goal in a win; a goal in a draw or defeat still annoys him a little.
        const won = fx.isHome ? res.gh > res.ga : res.ga > res.gh;
        // A goal or an assist both count as making it pay off.
        const ga = user.goals + user.assists;
        if (ga && won) { changeAff(2); report.events.push('You ignored the plan, but your goal or assist helped win the game. Affection +2'); }
        else if (ga) { changeAff(-2); report.events.push('You ignored the plan. You got a goal or assist, but the team didn\x27t win: affection −2'); }
        else { changeAff(-6); report.events.push('You ignored the manager\x27s plan and got no goal or assist. He is furious: affection −6'); }
      }
    }
    if (p.promise > 0) p.promise--;
    if (p.chance > 0) p.chance--;
    S.results.unshift(resultRow(res, fx.isHome, user, league(myClub().league).name, 'league'));
  }
  p.order = null;

  // Midweek cup game (European or domestic), picked on how fresh you are after the weekend.
  const efx = midweekFixture();
  // Two games in a week takes 50+ energy at the start of it; otherwise you play only the league game.
  const tooTired = efx && user && user.mins && weekEnergy < TWO_GAME_ENERGY;
  const cupUser = efx ? (tooTired ? { mins: 0, start: false, goals: 0, assists: 0, rested: true } : { ...selection(!efx.euro, efx.opp), goals: 0, assists: 0 }) : null;
  if (tooTired) report.events.push(`Rested for the ${efx.t.name.replace(/ \d{4}$/, '')} game: you need ${TWO_GAME_ENERGY}+ energy to play twice in a week`);
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
    S.results.unshift(resultRow(cupRes, efx.isHome, cupUser, efx.t.name.replace(/ \d{4}$/, ''), efx.euro ? 'euro' : 'cup', efx.stage));
  }

  pitchXp([user, cupUser].filter(Boolean), report);

  // Finances
  const net = weeklyNet();
  p.money += net;
  report.net = net;
  if (p.money < 0 && p.equip > 0) {
    p.equip = 0;
    msg('You could not pay for your training equipment, so you are back on normal kit.', 'bad');
  }
  if (p.money < 0 && ((p.house > 0 && !ownedHere()) || (p.oldLeases || []).length)) {
    p.house = ownedHere() ? p.house : 0;
    p.leaseEnd = 0;
    p.oldLeases = [];
    msg('You ran out of money and had to move back into a shared flat.', 'bad');
  }

  // Injury. Every week out costs a little sharpness, more as you get older; the big
  // judgement comes in the end-of-season review, based on how many games you missed.
  let justRecovered = false;
  if (p.injured) {
    p.injured--;
    nudgeOvr(-.03 * declineFactor());
    if (!p.injured) {
      // Match sharpness takes a while to return: about a week of rust for every three weeks out (1 to 5).
      p.rust = clamp(Math.round((p.injLen || 3) / 3), 1, 5);
      justRecovered = true;
      msg(`You are fit again and back in training, but short of match sharpness for about ${p.rust} week${p.rust > 1 ? 's' : ''}.`, 'good');
      setObjectives(OBJ_ORDER.filter(s => s !== 'season' || !p.objectives.some(o => o.span === 'season')));
    }
  } else {
    let chance = .009 + (p.energy < 30 ? .045 : 0) + (p.trainedThisWeek || 0) * .003 + (user && user.mins ? .008 : 0) + (cupUser && cupUser.mins ? .008 : 0);
    chance *= (1 - .1 * p.equip) * (1 + vetYears() * .04) * injuryMult();
    if (Math.random() < chance) {
      // Most knocks are short; a strong body makes a serious one rarer.
      const serious = Math.random() < seriousChance();
      if (serious) p.seriousSeason = S.season;
      p.injured = serious ? randi(8, 20) : randi(1, 6);
      p.injLen = p.injured;
      p.rust = 0;
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

  // Each week back in action knocks off some of the rust.
  if (!p.injured && p.rust > 0 && !justRecovered) p.rust--;
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
  loyaltyOffer();
  inquiryWeek();
  renewTaskWeek();
  const card = cardTier(calcOVR());
  if (card !== 'Bronze' && !(p.cards || []).includes(card)) {
    p.cards = [...(p.cards || []), card];
    msg(card === 'Silver' ? 'You reached a silver rating (65)! Second-tier clubs will start bidding for you. Top-flight clubs want 78 (the top sides 85), or a +8 OVR breakout season.' : 'You reached a gold rating (75)! You are now one of the most wanted players around.', 'good');
    notify('good', `${card} rating!`, card === 'Silver' ? 'You hit 65 OVR. Second-tier clubs will bid for you now.' : 'You hit 75 OVR. You are one of the most wanted players around.');
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

// From 38 a club may simply decide you are too old to keep: 70% still offer a renewal at 38, 40% at 39.
const OLD_RENEW_AGE = 38;
const renewOdds = (age = ageOf(S.player.by)) => age < OLD_RENEW_AGE ? 1 : age === OLD_RENEW_AGE ? .7 : age === OLD_RENEW_AGE + 1 ? .4 : .2;
// A club also baulks at renewing someone paid far above what they're now worth: more than 2.5× your
// market value and the odds fall with it (5× → half, 25× or more → a tenth).
const payRatio = () => S.player.wage / Math.max(1, marketWage(calcOVR(), myClub()));
const payOdds = () => payRatio() <= 2.5 ? 1 : clamp(2.5 / payRatio(), .1, 1);
// Why a renewal was refused, or null if they'll offer one.
function renewalRefusal() {
  if (Math.random() < renewOdds() * payOdds()) return null;
  const age = ageOf(S.player.by), old = age >= OLD_RENEW_AGE, dear = payOdds() < 1;
  return old && dear ? `at your age (${age}) and on ${money(S.player.wage)} a week` : dear ? `on ${money(S.player.wage)} a week, far above what you're worth now` : `at your age (${age})`;
}

// A manager who adores a veteran (affection 95+, age 33+) usually offers an extension himself.
function veteranRenewal() {
  const p = S.player;
  if (S.week !== 30 || p.loan || p.vetAsked === S.season || ageOf(p.by) <= VET_AGE || effAff() < 95) return;
  if (S.offers.some(o => o.type === 'renew')) return;
  p.vetAsked = S.season;
  if (Math.random() >= .7 * renewOdds() * payOdds()) return;
  S.offers.push(makeOffer(myClub(), 'renew', 0, false, true));
  msg(`${myClub().mgr} wants you to stay and has offered you a new contract.`, 'good');
  notify('good', 'The manager wants you to stay', `${myClub().mgr} came to you with a new contract. Check your Home screen.`);
}

function randomEvent(report) {
  const p = S.player;
  if (Math.random() > .14) return;
  const events = [
    () => { if (p.rep < 15) return; const v = Math.round(p.rep * 150); p.money += v; msg(`A boot brand paid you ${money(v)} for a photoshoot.`, 'good'); },
    () => { addRep(1.5); msg('Your visit to a children\'s hospital went viral. Reputation up.', 'good'); },
    () => { const v = Math.round(Math.max(150, p.wage * rand(.3, .8))); p.money -= v; msg(`Your car needed repairs: ${money(v)}.`, 'bad'); },
    () => { p.energy = clamp(p.energy - 15, 0, 100); msg('You slept badly before training. Energy down.', 'bad'); },
    () => { const k = pick(attrKeys(p.pos)); p.attrs[k] = clamp(p.attrs[k] + .8, 1, 99); msg(`A senior teammate gave you extra ${ATTR_NAMES[k].toLowerCase()} tips after training.`, 'good'); },
    () => { changeAff(-3); msg('You were late to a team meeting. Manager affection −3.', 'bad'); },
    () => { changeAff(3); msg('The manager praised your attitude in front of the squad. Affection +3.', 'good'); },
    () => { if (p.rep < 30) return; const v = Math.round(p.rep * 300); p.money += v; msg(`You signed a social media deal worth ${money(v)}.`, 'good'); },
  ];
  pick(events)();
}

function checkContractBoost() {
  const p = S.player, ovr = calcOVR();
  if (p.loan || p.years < 1 || ovr - p.ovrAtSign < 4 || effAff() < 45 || negLocked()) return;
  if (S.offers.some(o => o.type === 'renew')) return;
  if (p.wage > marketWage(ovr, myClub()) * .8 || ageOf(p.by) >= OLD_RENEW_AGE) return;
  // When the club comes to you it is a loyalty deal half the time (if the manager adores you); any
  // other deal it offers you itself comes with a release clause.
  const o = makeOffer(myClub(), 'renew', 0, loyaltyRoll() && Math.random() < .5, true);
  S.offers.push(o);
  msg(o.clause ? `"We really love you as a player," say ${myClub().name}. They want ${o.clause} seasons to make you their star, on ${raisePct(o)}% more a week, and promise to keep every distraction away from you.` : `${myClub().name} want to reward your progress with an improved contract.${o.block ? ` It comes with a ${o.block}-year release clause.` : ''}`, 'good');
}

// Loyalty deals only go to players the manager adores (93+ affection). Turn one down and the club
// waits: about every three months it thinks again, and half the time comes back with another.
const LOYAL_AFF = 93, LOYAL_GAP = 13;
const loyalAge = () => { const a = ageOf(S.player.by); return a >= CLAUSE_AGES[0] && a <= CLAUSE_AGES[1]; };
function loyaltyRoll() {
  const p = S.player;
  if (!loyalAge() || effAff() < LOYAL_AFF) return false;
  if (!p.loyalNext) return true;
  if (absWeek() < p.loyalNext) return false;
  p.loyalNext = absWeek() + LOYAL_GAP;
  return Math.random() < .5;
}

// A manager who adores you (93+ affection) may come to you with a loyalty deal when you are 20 to 28:
// the first week each season you are at 93+, half the time. After you have said no once, the club
// only thinks again about every three months, again half the time.
function loyaltyOffer() {
  const p = S.player;
  if (p.loan || p.needsContract || !loyalAge() || negLocked() || S.offers.some(o => o.type === 'renew')) return;
  if (p.loyalNext) { if (!loyaltyRoll()) return; }
  else {
    if (p.loyalAsked === S.season || effAff() < LOYAL_AFF) return;
    p.loyalAsked = S.season;
    if (Math.random() >= .5) return;
  }
  // Half the time it is a loyalty deal; otherwise a normal new contract with a release clause.
  const o = makeOffer(myClub(), 'renew', 0, Math.random() < .5, true);
  S.offers.push(o);
  if (!o.clause) {
    msg(`${myClub().mgr} wants to keep you and has offered a new contract${o.block ? `, with a ${o.block}-year release clause` : ''}.`, 'good');
    notify('good', 'A new contract', `${myClub().mgr} came to you with a new deal. Check the Contract tab.`);
    return;
  }
  msg(`${myClub().mgr} pulled you aside: "You're the one we want to build this team around." He has offered you a loyalty deal.`, 'good');
  notify('good', 'We want you here', `"We really love you as a player," says ${myClub().mgr}. ${o.clause} seasons to make you our star, ${raisePct(o)}% more a week, and no distractions from other clubs. Check the Contract tab.`);
}

// No club pays more than 35% above your market value, and nobody earns more than the
// best-paid players in the world in their position (Mbappé/Haaland, De Bruyne, Van Dijk, Courtois).
// Saudi and MLS clubs play by their own rules: up to 60% above market value and no position maximum.
const MAX_OVER_MARKET = .35, RICH_OVER_MARKET = .6;
const WAGE_MAX = { FWD: 600000, MID: 470000, DEF: 410000, GK: 300000 };
const richLeague = c => VET_LEAGUES.includes(league(c.league).nat);
// Without a club you have no leverage: every club, Saudi and MLS included, pays your market value.
const freeAgent = () => !!S.player.needsContract;
// From 38 a free agent is a short-term gamble for any club, whatever the league's usual pay: a small
// flat wage from your OVR and the club's division only (about €18k a week at 78 OVR in a top
// flight, half that a division down, a quarter two down). Negotiation adds up to 15%.
const oldFreeAgent = () => freeAgent() && ageOf(S.player.by) >= OLD_RENEW_AGE;
const oldFreeWage = c => clamp((calcOVR() - 55) * 800, 2000, 25000) * ({ 1: 1, 2: .5, 3: .25 }[clubTier(c)] || .25);
// Saudi and MLS clubs still pay a big name without a club something, shrinking each year.
// Saudi: €80–100k a week at 37, €50–65k at 38, €25–35k at 39. MLS pays a little less.
const RICH_FREE = {
  KSA: { 37: [80000, 100000], 38: [50000, 65000], 39: [25000, 35000] },
  USA: { 37: [65000, 80000], 38: [40000, 50000], 39: [20000, 28000] },
};
function saudiFreeRange(c) {
  const age = ageOf(S.player.by), table = RICH_FREE[league(c.league).nat];
  if (!freeAgent() || age < 37 || !table) return null;
  return table[Math.min(age, 39)];
}
// What a free agent from 37 would be offered by this club, or null for the normal market price.
function freeAgentWage(c) {
  const r = saudiFreeRange(c);
  if (r) return Math.round(rand(...r) / 10) * 10;
  return oldFreeAgent() ? Math.round(oldFreeWage(c) * rand(.9, 1.05) / 10) * 10 : null;
}
// From 37, fewer clubs want a free agent at all. Each search either draws interest or doesn't
// (85% at 37, 50% at 38, 20% at 39), and even then only a few clubs call (3, 2, then 1).
const FREE_AGENT_INTEREST = { 37: [.85, 3], 38: [.5, 2], 39: [.2, 1] };
const freeAgentInterest = () => !freeAgent() || ageOf(S.player.by) < 37 ? [1, Infinity] : FREE_AGENT_INTEREST[Math.min(ageOf(S.player.by), 39)];
const wageCeiling = (c, room = MAX_OVER_MARKET) => richLeague(c) && !freeAgent()
  ? marketWage(calcOVR(), c) * (1 + Math.min(room, RICH_OVER_MARKET))
  : Math.min(marketWage(calcOVR(), c) * (1 + Math.min(room, MAX_OVER_MARKET)), WAGE_MAX[POS_GROUP[S.player.pos]]);

const vetRichWage = type => Math.round((type === 'renew' ? Math.max(S.player.wage, primeWage() * .8) * rand(.9, 1.02) : primeWage() * rand(.85, 1.05)) / 10) * 10;

// Renewals pay around market value; rival clubs bid a little above it to tempt you away.
// A fixed wage (a veteran's Saudi or MLS deal) skips the market maths.
function makeOffer(c, type, fixedWage = 0, loyalty = false, clubOffer = false) {
  const ovr = calcOVR();
  // Saudi and MLS clubs open higher to lure you.
  const range = type === 'renew' ? [.85, 1] : freeAgent() ? [.9, 1.05] : richLeague(c) ? [1.15, 1.4] : [1, 1.2];
  const fa = freeAgentWage(c);
  const market = fa != null ? fa
    : Math.round(Math.min(marketWage(ovr, c) * rand(...range) * (freeAgent() ? 1 : 1 + agent().wage * .5), wageCeiling(c)) / 10) * 10;
  // Past 33, a Saudi or MLS club always pays about what you earned in your prime (a renewal there
  // keeps you close to your current wage), however low your market value has dropped. Not for a
  // free agent, though.
  const vetRich = !fixedWage && vetYears() > 0 && richLeague(c) && !freeAgent();
  if (vetRich) fixedWage = vetRichWage(type);
  const wage = Math.max(minWage(c), fixedWage || market);
  const age = ageOf(S.player.by);
  // Veterans get shorter deals: up to 3 years at 34, 2 at 35, then one year at a time. Big
  // top-flight clubs start shortening earlier: at most 4 years at 30–31, 3 at 32–33, then 1 or 2
  // years at 34 and 35. Your own top-flight club renews for one year, or two if the manager
  // adores you (98+ affection).
  const vy = vetYears(age), bigMax = !bigTopFlight(c) ? 5 : age >= 32 ? 3 : age >= 30 ? 4 : 5;
  let years = !vy ? randi(Math.min(2, bigMax), bigMax) : vy === 1 && !bigTopFlight(c) ? randi(1, 3) : vy <= 2 ? randi(1, 2) : 1;
  if (vy && type === 'renew' && clubTier(c) === 1) years = effAff() >= 98 ? 2 : 1;
  // Saudi and MLS clubs keep offering veterans longer deals, renewals included: up to 3 years at
  // 34–35, 2 at 36–37, then one year at a time.
  if (richLeague(c) && vy) years = randi(1, age <= 35 ? 3 : age <= 37 ? 2 : 1);
  if (age >= OLD_RENEW_AGE) years = 1;
  // A loyalty deal (only when the club or manager comes to you, aged 20 to 28): 25% above your
  // current wage or your market value, whichever is higher, with a clause of 2–3 seasons with no bids from other clubs and no salary talks.
  // Its wage cannot be negotiated.
  const clause = loyalty && type === 'renew' && age >= CLAUSE_AGES[0] && age <= CLAUSE_AGES[1] && S.player.wage > 0 && !fixedWage ? randi(2, 3) : 0;
  if (clause) years = Math.min(5, Math.max(years, clause + (S.phase === 'season' ? 1 : 0)));
  const clauseBase = Math.max(S.player.wage, marketWage(ovr, c));
  const clauseWage = clause ? Math.round(Math.min(clauseBase * (1 + CLAUSE_RAISE), richLeague(c) ? Infinity : Math.max(clauseBase, WAGE_MAX[POS_GROUP[S.player.pos]])) / 10) * 10 : 0;
  let status = squadStatus(c, ovr), promised = false;
  // Buying clubs sometimes promise a starting place, more often when you are close to their level.
  if (type === 'transfer' && (status === 'Rotation' || status === 'Reserve') && Math.random() < clamp(.45 - (teamStrength(c) - ovr) * .04, .1, .6)) {
    status = 'Starter';
    promised = true;
  }
  // Buying clubs only haggle a set number of times (1 to 3) before walking away.
  const maxRounds = (type === 'transfer' ? randi(1, 3) : 2) + ((S.player.agent || 0) >= 4 ? 1 : 0);
  // A release clause: 65% of transfers, and every renewal the club offers you itself (other than a
  // loyalty deal).
  const block = clause ? 0 : Math.min(years, type === 'transfer' ? (Math.random() < BLOCK_CHANCE ? blockYears() : 0) : clubOffer ? blockYears() : 0);
  return { id: Math.random().toString(36).slice(2, 9), club: c.id, type, wage: clauseWage || wage, years, status, promised, week: S.week, season: S.season, rounds: 0, maxRounds, pen: 0, ...(fixedWage ? { prime: true } : {}), ...(clause ? { clause } : {}), ...(block ? { block, blockFee: breachFee() } : {}) };
}

const maxRounds = o => o.clause ? 0 : o.maxRounds || 2;
const CLAUSE_AGES = [20, 28], CLAUSE_RAISE = .25;
// The loyalty clause covers whole seasons: signed in summer, the next X; signed during a season,
// the X after this one.
const clauseEnd = x => S.season + x;
const clauseActive = () => (S.player.clauseUntil || 0) > absWeek();
// How much more than your current wage an offer pays, in %.
const raisePct = o => Math.round((o.wage / Math.max(1, S.player.wage) - 1) * 100);
const negLocked = () => (S.player.negLock || 0) > absWeek();

// ---------- release clauses ----------
// A release clause blocks any move and salary talks for 2 years (50% of the time), 3 (30%) or 4 (20%),
// never longer than the contract itself. Other clubs
// can only reach you through your agent. Breaking it costs a fee set by your OVR when you sign.
const BLOCK_CHANCE = .65;
const blockYears = () => { const r = Math.random(); return r < .5 ? 2 : r < .8 ? 3 : 4; };
// Each band runs from its lowest fee at its lowest OVR to its highest at its top OVR:
// 55–67: €50–250k, 68–77: €750k–5M, 78–84: €10–30M, 85–91: €40–100M (below 55: €20–50k).
const BREACH_BANDS = [[0, 54, 2e4, 5e4], [55, 67, 5e4, 2.5e5], [68, 77, 7.5e5, 5e6], [78, 84, 1e7, 3e7], [85, MAX_OVR, 4e7, 1e8]];
function breachFee(ovr = calcOVR()) {
  const [a, b, lo, hi] = BREACH_BANDS.find(([, top]) => ovr <= top) || BREACH_BANDS.at(-1);
  const t = clamp((ovr - a) / Math.max(1, b - a), 0, 1);
  return Math.round(lo * Math.pow(hi / lo, t) * rand(.95, 1.05) / 1e4) * 1e4;
}
// Old saves only had loyalty clauses.
const blockActive = () => clauseActive() && S.player.clauseKind === 'block';
const inquiries = () => S.player.inquiries || [];
// Will the buying club pay the fee? It depends on your goals + assists (the better of last season and
// this one): 40+ makes it 90–100% likely, 30–39 70–89%, 23–29 58–69%, 18–22 46–57%, fewer 0–45%.
// Offering to pay half lifts the odds a band (and 0–45% straight to 58–69%). Paying it all always works.
// Deeper roles count their G/A against a lower par (a centre-back's 8 count like a striker's 40);
// keepers count two per clean sheet.
const BREACH_TIERS = [[40, [.9, 1], [1, 1]], [30, [.7, .89], [.9, 1]], [23, [.58, .69], [.7, .89]], [18, [.46, .57], [.58, .69]], [0, [0, .45], [.58, .69]]];
function clauseGA() {
  const p = S.player, last = (p.career || []).at(-1), st = p.st;
  if (p.pos === 'GK') return Math.max(last ? last.cleanAll || 0 : 0, st ? st.cleanAll || 0 : 0) * 2;
  const now = st ? st.goals + st.assists + (st.cup ? st.cup.goals + st.cup.assists : 0) : 0;
  const before = last ? last.goals + last.assists : 0;
  return Math.round(Math.max(now, before) * 10 / (GA_PAR[p.pos] || 10));
}
function breachOdds() {
  const [, they, half] = BREACH_TIERS.find(([min]) => clauseGA() >= min);
  return { they: rand(...they), half: rand(...half), full: 1 };
}

// A club that would have bid gets in touch with your agent instead.
function addInquiry(c, o = makeOffer(c, 'transfer')) {
  const p = S.player;
  if (inquiries().some(q => q.club === c.id) || c.id === p.club) return false;
  p.inquiries = [...inquiries(), { id: Math.random().toString(36).slice(2, 9), club: c.id, offer: o, week: absWeek(), talks: false, triedThey: false, triedHalf: false }];
  return true;
}

// Ask your agent to sound out clubs, once per transfer window. Each club is 50-50 to be interested;
// three in four of those get back to your agent, the rest go quiet.
const windowKey = () => `${S.season}${S.phase === 'offseason' ? 's' : 'j'}`;
const canSoundOut = () => blockActive() && inWindow() && S.player.soundedAt !== windowKey();
function soundOut() {
  const p = S.player;
  if (!canSoundOut()) return null;
  p.soundedAt = windowKey();
  const ovr = calcOVR(), reach = ovr + 2 + p.rep / 30;
  const pool = Object.values(S.clubs).filter(c => c.id !== p.club && !isBanned(c.id) && topFlightOpen(c) && !inquiries().some(q => q.club === c.id)
    && teamStrength(c) <= reach && teamStrength(c) >= ovr - 10).sort((a, b) => teamStrength(b) - teamStrength(a));
  const asked = shuffle(pool.slice(0, 12)).slice(0, 3);
  const back = asked.filter(() => Math.random() < .5 && Math.random() < .75).filter(c => addInquiry(c));
  if (!asked.length) agentSay('I made some calls, but nobody at your level is looking right now.');
  else if (!back.length) agentSay(`I put the word out to ${asked.map(c => c.name).join(', ')}. Nobody has got back to me.`, 'bad');
  else {
    agentSay(`I put the word out to ${asked.map(c => c.name).join(', ')}. ${back.map(c => c.name).join(' and ')} got back to me: they want to talk.`, 'good');
    notify('good', 'Clubs want to talk!', `${back.map(c => c.name).join(' and ')} answered your agent. See the Contract tab.`);
  }
  save();
  return back.length;
}

// Listen to an inquiry: the club opens talks with yours about the release clause.
function listenInquiry(id) {
  const q = inquiries().find(x => x.id === id), c = q && club(q.club);
  if (!q || q.talks) return;
  q.talks = true;
  q.odds = breachOdds();
  msg(`${c.name} have opened talks with ${myClub().name} about your release clause.`, 'good');
  notify('talks', 'Talks are on!', `${c.name} are talking to ${myClub().name} about you right now. Now decide how the ${money(S.player.clauseFee)} release fee gets paid.`);
  save();
}

function ignoreInquiry(id) {
  const q = inquiries().find(x => x.id === id);
  if (q) msg(`You told your agent you are not interested in ${club(q.club).name}.`);
  S.player.inquiries = inquiries().filter(x => x.id !== id);
  save();
}

// Who pays the release fee. Only one try each at asking the club and at splitting it; a failed
// split costs nothing. Paying it all yourself always works.
function payBreach(id, mode) {
  const p = S.player, q = inquiries().find(x => x.id === id), fee = p.clauseFee || 0;
  if (!q || !q.talks || !blockActive()) return null;
  const c = club(q.club), cost = mode === 'full' ? fee : mode === 'half' ? Math.round(fee / 2) : 0;
  if ((mode === 'they' && q.triedThey) || (mode === 'half' && q.triedHalf) || p.money < cost) return null;
  if (mode === 'they') q.triedThey = true;
  if (mode === 'half') q.triedHalf = true;
  q.odds = q.odds || breachOdds();
  if (Math.random() >= q.odds[mode]) {
    msg(mode === 'they' ? `${c.name} refused to pay your release fee.` : `${c.name} would not split the fee. No money changed hands.`, 'bad');
    save();
    return 'no';
  }
  p.money -= cost;
  // The fee buys this one club the right to bid. The clause still blocks everyone else, and other
  // clubs that were asking keep waiting.
  p.inquiries = inquiries().filter(x => x.id !== id);
  if (!S.offers.some(o => o.club === q.club)) S.offers.push({ ...q.offer, week: S.week, season: S.season, released: true });
  const who = mode === 'they' ? `${c.name} paid the full ${money(fee)}` : mode === 'half' ? `you and ${c.name} split the ${money(fee)}` : `you paid the ${money(fee)} yourself`;
  msg(`Release fee settled: ${who}. Only ${c.name} can make you an official offer; your clause still blocks every other club.`, 'good');
  notify('good', `${c.name} can bid!`, `The release fee is settled (${who}). ${c.name}'s official offer is in the Contract tab. Other clubs are still blocked.`);
  save();
  return 'ok';
}

// Weekly: old inquiries go cold, and once the clause runs out clubs bid normally again.
function inquiryWeek() {
  const p = S.player;
  if (!inquiries().length) return;
  if (!blockActive()) { p.inquiries = []; return; }
  const cold = inquiries().filter(q => absWeek() - q.week >= 6);
  if (cold.length) msg(`${cold.map(q => club(q.club).name).join(', ')} stopped waiting and moved on.`);
  p.inquiries = inquiries().filter(q => absWeek() - q.week < 6);
}

// ---------- asking for a renewal ----------
// Asking for a new deal works 80% of the time. Otherwise the board sets you a task first: hit it
// within 8 weeks and the offer is guaranteed.
const RENEW_TASK = { FWD: ['ga', 4], MID: ['ga', 3], DEF: ['tackles', 14], GK: ['clean', 2] };
function setRenewTask() {
  const [kind, target] = RENEW_TASK[POS_GROUP[S.player.pos]];
  S.player.renewTask = { kind, target, progress: 0, until: absWeek() + 8 };
}
const renewTaskText = t => `${t.target} ${t.kind === 'ga' ? 'goals + assists' : t.kind === 'tackles' ? 'tackles' : 'clean sheets'}`;
function renewTaskGame(user, clean) {
  const p = S.player, t = p.renewTask;
  if (!t) return;
  t.progress += t.kind === 'ga' ? user.goals + user.assists : t.kind === 'tackles' ? user.tackles || 0 : clean ? 1 : 0;
  if (t.progress < t.target) return;
  p.renewTask = null;
  if (p.loan || p.needsContract) return;
  S.offers.push(makeOffer(myClub(), 'renew'));
  msg(`You did what the board asked (${renewTaskText(t)}). ${myClub().name} have put a new contract on the table.`, 'good');
  notify('good', 'Task complete!', `The board kept their word: ${myClub().name} have offered you a new contract.`);
}
function renewTaskWeek() {
  const p = S.player, t = p.renewTask;
  if (t && absWeek() >= t.until) { p.renewTask = null; msg(`You ran out of time on the board's task (${t.progress}/${t.target}). No new contract for now.`, 'bad'); }
}

// Scouting signals: an 8+ OVR jump this season (breakout), a 6+ jump (rising), and a silver (65+) rating.
function scoutBuzz() {
  const ovr = calcOVR(), jump = ovr - (S.ovrSeasonStart || ovr);
  return { breakout: jump >= BREAKOUT_OVR, rising: jump >= RISING_OVR, silver: ovr >= 65 };
}
// The bottom half of a top flight by squad strength: the clubs a rising player can step up to.
const smallTopFlight = c => clubTier(c) === 1 && tierPrestige(c) < .5;

function generateOffers(count, guarantee = false) {
  const p = S.player, ovr = calcOVR(), { breakout, rising, silver } = scoutBuzz();
  // Free agents always hear from someone; otherwise clubs leave you to settle in for six months.
  // Under a release clause, clubs that would have bid get in touch with your agent instead.
  const divert = !guarantee && blockActive();
  if (!guarantee && offerLocked() && !divert) return;
  // An ageing free agent hears from fewer and fewer clubs.
  const [odds, maxNew] = freeAgentInterest(), interest = 1, before = S.offers.length;
  if (Math.random() >= odds) { msg(`No club came forward. At ${ageOf(p.by)}, offers for a player without a club are getting scarce: it may be time to retire.`, 'bad'); return; }
  const reach = ovr + 2 + p.rep / 30;
  const home = p.loan ? p.loan.parent : p.club;
  const free = c => c.id !== p.club && c.id !== home && !isBanned(c.id) && topFlightOpen(c) && !S.offers.some(o => o.club === c.id) && !coolingOff(c.id) && !inquiries().some(q => q.club === c.id);
  const pool = Object.values(S.clubs).filter(c => {
    if (!free(c)) return false;
    const s = teamStrength(c), top = clubTier(c) === 1;
    // Top-flight scouts stretch further for a breakout or silver-rated player.
    // A rising player also catches the eye of smaller top-flight clubs a few points above their level.
    return s <= reach + (top && breakout ? 5 : 0) + (top && silver ? 2 : 0) + (rising && smallTopFlight(c) ? 4 : 0) && s >= ovr - 10;
  });
  // Prefer the strongest clubs that rate you.
  pool.sort((a, b) => teamStrength(b) - teamStrength(a));
  const base = (.25 + p.rep / 200) * (p.listed ? 1.8 : 1) * agent().offers;
  let added = 0;
  const names = [];
  const add = c => {
    if (divert) { if (addInquiry(c)) { added++; names.push(c.name); } return; }
    const o = makeOffer(c, 'transfer'), again = declinedUntil(c.id) > absWeek();
    // An eager club uses up its one extra try.
    if (again) { o.again = true; p.declined[c.id] = { until: declinedUntil(c.id), eager: false }; }
    S.offers.push(o); added++; names.push(c.name);
    msg(again ? `${c.name} won't take no for an answer: they are back with another offer.` : `${c.name} (${league(c.league).name}) have made you an offer.`, 'good');
  };
  // At 34 and 35 a big top-flight club calls only now and then (25%, then 8% of windows), and never more than one.
  const vy = vetYears();
  let bigLeft = !vy ? Infinity : Math.random() < ([0, .25, .08][vy] || 0) ? 1 : 0;
  for (const c of pool.slice(0, 24)) {
    if (added >= count) break;
    if (bigTopFlight(c) && !bigLeft) continue;
    // Silver: second-tier clubs are much keener, top-flight clubs a little.
    // Rising (+6 OVR): the bottom half of top flights and second-tier clubs are much keener.
    const w = (clubTier(c) === 1 ? (breakout ? 3 : 1) * (silver ? 1.3 : 1) : clubTier(c) === 2 && silver ? 1.5 : 1)
      * (rising && (smallTopFlight(c) || clubTier(c) === 2) ? 2.2 : 1);
    if (Math.random() < (guarantee ? .5 : base) * w * interest) { add(c); if (bigTopFlight(c)) bigLeft--; }
  }
  // A silver-rated player in the lower leagues always gets a second-tier (or better) offer.
  if (silver && clubTier(myClub()) >= 2 && !S.offers.some(o => o.type === 'transfer' && clubTier(club(o.club)) <= 2)) {
    const better = Object.values(S.clubs).filter(c => free(c) && clubTier(c) <= 2 && teamStrength(c) <= reach + 2)
      .sort((a, b) => teamStrength(b) - teamStrength(a));
    if (better.length && Math.random() < interest) add(pick(better.slice(0, 6)));
  }
  if (vetYears() && !p.loan) {
    const nat = c => league(c.league).nat;
    // Saudi and MLS clubs keep calling, offering about what you earned in your prime.
    // The biggest clubs in those leagues are the ones with that kind of money.
    const rich = shuffle(Object.values(S.clubs).filter(c => free(c) && clubTier(c) === 1 && VET_LEAGUES.includes(nat(c)))
      .sort((a, b) => teamStrength(b) - teamStrength(a)).slice(0, 10));
    rich.slice(0, Math.random() < .6 ? 2 : 1).filter(() => Math.random() < interest).forEach(c => {
      if (divert) { add(c); return; }
      const o = makeOffer(c, 'transfer'), wage = o.wage;
      S.offers.push(o); added++; names.push(c.name);
      msg(`${c.name} (${league(c.league).name}) want your experience and offer ${money(wage)}/week${o.prime ? ', close to your prime wage' : ''}.`, 'good');
    });
    // Lower-league and Portuguese clubs want a veteran too, paying what your OVR is worth now.
    const modest = shuffle(Object.values(S.clubs).filter(c => free(c) && !VET_LEAGUES.includes(nat(c)) && (clubTier(c) >= 2 || nat(c) === 'POR') && teamStrength(c) <= ovr + 2 && teamStrength(c) >= ovr - 18)
      .sort((a, b) => teamStrength(b) - teamStrength(a)).slice(0, 15));
    modest.slice(0, Math.random() < .5 ? 2 : 1).filter(() => Math.random() < interest).forEach(add);
  }
  if (guarantee && added === 0 && Math.random() < interest) {
    const weakest = Object.values(S.clubs).filter(free).sort((a, b) => teamStrength(a) - teamStrength(b));
    add(pick(weakest.slice(0, 20)));
  }
  // Only a few clubs bother with an ageing free agent: keep the first maxNew new offers.
  if (added > maxNew) {
    const cut = S.offers.splice(before + maxNew).map(o => club(o.club).name);
    S.inbox = S.inbox.filter(m => !(m.week === S.week && m.season === S.season && cut.some(n => m.text.startsWith(n))));
    names.splice(maxNew); added = maxNew;
  }
  if (added && divert) {
    agentSay(`${names.join(', ')} ${added > 1 ? 'have' : 'has'} been asking about you. Your release clause stops them bidding, but they want to talk.`, 'good');
    notify('good', added > 1 ? `${added} clubs are asking about you!` : 'A club is asking about you!', `${names.join(', ')} contacted your agent. Listen to them in the Contract tab.`);
  } else if (added) notify('good', added > 1 ? `${added} clubs want you!` : 'A club wants you!', `${names.join(', ')} ${added > 1 ? 'have' : 'has'} made you an offer. Check the Contract tab.`);
}

// Offers when a window opens: more for a breakout season or a transfer request.
function windowOffers() {
  const { breakout } = scoutBuzz(), p = S.player;
  resolveWish();
  if (clauseActive() && !blockActive()) { msg('Your loyalty clause is active: no club can bid for you this window.'); return; }
  if (blockActive()) { generateOffers(randi(1, 3) + (breakout ? 2 : 0)); return; }
  if (offerLocked()) { msg('Clubs are leaving you to settle in at your new club: no transfer offers this window.'); return; }
  // A club you agreed to listen to comes back with a bid.
  if (p.interested && p.interested !== p.club && !isBanned(p.interested) && topFlightOpen(club(p.interested)) && !S.offers.some(o => o.club === p.interested)) S.offers.push(makeOffer(club(p.interested), 'transfer'));
  p.interested = null;
  generateOffers(randi(1, 3) + (breakout ? 2 : 0) + (S.player.listed ? 2 : 0));
}

function expireOffers(type) { S.offers = S.offers.filter(o => o.type !== type); }

// Summer only: wait a little longer for more clubs, three times per offseason.
// Offers already on the table stay; new clubs add to them.
const canRefreshOffers = () => S.phase === 'offseason' && (S.offerRerolls || 0) > 0 && (S.player.needsContract || !offerLocked());
function refreshOffers() {
  if (!canRefreshOffers()) return 0;
  const p = S.player, before = S.offers.length;
  S.offerRerolls--;
  if (p.needsContract) generateOffers(randi(1, 3), true);
  else generateOffers(randi(1, 2) + (scoutBuzz().breakout ? 1 : 0) + (p.listed ? 1 : 0));
  const added = S.offers.length - before;
  if (!added) msg('You waited, but no new clubs came forward.');
  save();
  return added;
}

// How far above market value a deal can go: buying clubs stretch to 25%, your own club only as
// far as your objectives record earns. A good agent adds a little. Never more than 35% over.
const BAND_ROOM = { elite: .3, great: .2, good: .1, ok: 0, poor: 0, new: 0 };
function wageCap(o) {
  // Saudi and MLS clubs go up to 60% over market value. A veteran's deal there starts from your
  // prime wage, so it can also stretch to 25% above your prime, whichever is higher.
  const c = club(o.club);
  const fr = saudiFreeRange(c);
  if (fr) return fr[1] * 1.15;
  if (oldFreeAgent()) return oldFreeWage(c) * 1.15;
  if (freeAgent()) return wageCeiling(c, .25 + agent().wage * .4);
  if (richLeague(c)) {
    const cap = wageCeiling(c, RICH_OVER_MARKET);
    const prime = o.prime || (o.type === 'transfer' && vetYears() > 0);
    return prime ? Math.max(cap, primeWage() * 1.25) : cap;
  }
  const room = (o.type === 'renew' ? BAND_ROOM[objBand()] : .25) + agent().wage * .4;
  return wageCeiling(c, room);
}

// What an ask would actually pay if they agree: the raise, but no more than the club's ceiling.
const negWage = (o, ask) => Math.round(Math.min(o.wage * (1 + ask.pct), Math.max(o.wage, wageCap(o))) / 10) * 10;

function negotiateChance(o, ask) {
  const c = club(o.club), ovr = calcOVR();
  const aff = o.type === 'renew' ? effAff() : 50;
  const board = o.type === 'renew' ? (S.player.board - 50) / 200 : 0;
  const over = o.wage * (1 + ask.pct) > wageCap(o) ? .35 : 0;
  return clamp(.85 - ask.pct * 1.3 + (aff - 50) / 120 + board + (ovr - teamStrength(c)) / 30 - o.rounds * .15 + (o.type === 'renew' ? BANDS[objBand()].chance : 0) - over + agent().neg, .05, .95);
}

// A renewal talk that fails ends the haggling: sign what is on the table or walk away.
const canNegotiate = o => o.rounds < maxRounds(o) && !o.talksOver && !(o.type === 'renew' && negLocked());

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
    o.wage = negWage(o, ask);
    o.negotiated = true;
    result = 'accepted';
    // Even when he agrees, the manager resents being squeezed: affection drops by a fifth.
    if (renew) changeAff(-p.aff * .2);
  } else if (!renew || Math.random() < ask.pct * 1.2) { S.offers = S.offers.filter(x => x.id !== id); result = 'withdrawn'; }
  else { result = 'rejected'; o.talksOver = true; }
  if (renew && result !== 'accepted') changeAff(-3);
  if (result === 'withdrawn') notify('bad', 'Offer withdrawn', `${club(o.club).name} ${renew ? 'were offended by your demands' : 'would not meet your demands'} and walked away.`);
  checkTermination();
  const name = club(o.club).name;
  msg(result === 'accepted' ? `${name} agreed to ${money(o.wage)}/week.` : result === 'withdrawn' ? `${name} were offended and withdrew their offer.` : `${name} refused to raise their offer. Talks are over: sign it as it is or decline.`, result === 'accepted' ? 'good' : 'bad');
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
      notify('bad', 'Burned bridges', `You joined ${names}'s rivals. ${names} fans and board will hate you: they will never make you an offer again, and neither club will ever call you a legend.`);
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
    p.frozen = false;
    syncHousing();
    syncSummerClub();
    p.board = 50;
    p.listed = false;
    p.objHist = [];
    p.objectives = [];
    p.chance = 0;
    p.objHard = o.negotiated ? .1 : 0;
    p.promise = o.promised ? 15 : 0;
    p.negLock = 0;
    p.clauseUntil = 0;
    if (o.promised) msg(`${club(o.club).mgr} has promised you a starting place. Keep him happy and it is yours.`, 'good');
    if (S.seasonSummary) S.seasonSummary.loanNext = false;
    msg(`Signed for ${club(o.club).name} from ${from}: ${money(o.wage)}/week for ${o.years} years.`, 'good');
    notify('good', 'Welcome to ' + club(o.club).name + '!', `You signed a ${o.years}-year deal worth ${money(o.wage)} a week.`);
    addRep(2);
  } else {
    msg(`Signed a new ${o.years}-year deal at ${money(o.wage)}/week. No more salary talks for about six months.`, 'good');
    notify('good', 'New contract signed!', `${o.years} more years at ${club(o.club).name}, ${money(o.wage)} a week.`);
    p.negLock = absWeek() + NEG_LOCK_WEEKS;
    // Signing as a starter (or key player) keeps you in the team for about 15 games, like a
    // transfer's promised place, as long as the manager doesn't turn on you (affection 30+).
    if (['Starter', 'Key Player'].includes(squadStatus())) {
      p.promise = Math.max(p.promise || 0, RENEW_PROMISE);
      msg(`${myClub().mgr} has kept you in his plans: your starting place is safe for the next ${RENEW_PROMISE} games.`, 'good');
    }
    if (o.clause) {
      const end = clauseEnd(o.clause);
      p.clauseUntil = (end + 1) * SEASON_WEEKS + 1;
      p.clauseKind = 'loyal';
      p.loyalNext = 0;
      p.negLock = Math.max(p.negLock, p.clauseUntil);
      p.offerLock = Math.max(p.offerLock || 0, p.clauseUntil);
      p.listed = false;
      msg(`"You won't regret this. We'll take care of everything else." Your loyalty clause runs until the end of ${seasonLabel(end)}: no bids from other clubs and no salary talks until then.`);
    }
    if (o.negotiated) {
      p.objHard = Math.min(.3, (p.objHard || 0) + .1);
      msg(`${myClub().mgr} expects more after your pay rise. His objectives will be a little harder.`);
    }
  }
  if (o.block) {
    p.clauseKind = 'block';
    p.clauseUntil = absWeek() + o.block * SEASON_WEEKS;
    p.clauseFee = o.blockFee;
    p.negLock = Math.max(p.negLock || 0, p.clauseUntil);
    p.offerLock = Math.max(p.offerLock || 0, p.clauseUntil);
    p.listed = false;
    p.inquiries = [];
    msg(`Release clause: for ${o.block} year${o.block > 1 ? 's' : ''} ${club(o.club).name} will block any move and salary talks. Clubs can still reach you through your agent, and breaking the clause costs ${money(o.blockFee)}.`);
  }
  p.wage = o.wage;
  p.peakWage = Math.max(p.peakWage || 0, o.wage);
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
  // Saying no to a loyalty deal stings a little, and the club waits three months before thinking about it again.
  if (o && o.clause) {
    S.player.loyalNext = absWeek() + LOYAL_GAP;
    msg(`${myClub().mgr} and the board are a little hurt that you turned down their loyalty deal. Manager −4, board −4.`, 'bad');
    notify('bad', 'They were hoping for a yes', `"We understand... but we really thought you felt the same way about us." ${myClub().mgr} and the board are slightly disappointed (manager −4, board −4).`);
  } else if (o && o.type === 'renew') msg(`You turned down ${myClub().name}'s new contract. The manager and board are slightly unhappy (−4 each).`, 'bad');
  // Turning down other clubs shows loyalty, especially rivals.
  if (o && o.type === 'transfer' && !S.player.needsContract) changeAff(isRival(club(o.club)) ? 5 : 2);
  // Turning down an eager club's second try ends it: no more chances for six months.
  if (o && o.type === 'transfer') S.player.declined = { ...(S.player.declined || {}), [o.club]: { until: absWeek() + DECLINE_WEEKS, eager: !o.again && Math.random() < EAGER } };
  S.offers = S.offers.filter(x => x.id !== id);
  save();
}

const inWindow = () => S.phase === 'offseason' || (S.week >= JAN_WINDOW[0] && S.week <= JAN_WINDOW[1]);

// Hand in a transfer request: the manager and the board take it badly, but clubs hear you are available.
function requestTransfer() {
  const p = S.player;
  if (p.listed || p.loan || clauseActive()) return false;
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
  const why = p.board >= 40 && effAff() >= 50 ? renewalRefusal() : null;
  if (why) {
    msg(`${myClub().name} won't offer a new contract ${why}. They'll see how your season goes.`, 'bad');
    save();
    return 'tooOld';
  }
  if (p.renewTask) return 'task';
  if (p.board >= 40 && effAff() >= 50) {
    if (Math.random() >= .8) {
      setRenewTask();
      msg(`${myClub().name} are not ready to offer a new deal yet. The board wants ${renewTaskText(p.renewTask)} in the next 8 weeks: do it and the contract is yours.`, 'bad');
      save();
      return 'challenge';
    }
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

// Goals + assists a season needs before the review lifts your OVR. Attackers need 10;
// deeper roles need fewer. Keepers are judged on their ratings instead.
const GA_PAR = { ST: 10, LW: 10, RW: 10, CAM: 10, LM: 8, RM: 8, CM: 6, CDM: 4, LB: 4, RB: 4, CB: 2 };

// End-of-season OVR review. For outfield players goals and assists decide it: under half of par
// costs OVR, under par holds it, and every G/A over par lifts it more. Ratings, awards and
// injuries adjust it.
function performanceReview(st, avg, awards) {
  const p = S.player, age = ageOf(p.by), notes = [], ovr = calcOVR(), L = league(myClub().league);
  const ga = st.goals + st.assists + (st.cup ? st.cup.goals + st.cup.assists : 0), par = GA_PAR[p.pos];
  let d = 0;
  if (st.apps >= 10 && !par) {
    d += avg >= 7.5 ? 1.5 : avg >= 7 ? .8 : avg >= 6.5 ? .2 : avg >= 6 ? -.6 : -1.2;
    notes.push(`${avg.toFixed(2)} average rating`);
    // Keepers are also judged on clean sheets and saves per game, like outfield players on G/A.
    const apps = st.apps + (st.cup ? st.cup.apps : 0), cs = (st.cleanAll || 0) / Math.max(1, apps), sv = (st.saves || 0) / Math.max(1, apps);
    const keep = (cs >= .45 ? 1.8 : cs >= .35 ? 1.2 : cs >= .25 ? .6 : cs >= .15 ? .2 : 0) + (sv >= 3.5 ? .6 : sv >= 2.5 ? .3 : 0);
    if (keep) { d += keep; notes.push(`${st.cleanAll || 0} clean sheets, ${st.saves || 0} saves`); }
  } else if (st.apps >= 10) {
    // Numbers count for less in the lower leagues.
    const w = L.tier === 1 ? leagueWeight(L) : L.tier === 2 ? .7 : .5;
    const gd = ga >= par ? Math.min(4.5, .3 + (ga - par) * .15) * w : ga >= par / 2 ? 0 : -.8;
    d += gd;
    notes.push(`${ga} goals + assists (par ${par})`);
    const r = avg >= 7.5 ? .4 : avg >= 7 ? .2 : avg < 6.2 ? -.4 : 0;
    if (r) { d += r; notes.push(`${avg.toFixed(2)} average rating`); }
  } else if (age >= 22 && !st.missed) { d -= .6; notes.push('too few games'); }
  awards.forEach(a => { const v = awardValue(a); if (v) { d += v; notes.push(a); } });
  d = Math.min(d, 5);
  // Gains shrink after 30 and on the way to 91; teenagers are judged gently, older players harder.
  const ageF = age <= 25 ? 1 : age <= VET_AGE ? .9 : Math.max(.1, .5 - (age - VET_AGE - 1) * .1);
  d = d > 0 ? d * ageF * clamp((MAX_OVR - ovr) / 8, .2, 1) * (p.pos === 'GK' ? GK_GROWTH : 1) * PERF_GAIN : d * (age <= 20 ? .3 : declineFactor(age));
  // Injuries: missing a quarter of the league games always costs OVR, more the longer you
  // were out and the older you are. A shorter spell out only hurts if you came back below par.
  const games = (league(myClub().league).clubs.length - 1) * 2, missed = st.missed || 0, share = games ? missed / games : 0;
  // A long lay-off also takes the shine off a good season: the gain shrinks with the share of
  // games missed (a third of the season out roughly halves it).
  if (d > 0 && share >= .1) d *= clamp(1 - share * 1.6, .3, 1);
  if (share >= .25) {
    // On top of a still-positive season the lay-off costs half as much; otherwise in full.
    d -= (1 + (share - .25) * 6) * declineFactor(age) * (age <= 21 ? .6 : 1) * (d > 0 ? .5 : 1);
    notes.push(`missed ${missed} games injured`);
  } else if (missed >= 3 && st.apps >= 5 && avg < 6.9) {
    d -= (avg < 6.5 ? .6 : .3) * declineFactor(age);
    notes.push(`below par after ${missed} games out injured`);
  } else if (missed >= 5) notes.push(`bounced back from ${missed} games out injured`);
  if (d > 0) d = Math.min(d, Math.max(0, MAX_OVR - ovr));
  nudgeOvr(d);
  return { change: Math.round(d * 10) / 10, notes };
}

// ---------- individual accolades ----------
// The Ballon d'Or and friends are decided against the best players in the world (the AI
// squads), on rating, goals, assists and team success.
const GOLDEN_SHOE_COEF = { ENG: 2, ESP: 2, ITA: 2, GER: 2, FRA: 2, POR: 1.5, NED: 1.5, TUR: 1.5 };
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
  let base = (ovr - 84) * 2.2 + (tot.goals * .8 + tot.cup.goals * .4 + tot.assists * .45 + tot.cup.assists * .25 + (tot.apps >= 15 ? (avg - 7) * 4 : -10) + clean) * w + team - 4;
  // Voters want a player who was there all season: a few weeks out dents the case a little
  // (a quarter of the season or more rules you out altogether, see longInjury).
  const games = (league(myClub().league).clubs.length - 1) * 2, share = games ? (tot.missed || 0) / games : 0;
  if (share > .1) base = (base > 0 ? base * clamp(1 - share, .5, 1) : base) - share * 10;
  return { n: p.name, club: p.club, pos: p.pos, age: ageOf(p.by), base, r: ovr, me: true, euro: !!GOLDEN_SHOE_COEF[league(myClub().league).nat] };
}

// Out injured for a quarter of the league season or more.
const longInjury = tot => { const g = (league(myClub().league).clubs.length - 1) * 2; return g > 0 && (tot.missed || 0) / g >= .25; };

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
  // A long lay-off rules you out of the Ballon d'Or, The Best and the World 11 entirely.
  const out = longInjury(tot), field = out ? all : [...all, me];
  const ballon = rankFor(field);
  const myRank = ballon.findIndex(c => c.me) + 1;
  award("Ballon d'Or", ballon, myRank > 1 && myRank <= 30 ? `You finished ${myRank}${ordinal(myRank)}` : out ? 'You were out of the running after a long injury' : '');
  award('The Best FIFA Men\'s Player', rankFor(field));
  if (!out && rankFor([...all, me], 3).findIndex(c => c.me) < 11 && me.base > -5) mine.push('FIFPRO World 11');
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
  const give = (short, full, rep) => { awards.push(short); p.awards.push({ name: full, season: S.season }); addRep(rep); };
  if (pos === 1) { awards.push(`${L.name} champion`); p.trophies.push({ name: L.name, club: c.name, season: S.season }); addRep(6); }
  const scorers = topScorers(lid, 1);
  if (scorers[0] && scorers[0].me) give('Golden Boot', `${L.name} Golden Boot`, 4);
  const assisters = topAssists(lid, 1);
  if (assisters[0] && assisters[0].me) give('Top Assists', `${L.name} Top Assists`, 3);
  // England's awards are the PFA's; elsewhere the league names its own.
  const pfa = L.nat === 'ENG' && L.tier === 1;
  // Out for a quarter of the league season or more: no Player or Team of the Season, no Ballon d'Or,
  // The Best or FIFPRO World 11, however good the games you did play were.
  const longOut = longInjury(tot);
  if (longOut) awards.push(`Missed ${tot.missed} league games: out of the running for the big individual awards`);
  if (!longOut && tot.apps >= 20 && avg >= 7.8) give(pfa ? 'PFA Player of the Year' : 'Player of the Season', pfa ? 'PFA Player of the Year' : `${L.name} Player of the Season`, 4);
  else if (age <= 21 && tot.apps >= 15 && avg >= 7.1) give(pfa ? 'PFA Young Player of the Year' : 'Young Player of the Season', pfa ? 'PFA Young Player of the Year' : `${L.name} Young Player`, 3);
  if (!longOut && tot.apps >= 18 && avg >= 7.3) give('Team of the Season', `${L.name} Team of the Season`, 1);
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
  S.seasonSummary = { season: S.season, club: c.name, clubs, pos, apps: tot.apps, goals: tot.goals, assists: tot.assists, avg, awards, ovrStart: S.ovrSeasonStart || ovr, ovrEnd: ovr, clean: tot.clean, cleanAll: tot.cleanAll || 0, saves: tot.saves || 0, starts: st.starts, missed: tot.missed, loanNext: false, returning: false, cup: tot.cup, review, honours: acc.honours };

  // Ageing for the player (applied at the birthday that comes with the new season).
  // Nothing until 33; from the 34th birthday a gradual fade that steepens from 38 (slower in Saudi
  // Arabia and the MLS, and with good kit). Pace and reflexes go a little quicker than the rest.
  const nextAge = age + 1, sum = S.seasonSummary, rawBefore = rawOVR();
  if (nextAge > VET_AGE) {
    const rate = (BIRTHDAY_DROP[nextAge] || 6 + (nextAge - 39) * 1.5) * (1 - .06 * p.equip) * vetLeagueEase();
    attrKeys(p.pos).forEach(k => {
      const fast = ['PAC', 'REF'].includes(k) ? 1.3 : 1;
      p.attrs[k] = clamp(p.attrs[k] - rand(.8, 1.2) * rate * fast, 20, 99);
    });
  }
  // The review screen explains the change: matches and training, the review, and ageing.
  sum.ovrPreAge = ovr;
  sum.ovrEnd = calcOVR();
  sum.ageTo = nextAge;
  sum.ageLoss = Math.round((rawBefore - rawOVR()) * 10) / 10;
  sum.rawEnd = Math.round(rawOVR() * 10) / 10;
  sum.seasonGain = ovr - (S.ovrSeasonStart || ovr) - Math.round(review.change);
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
  S.offerRerolls = 3;
  if (p.years <= 0) {
    if (p.loan) endLoan();
    S.offers = [];
    S.seasonSummary.loanNext = false;
    p.needsContract = true;
    p.clauseUntil = 0;
    p.inquiries = [];
    const home = myClub();
    const wanted = (effAff() >= 35 && p.board >= 30) || squadStatus() === 'Key Player';
    const why = wanted ? renewalRefusal() : null;
    if (why) {
      msg(`Your contract has expired. ${home.name} have decided not to renew it ${why}. Find a new club or retire.`, 'bad');
      notify('bad', 'No new contract', `${home.name} won't renew your contract ${why}. Look at the other offers, or call it a day.`);
    } else if (wanted) {
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
  p.frozen = false;
  syncHousing();
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
  p.frozen = false;
  syncHousing();
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
  // Only club legends get the big send-off.
  const rec = retiredRecord(), legends = clubLegacy(rec).filter(c => c.legend).map(c => c.club), traits = knownFor(rec).join(' and ');
  if (legends.length) {
    msg(`You have announced your retirement. You are well known for your ${traits}.`, 'good');
    legends.forEach(n => msg(`${n} have named you a club legend.`, 'good'));
    notify('good', 'Retirement announced', `You have announced your retirement. You are well known for your ${traits}. You retire as a ${legends.join(' and ')} legend.`);
  } else msg('You have retired from professional football.');
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
  // Wages below the new minimum (a little above the cheapest rent in the country) are raised to it.
  if (p.club && !p.needsContract && !p.loan && p.wage < minWage(myClub())) p.wage = minWage(myClub());
  // Sponsor fees were cut hard: rescale deals and requests signed at the old rates.
  if (!p.sponsorV2) {
    const fix = d => { const lv = SPONSOR_LEVELS.find(l => l.name === d.level); if (!lv) return; d.weekly = Math.round(d.weekly * lv.base / lv.old / 10) * 10; if (d.goalBonus) d.goalBonus = Math.round(d.weekly * .1 / 10) * 10; };
    (p.sponsors || []).forEach(fix);
    (p.sponsorReqs || []).forEach(fix);
    delete p.sponsorMarket;
    p.sponsorV2 = true;
  }
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
  // A summer transfer made before this fix may have left you in your old club's tournament.
  if (p.club && S.phase === 'offseason') syncSummerClub();
  // Saudi and MLS bids for a veteran made before they all paid prime wages.
  if (vetYears() > 0 && !freeAgent()) (S.offers || []).forEach(o => { if (!o.prime && S.clubs[o.club] && richLeague(club(o.club))) { o.wage = Math.max(o.wage, vetRichWage(o.type)); o.prime = true; } });
  // Free agents get market-value offers only: take back any prime-wage bids from before this rule.
  if (freeAgent()) (S.offers || []).forEach(o => { if ((o.prime || oldFreeAgent()) && S.clubs[o.club]) { const f = makeOffer(club(o.club), o.type); o.wage = f.wage; delete o.prime; } });
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
  // Older formats that haven't kicked off yet switch to the current UEFA league phase.
  else if (S.euro && S.phase === 'season' && S.week <= EURO_WEEKS[0] && Object.values(S.euro).every(t => t.stage === 0 && t.draw !== EURO_DRAW)) S.euro = buildEuro();
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
// ---------- legacy ----------
// Per club across a whole career (loans left out): seasons, apps, G/A and league titles. A club
// names you a legend after more than 5 seasons, 100+ goals and assists and more than 150 games.
// Keepers need 100 clean sheets (all competitions) there instead of 100 goals and assists.
// Playing for both sides of a rivalry (say Real Madrid and Barcelona) rules you out as a legend at both.
const LEGEND = { seasons: 5, ga: 100, clean: 100, apps: 150 };
function clubLegacy(rec) {
  const byClub = {}, gk = POS_GROUP[rec.pos] === 'GK';
  rec.career.filter(r => !/\(loan\)/.test(r.club)).forEach(r => {
    const c = byClub[r.club] = byClub[r.club] || { club: r.club, clubId: r.clubId, seasons: new Set(), apps: 0, goals: 0, assists: 0, clean: 0, titles: {} };
    c.seasons.add(r.season); c.apps += r.apps; c.goals += r.goals; c.assists += r.assists; c.clean += r.cleanAll || 0;
    // A league title is a trophy named after the league that club played in that season.
    (rec.trophies || []).filter(t => t.season === r.season && t.club === r.club && t.name === r.league).forEach(t => { c.titles[t.name] = (c.titles[t.name] || 0) + 1; });
  });
  const names = Object.keys(byClub), rivalsOf = n => names.filter(m => m !== n && RIVALRIES.some(([x, y]) => (x === n && y === m) || (x === m && y === n)));
  return Object.values(byClub).map(c => {
    const earned = c.seasons.size > LEGEND.seasons && (gk ? c.clean >= LEGEND.clean : c.goals + c.assists >= LEGEND.ga) && c.apps > LEGEND.apps, rivals = rivalsOf(c.club);
    return { ...c, seasons: c.seasons.size, ga: c.goals + c.assists, gk, rivals, earned, legend: earned && !rivals.length };
  })
    .sort((a, b) => b.apps - a.apps);
}

// What the world remembers you for, from your career numbers and position.
// Defenders averaging 8+ tackles a game: defending. Keepers with 200+ clean sheets: goalkeeping.
const KNOWN = { tackles: 8, clean: 200 };
function careerTackleAvg(rec) {
  const rows = rec.career.filter(r => r.tackles != null && r.apps);
  const apps = rows.reduce((s, r) => s + r.apps, 0);
  return apps ? rows.reduce((s, r) => s + r.tackles, 0) / apps : 0;
}
const careerCleanSheets = rec => rec.career.reduce((s, r) => s + (r.cleanAll || 0), 0);
function knownFor(rec) {
  const g = rec.career.reduce((s, r) => s + r.goals, 0), a = rec.career.reduce((s, r) => s + r.assists, 0), apps = rec.career.reduce((s, r) => s + r.apps, 0);
  const group = POS_GROUP[rec.pos], out = [];
  if (group === 'GK') return careerCleanSheets(rec) > KNOWN.clean ? ['goalkeeping'] : ['reliability'];
  if (group === 'DEF' && careerTackleAvg(rec) >= KNOWN.tackles) {
    out.push('defending');
    // A defender is only remembered for attacking too if they chipped in plenty.
    if (!apps || (g + a) / apps < .3) return out;
  }
  if (['LW', 'RW', 'LM', 'RM'].includes(rec.pos) && apps && (g + a) / apps >= .4) out.push('pace');
  out.push(g >= a * 1.3 ? 'shooting' : 'passing and playmaking');
  return out;
}

// Ballon d'Or wins with the club you finished that season at.
function ballonDors(rec) {
  return (rec.awards || []).filter(x => x.name === "Ballon d'Or").map(x => {
    const row = rec.career.filter(r => r.season === x.season).pop();
    return { season: x.season, club: row ? row.club.replace(' (loan)', '') : '' };
  });
}

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
