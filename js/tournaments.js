// Cups: European club competitions during the season, and summer tournaments
// (Club World Cup, World Cup, Euro, Copa América, Asian Cup). No DOM code here.

// Nations that only appear in tournaments (not offered as a player nationality).
const EXTRA_NATIONS = {
  ECU: 'Ecuador', CHI: 'Chile', PER: 'Peru', PAR: 'Paraguay', VEN: 'Venezuela', BOL: 'Bolivia',
  PAN: 'Panama', CRC: 'Costa Rica', JAM: 'Jamaica',
  IRN: 'Iran', KSA: 'Saudi Arabia', QAT: 'Qatar', IRQ: 'Iraq', UAE: 'UAE', UZB: 'Uzbekistan', JOR: 'Jordan',
  ALG: 'Algeria', TUN: 'Tunisia', RSA: 'South Africa',
  MLI: 'Mali', BFA: 'Burkina Faso', COD: 'DR Congo', GUI: 'Guinea', CPV: 'Cape Verde', GAB: 'Gabon', ANG: 'Angola', ZAM: 'Zambia',
};
const natName = k => NATIONS[k] || EXTRA_NATIONS[k] || k;

// Names for the generated players of national teams and Club World Cup sides: a few more pools,
// and nations that share a language borrow a neighbour's.
Object.assign(NAME_POOLS, {
  NOR: [['Erik', 'Martin', 'Kristoffer', 'Jonas', 'Sander', 'Magnus', 'Fredrik', 'Oscar', 'Andreas', 'Mathias'], ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Nilsen', 'Berg', 'Haugen', 'Lindqvist', 'Eriksson']],
  CRO: [['Luka', 'Ivan', 'Marko', 'Josip', 'Mateo', 'Nikola', 'Filip', 'Dominik', 'Ante', 'Stefan'], ['Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić', 'Petrović', 'Jovanović', 'Nikolić', 'Pavlović', 'Knežević']],
  POL: [['Jakub', 'Kacper', 'Bartosz', 'Mateusz', 'Oleksandr', 'Andriy', 'Mykola', 'Piotr', 'Kamil', 'Viktor'], ['Kowalski', 'Nowak', 'Wiśniewski', 'Lewandowski', 'Shevchenko', 'Bondarenko', 'Kovalenko', 'Zieliński', 'Tkachenko', 'Wójcik']],
  JPN: [['Takumi', 'Kaoru', 'Daichi', 'Ritsu', 'Wataru', 'Ko', 'Hiroki', 'Yuki', 'Kento', 'Ayumu'], ['Tanaka', 'Suzuki', 'Sato', 'Ito', 'Watanabe', 'Kubo', 'Endo', 'Mitoma', 'Nakamura', 'Yamamoto']],
  KOR: [['Min-jae', 'Heung-min', 'Kang-in', 'Hee-chan', 'Jae-sung', 'Seung-ho', 'Ji-sung', 'Woo-young', 'Gue-sung', 'Young-woo'], ['Kim', 'Lee', 'Park', 'Hwang', 'Jeong', 'Cho', 'Seol', 'Paik', 'Oh', 'Yang']],
  CHN: [['Wei', 'Lei', 'Hao', 'Jun', 'Yang', 'Xi', 'Bin', 'Tao', 'Chen', 'Long'], ['Wang', 'Li', 'Zhang', 'Liu', 'Wu', 'Zhao', 'Huang', 'Zhou', 'Xu', 'Sun']],
  IDN: [['Rizky', 'Arhan', 'Marselino', 'Witan', 'Nguyen', 'Theerathon', 'Safawi', 'Hariss', 'Quang', 'Supachai'], ['Pratama', 'Ferdinan', 'Sulaeman', 'Hai', 'Bunmathan', 'Rasid', 'Harun', 'Chanathip', 'Saputra', 'Van Toan']],
  NGA: [['Victor', 'Ademola', 'Samuel', 'Wilfred', 'Thomas', 'Kelechi', 'Mohammed', 'Jordan', 'Patson', 'Percy'], ['Osimhen', 'Lookman', 'Chukwueze', 'Ndidi', 'Partey', 'Iheanacho', 'Kudus', 'Ayew', 'Daka', 'Tau']],
  IRN: [['Mehdi', 'Sardar', 'Alireza', 'Saman', 'Eldor', 'Abbosbek', 'Ali', 'Milad', 'Otabek', 'Ehsan'], ['Taremi', 'Azmoun', 'Jahanbakhsh', 'Ghoddos', 'Shomurodov', 'Fayzullaev', 'Gholizadeh', 'Mohammadi', 'Shukurov', 'Hajsafi']],
});
[['ENG', 'SCO WAL IRL CAN AUS JAM'], ['GER', 'SUI AUT'], ['NOR', 'SWE DEN'], ['CRO', 'SRB'], ['POL', 'UKR'], ['ARG', 'URU PAR CHI BOL'], ['ESP', 'COL ECU PER VEN MEX PAN CRC'],
  ['IDN', 'MAS SGP THA VIE'], ['KSA', 'QAT IRQ UAE JOR EGY ALG TUN MAR'], ['SEN', 'MLI GUI BFA'], ['CIV', 'CMR COD GAB CPV ANG'], ['NGA', 'GHA ZAM RSA'], ['IRN', 'UZB']]
  .forEach(([from, list]) => list.split(' ').forEach(n => { NAME_POOLS[n] = NAME_POOLS[n] || NAME_POOLS[from]; }));

// Rough national-team strength (average of the best XI), 2025-26.
const NATION_STR = {
  ESP: 87, FRA: 86, ENG: 86, ARG: 86, POR: 85, BRA: 84, GER: 83, NED: 83, ITA: 82, BEL: 81,
  CRO: 80, URU: 80, COL: 80, MAR: 79, NOR: 79, DEN: 78, SUI: 78, SEN: 78, AUT: 78, TUR: 78,
  USA: 77, MEX: 77, JPN: 77, ECU: 77, CIV: 77, SWE: 76, POL: 76, SRB: 76, UKR: 76, KOR: 76, NGA: 76,
  SCO: 75, CAN: 75, EGY: 75, PAR: 75, ALG: 75, CMR: 74, IRN: 74, CHI: 74, WAL: 73, IRL: 73, GHA: 73, AUS: 73,
  TUN: 72, PER: 72, KSA: 71, VEN: 71, PAN: 71, RSA: 70, UZB: 70, CRC: 70, QAT: 69, IRQ: 68, JOR: 68, JAM: 68,
  UAE: 67, BOL: 67, CHN: 64, IDN: 64, THA: 63, VIE: 62, MAS: 61, SGP: 55,
  MLI: 73, COD: 73, BFA: 72, GUI: 70, CPV: 69, GAB: 69, ANG: 68, ZAM: 67,
};

const CONFED = {
  UEFA: ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BEL', 'SCO', 'WAL', 'IRL', 'NOR', 'SWE', 'DEN', 'SUI', 'AUT', 'CRO', 'SRB', 'POL', 'TUR', 'UKR'],
  CONMEBOL: ['BRA', 'ARG', 'URU', 'COL', 'ECU', 'CHI', 'PER', 'PAR', 'VEN', 'BOL'],
  CONCACAF: ['USA', 'MEX', 'CAN', 'PAN', 'CRC', 'JAM'],
  AFC: ['JPN', 'KOR', 'CHN', 'MAS', 'SGP', 'IDN', 'THA', 'VIE', 'AUS', 'IRN', 'KSA', 'QAT', 'IRQ', 'UAE', 'UZB', 'JOR'],
  CAF: ['NGA', 'SEN', 'CIV', 'GHA', 'MAR', 'EGY', 'CMR', 'ALG', 'TUN', 'RSA', 'MLI', 'COD', 'BFA', 'GUI', 'CPV', 'GAB', 'ANG', 'ZAM'],
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

// European club competitions, the current UEFA format: 36 clubs in one league table, each playing
// 8 different opponents drawn from four pots (two from each pot, four at home and four away,
// nobody from their own country and at most two from any other). The top 8 go straight to the
// round of 16, 9th to 24th play a two-legged knockout play-off, 25th and below are out. The
// knockouts are two-legged up to the semi-finals; the final is one game. Played midweek.
const EURO_COMPS = [
  { key: 'UCL', name: 'Champions League' },
  { key: 'UEL', name: 'Europa League' },
  { key: 'UECL', name: 'Conference League' },
];
const EURO_TEAMS = 36, LEAGUE_MDS = 8, EURO_DRAW = 2;
const EURO_WEEKS = [3, 5, 7, 11, 13, 16, 19, 24, 28, 30, 31, 34, 35, 36, 37, 38, 44];
// The old 16-team group format, for competitions already under way in older saves.
const OLD_EURO_WEEKS = [5, 8, 11, 14, 17, 20, 30, 36, 44];
const euroWeeks = t => t.weeks || OLD_EURO_WEEKS;
const EURO_NATS = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BEL', 'TUR']; // UEFA ranking order
const EURO_WEIGHT = { ENG: 1.25, ESP: 1.25, ITA: 1.25, GER: 1.25, FRA: 1 }; // the rest .75

// Domestic cups, one midweek round at a time. Weeks never clash with Europe or each other:
// main = the big knockout cup (FA Cup, Copa del Rey...), league = league cup, super = super cup
// (2 teams, or 4 for the Spanish/Italian/Saudi format), playoff = MLS Cup playoffs.
const CUP_WEEKS = { main: [9, 15, 21, 27, 33, 39, 43], league: [2, 4, 6, 10, 12, 18, 26], super2: [1], super4: [22, 23], playoff: [40, 42, 45, 46] };
const DOMESTIC = {
  ENG: [{ key: 'FAC', name: 'FA Cup', type: 'main', tiers: 3 }, { key: 'EFL', name: 'Carabao Cup', type: 'league', tiers: 3 }, { key: 'SHIELD', name: 'Community Shield', type: 'super2' }],
  ESP: [{ key: 'CDR', name: 'Copa del Rey', type: 'main', tiers: 3 }, { key: 'SCE', name: 'Supercopa de España', type: 'super4' }],
  ITA: [{ key: 'CIT', name: 'Coppa Italia', type: 'main', tiers: 2 }, { key: 'SCI', name: 'Supercoppa Italiana', type: 'super4' }],
  GER: [{ key: 'DFB', name: 'DFB-Pokal', type: 'main', tiers: 3 }, { key: 'DFL', name: 'DFL-Supercup', type: 'super2' }],
  FRA: [{ key: 'CDF', name: 'Coupe de France', type: 'main', tiers: 3 }, { key: 'TDC', name: 'Trophée des Champions', type: 'super2' }],
  POR: [{ key: 'TDP', name: 'Taça de Portugal', type: 'main', tiers: 3 }, { key: 'TDL', name: 'Taça da Liga', type: 'league', tiers: 2 }, { key: 'STP', name: 'Supertaça', type: 'super2' }],
  NED: [{ key: 'KNVB', name: 'KNVB Cup', type: 'main', tiers: 3 }, { key: 'JCS', name: 'Johan Cruyff Shield', type: 'super2' }],
  BEL: [{ key: 'BCUP', name: 'Belgian Cup', type: 'main', tiers: 3 }, { key: 'BSC', name: 'Belgian Super Cup', type: 'super2' }],
  TUR: [{ key: 'TFFC', name: 'Turkish Cup', type: 'main', tiers: 3 }, { key: 'TSC', name: 'Turkish Super Cup', type: 'super4' }],
  KSA: [{ key: 'KC', name: 'King\'s Cup', type: 'main', tiers: 2 }, { key: 'SSC', name: 'Saudi Super Cup', type: 'super4' }],
  USA: [{ key: 'USOC', name: 'U.S. Open Cup', type: 'main', tiers: 3 }, { key: 'MLSC', name: 'MLS Cup', type: 'playoff' }],
};

// Summer tournaments, by the calendar year they are played in (the summer after a season).
// AFCON is played in 2027 and 2028, then every four years.
const SUMMER_EVENTS = [
  { key: 'CWC', name: 'Club World Cup', every: 4, first: 2029 },
  { key: 'WC', name: 'World Cup', every: 4, first: 2030 },
  { key: 'EURO', name: 'European Championship', every: 4, first: 2028, confed: ['UEFA'] },
  { key: 'COPA', name: 'Copa América', every: 4, first: 2028, confed: ['CONMEBOL', 'CONCACAF'] },
  { key: 'ASIA', name: 'AFC Asian Cup', every: 4, first: 2027, confed: ['AFC'] },
  { key: 'AFCON', name: 'Africa Cup of Nations', every: 4, first: 2028, also: [2027], confed: ['CAF'] },
];
// Cycles run both ways from the first listed year, so a career that starts earlier still gets them.
const eventOn = (ev, year) => (ev.also || []).includes(year) || ((year - ev.first) % ev.every + ev.every) % ev.every === 0;
function nextEventYear(ev, from) { let y = from; while (!eventOn(ev, y)) y++; return y; }

// ---------- teams ----------
// A team id is a club id ("ENG-0"), a nation ("N:ENG") or a world club ("W:3").
const isNation = id => id.startsWith('N:');
const isWorld = id => id.startsWith('W:');
const isClub = id => !isNation(id) && !isWorld(id);
function teamName(id) { return isNation(id) ? natName(id.slice(2)) : isWorld(id) ? WORLD_CLUBS[+id.slice(2)][0] : club(id).name; }
function teamCode(id) { return isNation(id) ? id.slice(2) : isWorld(id) ? shortName(WORLD_CLUBS[+id.slice(2)][0]) : club(id).short; }
function teamStr(id) { return isNation(id) ? NATION_STR[id.slice(2)] || 60 : isWorld(id) ? WORLD_CLUBS[+id.slice(2)][2] : teamStrength(club(id)); }

// The national team picks you on merit: you need a minimum level for your country, and
// if two or more of your compatriots in your position are rated higher, you miss out.
const callUpFloor = nat => clamp(Math.round((NATION_STR[nat] || 60) - 12), 50, 76);
let callUpCache = null;
function natRivals() {
  const p = S.player, ovr = calcOVR(), key = `${S.season}:${S.week}:${ovr}:${p.pos}:${p.nat}`;
  if (callUpCache && callUpCache.key === key) return callUpCache.list;
  const list = [];
  Object.values(S.clubs).forEach(c => c.players.forEach(pl => { if (pl.nat === p.nat && pl.pos === p.pos && pl.r > ovr) list.push({ n: pl.n, r: pl.r, club: c.id }); }));
  list.sort((a, b) => b.r - a.r);
  callUpCache = { key, list };
  return list;
}
const calledUp = () => calcOVR() >= callUpFloor(S.player.nat) && natRivals().length < 2;
// Out of contract you belong to no club, so its summer tournament goes on without you.
const myTeams = () => [...(S.player.needsContract ? [] : [S.player.club]), ...(calledUp() ? ['N:' + S.player.nat] : [])];

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

// League phase draw, like UEFA's: four pots of 9 by strength. Each club gets one home and one away
// game against each pot, never against its own country and at most two clubs from any other.
// Each part of the draw is a permutation found by backtracking; a dead end restarts the draw.
function leaguePhaseDraw(teams) {
  const natOf = {}, str = {};
  teams.forEach(id => { natOf[id] = league(club(id).league).nat; str[id] = teamStrength(club(id)); });
  const sorted = teams.slice().sort((a, b) => str[b] - str[a]);
  const pots = [0, 1, 2, 3].map(i => sorted.slice(i * 9, i * 9 + 9));
  // Country protection only works if no pot is full of one country: at most 2 per pot. Extra clubs
  // swap with the closest-rated club of another country in the neighbouring pot.
  const inPot = (pot, n) => pot.filter(id => natOf[id] === n).length;
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < 4 && !moved; i++) {
      const crowded = pots[i].find(id => inPot(pots[i], natOf[id]) > 2);
      if (!crowded) continue;
      for (const j of [0, 1, 2, 3].filter(j => j !== i).sort((a, b) => Math.abs(a - i) - Math.abs(b - i))) {
        const swap = pots[j].filter(id => natOf[id] !== natOf[crowded] && inPot(pots[i], natOf[id]) < 2 && inPot(pots[j], natOf[crowded]) < 2)
          .sort((a, b) => Math.abs(str[a] - str[crowded]) - Math.abs(str[b] - str[crowded]))[0];
        if (swap) { pots[i][pots[i].indexOf(crowded)] = swap; pots[j][pots[j].indexOf(swap)] = crowded; moved = true; break; }
      }
    }
    if (!moved) break;
  }
  // 16 parts: for each pair of pots (i, j), every club in pot i hosts a different club from pot j.
  // That alone gives everyone 2 opponents per pot, 4 home and 4 away. Start from random parts,
  // then keep swapping two guests within a part while it doesn't add clashes, until none are left.
  // A club's clashes: facing itself or the same club twice, its own country, more than 2 from one country.
  const teamBad = (id, opp) => {
    let bad = 0;
    const byNat = {};
    opp.forEach((o, k) => {
      if (o === id || opp.indexOf(o) !== k) bad += 10;
      if (natOf[o] === natOf[id]) bad += 10;
      byNat[natOf[o]] = (byNat[natOf[o]] || 0) + 1;
    });
    for (const n in byNat) if (byNat[n] > 2) bad += byNat[n] - 2;
    return bad;
  };
  const swapIn = (arr, from, to) => { arr[arr.indexOf(from)] = to; };
  const ITER = 25000;
  for (let restart = 0; restart < 8; restart++) {
    const parts = [], opp = {};
    teams.forEach(id => { opp[id] = []; });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const p = { hosts: pots[i], guests: shuffle(pots[j].slice()) };
      p.hosts.forEach((h, k) => { opp[h].push(p.guests[k]); opp[p.guests[k]].push(h); });
      parts.push(p);
    }
    let score = teams.reduce((s, id) => s + teamBad(id, opp[id]), 0);
    for (let it = 0; it < ITER && score > 0; it++) {
      // Annealing: early on a worse swap is sometimes kept, so the search can climb out of dead ends.
      const temp = 1.5 * (1 - it / ITER) + .05;
      const p = parts[randi(0, 15)], x = randi(0, 8), y = randi(0, 8);
      if (x === y) continue;
      const hx = p.hosts[x], hy = p.hosts[y], gx = p.guests[x], gy = p.guests[y];
      const who = [...new Set([hx, hy, gx, gy])], before = who.reduce((s, id) => s + teamBad(id, opp[id]), 0);
      const flip = () => { swapIn(opp[hx], gx, gy); swapIn(opp[hy], gy, gx); swapIn(opp[gx], hx, hy); swapIn(opp[gy], hy, hx); };
      flip();
      const after = who.reduce((s, id) => s + teamBad(id, opp[id]), 0);
      if (after <= before || Math.random() < Math.exp((before - after) / temp)) { p.guests[x] = gy; p.guests[y] = gx; score += after - before; }
      else { swapIn(opp[hx], gy, gx); swapIn(opp[hy], gx, gy); swapIn(opp[gx], hy, hx); swapIn(opp[gy], hx, hy); }
    }
    if (score === 0) return { matches: parts.flatMap(({ hosts, guests }) => hosts.map((h, k) => [h, guests[k]])), pots };
  }
  return null;
}

// Split the 144 games into 8 matchdays where every club plays once.
function splitMatchdays(matches, teams) {
  const matching = edges => {
    const by = {}, used = new Set(), pickd = [];
    teams.forEach(t => { by[t] = []; });
    edges.forEach(e => { by[e[0]].push(e); by[e[1]].push(e); });
    let steps = 0;
    const go = () => {
      if (++steps > 20000) return false;
      let best = null, opts = null;
      for (const t of teams) {
        if (used.has(t)) continue;
        const o = by[t].filter(e => !used.has(e[0]) && !used.has(e[1]));
        if (!o.length) return false;
        if (!best || o.length < opts.length) { best = t; opts = o; }
      }
      if (!best) return true;
      for (const e of shuffle(opts)) {
        used.add(e[0]); used.add(e[1]); pickd.push(e);
        if (go()) return true;
        pickd.pop(); used.delete(e[0]); used.delete(e[1]);
      }
      return false;
    };
    return go() ? pickd.slice() : null;
  };
  for (let attempt = 0; attempt < 100; attempt++) {
    let left = matches.slice();
    const rounds = [];
    for (let r = 0; r < LEAGUE_MDS; r++) {
      const m = matching(left);
      if (!m) break;
      rounds.push(m);
      left = left.filter(x => !m.includes(x));
    }
    if (rounds.length === LEAGUE_MDS) return rounds;
  }
  return null;
}

function makeLeaguePhase(key, name, teams) {
  const drawn = leaguePhaseDraw(teams), mds = drawn && splitMatchdays(drawn.matches, teams);
  // Should the draw ever fail, fall back to 8 rounds of a round robin.
  const lp = mds || (() => { const rr = roundRobin(teams); return shuffle(rr.map((_, i) => i)).slice(0, LEAGUE_MDS).sort((a, b) => a - b).map(i => rr[i]); })();
  const table = {}, form = {};
  teams.forEach(id => { table[id] = blankRow(); form[id] = []; });
  const stages = [];
  for (let k = 0; k < LEAGUE_MDS; k++) stages.push({ type: 'league', md: k, name: `League phase matchday ${k + 1}` });
  // Two legs for every knockout round but the final.
  ['Knockout play-off', 'Round of 16', 'Quarter-final', 'Semi-final'].forEach(n => [1, 2].forEach(leg => stages.push({ type: 'ko', round: n, leg, name: `${n} · ${leg === 1 ? '1st' : '2nd'} leg` })));
  stages.push({ type: 'ko', round: 'Final', name: 'Final' });
  return { key, name, season: S.season, format: 'league', draw: mds ? EURO_DRAW : 1, pots: drawn ? drawn.pots : null, groups: [teams.slice()], lp, table, form, stages, stage: 0, ko: [], winner: null, home: true, goals: 0, weeks: EURO_WEEKS };
}
const leaguePhaseTable = t => groupTable(t, 0);

function groupTable(t, g) {
  return t.groups[g].map(id => ({ id, ...t.table[id] }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

// Group winners meet runners-up from the neighbouring group: A1-B2, B1-A2, C1-D2, ...
function firstKnockout(t) {
  const ties = [];
  // League phase: 9th v 24th, 10th v 23rd... the better-placed club hosts the second leg.
  if (t.format === 'league') {
    const tb = leaguePhaseTable(t);
    for (let i = 8; i < 16; i++) ties.push([tb[i].id, tb[31 - i].id]);
    return ties;
  }
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
  // The top 8 of a league phase sit out the play-off but are still in.
  if (t.format === 'league' && stRound(st) === 'Knockout play-off' && leaguePhaseTable(t).slice(0, 8).some(r => r.id === id)) return true;
  return st.type === 'group' || st.type === 'league' || pendingTies(t).some(x => x.includes(id));
}
const stRound = st => st.round || st.name;

// The fixture a team plays in the next stage, if any.
function stageFixture(t, id) {
  const st = t.stages[t.stage];
  if (!st || t.winner) return null;
  if (st.type === 'group') {
    for (const md of t.rr) { const f = md[st.md].find(x => x.includes(id)); if (f) return f; }
    return null;
  }
  if (st.type === 'league') return t.lp[st.md].find(x => x.includes(id)) || null;
  const tie = pendingTies(t).find(x => x.includes(id));
  // In a first leg the lower-placed club is at home.
  return !tie ? null : st.leg === 1 ? [tie[1], tie[0]] : tie;
}

function pendingTies(t) {
  const st = t.stages[t.stage];
  if (!st || st.type !== 'ko') return [];
  const last = t.ko[t.ko.length - 1];
  if (last && last.name === stRound(st)) return last.ties;
  if (!last) return firstKnockout(t);
  const w = last.res.map(r => r.winner), ties = [];
  // Round of 16: the top 8 each meet a play-off winner, 1st against the winner of 16th v 17th.
  if (t.format === 'league' && last.name === 'Knockout play-off') {
    const top = leaguePhaseTable(t).slice(0, 8).map(r => r.id);
    top.forEach((id, i) => ties.push([id, w[7 - i]]));
    return ties;
  }
  for (let i = 0; i < w.length; i += 2) ties.push([w[i], w[i + 1]]);
  return ties;
}

// Play one stage of a tournament. userFor(h, a) returns the user's match object when they
// are involved. Returns the user's result for the match report.
function playStage(t, userFor) {
  const st = t.stages[t.stage];
  if (!st || t.winner) return null;
  let mine = null;
  if (st.type === 'group' || st.type === 'league') {
    (st.type === 'league' ? [t.lp] : t.rr).forEach(md => md[st.md].forEach(([h, a]) => {
      const u = userFor(h, a);
      const r = simTeams(h, a, u, t.home ? 2 : 0);
      const th = t.table[h], ta = t.table[a];
      th.p++; ta.p++; th.gf += r.gh; th.ga += r.ga; ta.gf += r.ga; ta.ga += r.gh;
      if (r.gh > r.ga) { th.w++; ta.l++; th.pts += 3; } else if (r.gh < r.ga) { ta.w++; th.l++; ta.pts += 3; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
      // Last-five form for the league phase table.
      if (t.form) { const rh = r.gh > r.ga ? 'W' : r.gh < r.ga ? 'L' : 'D'; t.form[h].push(rh); t.form[a].push(rh === 'W' ? 'L' : rh === 'L' ? 'W' : 'D'); }
      if (u) mine = r;
    }));
  } else if (st.leg === 1) {
    // First leg: the lower-placed club at home. The tie is decided next time.
    const ties = pendingTies(t), legs = [];
    ties.forEach(([s, w]) => {
      const u = userFor(w, s), r = simTeams(w, s, u, 2);
      legs.push(r);
      if (u) mine = r;
    });
    t.ko.push({ name: stRound(st), ties, res: [], legs: [legs] });
  } else if (st.leg === 2) {
    // Second leg at the better-placed club; level on aggregate goes to penalties.
    const k = t.ko[t.ko.length - 1], res = [];
    k.ties.forEach(([s, w], i) => {
      const first = k.legs[0][i], u = userFor(s, w), r = simTeams(s, w, u, 2);
      const aggS = r.gh + first.ga, aggW = r.ga + first.gh;
      if (aggS === aggW) decidePens(r, s, w);
      r.winner = aggS > aggW ? s : aggS < aggW ? w : r.pens;
      r.agg = [aggS, aggW];
      res.push({ h: s, a: w, gh: aggS, ga: aggW, pens: r.pens || null, pensScore: r.pensScore || null, winner: r.winner, legs: [first, r] });
      if (u) mine = r;
    });
    k.legs.push(res.map(x => x.legs[1]));
    k.res = res;
  } else {
    const ties = pendingTies(t), res = [];
    ties.forEach(([h, a]) => {
      const u = userFor(h, a);
      const r = simTeams(h, a, u, 0);
      if (r.gh === r.ga) decidePens(r, h, a);
      r.winner = r.gh > r.ga ? h : r.gh < r.ga ? a : r.pens;
      res.push(r);
      if (u) mine = r;
    });
    t.ko.push({ name: stRound(st), ties, res });
    if (stRound(st) === 'Final') t.winner = res[0].winner;
  }
  t.stage++;
  return mine;
}

// Penalties: the shootout you played by hand, if it was yours; otherwise close to a coin toss,
// the stronger side slightly favoured.
function decidePens(r, x, y) {
  if (r.shootout) { r.pens = r.shootout.winner; r.pensScore = r.shootout.score; r.mySo = true; delete r.shootout; return; }
  r.pens = Math.random() < clamp(.5 + (teamStr(x) - teamStr(y)) / 60, .35, .65) ? x : y;
  r.pensScore = shootoutScore(r.pens === r.h);
}

// A believable shootout score as [home, away]: usually 5–4, 4–3 or 4–2, sometimes 3–1 or 3–0,
// and about one in five goes to sudden death (6–5, 7–6, 8–7).
function shootoutScore(homeWins) {
  let w, l;
  if (Math.random() < .2) { w = randi(6, 8); l = w - 1; }
  else { w = pick([3, 4, 4, 5, 5]); l = w === 5 ? randi(3, 4) : w === 4 ? randi(2, 3) : randi(0, 1); }
  return homeWins ? [w, l] : [l, w];
}
const pensText = r => r.pensScore ? `${Math.max(...r.pensScore)}–${Math.min(...r.pensScore)}` : '';

// ---------- shootouts you take part in ----------
// A knockout game you are in is played a moment early (S.preSim), and the round then uses that same
// result. If it ends level and you are on the pitch at the final whistle, you take the shootout by
// hand first: in goal you pick which way to dive for every kick against you; as an outfield
// player you take one of your side's five kicks and pick where to put it.
const preKey = () => { const t = S.phase === 'season' ? null : summerPending(); return S.phase === 'season' ? 'w' + weekKey() : t ? `s${S.season}-${t.key}-${t.stage}` : 'none'; };

// The knockout game this step plays for you: its sides in the order they are simulated, the home
// advantage and, in a second leg, the first leg. null when it is not a knockout game.
function myKoGame() {
  if (S.phase === 'season') {
    const now = midweekNow();
    if (!now) return null;
    const { efx, user } = now, me = S.player.club;
    if (!efx.euro) return { h: efx.home, a: efx.away, home: 1.5, user: { ...user, team: me }, me };
    return koOf(efx.t, me, { ...user, team: me });
  }
  const t = summerPending();
  if (!t) return null;
  return koOf(t, t.mine, { ...summerPick(t.mine), goals: 0, assists: 0, team: t.mine }, true);
}
function koOf(t, me, user, summer = false) {
  const st = t.stages[t.stage];
  if (!st || st.type !== 'ko') return null;
  const f = stageFixture(t, me);
  if (!f) return null;
  let first = null;
  if (st.leg === 2) { const k = t.ko[t.ko.length - 1]; first = k.legs[0][k.ties.findIndex(x => x[0] === f[0] && x[1] === f[1])]; }
  return { h: f[0], a: f[1], home: st.leg ? 2 : 0, user, me, first, leg1: st.leg === 1, summer };
}

// Play your knockout game early. Returns the shootout to take by hand, or null.
function prepareShootout() {
  const key = preKey();
  if (S.preSim && S.preSim.key === key) return S.preSim.so && !S.preSim.so.done ? S.preSim.so : null;
  S.preSim = null;
  const g = myKoGame();
  if (!g) return null;
  const u = { ...g.user };
  const r = simTeams(g.h, g.a, u, g.home);
  S.preSim = { key, h: g.h, a: g.a, r, goals: u.goals, assists: u.assists, base: g.summer ? g.user : null };
  const level = !g.leg1 && (g.first ? r.gh + g.first.ga === r.ga + g.first.gh : r.gh === r.ga);
  // You only take part if you are still on the pitch at the final whistle.
  if (!level || !u.mins || (u.start && u.mins < 90)) return null;
  const p = S.player, opp = g.me === g.h ? g.a : g.h;
  S.preSim.so = { me: g.me, opp, meHome: g.me === g.h, gk: matchPos() === 'GK', meFirst: Math.random() < .5, myKick: randi(1, 5), mine: [], theirs: [], log: [], done: false };
  return S.preSim.so;
}

const SO_COLS = ['left', 'centre', 'right'], SO_ROWS = ['high', 'low'], KEEPER_WENT = ['went left', 'stayed in the middle', 'went right'];
// Whose kick is next ('mine' or 'theirs'), and whether you take part in it ('shoot' or 'save').
function soNext(so) {
  const k = so.mine.length + so.theirs.length, mineNow = (k % 2 === 0) === so.meFirst;
  const side = mineNow ? 'mine' : 'theirs', round = so[side].length;
  const you = mineNow ? (!so.gk && round === so.myKick - 1 ? 'shoot' : null) : (so.gk ? 'save' : null);
  return { side, round, you };
}
// Over yet? Within the first five each, once one side can't catch up; then sudden death.
function soCheck(so) {
  const gm = so.mine.filter(Boolean).length, gt = so.theirs.filter(Boolean).length, nm = so.mine.length, nt = so.theirs.length;
  const over = nm <= 5 && nt <= 5 ? gm > gt + (5 - nt) || gt > gm + (5 - nm) || (nm === 5 && nt === 5 && gm !== gt) : nm === nt && gm !== gt;
  if (!over) return;
  so.done = true;
  so.winner = gm > gt ? so.me : so.opp;
  so.score = so.meHome ? [gm, gt] : [gt, gm];
}
// Take the next kick. choice: { col, row } when you shoot, { col } when you dive; ignored otherwise.
function soKick(so, choice) {
  if (so.done) return null;
  const { side, you } = soNext(so), p = S.player, ovr = calcOVR();
  const kickStr = teamStr(side === 'mine' ? so.me : so.opp), saveStr = teamStr(side === 'mine' ? so.opp : so.me);
  let goal, text;
  if (you === 'shoot') {
    // The keeper guesses a side; the centre is the gamble he rarely stays for.
    const dive = weightedPick([0, 1, 2], c => [.42, .16, .42][c]), high = choice.row === 0;
    if (Math.random() < (high ? .13 : .04) * (choice.col === 1 ? .5 : 1) * clamp(1.6 - ovr / 100, .7, 1.2)) { goal = false; text = high ? 'You blazed it over the bar!' : 'You dragged it wide of the post!'; }
    else if (dive === choice.col && Math.random() < (choice.col === 1 ? (high ? .5 : .9) : high ? .3 : .72) * clamp(saveStr / 78, .85, 1.12)) { goal = false; text = `The keeper ${KEEPER_WENT[dive]} and saved it!`; }
    else { goal = true; text = dive === choice.col ? `The keeper ${KEEPER_WENT[dive]} but couldn't keep it out. Goal!` : (dive === 1 ? `The keeper stayed in the middle. Goal!` : `The keeper went ${SO_COLS[dive]}. You sent him the wrong way. Goal!`); }
  } else if (you === 'save') {
    const col = weightedPick([0, 1, 2], c => [.4, .2, .4][c]), row = Math.random() < .45 ? 0 : 1;
    const where = col === 1 ? `${SO_ROWS[row]} down the middle` : `${SO_ROWS[row]} and ${SO_COLS[col]}`;
    if (Math.random() < (row === 0 ? .1 : .04)) { goal = false; text = `They went ${where}... and missed the target!`; }
    else if (choice.col === col && Math.random() < (col === 1 ? (row === 0 ? .5 : .85) : row === 0 ? .35 : .7) * clamp(ovr / 78, .85, 1.15)) { goal = false; text = `They went ${where}. You read it and saved it!`; }
    else { goal = true; text = choice.col === col ? `They went ${where}. You got a hand to it, but it went in.` : `They went ${where}; ${choice.col === 1 ? `you stayed in the middle` : `you dived ${SO_COLS[choice.col]}`}. Goal.`; }
  } else {
    goal = Math.random() < clamp(.76 + (kickStr - saveStr) / 100, .62, .88);
    text = `${teamName(side === 'mine' ? so.me : so.opp)}: ${goal ? 'scored' : pick(['saved', 'missed', 'hit the post'])}.`;
  }
  so[side].push(goal);
  so.log.push({ side, goal, you, text });
  soCheck(so);
  return so.log[so.log.length - 1];
}

// One match between any two teams. home is the home advantage in rating points.
function simTeams(h, a, user, home = 2) {
  const p = S.player;
  // Your knockout game, already played a moment early so a shootout could be taken by hand.
  const pre = S.preSim;
  if (user && pre && pre.h === h && pre.a === a && pre.key === preKey()) {
    S.preSim = null;
    user.goals = pre.goals; user.assists = pre.assists;
    const r = JSON.parse(JSON.stringify(pre.r));
    if (pre.so && pre.so.done) r.shootout = { winner: pre.so.winner, score: pre.so.score };
    return r;
  }
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
  const scorers = [], onPitch = userMinutes(user);
  // A teammate who set it up, never the scorer.
  const helper = (id, n) => { for (let k = 0; k < 4; k++) { const x = scorerName(id); if (x !== n) return x; } return null; };
  const credit = (id, goals, mine) => {
    const str = mine ? (mineHome ? sh : sa) : 0;
    for (let i = 0; i < goals; i++) {
      let goal = null;
      if (mine && user.mins) {
        const pGoal = clamp(GOAL_SHARE[p.pos] * Math.pow(ovr / str, 3) * user.mins / 90 * matchForm(), 0, .7);
        if (Math.random() < pGoal) {
          user.goals++;
          goal = { n: p.name, me: true, home: id === h, min: randi(...onPitch) };
          if (Math.random() < .7) goal.ast = helper(id, p.name);
          scorers.push(goal);
          continue;
        }
        const pAst = clamp(ASSIST_SHARE[p.pos] * Math.pow(ovr / str, 2) * user.mins / 90 * 1.3 * matchForm(), 0, .7);
        if (Math.random() < pAst) { user.assists++; goal = { n: scorerName(id), home: id === h, min: randi(...onPitch), ast: p.name, astMe: true }; }
      }
      if (!goal) {
        goal = { n: scorerName(id), home: id === h, min: randi(1, 90) };
        if (Math.random() < .7) goal.ast = helper(id, goal.n);
      }
      scorers.push(goal);
    }
  };
  credit(h, gh, user && mineHome);
  credit(a, ga, user && !mineHome);
  scorers.sort((x, y) => x.min - y.min);
  return { h, a, gh, ga, scorers };
}

function scorerName(id) {
  if (isClub(id)) return aiScorer(club(id)).n;
  return aiScorer(tourSide(id)).n;
}

// ---------- tournament squads ----------
// Run fn with Math.random seeded, so a generated squad comes out the same every time it is asked
// for: a side keeps its players (and coach) for the whole tournament without saving them.
function seeded(key, fn) {
  const old = Math.random;
  let s = strHash(key) || 1;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = old; }
}
// A full squad around a rating. A national team's players are all from that country.
const genSquad = (key, base, nat, natOnly) => seeded(key, () => POSITIONS.flatMap(pos => Array.from({ length: SQUAD_TARGET[pos] }, () => {
  const pl = genPlayer(pos, base, nat, 20, 33);
  return natOnly ? { ...pl, nat, n: randomName(nat) } : pl;
})));
// A team as a club-like side for the team sheet and the scorers: { id, name, short, mgr, players }.
// A club in the game is itself. A national team is its country's best players at every club in the
// game, topped up with generated players around its rating where the game has too few good ones.
// A Club World Cup side from outside the game's leagues gets a generated squad of its own.
let tourSideCache = {};
function tourSide(id) {
  if (isClub(id)) return club(id);
  const key = `${id}|${S.season}`;
  if (tourSideCache[key]) return tourSideCache[key];
  let side;
  if (isNation(id)) {
    const nat = id.slice(2), str = NATION_STR[nat] || 60;
    const real = Object.values(S.clubs).flatMap(c => c.players.filter(pl => pl.nat === nat));
    const pool = real.concat(genSquad(`N|${nat}|${S.season}`, str - 3, nat, true));
    const players = POSITIONS.flatMap(pos => pool.filter(pl => pl.pos === pos).sort((a, b) => b.r - a.r).slice(0, SQUAD_TARGET[pos]));
    side = { id, name: natName(nat), short: nat, mgr: seeded(`coach|${nat}`, () => randomName(nat)), players };
  } else {
    const [name, nat, str] = WORLD_CLUBS[+id.slice(2)];
    side = { id, name, short: teamCode(id), mgr: seeded(`coach|${name}`, () => randomName(nat)), players: genSquad(`W|${name}|${S.season}`, str - 3, nat) };
  }
  if (Object.keys(tourSideCache).length > 80) tourSideCache = {};
  return (tourSideCache[key] = side);
}

// ---------- European competitions ----------
// Qualification from last season's final tables (squad strength in the first season).
// All top-flight clubs are queued by league position, the bigger leagues first on a tie,
// then the queue is cut into 36 for each competition.
function buildEuro() {
  // European leagues only (Saudi and US clubs play elsewhere).
  const order = EURO_NATS;
  const tops = S.leagues.filter(l => l.tier === 1 && order.includes(l.nat)).sort((a, b) => order.indexOf(a.nat) - order.indexOf(b.nat));
  const ranked = tops.map(l => {
    const prev = S.lastStandings && S.lastStandings[l.nat];
    const ids = prev ? prev.filter(id => club(id).league === l.id) : [];
    const rest = l.clubs.filter(id => !ids.includes(id)).sort((a, b) => teamStrength(club(b)) - teamStrength(club(a)));
    return ids.concat(rest);
  });
  // The big leagues send more clubs: each place is weighted by the league's UEFA standing, so the
  // Champions League takes 5 each from England, Spain, Italy and Germany, 4 from France and 3 from
  // Portugal, the Netherlands, Belgium and Turkey (36). Ties go to the higher-ranked league.
  const queue = ranked.flatMap((r, i) => r.slice(0, 20).map((id, pos) => ({ id, i, key: pos / (EURO_WEIGHT[tops[i].nat] || .75) })))
    .sort((a, b) => a.key - b.key || a.i - b.i).map(x => x.id);
  const out = {};
  EURO_COMPS.forEach((c, i) => {
    const teams = queue.slice(i * EURO_TEAMS, (i + 1) * EURO_TEAMS);
    if (teams.length === EURO_TEAMS) out[c.key] = makeLeaguePhase(c.key, c.name, teams);
  });
  return out;
}

function euroComp(id = S.player.club) {
  return S.euro ? Object.values(S.euro).find(t => Object.prototype.hasOwnProperty.call(t.table, id)) : null;
}

// Your European game this week, if there is one.
function euroFixture() {
  if (!S.euro) return null;
  const t = euroComp();
  if (!t || euroWeeks(t).indexOf(S.week) !== t.stage) return null;
  const f = stageFixture(t, S.player.club);
  if (!f) return null;
  const isHome = f[0] === S.player.club;
  return { t, home: f[0], away: f[1], isHome, opp: isHome ? f[1] : f[0], stage: t.stages[t.stage].name, euro: true };
}

// Plays every European game this week. Returns the user's match, if they had one.
function euroWeek(userMatch) {
  if (!S.euro) return null;
  let mine = null;
  Object.values(S.euro).forEach(t => {
    if (euroWeeks(t).indexOf(S.week) !== t.stage) return;
    const id = S.player.club;
    const r = playStage(t, (h, a) => (userMatch && (h === id || a === id)) ? Object.assign(userMatch, { team: id }) : null);
    if (r) mine = { ...r, comp: t.name };
    if (t.winner) finishTournament(t);
  });
  return mine;
}

// ---------- domestic cups ----------
// Single-leg knockouts with a fresh draw each round. When the field is not a power of two,
// the top seeds (higher divisions first) get a bye through the first round, like the FA Cup.
function cupRoundName(n) { return { 2: 'Final', 4: 'Semi-final', 8: 'Quarter-final', 16: 'Round of 16' }[n] || null; }

function makeCup(def, nat, teams, weeks) {
  const size = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const rounds = Math.log2(size);
  const seeded = teams.slice().sort((a, b) => clubTier(club(a)) - clubTier(club(b)) || teamStrength(club(b)) - teamStrength(club(a)));
  const byes = seeded.slice(0, size - teams.length), playing = seeded.slice(size - teams.length);
  const t = { key: def.key, name: def.name, nat, type: def.type, season: S.season, cup: true, size, weeks: weeks.slice(-rounds), r: 0, teams, byes, ties: [], rounds: [], winner: null, rep: def.type.startsWith('super') ? 2 : 4 };
  t.ties = pairUp(playing, def.type === 'playoff');
  return t;
}

// Random pairs, or seeded pairs (1 v 8, 2 v 7...) for the playoffs' first round.
function pairUp(list, seeded) {
  const l = seeded ? list.slice() : shuffle(list.slice()), ties = [];
  if (seeded) { const n = l.length; for (let i = 0; i < n / 2; i++) ties.push([l[i], l[n - 1 - i]]); }
  else for (let i = 0; i < l.length; i += 2) ties.push([l[i], l[i + 1]]);
  return ties;
}

function cupStage(t) { return cupRoundName(t.size >> t.r) || `Round ${t.r + 1}`; }

// The league champion and the cup winner (plus runners-up for a four-team super cup).
function superCupTeams(nat, four) {
  const top = S.leagues.find(l => l.nat === nat && l.tier === 1);
  const table = (S.lastStandings && S.lastStandings[nat] || []).filter(id => S.clubs[id]);
  const ranked = [...table, ...top.clubs.slice().sort((a, b) => teamStrength(club(b)) - teamStrength(club(a)))];
  const main = (DOMESTIC[nat] || []).find(d => d.type === 'main');
  const cup = main && (S.history || []).filter(h => h.key === main.key).pop();
  const picks = four ? [ranked[0], ranked[1], cup && cup.winner, cup && cup.runnerUp] : [ranked[0], cup && cup.winner];
  const out = [];
  picks.concat(ranked).forEach(id => { if (id && S.clubs[id] && !out.includes(id) && out.length < (four ? 4 : 2)) out.push(id); });
  return out;
}

function buildCups() {
  const out = {};
  for (const nat in DOMESTIC) {
    if (!S.leagues.some(l => l.nat === nat)) continue;
    DOMESTIC[nat].forEach(def => {
      if (def.type === 'playoff') return; // drawn once the regular season is nearly done
      const teams = def.type.startsWith('super') ? superCupTeams(nat, def.type === 'super4')
        : S.leagues.filter(l => l.nat === nat && l.tier <= def.tiers).flatMap(l => l.clubs);
      if (teams.length >= 2) out[def.key] = makeCup(def, nat, teams, CUP_WEEKS[def.type]);
    });
  }
  return out;
}

// MLS Cup: the top eight of each conference, seeded within the conference for the first round.
function buildPlayoffs() {
  if (!S.cups) return;
  for (const nat in DOMESTIC) {
    const def = DOMESTIC[nat].find(d => d.type === 'playoff');
    if (!def || S.cups[def.key]) continue;
    const confs = S.leagues.filter(l => l.nat === nat && l.tier === 1);
    if (confs.length < 2) continue;
    const t = makeCup(def, nat, [], CUP_WEEKS.playoff);
    t.teams = confs.flatMap(l => leagueTable(l.id).slice(0, 8).map(r => r.id));
    t.size = 16; t.weeks = CUP_WEEKS.playoff.slice(); t.byes = [];
    t.ties = confs.flatMap(l => pairUp(leagueTable(l.id).slice(0, 8).map(r => r.id), true));
    S.cups[def.key] = t;
    while (!t.winner && t.weeks[t.r] < S.week) playCupRound(t, null);
  }
}

function playCupRound(t, userMatch) {
  const id = S.player.club, res = [];
  let mine = null;
  t.ties.forEach(([h, a]) => {
    const u = userMatch && (h === id || a === id) ? Object.assign(userMatch, { team: id }) : null;
    const r = simTeams(h, a, u, 1.5);
    if (r.gh === r.ga) decidePens(r, h, a);
    r.winner = r.gh > r.ga ? h : r.gh < r.ga ? a : r.pens;
    res.push(r);
    if (u) mine = { ...r, comp: t.name };
  });
  t.rounds.push({ name: cupStage(t), res });
  const alive = res.map(r => r.winner).concat(t.r === 0 ? t.byes : []);
  t.r++;
  if (alive.length === 1) {
    t.winner = alive[0];
    t.runnerUp = res[0].h === t.winner ? res[0].a : res[0].h;
    t.ties = [];
    finishTournament(t);
  } else t.ties = pairUp(alive, false);
  return mine;
}

// Your domestic cup tie this week, if you are still in a cup that plays now.
function cupFixture() {
  const id = S.player.club;
  for (const t of Object.values(S.cups || {})) {
    if (t.winner || t.weeks[t.r] !== S.week) continue;
    const f = t.ties.find(x => x.includes(id));
    if (f) return { t, home: f[0], away: f[1], isHome: f[0] === id, opp: f[0] === id ? f[1] : f[0], stage: cupStage(t), euro: false };
  }
  return null;
}

// Plays this week's domestic cup rounds everywhere. Returns your match, if you had one.
function cupWeek(userMatch) {
  let mine = null;
  Object.values(S.cups || {}).forEach(t => {
    if (t.winner || t.weeks[t.r] !== S.week) return;
    const r = playCupRound(t, userMatch);
    if (r) mine = r;
  });
  return mine;
}

// The one midweek game you can have: Europe and domestic cups never share a week.
const midweekFixture = () => euroFixture() || cupFixture();

// ---------- summer tournaments ----------
function summerTeams(ev) {
  const noisy = list => list.slice().sort((a, b) => (NATION_STR[b] + gauss() * 3) - (NATION_STR[a] + gauss() * 3));
  if (ev.key === 'CWC') {
    // Europe sends its last four Champions League winners plus the strongest top-flight clubs.
    const winners = (S.history || []).filter(h => h.key === 'UCL' && h.season > S.season - 4 && isClub(h.winner)).map(h => h.winner);
    const strongest = Object.values(S.clubs).filter(c => clubTier(c) === 1 && EURO_NATS.includes(league(c.league).nat)).sort((a, b) => teamStrength(b) - teamStrength(a)).map(c => c.id);
    const europe = [...new Set([...winners, ...strongest])].slice(0, 12);
    // Sides that are in the game's own leagues (Al Hilal, Inter Miami...) play as themselves.
    return europe.concat(WORLD_CLUBS.map((w, i) => { const c = clubByName(w[0]); return c ? c.id : 'W:' + i; }));
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
  const year = baseYear() + S.season + 1, p = S.player;
  S.summer = [];
  SUMMER_EVENTS.filter(ev => eventOn(ev, year)).forEach(ev => {
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

// After a summer transfer you can't keep playing a club tournament for the club you left. If your
// new club is still in it, you carry on with them; otherwise the rest is played without you.
function syncSummerClub() {
  const p = S.player;
  (S.summer || []).forEach(t => {
    if (t.winner || !t.mine || !isClub(t.mine) || t.mine === p.club) return;
    const left = teamName(t.mine);
    if ((t.teams || t.groups.flat()).includes(p.club) && alive(t, p.club)) {
      t.mine = p.club;
      msg(`${t.name}: you will play the rest of it for ${teamName(p.club)}.`);
      return;
    }
    t.mine = null;
    while (!t.winner) playStage(t, () => null);
    finishTournament(t);
    msg(`You left ${left}, so you take no further part in the ${t.name}.`);
  });
}

// Play the next round of your summer tournament. Once you are knocked out, the rest is simulated.
function playSummerStage() {
  const t = summerPending();
  if (!t) return null;
  const p = S.player, st = t.stages[t.stage], me = t.mine;
  // Played early for a shootout? Then the same team sheet.
  const pre = S.preSim && S.preSim.key === preKey() && S.preSim.base;
  const user = pre ? { ...pre } : { ...summerPick(me), goals: 0, assists: 0, team: me };
  const res = playStage(t, (h, a) => (h === me || a === me) ? user : null);
  let report = null;
  if (res) {
    report = { stage: st.name, comp: t.name, match: { ...res, user, isHome: res.h === me } };
    if (user.mins) {
      user.saves = matchSaves(user, teamStr(res.h === me ? res.a : res.h), teamStr(me));
      const rating = summerRating(user, res, me);
      user.rating = rating;
      notifyHaul(user, t.name.replace(/ \d{4}$/, ''));
      if (isNation(me)) { p.caps++; p.intlGoals = (p.intlGoals || 0) + user.goals; }
      t.goals += user.goals;
      const my = t.my = t.my || { apps: 0, goals: 0, assists: 0, rsum: 0 };
      my.apps++; my.goals += user.goals; my.assists += user.assists; my.rsum += rating;
      // Goes into the season just finished, under the club you ended it with.
      const row = p.career.filter(r => r.season === S.season).pop();
      if (row) {
        addComp(row.comps = row.comps || {}, t.name.replace(/ \d{4}$/, ''), isNation(me) ? 'nat' : 'cup', 1, user.goals, user.assists, rating, user.mins || 0);
        if (!isNation(me)) {
          row.apps++; row.goals += user.goals; row.assists += user.assists; row.mins = (row.mins || 0) + (user.mins || 0);
          // Tackles and clean sheets count in every club competition.
          const conceded = res.h === me ? res.ga : res.gh;
          if (row.tackles != null) row.tackles += matchTackles(user);
          // saves were counted before the rating
          row.saves = (row.saves || 0) + user.saves;
          if (row.cleanAll != null && conceded === 0 && ['GK', 'DEF'].includes(POS_GROUP[p.pos]) && user.mins >= 60) row.cleanAll++;
        }
      }
      addRep((rating - 6.4) * .6 + user.goals * .3);
      nudgeOvr(perfDelta(rating, user) * .5);
    }
  }
  if (!t.winner && !alive(t, me)) {
    msg(`${teamName(me)} are out of the ${t.name}.`, 'bad');
    while (!t.winner) playStage(t, () => null);
  }
  if (t.winner) finishTournament(t);
  S.summerSel = null;
  save();
  return report;
}

// The team for this round is picked once, when you first look at it (the matchday sheet), and the
// game then plays with that same pick.
function summerPick(me) {
  const key = preKey() + '|' + me;
  if (!S.summerSel || S.summerSel.key !== key) S.summerSel = { key, sel: summerSelection(me) };
  return { ...S.summerSel.sel };
}

// Out of contract, you are not your old club's player: it plays its summer games without you until
// you re-sign (or join another club in the tournament).
function summerSelection(me) {
  if (isClub(me) && S.player.needsContract) return { mins: 0, start: false, free: true };
  if (isClub(me)) return selection();
  const ovr = calcOVR(), str = NATION_STR[me.slice(2)] || 60;
  const start = ovr >= str + 2 ? .9 : ovr >= str - 2 ? .65 : ovr >= str - 5 ? .35 : .15;
  const r = Math.random();
  if (r < start) return starterMins(70);
  if (r < start + (1 - start) * .5) return { mins: randi(10, 30), start: false };
  return { mins: 0, start: false };
}

function summerRating(user, res, me) {
  const mine = res.h === me, gf = mine ? res.gh : res.ga, gaa = mine ? res.ga : res.gh;
  const g = POS_GROUP[S.player.pos];
  let r = 6.4 + (calcOVR() - teamStr(me)) / 30 + user.goals * .9 + user.assists * .6 + (gf > gaa ? .3 : gf < gaa ? -.3 : 0);
  if ((g === 'GK' || g === 'DEF') && gaa === 0 && user.mins >= 60) r += .6;
  if (g === 'GK' || g === 'DEF') r -= gaa * .15;
  if (g === 'GK') r += (user.saves || 0) * .18;
  r -= vetYears() * .06 + rustPenalty();
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
  const final = t.ko && t.ko.length ? t.ko[t.ko.length - 1].res[0] : null;
  const runnerUp = t.runnerUp || (final ? (final.winner === final.h ? final.a : final.h) : null);
  S.history = [...(S.history || []), { key: t.key, name: t.name, season: t.season, winner: t.winner, runnerUp }].slice(-240);
  const p = S.player, mine = t.winner === p.club || (isNation(t.winner) && t.winner === t.mine);
  // Season-end awards and the review pick these up (in the summer, straight into the review).
  const note = text => { if (S.seasonSummary && S.phase === 'offseason') S.seasonSummary.awards.push(text); else (S.cupWins = S.cupWins || []).push(text); };
  const label = t.name.replace(/ \d{4}$/, '');
  if (mine) {
    p.trophies.push({ name: label, club: teamName(t.winner), season: t.season, nat: isNation(t.winner) });
    addRep((t.rep || (t.key === 'UCL' || t.key === 'WC' ? 8 : 5)));
    nudgeOvr((t.rep && t.rep < 4 ? .2 : .5) * growthFactor());
    msg(`You won the ${t.name}!`, 'good');
    notify('good', `${label} winners!`, `${teamName(t.winner)} won the ${t.name}, and you were part of it.`);
    note(`${label} winner`);
  } else if (!t.cup || t.nat === league(myClub().league).nat) {
    msg(`${teamName(t.winner)} won the ${t.name}.`);
  }
  // Player awards for the big tournaments, judged on your own numbers in them.
  const my = t.my;
  if (!my || !my.apps || !(t.key === 'UCL' || SUMMER_EVENTS.some(e => e.key === t.key))) return;
  const avg = my.rsum / my.apps, deep = mine || runnerUp === (t.mine || p.club);
  const won = [];
  if (my.goals >= randi(5, 8)) won.push(t.key === 'UCL' ? 'Champions League Top Scorer' : `${label} Golden Boot`);
  if (my.apps >= 4 && avg >= 7.4 && (deep || avg >= 7.9)) won.push(t.key === 'UCL' ? 'Champions League Player of the Season' : `${label} Golden Ball`);
  else if (t.key !== 'UCL' && ageOf(p.by) <= 21 && my.apps >= 3 && avg >= 7.1) won.push(`${label} Best Young Player`);
  won.forEach(a => {
    p.awards.push({ name: a, season: t.season, nat: !!t.mine && isNation(t.mine) });
    addRep(3);
    note(a);
    msg(`You won the ${a}!`, 'good');
  });
  if (won.length) notify('good', 'Award winner!', won.join(' · '));
}
