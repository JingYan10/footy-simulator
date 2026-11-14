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
const OFFER_LOCK_WEEKS = 46; // and no transfer offers or agent calls for a full year after joining a club
const TIER_OVR = { 1: [58, 91], 2: [55, 80], 3: [48, 72] };
const SQUAD_TARGET = { GK: 3, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2, LM: 1, RM: 1, LW: 2, RW: 2, ST: 2 };

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const POS_NAMES = { GK: 'Goalkeeper', CB: 'Centre-back', LB: 'Left-back', RB: 'Right-back', CDM: 'Defensive mid', CM: 'Central mid', CAM: 'Attacking mid', LM: 'Left midfielder', RM: 'Right midfielder', LW: 'Left winger', RW: 'Right winger', ST: 'Striker' };
const POS_GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD' };
const GROUP_SLOTS = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

// ---------- formations ----------
// Every club plays the shape its manager likes. The shape sets how many starting places each line
// has (a striker has two in a 4-4-2, one in a 4-2-3-1), and which positions it uses: a player whose
// position the shape has no place for is picked a little less (3 points down in the pecking order).
const FORMATIONS = {
  '4-3-3': { DEF: ['LB', 'CB', 'CB', 'RB'], MID: ['CM', 'CDM', 'CM'], FWD: ['LW', 'ST', 'RW'] },
  // The three behind the striker: wide midfielders either side of the No. 10.
  '4-2-3-1': { DEF: ['LB', 'CB', 'CB', 'RB'], MID: ['CDM', 'CDM', 'CAM'], FWD: ['LM', 'ST', 'RM'] },
  '4-4-2': { DEF: ['LB', 'CB', 'CB', 'RB'], MID: ['LM', 'CM', 'CM', 'RM'], FWD: ['ST', 'ST'] },
  '3-5-2': { DEF: ['CB', 'CB', 'CB'], MID: ['LM', 'CDM', 'CM', 'CAM', 'RM'], FWD: ['ST', 'ST'] },
  '3-4-3': { DEF: ['CB', 'CB', 'CB'], MID: ['LM', 'CM', 'CM', 'RM'], FWD: ['LW', 'ST', 'RW'] },
};
// How often managers pick each shape.
const FORMATION_SHARE = [['4-3-3', 35], ['4-2-3-1', 25], ['4-4-2', 20], ['3-5-2', 10], ['3-4-3', 10]];
// Positions that can fill a role they are close to (a full-back as a wing-back, a winger wide in midfield).
const ROLE_FIT = { LB: ['LM'], RB: ['RM'], LW: ['LM'], RW: ['RM'], LM: ['LW', 'LB'], RM: ['RW', 'RB'], CDM: ['CM'], CAM: ['CM'], CM: ['CDM', 'CAM'] };
const OFF_ROLE = 3;
// A club's shape comes from its manager, so it changes when he does.
const strHash = key => { let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
function formationOf(c) {
  let r = strHash(`${c.id}|${c.mgr}`) % 100;
  for (const [f, share] of FORMATION_SHARE) { if (r < share) return f; r -= share; }
  return '4-3-3';
}
// Every manager also has a plan B, another shape he switches to for about 1 game week in 4. His main
// shape still decides how many places each line has (and so your start chance); plan B only changes
// who plays where that week.
const PLAN_B_SHARE = 25;
function altFormationOf(c) {
  const main = formationOf(c), pool = FORMATION_SHARE.filter(([f]) => f !== main);
  let r = strHash(`${c.id}|${c.mgr}|B`) % pool.reduce((s, [, n]) => s + n, 0);
  for (const [f, share] of pool) { if (r < share) return f; r -= share; }
  return pool[0][0];
}
const planBWeek = (c, season = S.season, week = S.week) => strHash(`${c.id}|${season}|${week}|planB`) % 100 < PLAN_B_SHARE;
const weekFormation = c => planBWeek(c) ? altFormationOf(c) : formationOf(c);
// Your role this week. In a plan B week with more than one place for you, the manager picks one of them.
function weekRole(pos, c) {
  const f = weekFormation(c);
  if (f === formationOf(c)) return shapeRole(pos, c);
  const opts = shapeOptions(pos, f);
  return opts[strHash(`${c.id}|${S.season}|${S.week}|role`) % opts.length];
}
// The manager's shape never changes for you: no player is bigger than the club. Where the shape has
// no place for your position, you take the role you can fill (a full-back as a wing-back in a back
// three, a winger wide in midfield).
function shapeRole(pos, c, f = formationOf(c)) {
  const roles = Object.values(FORMATIONS[f]).flat();
  if (pos === 'GK' || roles.includes(pos)) return pos;
  return (ROLE_FIT[pos] || []).find(r => roles.includes(r)) || pos;
}
// Where a shape could use you: your own position if it has one, else the roles close to it (a left
// winger in a 4-4-2 is a left mid or a striker). At most two.
function shapeOptions(pos, f) {
  const roles = Object.values(FORMATIONS[f]).flat();
  if (pos === 'GK' || roles.includes(pos)) return [pos];
  const fit = (ROLE_FIT[pos] || []).filter(r => roles.includes(r));
  const near = (POS_NEAR[pos] || []).filter(r => roles.includes(r) && !fit.includes(r));
  const out = [...fit, ...near].slice(0, 2);
  return out.length ? out : [pos];
}
const formationSlots = (c, g) => g === 'GK' ? 1 : FORMATIONS[formationOf(c)][g].length;
function fitsFormation(pos, c) {
  if (pos === 'GK') return true;
  const roles = FORMATIONS[formationOf(c)][POS_GROUP[pos]] || [];
  return roles.includes(pos) || (ROLE_FIT[pos] || []).some(r => roles.includes(r));
}
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
  // Strikers lean less on shooting (35%) and more on pace (25%) than EA's formula.
  ST: { Finishing: 15, 'Att. Positioning': 10, 'Sprint Speed': 13, Acceleration: 12, Dribbling: 10, 'Ball Control': 9, Reactions: 8, 'Shot Power': 6, Composure: 5, Strength: 5, Agility: 3, 'Long Shots': 2, Volleys: 2 },
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

// How each position's card stats sit around its OVR, averaged from real EA cards of top players at
// that position. Like on EA cards, most stats sit below the OVR: the OVR comes from the detailed
// stats that matter for the position, the card shows broader averages. POS_LIFT is that gap, added
// on top of the weighted card stats.
// Each position is built for its job: its main stats sit at or above the OVR, the ones it barely uses
// well below (a full-back can't shoot like a winger, a winger can't defend).
const POS_PROFILE = {
  ST: { PAC: 0, SHO: 3, PAS: -15, DRI: -6, DEF: -50, PHY: -3 },
  LW: { PAC: 3, SHO: -5, PAS: -10, DRI: 2, DEF: -50, PHY: -18 }, RW: { PAC: 3, SHO: -5, PAS: -10, DRI: 2, DEF: -50, PHY: -18 },
  CAM: { PAC: -10, SHO: -5, PAS: 2, DRI: 2, DEF: -35, PHY: -20 },
  LM: { PAC: 2, SHO: -12, PAS: -4, DRI: 0, DEF: -30, PHY: -15 }, RM: { PAC: 2, SHO: -12, PAS: -4, DRI: 0, DEF: -30, PHY: -15 },
  CM: { PAC: -12, SHO: -12, PAS: 2, DRI: -3, DEF: -15, PHY: -10 },
  CDM: { PAC: -18, SHO: -25, PAS: -8, DRI: -12, DEF: 2, PHY: 0 },
  LB: { PAC: 0, SHO: -40, PAS: -18, DRI: -18, DEF: 2, PHY: -5 }, RB: { PAC: 0, SHO: -40, PAS: -18, DRI: -18, DEF: 2, PHY: -5 },
  CB: { PAC: -12, SHO: -45, PAS: -22, DRI: -25, DEF: 2, PHY: 0 },
};
// The earlier shapes (averaged from EA cards; full-backs had a second version), for reshaping saves.
const PROFILE_V1 = {
  ST: { PAC: -2, SHO: 1, PAS: -15, DRI: -5, DEF: -45, PHY: -6 },
  LW: { PAC: 2, SHO: -4, PAS: -8, DRI: 0, DEF: -47, PHY: -15 }, RW: { PAC: 2, SHO: -4, PAS: -8, DRI: 0, DEF: -47, PHY: -15 },
  CAM: { PAC: -8, SHO: -6, PAS: -4, DRI: 0, DEF: -22, PHY: -18 },
  LM: { PAC: 1, SHO: -8, PAS: -5, DRI: -1, DEF: -32, PHY: -14 }, RM: { PAC: 1, SHO: -8, PAS: -5, DRI: -1, DEF: -32, PHY: -14 },
  CM: { PAC: -12, SHO: -8, PAS: -1, DRI: -2, DEF: -13, PHY: -11 },
  CDM: { PAC: -17, SHO: -14, PAS: -5, DRI: -7, DEF: -2, PHY: -3 },
  LB: { PAC: 4, SHO: -15, PAS: -5, DRI: -4, DEF: -7, PHY: -6 }, RB: { PAC: 4, SHO: -15, PAS: -5, DRI: -4, DEF: -7, PHY: -6 },
  CB: { PAC: -11, SHO: -38, PAS: -17, DRI: -16, DEF: -1, PHY: -3 },
};
const FB_V2 = { PAC: 2, SHO: -25, PAS: -10, DRI: -10, DEF: 0, PHY: -4 };
const POS_LIFT = Object.fromEntries(Object.keys(WEIGHTS).map(pos => [pos, POS_PROFILE[pos] ? -Object.keys(WEIGHTS[pos]).reduce((s, k) => s + WEIGHTS[pos][k] * (POS_PROFILE[pos][k] || 0), 0) : 0]));
// A stat on that shape for a given OVR.
const profileAttr = (k, pos, ovr) => ovr + (POS_PROFILE[pos][k] || 0);

// Training equipment: bought once, then paid weekly to keep running. Better kit means faster
// attribute gains, but it is priced so a lower-league wage takes a long time to afford it.
const EQUIP_TIERS = [
  { name: 'Normal', buy: 0, fee: 0, mult: 1, energy: 0, desc: 'Club-issue kit and the public gym.' },
  { name: 'Bronze', buy: 50000, fee: 2400, mult: 1.6, energy: 2, desc: 'Proper boots, a home gym and a ball machine.' },
  { name: 'Silver', buy: 250000, fee: 8000, mult: 2.3, energy: 4, desc: 'Personal trainer, video analysis and recovery tools.' },
  { name: 'Gold', buy: 1500000, fee: 30000, mult: 3.2, energy: 6, desc: 'Elite performance team, nutritionist and cryo suite.' },
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
// Manchester, Madrid and Barcelona, Milan, Munich, Paris, Lisbon, Amsterdam, Brussels, LA and Miami, Riyadh).
const HOUSE_RENT = {
  ENG: [250, 800, 3500, 12000, 35000],
  ESP: [180, 550, 2200, 7000, 22000],
  ITA: [170, 500, 2000, 6500, 20000],
  GER: [200, 600, 2000, 6000, 18000],
  FRA: [220, 700, 2800, 8500, 26000],
  POR: [130, 400, 1300, 4000, 12000],
  TUR: [150, 450, 1500, 5000, 15000],
  NED: [200, 650, 2000, 5500, 15000],
  BEL: [180, 600, 1800, 5000, 14000],
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
  ['Club Brugge', 'Anderlecht'], ['Anderlecht', 'Standard Liège'], ['Club Brugge', 'Cercle Brugge'], ['Antwerp', 'Beerschot'], ['Club Brugge', 'Antwerp'], ['Anderlecht', 'Union SG'],
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
  'Club Brugge|Anderlecht': 'De Topper', 'Anderlecht|Standard Liège': 'Le Clasico', 'Club Brugge|Cercle Brugge': 'Bruges derby', 'Antwerp|Beerschot': 'Antwerp derby', 'Club Brugge|Antwerp': 'Belgian derby', 'Anderlecht|Union SG': 'Brussels derby',
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

// The calendar starts the summer you turn 16 (S.startYear). Older saves, and the squads in the
// database, are set in 2026. Past careers set labelBase while they are drawn.
let labelBase = null;
const baseYear = () => labelBase ?? ((S && S.startYear) || START_YEAR);
const yearNow = () => baseYear() + S.season;
const seasonLabel = (season = S.season) => `${baseYear() + season}/${String((baseYear() + season + 1) % 100).padStart(2, '0')}`;

// Each season kicks off on the first Saturday on or after 8 August; one game week is seven days.
const DAY = 864e5, MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function seasonStart(season = S.season) { const d = new Date(Date.UTC(baseYear() + season, 7, 8)); d.setUTCDate(8 + (6 - d.getUTCDay() + 7) % 7); return d; }
const weekDate = (week = S.week, season = S.season) => new Date(seasonStart(season).getTime() + (Math.min(week, SEASON_WEEKS) - 1) * 7 * DAY);
// The game's "today": the matchday, or 1 July in the summer break.
const gameDate = () => S.phase === 'season' ? weekDate() : new Date(Date.UTC(yearNow() + 1, 6, 1));
const fmtDate = d => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
// Your real age on the game's date, from the birthday you entered (older saves just use the year).
function realAge(p = S.player) {
  if (!p.birth) return ageOf(p.by);
  const [y, m, d] = p.birth.split('-').map(Number), t = gameDate();
  return t.getUTCFullYear() - y - (t.getUTCMonth() + 1 < m || (t.getUTCMonth() + 1 === m && t.getUTCDate() < d) ? 1 : 0);
}
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
  return { n: randomName(nat), pos, by: baseYear() + (S ? S.season : 0) - age, nat, r: Math.round(clamp(base + gauss() * 3 - youthPenalty, 40, 86)), g: 0, a: randi(40, 75) };
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
    const top = groups[g].sort((a, b) => b - a).slice(0, formationSlots(c, g));
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
function newStats() { return { apps: 0, starts: 0, mins: 0, goals: 0, assists: 0, rsum: 0, motm: 0, clean: 0, cleanAll: 0, tackles: 0, saves: 0, missed: 0, cup: { apps: 0, mins: 0, goals: 0, assists: 0, rsum: 0 }, comps: {} }; }

// kind: 'league', 'cup', 'euro' or 'nat'.
// Assists for your country, from every season's competitions (qualifiers, friendlies and tournaments).
const intlAssists = (p = S.player) => (p.career || []).reduce((s, r) => s + Object.values(r.comps || {}).reduce((t, c) => t + (c.kind === 'nat' ? c.assists || 0 : 0), 0), 0);
// mins: minutes played (older saves have none for their earlier games).
function addComp(comps, name, kind, apps, goals, assists, rsum, mins = 0) {
  const c = comps[name] = comps[name] || { kind, apps: 0, goals: 0, assists: 0, rsum: 0 };
  c.apps += apps; c.goals += goals; c.assists += assists; c.rsum += rsum; c.mins = (c.mins || 0) + mins;
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

// Card stats rounded for the season record (the Icon card averages them over your prime).
const roundAttrs = a => Object.fromEntries(Object.entries(a || {}).map(([k, v]) => [k, Math.round(v)]));
function careerRow(st, c) {
  const p = S.player;
  return { season: S.season, club: c.name + (p.loan && p.club === c.id ? ' (loan)' : ''), clubId: c.id, no: p.shirt && p.shirt.club === c.id ? p.shirt.no : undefined, league: league(c.league).name, apps: st.apps + st.cup.apps, mins: (st.mins || 0) + ((st.cup && st.cup.mins) || 0), tackles: st.tackles || 0, cleanAll: st.cleanAll || 0, saves: st.saves || 0, goals: st.goals + st.cup.goals, assists: st.assists + st.cup.assists, avg: Math.round((st.apps ? st.rsum / st.apps : 0) * 100) / 100, ovr: calcOVR(), pos: p.seasonPos || p.pos, alts: [...altPositions()], posApps: { ...(st.posApps || {}) }, comps: JSON.parse(JSON.stringify(st.comps || {})), attrs: roundAttrs(p.attrs) };
}

function seasonTotals() {
  const p = S.player, all = [...(p.seasonSpells || []), p.st];
  const t = newStats();
  all.forEach(s => {
    ['apps', 'starts', 'mins', 'goals', 'assists', 'rsum', 'motm', 'clean', 'cleanAll', 'tackles', 'saves', 'missed'].forEach(k => { t[k] += s[k] || 0; });
    ['apps', 'mins', 'goals', 'assists', 'rsum'].forEach(k => { t.cup[k] += (s.cup && s.cup[k]) || 0; });
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
  let s = POS_LIFT[p.pos];
  for (const k in w) s += w[k] * p.attrs[k];
  return s;
}

function calcOVR(p = S.player) {
  const s = rawOVR(p);
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
// Defenders and holding midfielders build their OVR on tackles instead of goals and assists:
// about 7 tackles in a game is worth what a goal is to a striker.
// The position you play in matches: your main one, a new one you agreed to play straight away, or,
// for one game week, another position you can play that the manager picked you in.
const weekKey = () => `${S.season}-${S.week}`;
function matchPos() {
  const p = S.player, w = p.weekPos;
  return (w && w.key === weekKey() && w.pos) || p.playPos || p.pos;
}
// Can play other positions? About 1 game week in 4 the manager starts you in one of them (alerted).
// Only when you are in his starting line-up that week: from the bench there is nothing to switch.
const WEEK_POS_CHANCE = .25;
function rollWeekPos(sel) {
  const p = S.player, key = weekKey();
  if (p.weekPos && p.weekPos.key === key) return;
  if (!sel || !sel.start) { p.weekPos = { key, pos: null }; return; }
  const base = p.playPos || p.pos, other = [p.pos, ...altPositions()].filter((x, i, a) => x !== base && a.indexOf(x) === i && x !== 'GK');
  const pos = other.length && !p.injured && Math.random() < WEEK_POS_CHANCE ? pick(other) : null;
  // The manager tells you on matchday (see tellWeekPos), not the moment the week comes up.
  p.weekPos = { key, pos, told: !pos };
}
// A one-week position you haven't been told about yet stays hidden.
const weekPosTold = () => { const w = S.player.weekPos; return !(w && w.key === weekKey() && w.pos && !w.told); };
// When the manager's shape has no place for the position you play, you are told the role you take
// instead (a central midfielder as a holder in a 4-2-3-1): once each time that changes, not weekly.
// A plan B week that moves you somewhere else is told every time it happens, for that week only.
function shapeRoleNote() {
  const c = myClub(), pos = matchPos(), f = weekFormation(c), role = weekRole(pos, c);
  if (f !== formationOf(c)) {
    // Plan B that puts you back in your own position (an LM in a 4-3-3 when he switches to a 4-2-3-1) needs no alert.
    if (role === shapeRole(pos, c) || role === pos) return null;
    const key = `${c.id}|${weekKey()}`;
    return S.player.planBTold === key ? null : { key, pos, role, f, planB: true };
  }
  if (role === pos) return null;
  const key = `${c.id}|${c.mgr}|${pos}|${role}`;
  return S.player.roleTold === key ? null : { key, pos, role, f };
}
function tellShapeRole(popup = true) {
  const n = shapeRoleNote();
  if (!n) return;
  if (n.planB) {
    S.player.planBTold = n.key;
    const c = myClub(), what = roleText(n.pos, n.role);
    msg(`Plan B this week: ${c.mgr} switches to a ${n.f}, so you start ${what}.`, 'info');
    if (popup) notify('good', `Plan B: playing ${n.role}`, `${c.mgr} goes with his ${n.f} this week instead of his usual ${formationOf(c)}, so you start ${what}. Back to normal next week; his targets stay the same.`);
    return;
  }
  S.player.roleTold = n.key;
  syncObjRole();
  const c = myClub(), what = roleText(n.pos, n.role);
  msg(`${c.mgr} plays a ${formationOf(c)}: you start ${what}, and his targets are set for that role.`, 'info');
  if (popup) notify('good', `Playing ${n.role}`, `${c.mgr}'s ${formationOf(c)} has no ${POS_NAMES[n.pos].toLowerCase()} spot, so you start ${what}. You play it as a ${n.role} in matches, and his targets are set for a ${n.role}.`);
}
// The role you actually fill on the pitch for your club: what your goals, assists, tackles and
// ratings are made of.
const matchRole = () => { const c = myClub(); return c ? weekRole(matchPos(), c) : matchPos(); };
// The role the manager's targets are set for: your position (or the new one you took on) as his shape uses it.
const objRole = () => { const p = S.player, c = myClub(), pos = p.playPos || p.pos; return c ? shapeRole(pos, c) : pos; };
// Targets set for a role you no longer fill (a new manager, a new shape) are set again for the new one.
function syncObjRole() {
  const p = S.player, role = objRole();
  if (p.injured) return;
  const spans = (p.objectives || []).filter(o => o.pos && o.pos !== role && o.span !== 'chance').map(o => o.span);
  if (spans.length) setObjectives(spans);
}
function tellWeekPos(popup = true) {
  const p = S.player, w = p.weekPos;
  if (weekPosTold()) return;
  w.told = true;
  msg(`${myClub().mgr} wants you at ${POS_NAMES[w.pos].toLowerCase()} this week.`, 'info');
  if (popup) notify('good', `Playing ${w.pos} this week`, `${myClub().mgr} is using you at ${POS_NAMES[w.pos].toLowerCase()} for this week's games. Your season still counts as a ${p.pos}.`);
}
// Learning a new position takes about 20 game weeks from your first game there: you are a touch worse
// in matches (8% fewer goals, assists and tackles, ratings 0.2 lower) and the manager eases your
// targets by 15%.
const ADJUST_WEEKS = 20, ADJUST_FORM = .92, ADJUST_RATING = .2, ADJUST_TARGETS = .85;
const adjusting = () => (S.player.adjustUntil || 0) > absWeek();
const adjustForm = () => adjusting() ? ADJUST_FORM : 1;
const TACKLERS = ['CB', 'LB', 'RB', 'CDM'];
// Tackles that count as a busy, decent game when you went against the manager's plan.
const DECENT_TACKLES = { CB: 5, LB: 5, RB: 5, CDM: 5 };
// Keepers grow on clean sheets and saves, with the rating counting half as much. Real top keepers
// keep a clean sheet in about 40% of games and make 2.5 to 3 saves, worth what 0.6 goals and 0.3
// assists a game are to a striker.
const GK_CLEAN_GAIN = .015, GK_SAVE_GAIN = .002;
function perfDelta(rating, user) {
  const gk = matchPos() === 'GK';
  const output = gk ? (user.clean ? GK_CLEAN_GAIN : 0) + (user.saves || 0) * GK_SAVE_GAIN
    : TACKLERS.includes(matchRole()) ? (user.tackles || 0) * .0011 : user.goals * .015 + user.assists * .01;
  const d = ((rating - 6.7) * (gk ? .015 : .03) + output) * user.mins / 90;
  return d > 0 ? d * growthFactor() * PERF_GAIN : d * declineFactor();
}

// How much harder drops hit with age: from 34 an OVR loss is 1.2× bigger, growing a little each year.
// The body holds up until 33. After that every year makes OVR easier to lose and games harder.
const VET_AGE = 33;
const ROLE_RANK = { Reserve: 0, Rotation: 1, Starter: 2, 'Key Player': 3 };
// The best role a club offers a veteran (see makeOffer), and the share of the usual wage it pays.
const vetRoleCap = (age, ovr) => age >= 36 ? (ovr >= 85 ? 'Rotation' : 'Reserve') : age === 35 ? 'Rotation' : age >= 33 ? 'Starter' : null;
// The season a contract offered now runs to (a mid-season move or renewal adds this half season on top).
const offerEnds = o => o.endSeason ?? S.season + o.years;
// The season your current deal ends with.
const contractEnd = () => S.season + S.player.years - (S.phase === 'offseason' ? 0 : 1);
const VET_WAGE_CUT = { 33: .9, 34: .8, 35: .65, 36: .5, 37: .4 };
// A veteran's contract role holds at that club: rotation means a 35% start chance at most, a reserve 15%.
const ROLE_CAP_START = { Starter: 1, Rotation: .35, Reserve: .15 };
const roleCapHere = () => { const r = S.player.roleCap; return r && r.club === S.player.club && (r.from ?? 0) <= S.season ? r.status : null; };
const vetYears = (age = ageOf(S.player.by)) => Math.max(0, age - VET_AGE);
// Scoring and assist chances: 8% lower for each year past 33, down to half.
const vetForm = (age = ageOf(S.player.by)) => Math.max(.5, 1 - vetYears(age) * .08);
// Back from injury but short of match sharpness ("rust", in weeks): ratings drop and chances
// dry up, most in the first week back and fading as the rust wears off.
const rustLevel = () => Math.min(S.player.rust || 0, 5) / 5;
const rustPenalty = () => (S.player.rust > 0 ? .3 + rustLevel() * .5 : 0);
const rustForm = () => (S.player.rust > 0 ? .8 - rustLevel() * .2 : 1);
const matchForm = () => vetForm() * rustForm() * adjustForm() * chemForm();

// ---------- attributes in matches ----------
// Your stats decide what you do with the ball, measured against what a typical player of your
// position and OVR would have. Finishing: Shooting, then Pace (getting into the right places),
// then Dribbling. Assists: Passing, Dribbling and Pace. Tackles: Defending, helped by Pace.
// Pace matters in every outfield role; keepers are judged on their own stats.
// A typical player: stats spread by how much each counts for the position, levelled to the same OVR.
function typicalAttr(k, pos = matchPos(), ovr = calcOVR()) {
  if (POS_PROFILE[pos]) return profileAttr(k, pos, ovr);
  const w = WEIGHTS[pos], raw = kk => ovr + ((w[kk] || 0) - 1 / 6) * 45;
  const lift = ovr - Object.keys(w).reduce((s, kk) => s + w[kk] * raw(kk), 0);
  return raw(k) + lift;
}
function statMix(mix, attrs) { return Object.entries(mix).reduce((s, [k, w]) => s + w * attrs[k], 0); }
function statFactor(mix, exp, lo, hi) {
  const p = S.player;
  if (p.pos === 'GK') return 1;
  const ref = {}; Object.keys(mix).forEach(k => { ref[k] = typicalAttr(k); });
  return clamp(Math.pow(statMix(mix, p.attrs) / Math.max(1, statMix(mix, ref)), exp), lo, hi);
}
const SCORE_MIX = { SHO: .45, PAC: .35, DRI: .2 }, ASSIST_MIX = { PAS: .45, DRI: .3, PAC: .25 }, TACKLE_MIX = { DEF: .75, PAC: .25 };
const scoreFactor = () => statFactor(SCORE_MIX, 2.5, .45, 1.6);
const assistFactor = () => statFactor(ASSIST_MIX, 2, .5, 1.5);
const tackleFactor = () => statFactor(TACKLE_MIX, 1.5, .6, 1.4);
// Strong foot: cutting inside on your weaker side (a right-footer on the left) means more shots and
// fewer crosses; playing on your strong side means more crosses and fewer goals.
const POS_SIDE = { LW: 'L', LM: 'L', LB: 'L', RW: 'R', RM: 'R', RB: 'R' };
const footSide = (pos = matchPos()) => POS_SIDE[pos] ? (POS_SIDE[pos] === (S.player.foot || 'R') ? 'strong' : 'inverted') : null;
const footGoal = () => ({ strong: .88, inverted: 1.15 }[footSide()] || 1);
const footAssist = () => ({ strong: 1.15, inverted: .87 }[footSide()] || 1);
// Your goals and assists in a game come a little less often overall (GA_SCALE). Top-flight defences
// are tighter (10% fewer against any top-flight side), and an opponent stronger than your team costs
// up to 20% more.
const GA_SCALE = .9;
const oppEdge = (mine, opp) => (clubTier(opp) === 1 ? .9 : 1) * clamp(Math.exp((teamStrength(mine) - teamStrength(opp)) / 30), .8, 1);
function declineFactor(age = ageOf(S.player.by)) { return age > VET_AGE ? 1.1 + (age - VET_AGE - 1) * .1 : 1; }
// Saudi and MLS football is gentler on an old body: veterans decline about 30% slower there.
// Saudi Arabia and the MLS are kinder on ageing legs: ageing and bad games cost 60% less there.
// OVR lost at each birthday from 34 (before kit and league): a steady fade that quickens a little each year.
const BIRTHDAY_DROP = { 34: .4, 35: .7, 36: .9, 37: 1.2, 38: 1.5, 39: 2 };

// The card stats a player of this position and OVR typically has (initAttrs without the random
// spread). Used for Icon cards of old careers that were saved without any stats.
function typicalAttrs(pos, target) {
  const w = WEIGHTS[pos] || WEIGHTS.ST, keys = attrKeys(pos), avgW = 1 / keys.length, attrs = {};
  keys.forEach(k => { attrs[k] = POS_PROFILE[pos] ? profileAttr(k, pos, target) : target + (w[k] - avgW) * 45; });
  const diff = target - rawOVR({ pos, attrs });
  keys.forEach(k => { attrs[k] = clamp(Math.round(attrs[k] + diff), 25, 99); });
  return attrs;
}

function initAttrs(pos, target) {
  const w = WEIGHTS[pos], keys = attrKeys(pos), avgW = 1 / keys.length;
  const attrs = {};
  keys.forEach(k => { attrs[k] = (POS_PROFILE[pos] ? profileAttr(k, pos, target) : target + (w[k] - avgW) * 45) + rand(-4, 4); });
  const p = { pos, attrs };
  const diff = target - calcOVR(p);
  keys.forEach(k => { attrs[k] = clamp(attrs[k] + diff, 25, 99); });
  return attrs;
}

// Step 1: build the world and offer five clubs to choose from.
// The squads in the database are set in 2026: shift every birth year so ages are right in the year
// your career starts.
function shiftAges(clubs, delta) { if (delta) clubs.forEach(c => c.players.forEach(pl => { pl.by += delta; })); }

function prepareGame({ name, nat, pos, birth = null, foot = 'R' }) {
  const by = birth ? +birth.slice(0, 4) : START_YEAR - START_AGE;
  S = { v: 3, season: 0, week: 1, phase: 'choose', rerolls: 3 };
  Object.assign(S, buildWorld());
  // You start the summer you turn 16.
  S.startYear = by + START_AGE;
  shiftAges(Object.values(S.clubs), S.startYear - START_YEAR);
  const ovr = 55;
  S.player = {
    name, nat, pos, by, birth, foot, attrs: initAttrs(pos, ovr), pot: randi(78, 94),
    club: null, wage: 0, years: 3, money: 1000, energy: 100, rep: 2, injured: 0,
    slots: TRAIN_SLOTS, equip: 0, house: 0,
    form: [], career: [], trophies: [], awards: [], ovrAtSign: ovr, joinedSeason: 0, caps: 0,
    aff: 50, affPen: 0, board: 50, objectives: [], objHist: [], order: null, loan: null, listed: false,
    clubsPlayed: [], banned: [], offerLock: 0, lockYear: true, seasonSpells: [], sponsorV2: true, eaV: 3,
  };
  S.inbox = [];
  S.offers = [];
  S.startChoices = startingClubs();
  S.player.st = newStats();
}

// ---------- second teams (academies) ----------
// Big clubs' B teams, by name: the B team plays in the lower leagues, never in its first team's
// division, and the first team calls up the B-team players who are good enough.
const B_TEAMS = {
  'Real Madrid Castilla': 'Real Madrid', 'Barcelona Atlètic': 'Barcelona', 'Atlético Madrileño': 'Atlético Madrid',
  'Celta Fortuna': 'Celta Vigo', 'Real Sociedad B': 'Real Sociedad', 'Villarreal B': 'Villarreal', 'Betis Deportivo': 'Real Betis',
  'TSG Hoffenheim II': 'TSG Hoffenheim', 'VfB Stuttgart II': 'VfB Stuttgart',
  'Benfica B': 'Benfica', 'Porto B': 'Porto', 'Sporting CP B': 'Sporting CP', 'Braga B': 'Braga', 'Vitória SC B': 'Vitória SC',
  'Jong Ajax': 'Ajax', 'Jong PSV': 'PSV', 'Jong AZ': 'AZ', 'Jong FC Utrecht': 'FC Utrecht', 'Jong Almere City': 'Almere City', 'Jong Sparta': 'Sparta Rotterdam',
  'Club NXT': 'Club Brugge', 'Jong Genk': 'Genk', 'Jong KAA Gent': 'Gent',
};
// The first team of a B team (a club object), or null.
function parentOf(c) {
  const n = c && B_TEAMS[c.name], par = n && clubByName(n);
  return par && par.id !== c.id ? par : null;
}
const isBTeam = c => !!parentOf(c);

// 10% top flight, 30% second tier, 60% third tier, for each of the five offers. A real talent
// (potential 88+) is also scouted by a big club's academy: one of the five is a B team, 25% of the
// time at 88 potential, rising to every time at 94.
function startingClubs() {
  const all = Object.values(S.clubs), used = new Set(), out = [];
  const pot = S.player.pot || 0;
  if (pot >= 88 && Math.random() < (pot - 86) / 8) {
    const b = all.filter(isBTeam);
    if (b.length) { const c = pick(b); used.add(c.id); out.push(c.id); }
  }
  while (out.length < 5) {
    const r = Math.random(), tier = r < .01 ? 1 : r < .31 ? 2 : 3;
    const c = pick(all.filter(x => clubTier(x) === tier && !used.has(x.id) && !isBTeam(x)));
    used.add(c.id);
    out.push(c.id);
  }
  return out.sort((a, b) => clubTier(club(a)) - clubTier(club(b)));
}

// A first-team call-up: at a B team (not on loan), the first team offers you a role once you are
// good enough for it: OVR within 8 of their team rating and a season average of 7.0+ over 6 games or
// more (or OVR within 2 of their team rating, whatever your form). About one week in six once you
// qualify. Turn it down and they look again in 10 weeks; an offer left unanswered for 4 weeks lapses.
const CALLUP_GAP = 8, CALLUP_FORM = 7, CALLUP_WAIT = 10, CALLUP_LAPSE = 4;
function callUpWeek() {
  const p = S.player;
  if (p.loan || p.needsContract) return;
  const par = parentOf(myClub());
  if (!par) return;
  const open = S.offers.find(o => o.callup);
  if (open) {
    if (absWeek() - (open.at || 0) >= CALLUP_LAPSE) {
      S.offers = S.offers.filter(o => o !== open);
      p.callupNo = absWeek() + CALLUP_WAIT;
      msg(`${par.name} withdrew their call-up: you never answered.`, 'bad');
    }
    return;
  }
  if ((p.callupNo || 0) > absWeek() || isBanned(par.id)) return;
  const ovr = calcOVR(), str = teamStrength(par), st = p.st || {}, avg = st.apps ? st.rsum / st.apps : 0;
  const good = ovr >= str - CALLUP_GAP && st.apps >= 6 && avg >= CALLUP_FORM;
  if (!(good || ovr >= str - 2) || Math.random() >= 1 / 6) return;
  const o = makeOffer(par, 'transfer');
  o.callup = true; o.at = absWeek();
  delete o.block; delete o.blockFee;
  S.offers.push(o);
  msg(`${par.mgr} wants you in the ${par.name} first team as ${o.status.toLowerCase()}: ${money(o.wage)}/week for ${o.years} year${o.years > 1 ? 's' : ''}. Answer within ${CALLUP_LAPSE} weeks.`, 'good');
  notify('good', `Called up to ${par.name}!`, `${par.mgr} has seen enough at ${myClub().name}. He offers you a place in the first team as ${o.status.toLowerCase()}. Check the Contract tab.`);
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
  planPositionAsk();
  p.seasonPos = p.pos;
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
// What the board's trust does besides contract talks: it backs a bigger pay rise when you renew
// (+5% room at 65+, +10% at 80+, 5% less under 30), makes your release clause cheaper to break (25%
// off at 75+, 25% dearer under 30), and pays a long-serving player a testimonial when he leaves.
const boardRoom = () => { const b = S.player.board; return b >= 80 ? .1 : b >= 65 ? .05 : b < 30 ? -.05 : 0; };
const clauseFeeNow = () => { const b = S.player.board, f = S.player.clauseFee || 0; return Math.round(f * (b >= 75 ? .75 : b < 30 ? 1.25 : 1) / 1e4) * 1e4; };
// Five seasons or more at a club and a board at 70+: a testimonial game worth 20 weeks' wages
// (€50k at least) and a little reputation, when you leave or retire.
const TESTIMONIAL_SEASONS = 5, TESTIMONIAL_BOARD = 70;
const testimonialDue = () => { const p = S.player; return !p.loan && p.club && S.season - (p.joinedSeason || 0) >= TESTIMONIAL_SEASONS && p.board >= TESTIMONIAL_BOARD; };
function testimonial() {
  const p = S.player;
  if (!testimonialDue()) return;
  const v = Math.max(5e4, Math.round(p.wage * 20 / 1e3) * 1e3);
  p.money += v;
  addRep(3);
  msg(`${myClub().name} held a testimonial game in your honour: a full stadium, and ${money(v)} for you.`, 'good');
  notify('good', 'Testimonial', `${myClub().name} thanked you for ${S.season - (p.joinedSeason || 0)} seasons with a testimonial game worth ${money(v)}.`);
}

function formBonus() {
  const f = S.player.form;
  if (!f.length) return 0;
  return clamp((f.reduce((a, b) => a + b, 0) / f.length - 6.5) * 1.5, -3, 3);
}

function selScore(r, a, bonus = 0) { return r + (a - 50) * .2 + bonus; }

// Everyone competing for your position group, best first, as the manager sees it.
function peckingOrder(c = myClub(), ovr = calcOVR(), aff = effAff(), withForm = true) {
  // At your own club you are judged where you play now; other clubs see your main position.
  const myPos = c === myClub() ? matchPos() : S.player.pos, g = POS_GROUP[myPos];
  // Injured rivals drop to the bottom until they are fit.
  const fit = pos => fitsFormation(pos, c) ? 0 : -OFF_ROLE;
  const list = c.players.filter(pl => POS_GROUP[pl.pos] === g).map(pl => ({ n: pl.n, pos: pl.pos, r: pl.r, a: pl.a, inj: pl.inj || 0, score: pl.inj ? -99 : selScore(pl.r, pl.a, fit(pl.pos)) }));
  // Top-flight managers trust proven stars: below 86 OVR you are judged harder, from 86 a little kinder.
  const topAdj = clubTier(c) === 1 ? (ovr >= STAR_OVR ? .5 : -3.5) : 0;
  list.push({ n: S.player.name, pos: myPos, r: ovr, a: aff, score: selScore(ovr, aff, (withForm ? formBonus() : 0) + topAdj + fit(myPos)), me: true });
  return list.sort((x, y) => y.score - x.score);
}

function myRank(c = myClub(), ovr = calcOVR(), aff = effAff(), withForm = true) {
  return peckingOrder(c, ovr, aff, withForm).findIndex(x => x.me) + 1;
}

function squadStatus(c = myClub(), ovr = calcOVR(), aff = c === myClub() ? effAff() : 50) {
  const mine = c === myClub(), slots = formationSlots(c, POS_GROUP[mine ? matchPos() : S.player.pos]);
  if (mine && frozenOut()) return 'Reserve';
  const capped = mine ? roleCapHere() : null, st = squadRank(c, ovr, aff, mine);
  return capped && ROLE_RANK[st] > ROLE_RANK[capped] ? capped : st;
}
function squadRank(c, ovr, aff, mine) {
  const slots = formationSlots(c, POS_GROUP[mine ? matchPos() : S.player.pos]);
  // A promised starting place holds while the manager keeps faith (affection 30+), like in selection.
  const promised = mine && S.player.promise > 0 && effAff() >= 30;
  const rank = promised ? Math.min(myRank(c, ovr, aff, true), slots) : myRank(c, ovr, aff, mine);
  if (rank === 1) return 'Key Player';
  if (rank <= slots) return 'Starter';
  if (rank <= slots + 2) return 'Rotation';
  return 'Reserve';
}

const STAR_OVR = 86;
const MAX_START = .85, MAX_START_GK = .95;

// Chance of starting the next match, and share of the rest where you come off the bench.
function startChance() {
  const p = S.player, c = myClub(), ovr = calcOVR(), eff = effAff();
  const slots = formationSlots(c, POS_GROUP[matchPos()]);
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
  // Three chances taken in a row at this club, or a loyalty deal: +40 points for good.
  if (chanceBoosted()) start += CHANCE_BOOST;
  // A veteran signed as rotation or reserve plays like one (a chance he already gave you still holds).
  if (roleCapHere()) start = Math.min(start, ROLE_CAP_START[roleCapHere()]);
  // You asked the manager for a chance: he starts you most games (80%) for the next 10 league games.
  if (p.chance > 0) start = Math.max(start, CHANCE_START);
  // A loan club wants to see you play: at least a 40% start chance.
  if (p.loan) start = Math.max(start, .4);
  if (p.energy < 25) start *= .4;
  // Frozen out: you train with the reserves and only get the odd late cameo.
  if (frozenOut()) { start = 0; subShare = .1; }
  // Just back from injury: the manager eases you in.
  if (p.rust > 0) start *= .75;
  // Nobody is guaranteed a shirt: at most an 85% chance of starting (95% for a keeper, whom
  // managers rarely rotate).
  // Turned down a new position this season: the manager leaves you out a little more.
  return { start: Math.max(0, clamp(start, 0, matchPos() === 'GK' ? MAX_START_GK : MAX_START) -(p.posRefused === S.season ? POS_REFUSE_START : 0)), subShare };
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
const OBJ_WORDS = { goals: ['goal', 'goals'], assists: ['assist', 'assists'], tackles: ['tackle', 'tackles'], ga: ['goal or assist', 'goals + assists'], clean: ['clean sheet', 'clean sheets'], gat: ['goal, assist or tackle', 'goals + assists + tackles'] };
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
// Holding midfielders are judged on tackles (40%), on goals + assists + tackles together (35%), or on
// goals + assists alone (25%). Their G/A and tackle targets sit below other midfielders' and centre-backs'.
const cdmKind = () => { const r = Math.random(); return r < .4 ? 'tackles' : r < .75 ? 'gat' : 'ga'; };
const objKind = (pos = S.player.pos) => pos === 'CDM' ? cdmKind() : ['LW', 'RW'].includes(pos) ? 'ga' : POS_GROUP[pos] === 'MID' ? (Math.random() < MID_GA ? 'ga' : 'assists') : ({ FWD: 'goals', DEF: 'tackles' }[POS_GROUP[pos]] || 'clean');

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

// What a full game in a position is worth towards an objective of this kind (clean sheets aside).
function objPerGame(kind, pos, str = teamStrength(myClub())) {
  const p = S.player, ovr = calcOVR();
  const tk = Math.max(TACKLE_FLOOR, 2 + ((p.attrs.DEF || 40) - 50) * .2) * (TACKLE_ROLE[pos] ?? 1);
  const g = (OBJ_RATE[pos] || .12) * clamp(Math.pow(ovr / str, 3), .5, 1.6), a = (OBJ_AST_RATE[pos] || .15) * clamp(Math.pow(ovr / str, 2), .5, 1.6);
  // Holding midfielders aren't there to score: their goals + assists target is 40% lower.
  return kind === 'tackles' ? tk : kind === 'ga' ? (g + a) * (pos === 'CDM' ? .6 : 1) : kind === 'gat' ? tk + g + a : kind === 'assists' ? a : g;
}
const objVetEase = (age = ageOf(S.player.by)) => Math.max(.6, 1 - Math.max(0, age - 34) * .08);
function makeObjective(span) {
  if (span === 'drill') return makeDrill();
  const p = S.player, to = Math.min(SEASON_WEEKS, span === 'season' ? SEASON_WEEKS : S.week + OBJ_SPAN[span].weeks - 1);
  const games = gamesBetween(S.week, to);
  if (games < 2) return null;
  const { start, subShare } = startChance();
  const play = clamp(start + (1 - start) * subShare * .35, .15, 1);
  // Targets are set for the position you are playing now (a new one you have taken on, too).
  const c = myClub(), str = teamStrength(c), pos = objRole(), kind = objKind(pos);
  let perGame;
  if (kind === 'clean') {
    // Clean sheets depend on how strong your team is compared with the rest of the league.
    const ids = league(c.league).clubs, avg = ids.reduce((s, id) => s + teamStrength(club(id)), 0) / ids.length;
    perGame = clamp(.25 + (str - avg) / 35, .1, .55);
  } else perGame = objPerGame(kind, pos, str);
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
  const target = Math.max(1, Math.floor(expected * (kind === 'tackles' ? .85 : kind === 'gat' ? .8 : .7) * objVetEase() * (adjusting() ? ADJUST_TARGETS : 1) + .3));
  return { span, kind, target, progress: 0, endWeek: to, games, pos, perGame: target / games };
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
  if (o.span === 'chance') settleChance(ok);
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
// After a chance is settled you wait a month to ask again. Hit three in a row at one club and the
// manager trusts you for good there: +40 points on your start chance, permanently.
const CHANCE_COOLDOWN = 4, CHANCE_STREAK = 3, CHANCE_BOOST = .4;
const chanceBoosted = () => (S.player.boostClubs || []).includes(S.player.club);
const chanceCooldown = () => Math.max(0, (S.player.chanceNext || 0) - absWeek());
const chanceObjective = () => (S.player.objectives || []).find(o => o.span === 'chance');
// From 34 a manager won't hand a veteran a run of games on request.
const CHANCE_MAX_AGE = 33;
function canAskChance() {
  const p = S.player;
  if (S.phase !== 'season' || ageOf(p.by) > CHANCE_MAX_AGE || p.loan || p.injured || p.needsContract || frozenOut() || p.chance > 0 || chanceObjective() || chanceCooldown()) return false;
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

// A chance has been settled: start the cooldown and count the streak.
function settleChance(ok) {
  const p = S.player;
  p.chanceNext = absWeek() + CHANCE_COOLDOWN;
  p.chanceStreak = ok ? (p.chanceStreak || 0) + 1 : 0;
  if (ok && p.chanceStreak >= CHANCE_STREAK && !chanceBoosted()) {
    p.boostClubs = [...(p.boostClubs || []), p.club];
    p.chanceStreak = 0;
    msg(`Three chances taken in a row. ${myClub().mgr} trusts you completely now: +${Math.round(CHANCE_BOOST * 100)}% start chance for as long as you are at ${myClub().name}.`, 'good');
    notify('good', 'He believes in you!', `You proved ${myClub().mgr} right three times in a row. Your start chance at ${myClub().name} is now ${Math.round(CHANCE_BOOST * 100)}% higher for good.`);
  }
}

// After each week: settle objectives whose window has closed and set the next ones.
function tickObjectives() {
  syncObjRole();
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
const eliteTopFlight = c => clubTier(c) === 1 && tierPrestige(c) >= .8;function topFlightOpen(c) {
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
// A club you left stays away for the rest of that season and the whole of the next one.
const LEFT_SEASONS = 2;
const leftRecently = id => id !== S.player.club && (S.player.career || []).some(r => r.clubId === id && r.season >= S.season - LEFT_SEASONS);
function coolingOff(id) {
  const p = S.player, w = absWeek();
  if (leftRecently(id)) return true;
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

// ---------- positions ----------
// Besides your main position you can pick up to three more (secondary, third, fourth) when the
// manager asks you to play somewhere new. Each season there is a 10–40% chance he asks, at a random
// point. Asked in the first 60% of the season, a yes makes it your main position from next season
// (the old one moves beside it); later, a yes just adds it beside your main position. Saying no
// costs affection and a little playing time for the rest of the season.
const POS_NEAR = {
  LW: ['ST', 'LM', 'RW'], RW: ['ST', 'RM', 'LW'], ST: ['LW', 'RW', 'CAM'], CAM: ['CM', 'ST', 'LW', 'RW'],
  CM: ['CDM', 'CAM', 'LM', 'RM'], CDM: ['CM', 'CB'], LM: ['LW', 'LB', 'CM'], RM: ['RW', 'RB', 'CM'],
  LB: ['LM', 'CB', 'RB'], RB: ['RM', 'CB', 'LB'], CB: ['CDM', 'LB', 'RB'], GK: [],
};
const MAX_ALTS = 3, POS_ASK_EARLY = .6, POS_REFUSE_START = .06;
const altPositions = (p = S.player) => p.alts || [];
// At the start of each season: will the manager ask this season, and when?
function planPositionAsk() {
  const p = S.player;
  p.posAsk = (POS_NEAR[p.pos] || []).length && Math.random() < rand(.1, .4) ? { season: S.season, week: Math.ceil(randi(1, 10) * SEASON_WEEKS / 10) } : null;
}
// Start enough games in the role his shape puts you in (a CM as a holder in a 4-2-3-1) and the
// manager asks you to make it your position, once a season for each role.
const SHAPE_ASK_STARTS = 8;
function maybeShapeAsk() {
  const p = S.player;
  if (S.decision || p.loan || p.injured || p.needsContract) return false;
  const c = myClub(), [role, n] = Object.entries(p.st.shapeApps || {}).sort((a, b) => b[1] - a[1])[0] || [];
  if (!role || n < SHAPE_ASK_STARTS || role === p.pos || role === p.nextPos || role === 'GK') return false;
  const key = `${S.season}|${role}`;
  if (p.shapeAsked === key) return false;
  p.shapeAsked = key;
  const early = S.week <= SEASON_WEEKS * POS_ASK_EARLY, name = POS_NAMES[role].toLowerCase();
  // Late in the season he can only add it beside your main position: nothing to ask if it already is.
  if (!early && altPositions().includes(role)) return false;
  S.decision = { type: 'position', to: role, early, text: early
    ? `You have started ${n} games as a ${name} in ${c.mgr}'s ${formationOf(c)}. He wants to make it your position: agree and it becomes your main position from next season, with ${POS_NAMES[p.pos].toLowerCase()} beside it.`
    : `You have started ${n} games as a ${name} in ${c.mgr}'s ${formationOf(c)}. He wants it added as one of your positions, beside ${POS_NAMES[p.pos].toLowerCase()}.` };
  return true;
}
function maybePositionAsk() {
  if (maybeShapeAsk()) return;
  const p = S.player, a = p.posAsk;
  if (!a || a.season !== S.season || S.week < a.week || S.decision || p.loan || p.injured || p.needsContract) return;
  p.posAsk = null;
  const pool = POS_NEAR[p.pos].filter(x => x !== p.nextPos);
  if (!pool.length) return;
  // He usually asks for a position you can already play, if one fits.
  const known = pool.filter(x => altPositions().includes(x)), to = known.length && Math.random() < .5 ? pick(known) : pick(pool);
  const early = S.week <= SEASON_WEEKS * POS_ASK_EARLY;
  S.decision = { type: 'position', to, early, text: early
    ? `${myClub().mgr} wants to try you as a ${POS_NAMES[to].toLowerCase()}. Agree and it becomes your main position from next season, with ${POS_NAMES[p.pos].toLowerCase()} beside it.`
    : `${myClub().mgr} sees you as an option at ${POS_NAMES[to].toLowerCase()}. Agree and it is added beside your main position (${POS_NAMES[p.pos].toLowerCase()}).` };
}
function resolvePositionAsk(d, yes) {
  const p = S.player;
  if (!yes) {
    changeAff(-5);
    p.posRefused = S.season;
    msg(`You told ${myClub().mgr} you won't play ${POS_NAMES[d.to].toLowerCase()}. He is unhappy (−5) and you'll get a little less game time this season.`, 'bad');
    return;
  }
  changeAff(3);
  if (d.early) {
    p.nextPos = d.to;
    p.playPos = d.to;
    p.adjustUntil = absWeek() + ADJUST_WEEKS;
    msg(`You agreed to become a ${POS_NAMES[d.to].toLowerCase()}. You play there from the next match, and it becomes your main position next season. Affection +3.`, 'good');
  } else {
    addAltPosition(d.to);
    msg(`You can now play ${POS_NAMES[d.to].toLowerCase()} as well as ${POS_NAMES[p.pos].toLowerCase()}. Affection +3.`, 'good');
  }
}
function addAltPosition(pos) {
  const p = S.player;
  if (pos === p.pos) return;
  p.alts = [pos, ...altPositions().filter(x => x !== pos)].slice(0, MAX_ALTS);
}
// New season: a position you agreed to earlier takes over as your main one.
function applyNextPosition() {
  const p = S.player;
  if (!p.nextPos) return;
  const old = p.pos, oldOvr = calcOVR();
  p.pos = p.nextPos;
  delete p.nextPos;
  delete p.playPos;
  rebalanceAttrs(old, oldOvr);
  p.alts = [old, ...altPositions().filter(x => x !== old && x !== p.pos)].slice(0, MAX_ALTS);
  msg(`New season, new role: you are now a ${POS_NAMES[p.pos].toLowerCase()} (OVR ${calcOVR()}, was ${oldOvr} as a ${old}), with ${POS_NAMES[old].toLowerCase()} as a second position.`, 'good');
  notify('good', `Now a ${POS_NAMES[p.pos].toLowerCase()}`, `Your main position is now ${p.pos}. A summer of work in the new role reshaped your game: OVR ${calcOVR()}.`);
}

// A new main position reshapes your stats over the summer: they take on the new position's shape (a
// full-back is quick and a good defender, a centre-back strong and a great defender), keeping a
// little (15%) of what made you different, and your OVR drops by 1 at most (half the time not at all).
const SWITCH_MAX_DROP = 2, SWITCH_DROP = 1, SWITCH_KEEP = .15;
// Stats the position doesn't count (a winger's Defending) still drift towards its shape over the
// summer, 90% of the way: a converted defender playing wide keeps a little bite, but not 91 Defending.
const UNUSED_DRIFT = .9;
function shapeUnused(old = S.player.attrs) {
  const p = S.player, ovr = calcOVR();
  attrKeys(p.pos).filter(k => !(WEIGHTS[p.pos][k] > 0)).forEach(k => {
    p.attrs[k] = clamp(old[k] + UNUSED_DRIFT * (profileAttr(k, p.pos, ovr) - old[k]), 25, 99);
  });
}
function eaReshape() {
  const p = S.player;
  p.eaV = 3;
  if (!POS_PROFILE[p.pos]) return;
  const w = WEIGHTS[p.pos], old = { ...p.attrs }, oldOvr = Math.min(MAX_OVR, Math.round(rawOVR() - POS_LIFT[p.pos]));
  attrKeys(p.pos).forEach(k => { p.attrs[k] = clamp(profileAttr(k, p.pos, oldOvr) + (w[k] > 0 ? .5 : .25) * (old[k] - POS_LIFT[p.pos] - profileAttr(k, p.pos, oldOvr)), 25, 99); });
  const used = attrKeys(p.pos).filter(k => w[k] > 0);
  for (let i = 0; i < 8; i++) {
    const diff = oldOvr - rawOVR();
    if (Math.abs(diff) < .3) break;
    used.forEach(k => { p.attrs[k] = clamp(p.attrs[k] + diff, 25, 99); });
  }
  if (p.rebalanceV) p.rebalanceV = 3;
}
// Moves your stats from an older shape to the current one, keeping the OVR (unrounded): they follow
// the new shape closely, keeping only a little (15%) of what made you different in the stats that count.
function shapeReshape(OLD) {
  const p = S.player;
  p.eaV = 3;
  if (!OLD || !POS_PROFILE[p.pos]) return;
  const w = WEIGHTS[p.pos], old = { ...p.attrs };
  const oldLift = -Object.keys(w).reduce((s, k) => s + w[k] * (OLD[k] || 0), 0);
  const target = Object.keys(w).reduce((s, k) => s + w[k] * old[k], 0) + oldLift;
  attrKeys(p.pos).forEach(k => { p.attrs[k] = clamp(profileAttr(k, p.pos, target) + (w[k] > 0 ? .15 : 0) * (old[k] - target - (OLD[k] || 0)), 25, 99); });
  const used = attrKeys(p.pos).filter(k => w[k] > 0);
  for (let i = 0; i < 8; i++) {
    const diff = target - rawOVR();
    if (Math.abs(diff) < .05) break;
    used.forEach(k => { p.attrs[k] = clamp(p.attrs[k] + diff, 25, 99); });
  }
}
function rebalanceAttrs(fromPos, fromOvr) {
  const p = S.player, keys = attrKeys(p.pos), old = { ...p.attrs };
  if (!POS_PROFILE[p.pos] || !POS_PROFILE[fromPos]) return;
  const target = Math.min(MAX_OVR, Math.max(1, fromOvr - randi(0, SWITCH_DROP)));
  const used = keys.filter(k => WEIGHTS[p.pos][k] > 0);
  used.forEach(k => { p.attrs[k] = clamp(profileAttr(k, p.pos, target) + SWITCH_KEEP * (old[k] - profileAttr(k, fromPos, fromOvr)), 25, 99); });
  // Level it to the target OVR (a few passes, as stats are kept between 25 and 99).
  for (let i = 0; i < 8; i++) {
    const diff = target - rawOVR();
    if (Math.abs(diff) < .3) break;
    used.forEach(k => { p.attrs[k] = clamp(p.attrs[k] + diff, 25, 99); });
  }
  shapeUnused(old);
  p.rebalanced = S.season;
  p.rebalanceV = 3;
}

// ---------- shirt numbers ----------
// Every club squad wears numbers the usual way: 1 in goal, 2 and 3 the full-backs, 4 and 5 the
// centre-backs, 6 the holding midfielder, 8 the central midfielder, 10 the playmaker, 7 and 11 the
// wingers, 9 the striker. The better player gets the classic number; backup keepers get 13, 25 or
// 31; everyone else a free number from 12 up. You pick a free number when you join a club.
const SHIRT_PREF = { GK: [1], RB: [2], LB: [3], CB: [4, 5, 15], CDM: [6, 16], CM: [8, 14], CAM: [10, 20], RM: [7, 17], LM: [11, 18], RW: [7, 17], LW: [11, 18], ST: [9, 19] };
const BACKUP_GK = [13, 25, 31, 12, 30];
// Second choices when the classic numbers are taken, offered first in the picker.
const SHIRT_ALT = { GK: [], RB: [12, 22, 24, 32], LB: [12, 21, 23, 26], CB: [6, 23, 24, 33], CDM: [16, 18, 21, 28], CM: [16, 18, 20, 21], CAM: [20, 21, 22, 30], RM: [17, 27, 47], LM: [18, 23, 28], RW: [17, 27, 77], LW: [18, 21, 27], ST: [19, 29, 39, 99] };
function squadNumbers(c) {
  if (!c || !c.players) return;
  const taken = new Set(c.players.filter(pl => pl.no).map(pl => pl.no));
  const mine = S.player.shirt && S.player.shirt.club === c.id ? S.player.shirt.no : null;
  if (mine) taken.add(mine);
  c.players.filter(pl => !pl.no).sort((a, b) => b.r - a.r).forEach(pl => {
    const prefs = pl.pos === 'GK' && taken.has(1) ? BACKUP_GK : SHIRT_PREF[pl.pos] || [];
    let no = prefs.find(n => !taken.has(n));
    for (let k = 0; !no && k < 200; k++) { const n = 12 + strHash(`${c.id}|${pl.n}|${k}`) % 33; if (!taken.has(n)) no = n; }
    pl.no = no || 99;
    taken.add(pl.no);
  });
}
// Numbers you can take at a club: 1 to 99, none a teammate wears. Those that suit your position first.
function freeShirts(c = myClub()) {
  squadNumbers(c);
  const taken = new Set(c.players.map(pl => pl.no));
  const pos = S.player.pos, pref = [...new Set([...(SHIRT_PREF[pos] || []), ...(pos === 'GK' ? BACKUP_GK : SHIRT_ALT[pos] || [])])].filter(n => !taken.has(n));
  const rest = Array.from({ length: 99 }, (_, i) => i + 1).filter(n => !taken.has(n) && !pref.includes(n));
  return { pref, rest };
}
const needShirt = () => { const p = S.player; return S.phase !== 'retired' && p.club && !p.needsContract && (!p.shirt || p.shirt.club !== p.club || p.shirt.repick); };
function pickShirt(no) {
  const p = S.player, c = myClub();
  const { pref, rest } = freeShirts(c);
  if (![...pref, ...rest].includes(no)) return false;
  p.shirt = { club: c.id, no };
  msg(`You will wear the number ${no} shirt at ${c.name}.`, 'good');
  save();
  return true;
}
// Known for a number: the shirt you wore in the most games, once that is 300 or more.
function signatureShirt(rec) {
  const games = {};
  (rec.career || []).forEach(r => { if (r.no) games[r.no] = (games[r.no] || 0) + r.apps; });
  const best = Object.entries(games).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 300 ? { no: +best[0], apps: best[1] } : null;
}

// A rare ask from a star teammate: a team-mate in great form wants your number. Each team-mate asks
// once at most. Say yes and you pick another free number, and the two of you click: your scoring
// and assist chances go up a touch while you play together. Say no and he sulks: chances drop a
// touch for 12 weeks.
const SHIRT_ASK_CHANCE = .004, SHIRT_CHEM = 1.03, SHIRT_SNUB = .98, SHIRT_SNUB_WEEKS = 12;
function shirtRequestWeek() {
  const p = S.player, c = myClub();
  if (S.decision || !p.shirt || p.shirt.club !== c.id || p.loan || Math.random() >= SHIRT_ASK_CHANCE) return;
  squadNumbers(c);
  const asked = p.shirtAsked = p.shirtAsked || [], strength = teamStrength(c);
  const star = c.players.filter(pl => !asked.includes(pl.n) && pl.no !== p.shirt.no && ((pl.g || 0) + (pl.as || 0) >= 6 || pl.r >= strength + 3)).sort((a, b) => b.r - a.r)[0];
  if (!star) return;
  asked.push(star.n);
  S.decision = { type: 'shirt', name: star.n, text: `${star.n} (${star.pos}, ${star.r}) has been flying this season and asks if he can have your number ${p.shirt.no} shirt. He will only ask once.` };
}
// Chemistry with team-mates over shirts: x1.03 while your shirt-swap partner is still at the club,
// x0.98 while a snubbed team-mate is still sulking.
function chemForm() {
  const p = S.player, c = p.club && S.clubs[p.club];
  let f = 1;
  if (p.shirtChem && c && p.shirtChem.club === c.id && c.players.some(pl => pl.n === p.shirtChem.name)) f *= SHIRT_CHEM;
  if (p.shirtSnub && c && p.shirtSnub.club === c.id && absWeek() < p.shirtSnub.until) f *= SHIRT_SNUB;
  return f;
}
// The other way round: you ask a team-mate for his shirt. He is likelier to say yes the better you
// are next to him and the bigger your name. Yes: you swap numbers and click on the pitch (as above).
// No: you are the one left sulking (as above). Each team-mate is asked once at most, either way.
const canAskShirt = () => { const p = S.player; return !!(p.shirt && p.shirt.club === p.club && !p.shirt.repick && !p.loan && S.phase !== 'retired'); };
const shirtAskOdds = pl => clamp(.35 + (calcOVR() - pl.r) * .04 + (S.player.rep || 0) / 400, .1, .85);
function askTeammateShirt(name) {
  const p = S.player, c = myClub(), mate = c.players.find(pl => pl.n === name), asked = p.shirtAsked = p.shirtAsked || [];
  if (!canAskShirt() || !mate || asked.includes(name)) return null;
  asked.push(name);
  const yes = Math.random() < shirtAskOdds(mate), mine = p.shirt.no, his = mate.no;
  if (yes) {
    mate.no = mine;
    p.shirt = { club: c.id, no: his };
    p.shirtChem = { club: c.id, name };
    msg(`${name} handed you his number ${his} shirt and took your ${mine}. You two click on the pitch now.`, 'good');
  } else {
    p.shirtSnub = { club: c.id, name, until: absWeek() + SHIRT_SNUB_WEEKS };
    msg(`${name} said no to giving up his number ${his}. You are not happy about it, and the dressing room can feel it.`, 'bad');
  }
  save();
  return { yes, name, his, mine };
}
function resolveShirtAsk(d, yes) {
  const p = S.player, c = myClub(), mate = c.players.find(pl => pl.n === d.name);
  if (yes && mate) {
    const old = mate.no;
    mate.no = p.shirt.no;
    p.shirt = { club: c.id, no: p.shirt.no, repick: true, free: old };
    p.shirtChem = { club: c.id, name: mate.n };
    msg(`You gave ${mate.n} your shirt. He won't forget it: you two click on the pitch now. Pick a new number.`, 'good');
  } else {
    p.shirtSnub = { club: c.id, name: d.name, until: absWeek() + SHIRT_SNUB_WEEKS };
    msg(`You kept your number. ${d.name} is not happy about it, and the dressing room can feel it.`, 'bad');
  }
}

function resolveDecision(choice) {
  const d = S.decision, p = S.player;
  if (!d) return;
  if (d.type === 'position') resolvePositionAsk(d, choice === 'accept');
  else if (d.type === 'shirt') resolveShirtAsk(d, choice === 'yes');
  else if (d.type === 'recall') {
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
  p.freeSince = absWeek();
  p.netAt = null;
  msg(`${c.mgr} has had enough. ${c.name} have terminated your contract. You are a free agent.`, 'bad');
  notify('bad', 'Contract terminated', `Manager affection fell to ${SACK_AFF}. ${c.name} have released you. Sign for a new club to keep playing.`);
  generateOffers(randi(2, 4), true);
}

// Free agents can look for a club at any time, once a week.
function findClubs() {
  const p = S.player, wk = S.season * 100 + S.week;
  if (!p.needsContract || p.lastSearch === wk) return false;
  p.lastSearch = wk;
  generateOffers(randi(1, 2), true);
  save();
  return true;
}

// ---------- free agency ----------
// Without a club no wage comes in, but the season goes on: each week clubs weigh you up, your
// agent works the phones, and offers on the table lapse after a few weeks.
const FA_OFFER_WEEKS = 3, FA_NET_WEEKS = 6, FA_COUNTER = 1.25, FA_TRAIN = .5, FA_RUST = .03;
const idleWeeks = () => S.player.freeSince == null ? 0 : Math.max(0, absWeek() - S.player.freeSince);
// What a club thinks a free agent is worth a week: the price for your OVR, position and age in its
// league (Salaries.xlsx, via marketWage or the veteran rules), moved by recent form (80% to 130%),
// and 3% less for every week without a club, down to 75%.
function freeValue(c, base) {
  const form = clamp(valueForm(S.player), .8, 1.3), idle = Math.max(.75, 1 - idleWeeks() * .03);
  return Math.max(minWage(c), Math.round(base * form * idle / 10) * 10);
}
// Your asking wage against the club's valuation: at or under it they pay what you ask, up to 25%
// over it they offer their valuation instead, beyond that they walk away (returns false).
function judgeAsk(o) {
  const p = S.player, c = club(o.club), val = freeValue(c, o.wage);
  o.value = val;
  o.faWeek = absWeek();
  if (!p.askWage) { o.wage = val; return true; }
  if (p.askWage <= val) { o.wage = Math.max(minWage(c), Math.round(p.askWage / 10) * 10); return true; }
  if (p.askWage <= val * FA_COUNTER) { o.wage = val; o.counter = true; return true; }
  (p.faRefused = p.faRefused || []).push(c.name);
  return false;
}
// The wage you would like as a free agent (0 clears it and takes what clubs think you are worth).
function setAskWage(v) {
  const p = S.player;
  if (!p.needsContract) return false;
  p.askWage = Math.max(0, Math.round((+v || 0) / 10) * 10);
  save();
  return true;
}
// A guide for the asking wage: what a club at your current level would pay you now.
function freeGuide() {
  const c = myClub();
  return c ? freeValue(c, marketWage(calcOVR(), c)) : 0;
}
// After six weeks with nothing on the table, a lower-league club offers a one-year deal at its
// usual rate, whatever you were asking.
function safetyNet() {
  const p = S.player, ovr = calcOVR();
  const open = c => c.id !== p.club && !isBanned(c.id) && !S.offers.some(o => o.club === c.id);
  let pool = Object.values(S.clubs).filter(c => open(c) && clubTier(c) >= 2 && teamStrength(c) <= ovr + 3).sort((a, b) => teamStrength(b) - teamStrength(a));
  if (!pool.length) pool = Object.values(S.clubs).filter(open).sort((a, b) => teamStrength(a) - teamStrength(b));
  const c = pick(pool.slice(0, 8));
  if (!c) return;
  const o = makeOffer(c, 'transfer');
  o.wage = freeValue(c, marketWage(ovr, c));
  o.years = 1;
  o.faWeek = absWeek();
  o.net = true;
  delete o.block; delete o.blockFee;
  S.offers.push(o);
  p.netAt = absWeek();
  msg(`${c.name} (${league(c.league).name}) will give you a way back: a one-year deal at ${money(o.wage)}/week.`, 'good');
  notify('good', 'A way back', `${c.name} have offered you a one-year deal at ${money(o.wage)}/week. Check the Contract tab.`);
}
// New interest each week: more with a better agent, less the longer you have been without a club.
function faWeekInterest() {
  const p = S.player, a = agent().offers, before = S.offers.length;
  p.faRefused = [];
  const top = a >= 1.3 ? 3 : a >= 1.1 ? 2 : 1, low = a >= 1.3 ? 1 : 0;
  const n = Math.max(0, randi(low, top) - Math.floor(idleWeeks() / 4));
  if (n) generateOffers(n, true);
  const got = S.offers.slice(before), counters = got.filter(o => o.counter).length, refused = p.faRefused.length;
  if (!S.offers.length && idleWeeks() >= FA_NET_WEEKS && (p.netAt == null || absWeek() - p.netAt >= FA_NET_WEEKS)) safetyNet();
  return { offers: got.length, counters, refused };
}

// One week without a club: the world plays on, you train, pay your bills and wait for calls.
function freeAgentWeek() {
  const p = S.player;
  if (S.phase !== 'season' || !p.needsContract) return null;
  if (p.freeSince == null) p.freeSince = absWeek();
  S.weekHalf = null;
  const report = { week: S.week, season: S.season, match: null, events: [], free: true };
  birthdayWeek(report);
  sponsorWeek();
  marketWeek();
  (p.oldLeases || []).filter(l => l.end <= absWeek()).forEach(l => msg(`Your lease on the ${HOUSING[l.house].name.toLowerCase()} in ${natName(l.nat)} has ended. No more rent to pay there.`, 'good'));
  syncHousing();
  for (const l of S.leagues) { const md = matchdayFor(l.id); if (md) for (const [h, a] of md) playFixture(h, a, null); }
  euroWeek(null);
  cupWeek(null);
  // No wage, but the bills keep coming.
  const net = weeklyNet();
  p.money += net;
  report.net = net;
  if (p.money < 0 && p.equip > 0) { p.equip = 0; msg('You could not pay for your training equipment, so you are back on normal kit.', 'bad'); }
  if (p.money < 0 && ((p.house > 0 && !ownedHere()) || (p.oldLeases || []).length)) {
    p.house = ownedHere() ? p.house : 0; p.leaseEnd = 0; p.oldLeases = [];
    msg('You ran out of money and had to move back into a shared flat.', 'bad');
  }
  if (p.injured) { p.injured--; if (!p.injured) msg('You are fit again.', 'good'); }
  // No games: after a fortnight out, match sharpness slowly fades.
  if (idleWeeks() >= 2) { nudgeOvr(-FA_RUST * declineFactor()); report.events.push('No games this week: a little sharpness lost'); }
  p.energy = clamp(p.energy + energyRegen(), 0, 100);
  p.slots = TRAIN_SLOTS;
  p.trainedThisWeek = 0;
  p.weekEquip = 0;
  // Offers don't wait for ever.
  const lapsed = S.offers.filter(o => o.faWeek != null && absWeek() - o.faWeek >= FA_OFFER_WEEKS - 1);
  if (lapsed.length) {
    S.offers = S.offers.filter(o => !lapsed.includes(o));
    msg(`${lapsed.map(o => club(o.club).name).join(', ')} moved on: ${lapsed.length > 1 ? 'their offers have' : 'the offer has'} lapsed.`, 'bad');
  }
  S.lastMatch = report;
  S.week++;
  if (S.week === CUP_WEEKS.playoff[0]) buildPlayoffs();
  if (S.week > SEASON_WEEKS) { endSeason(report); save(); return report; }
  const r = faWeekInterest();
  const bits = [`${r.offers} new offer${r.offers !== 1 ? 's' : ''}${r.counters ? ` (${r.counters} below your asking wage)` : ''}`];
  if (r.refused) bits.push(`${r.refused} club${r.refused > 1 ? 's' : ''} said your asking wage is too high (${p.faRefused.slice(0, 3).join(', ')}${r.refused > 3 ? ` and ${r.refused - 3} more` : ''})`);
  msg(`Week ${idleWeeks()} as a free agent: ${bits.join('; ')}.`, r.offers ? 'good' : 'info');
  report.events.push(...bits);
  save();
  return report;
}

// ---------- training ----------
function equipMult() { return EQUIP_TIERS[S.player.equip].mult; }

// No hidden potential cap: the only ceiling is 91 OVR, and the last points come slowly.
// Below 60 a young player levels up quicker; from 30 every point is harder to earn.
// Saudi and US football is less competitive: the money is big, the development is slow.
// MLS a further 30% slower than that.
const SLOW_GROWTH = { KSA: .6, USA: .42 };
// The last points are the hardest: every gain (training, games, the season review) is cut to 60% at
// 88 OVR, 40% at 89 and 25% at 90, on top of the usual slowdown near 91.
const ELITE_SLOW = { 88: .6, 89: .4, 90: .25 };
const eliteSlow = (ovr = calcOVR()) => ELITE_SLOW[Math.min(90, ovr)] ?? 1;
const GK_GROWTH = 1.25;
const leagueGrowth = (c = myClub()) => SLOW_GROWTH[league(c.league).nat] || 1;
function growthFactor(lowBoost = true) {
  const age = ageOf(S.player.by), ovr = calcOVR();
  const ageF = age <= 21 ? 1.2 : age <= 25 ? 1 : age <= 29 ? .75 : age <= VET_AGE ? .6 : Math.max(.1, .4 - (age - VET_AGE - 1) * .06);
  const low = !lowBoost ? 1 : ovr < 60 ? 2.2 : 1;
  // Keeper ratings are spread differently, so goalkeepers level up about 25% faster.
  return ageF * low * leagueGrowth() * clamp(Math.pow(Math.max(0, MAX_OVR - ovr) / 20, 1.3), .06, 1) * eliteSlow(ovr) * (S.player.pos === 'GK' ? GK_GROWTH : 1);
}

// High attributes get harder to raise, but a session always gives something until 91.
// A third of what training equipment adds is only banked on the pitch: the session gives the
// rest, and the held-back part waits for that week's games (see pitchXp).
const EQUIP_PITCH = 1 / 3;
// Positions spread their OVR differently: a centre-back's is 68% Defending, a wide midfielder's no
// more than 35% in any one stat, a keeper's 24%. Training is scaled so a session on your most
// important stat lifts OVR by the same amount whatever your position.
const TRAIN_BALANCE_REF = .42;
const trainBalance = (pos = S.player.pos) => clamp(TRAIN_BALANCE_REF / Math.max(...Object.values(WEIGHTS[pos])), .6, 1.75);
function trainGain(attr, part = 'train') {
  if (calcOVR() >= MAX_OVR) return 0;
  const p = S.player, v = p.attrs[attr];
  // Gains slow above 80, and for a stat already well above its usual level for your position.
  const over = POS_PROFILE[p.pos] ? (v - profileAttr(attr, p.pos, calcOVR()) - 4) * 2 : 0;
  const ceiling = 1 - Math.max(0, v - 80, over) / 25, extra = equipMult() - 1;
  const mult = part === 'pitch' ? extra * EQUIP_PITCH : 1 + extra * (1 - EQUIP_PITCH);
  if (part === 'pitch' && !extra) return 0;
  return Math.max(part === 'pitch' ? 0 : .01, .06 * mult * (S.player.needsContract ? FA_TRAIN : 1) * growthFactor() * Math.max(.1, ceiling) * (S.player.energy < 30 ? .6 : 1) * trainBalance());
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
  // The week's running cost follows the best kit you trained with, even if you switch back down.
  p.weekEquip = Math.max(p.weekEquip || 0, p.equip);
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

// Not in your first season at a club, nor in the six months after signing a new contract there.
const justRenewed = () => S.player.renewedAt != null && absWeek() < S.player.renewedAt + NEG_LOCK_WEEKS;
const canAnnounce = () => (S.player.agent || 0) > 0 && S.player.wishSeason !== S.season && !S.player.loan && !newClub() && !justRenewed();

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
  if (offerLocked()) { agentSay(`Clubs will not bid while you are settling in at ${myClub().name}. ${c.name} will look again at the next window.`); return; }
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
// footballer's mansion around the big clubs (London, Madrid, Milan, Munich, Paris, Lisbon, Amsterdam, Brussels,
// LA and Miami, Riyadh, Istanbul). Upkeep is about 1% of the price a year, paid monthly.
const HOUSE_PRICE = {
  ENG: [0, 450000, 1400000, 4000000, 12000000],
  ESP: [0, 300000, 900000, 2500000, 7000000],
  ITA: [0, 300000, 850000, 2400000, 6500000],
  GER: [0, 380000, 1000000, 2600000, 6000000],
  FRA: [0, 450000, 1300000, 3500000, 9000000],
  POR: [0, 250000, 650000, 1600000, 4000000],
  NED: [0, 400000, 1000000, 2400000, 5000000],
  BEL: [0, 350000, 900000, 2200000, 4500000],
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
const sponsorIncome = sponsorGross;
const agentCut = () => Math.round(S.player.wage * agent().cut);
// Kit running costs: the best kit you trained with this week, or the kit you have now if that is better.
const kitTier = () => Math.max(S.player.equip, S.player.weekEquip || 0);
const kitFee = () => EQUIP_TIERS[kitTier()].fee;
function weeklyCosts() { return rentNow() + upkeepNow() + kitFee() + agentCut() + carUpkeep(); }
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
// Knocks are 20% more common than that; serious injuries are scaled back so they happen as often as before.
const INJURY_UP = 1.2;
const injuryMult = () => clamp(1.15 - (physOf() - 50) * .015, .5, 1.45) * (youngBody() ? .55 : 1) * INJURY_EASE * (S.player.pos === 'GK' ? GK_INJURY : 1) * INJURY_UP;
// After one serious injury, a second in the same season is far less likely (40% of the usual odds).
const seriousChance = () => clamp(.12 - (physOf() - 60) * .0025, .03, .18) * (youngBody() ? .45 : 1) * INJURY_EASE
  * (S.player.seriousSeason === S.season ? .4 : 1) * (S.player.pos === 'GK' ? GK_SERIOUS : 1) / INJURY_UP;
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
// Ending a week under 30 energy makes an injury more likely (about 1.5 times the usual odds in a two-game week).
const TIRED_ENERGY = 30, TIRED_INJURY = .02, MATCH_ENERGY = 22;
// Energy left at the end of the week if you play every remaining game in full.
function weekEndEnergy(e = S.player.energy) {
  const efx = midweekFixture(), lg = !leagueDone() && nextFixture();
  let left = e;
  if (lg) left -= MATCH_ENERGY;
  if (efx && (!lg || e >= TWO_GAME_ENERGY)) left -= MATCH_ENERGY;
  return Math.max(0, Math.round(left));
}
// The league game of a two-game week has been played; the midweek game is next.
const leagueDone = () => !!(S.weekHalf && S.weekHalf.key === weekKey());

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

// The league team sheet is settled once per matchday: looking at it on the matchday screen and then
// playing the game give the same lineup.
function matchdaySelection(fx = nextFixture()) {
  const p = S.player, key = `${S.season}-${S.week}`;
  if (!p.preSel || p.preSel.key !== key) p.preSel = { key, sel: selection(false, fx && fx.opp) };
  rollWeekPos(p.preSel.sel);
  return p.preSel.sel;
}

// The midweek team sheet too, so the matchday screen shows the lineup you then play.
function cupSelection(efx = midweekFixture()) {
  const p = S.player, key = weekKey();
  if (!p.preCup || p.preCup.key !== key) p.preCup = { key, sel: selection(!efx.euro, efx.opp) };
  return p.preCup.sel;
}

// A starting keeper is never subbed for tactics: he plays the full 90 unless he is hurt
// during the game (rare), which then counts as that week's injury.
const GK_OFF_INJURED = .025;
function starterMins(lo = 75) {
  if (matchPos() !== 'GK') return { mins: randi(lo, 90), start: true };
  if (Math.random() < GK_OFF_INJURED) return { mins: randi(20, 80), start: true, offInjured: true };
  return { mins: 90, start: true };
}

function selection(domesticCup = false, opp = null) {
  const p = S.player;
  if (p.injured) return { mins: 0, start: false };
  let { start, subShare } = startChance();
  start = Math.max(start, rotationStart(domesticCup, opp));
  const r = Math.random();
  if (r < start) return starterMins();
  if (r < start + (1 - start) * subShare) return { mins: randi(12, 35), start: false };
  return { mins: 0, start: false };
}

function aiScorer(c) { return weightedPick(c.players, pl => GOAL_SHARE[pl.pos] * Math.pow(pl.r / 70, 8) + .001); }
function aiAssister(c, scorer) { return weightedPick(c.players.filter(pl => pl !== scorer), pl => ASSIST_SHARE[pl.pos] * Math.pow(pl.r / 70, 8) + .001); }

function recordResult(h, a, gh, ga) {
  const th = S.table[h], ta = S.table[a];
  th.p++; ta.p++; th.gf += gh; th.ga += ga; ta.gf += ga; ta.ga += gh;
  if (gh > ga) { th.w++; ta.l++; th.pts += 3; } else if (gh < ga) { ta.w++; th.l++; ta.pts += 3; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
  // Last five league results, oldest first ('W', 'D' or 'L'), for the table's form column.
  const rh = gh > ga ? 'W' : gh < ga ? 'L' : 'D';
  th.f = ((th.f || '') + rh).slice(-5);
  ta.f = ((ta.f || '') + (rh === 'W' ? 'L' : rh === 'L' ? 'W' : 'D')).slice(-5);
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
  // A manager rated above his squad gets more out of it; a weak one less.
  sh += mgrEdge(ch); sa += mgrEdge(ca);
  // A defender or holding midfielder on the pitch: following the plan keeps the shape (about 10% fewer
  // goals against), playing your own game leaves gaps (about 12% more).
  const shape = user && user.mins && TACKLERS.includes(matchRole()) ? (user.own ? 1.12 : user.follow ? .9 : 1) : 1;
  const homeMine = user && h === p.club;
  const gh = poisson(1.45 * Math.exp((sh - sa + 2) / 13) * (user && !homeMine ? shape : 1));
  const ga = poisson(1.15 * Math.exp((sa - sh - 2) / 13) * (homeMine ? shape : 1));
  mgrTargets(ch); mgrTargets(ca);
  recordResult(h, a, gh, ga);
  mgrAfterMatch(h, a, gh, ga);
  const scorers = [], onPitch = userMinutes(user);
  const credit = (c, goals, mine) => {
    const edge = mine && user.mins ? GA_SCALE * oppEdge(c, c.id === h ? ca : ch) : 1;
    for (let i = 0; i < goals; i++) {
      let s = null, myAssist = false, goal = null;
      if (mine && user.mins) {
        const teamStr = teamStrength(c);
        const pGoal = clamp(GOAL_SHARE[matchRole()] * Math.pow(ovr / teamStr, 3) * user.mins / 90 * (user.own ? 1.3 : 1) * matchForm() * scoreFactor() * footGoal() * edge, 0, .7);
        if (Math.random() < pGoal) { user.goals++; goal = { n: p.name, me: true, home: c.id === h, min: randi(...onPitch) }; }
        else {
          const pAst = clamp(ASSIST_SHARE[matchRole()] * Math.pow(ovr / teamStr, 2) * user.mins / 90 * 1.3 * (user.own ? 1.3 : 1) * matchForm() * assistFactor() * footAssist() * edge, 0, .7);
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
  const g = POS_GROUP[matchRole()];
  let r = 6.4 + (calcOVR() - teamStr) / 30 + user.goals * .9 + user.assists * .6;
  r += gf > gaa ? .3 : gf < gaa ? -.3 : 0;
  if ((g === 'GK' || g === 'DEF') && gaa === 0 && user.mins >= 60) r += .6;
  if (g === 'GK' || g === 'DEF') r -= gaa * .15;
  // Every save lifts a keeper's rating, so a busy, solid afternoon scores well.
  if (g === 'GK') r += (user.saves || 0) * .18;
  if (p.energy < 30) r -= .4;
  r -= vetYears() * .06; // a step slower every year past 33
  r -= rustPenalty(); // short of match sharpness after an injury
  if (adjusting()) r -= ADJUST_RATING; // still learning a new position
  // Pace keeps you in the game for every outfield role: a quick player stands out, a slow one is exposed.
  if (p.pos !== 'GK') r += clamp((p.attrs.PAC - typicalAttr('PAC')) * .012, -.35, .35);
  r += gauss() * .45;
  if (user.mins < 45) r = 6 + (r - 6) * .6;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

// Your stats, form, fitness, reputation, OVR and objectives after a game you played in.
// Tackles in one game: mostly your Defending stat, scaled by position and minutes. A
// defender with 80 Defending averages about 8 over 90 minutes; keepers make none.
// Even with little Defending, a player in the role still wins the odd ball: about 2 a game as a holder.
const TACKLE_FLOOR = 2;
const TACKLE_ROLE = { CB: 1, LB: 1, RB: 1, CDM: 1.1, CM: .5, LM: .35, RM: .35, CAM: .25, LW: .25, RW: .25, ST: .15, GK: 0 };
function matchTackles(user, p = S.player) {
  const role = TACKLE_ROLE[p === S.player ? matchRole() : p.pos] || 0;
  if (!role || !user.mins) return 0;
  // Playing your own game you fly into more challenges (+15%); sticking to the plan, a few fewer (−10%).
  const plan = TACKLERS.includes(p === S.player ? matchRole() : p.pos) ? (user.own ? 1.15 : user.follow ? .9 : 1) : 1;
  const learning = p === S.player ? adjustForm() : 1;
  const base = Math.max(TACKLE_FLOOR, 2 + ((p.attrs.DEF || 40) - 50) * .2) * role * user.mins / 90 * (p === S.player ? tackleFactor() : 1) * plan * learning;
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
  line.apps++; line.goals += user.goals; line.assists += user.assists; line.rsum += rating; line.mins = (line.mins || 0) + (user.mins || 0);
  // Every game counts towards the position you played in it (for the retirement Icon card).
  const mp = matchRole(); st.posApps = st.posApps || {}; st.posApps[mp] = (st.posApps[mp] || 0) + 1;
  // Games the manager's shape put you in another role: enough of them and he asks you to switch.
  if (mp !== matchPos() && user.start && !planBWeek(myClub())) { st.shapeApps = st.shapeApps || {}; st.shapeApps[mp] = (st.shapeApps[mp] || 0) + 1; }
  addComp(st.comps = st.comps || {}, comp ? comp.name : league(myClub().league).name, comp ? comp.kind : 'league', 1, user.goals, user.assists, rating, user.mins || 0);
  if (!cup && user.start) st.starts++;
  const conceded = isHome ? res.ga : res.gh;
  const clean = conceded === 0 && ['GK', 'DEF'].includes(POS_GROUP[p.pos]) && user.mins >= 60;
  if (clean && !cup) st.clean++;
  if (clean || (conceded === 0 && mp === 'CDM' && user.mins >= 60)) st.cleanAll = (st.cleanAll || 0) + 1;
  const tk = matchTackles(user);
  user.tackles = tk;
  st.tackles = (st.tackles || 0) + tk;
  user.clean = clean;
  st.saves = (st.saves || 0) + sv;
  notifyHaul(user, comp ? comp.name : league(myClub().league).name);
  if (rating >= 8.3) { if (!cup) st.motm++; report.events.push(cup ? 'Player of the Match in the cup!' : 'Player of the Match!'); }
  p.form.push(rating); p.form = p.form.slice(-5);
  p.energy -= Math.round(user.mins / 90 * MATCH_ENERGY);
  addRep((rating - 6.4) * .5 * (0.6 + clubPrestige(myClub())) * (cup ? 1.3 : 1) + user.goals * .25);
  changeAff(rating >= 7.5 ? 2 : rating >= 7 ? 1 : rating < 6 ? -2 : 0);
  nudgeOvr(perfDelta(rating, user));
  derbyStakes(user, res, isHome, report);
  renewTaskGame(user, clean);
  // Goals, assists, tackles and clean sheets in every competition count towards objectives.
  const OBJ_SCALED = ['goals', 'assists', 'tackles', 'ga', 'gat'];
  (p.objectives || []).forEach(o => {
    o.progress += o.kind === 'goals' ? user.goals : o.kind === 'assists' ? user.assists : o.kind === 'tackles' ? user.tackles || 0
      : o.kind === 'ga' ? user.goals + user.assists : o.kind === 'gat' ? user.goals + user.assists + (user.tackles || 0) : o.kind === 'clean' && clean ? 1 : 0;
    // Asked to play out of position in a league game: the manager lowers the target by what that
    // game was worth less there (a full-back in midfield makes fewer tackles).
    const played = matchRole();
    if (!cup && o.pos && o.perGame && played !== o.pos && OBJ_SCALED.includes(o.kind)) {
      const r = Math.min(1, objPerGame(o.kind, played) / Math.max(.01, objPerGame(o.kind, o.pos)));
      if (r < 1) {
        o.targetF = Math.max(1, (o.targetF ?? o.target) - o.perGame * (1 - r) * user.mins / 90);
        o.target = Math.max(1, Math.round(o.targetF));
        o.oop = (o.oop || 0) + 1;
      }
    }
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
// Your birthday falls in this game week: a message, and your age ticks over.
function birthdayWeek(report) {
  const p = S.player;
  if (!p.birth) return;
  const [y, m, d] = p.birth.split('-').map(Number), from = weekDate(), to = new Date(from.getTime() + 7 * DAY);
  for (const yr of [from.getUTCFullYear(), to.getUTCFullYear()]) {
    const day = new Date(Date.UTC(yr, m - 1, d));
    if (day >= from && day < to) {
      const age = yr - y;
      msg(`Happy birthday! You turned ${age} on ${fmtDate(day)}.`, 'good');
      notify('good', `Happy ${age}${ordinal(age)} birthday!`, `The squad sang for you at training. You turned ${age} on ${fmtDate(day)}.`);
      report.events.push(`Turned ${age} this week`);
      return;
    }
  }
}

// Your part in the midweek game: rested if the weekend left you too tired for two games, out if
// injured, otherwise the team sheet. user/weekEnergy are the league game's, if there was one.
function midweekUser(efx, user, weekEnergy) {
  const p = S.player;
  if (user && user.mins && weekEnergy < TWO_GAME_ENERGY) return { mins: 0, start: false, goals: 0, assists: 0, rested: true };
  return { ...(p.injured || (user && user.offInjured) ? { mins: 0, start: false } : cupSelection(efx)), goals: 0, assists: 0 };
}
// The midweek game is played in this step of the week (a league game still to come is played first).
// Returns your part in it, or null.
function midweekNow() {
  const p = S.player;
  if (S.phase !== 'season' || p.needsContract) return null;
  const half = leagueDone() ? S.weekHalf : null, efx = midweekFixture();
  if (!efx || (!half && nextFixture())) return null;
  return { efx, user: midweekUser(efx, half ? half.user : null, half ? half.weekEnergy : p.energy) };
}

function advanceWeek() {
  const p = S.player;
  if (S.phase !== 'season' || p.needsContract) return null;
  const report = { week: S.week, season: S.season, match: null, events: [] };
  // A week with a league game and a midweek game is played in two steps: the league game on Saturday,
  // then the midweek game on its own day. The second step picks up where the first left off.
  const half = leagueDone() ? S.weekHalf : null;
  S.weekHalf = null;
  const fx = half ? null : nextFixture();
  let weekEnergy = p.energy, user = null;
  if (half) { user = half.user; weekEnergy = half.weekEnergy; }
  else {
  birthdayWeek(report);
  sponsorWeek();
  marketWeek();
  (p.oldLeases || []).filter(l => l.end <= absWeek()).forEach(l => msg(`Your lease on the ${HOUSING[l.house].name.toLowerCase()} in ${natName(l.nat)} has ended. No more rent to pay there.`, 'good'));
  syncHousing();

  if (fx) {
    // Manager's fitness brief: count the matchdays you turn up fresh for.
    if (!p.injured) (p.objectives || []).forEach(o => { if (o.kind === 'energy' && p.energy >= o.min) o.progress++; });
    else p.st.missed = (p.st.missed || 0) + 1;
    user = { ...matchdaySelection(fx), goals: 0, assists: 0 };
    tellWeekPos(false);
    if (user.start) tellShapeRole();
    S.player.preSel = null;
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
      if (user.own && TACKLERS.includes(matchRole())) {
        // Defenders and holding midfielders are judged on what they are there for: a clean sheet and a
        // decent number of tackles (5, or 4 for a holding midfielder).
        const kept = (fx.isHome ? res.ga : res.gh) === 0, busy = (user.tackles || 0) >= DECENT_TACKLES[matchRole()];
        if (kept && busy) { changeAff(2); report.events.push(`You ignored the plan, but a clean sheet and ${user.tackles} tackles won him over. Affection +2`); }
        else if (kept || busy) { changeAff(-2); report.events.push(`You ignored the plan. ${kept ? 'A clean sheet' : `${user.tackles} tackles`}, but not enough to please him: affection −2`); }
        else { changeAff(-6); report.events.push("You ignored the manager's plan: no clean sheet and too few tackles. He is furious: affection −6"); }
      } else if (user.own) {
        // He forgives a goal in a win; a goal in a draw or defeat still annoys him a little.
        const won = fx.isHome ? res.gh > res.ga : res.ga > res.gh;
        // A goal or an assist both count as making it pay off.
        const ga = user.goals + user.assists;
        if (ga && won) { changeAff(2); report.events.push('You ignored the plan, but your goal or assist helped win the game. Affection +2'); }
        else if (ga) { changeAff(-2); report.events.push('You ignored the plan. You got a goal or assist, but the team didn\x27t win: affection −2'); }
        else if (won) { changeAff(-2); report.events.push('You ignored the plan and got no goal or assist, but the team won. He lets it slide a little: affection −2'); }
        else { changeAff(-6); report.events.push('You ignored the manager\x27s plan and got no goal or assist. He is furious: affection −6'); }
      }
    }
    if (p.promise > 0) p.promise--;
    if (p.chance > 0) p.chance--;
    S.results.unshift(resultRow(res, fx.isHome, user, league(myClub().league).name, 'league'));
  }
  p.order = null;
  // Stop after the league game when there is a midweek game to come.
  if (fx && midweekFixture()) { S.weekHalf = { key: weekKey(), user, weekEnergy }; return report; }
  }

  // Midweek cup game (European or domestic), picked on how fresh you are after the weekend.
  const efx = midweekFixture();
  // Two games in a week takes 50+ energy at the start of it; otherwise you play only the league game.
  const tooTired = efx && user && user.mins && weekEnergy < TWO_GAME_ENERGY;
  const cupUser = efx ? midweekUser(efx, user, weekEnergy) : null;
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
    // Each training session this week adds a small risk (a third of what it used to be).
    const trainPart = (p.trainedThisWeek || 0) * .001;
    const raw = .009 + (p.energy < TIRED_ENERGY ? TIRED_INJURY : 0) + trainPart + (user && user.mins ? .008 : 0) + (cupUser && cupUser.mins ? .008 : 0);
    const chance = raw * (1 - .1 * p.equip) * (1 + vetYears() * .04) * injuryMult();
    const offHurt = [user, cupUser].find(u => u && u.mins && u.offInjured);
    if (offHurt) report.events.push(`Went off injured after ${offHurt.mins} minutes`);
    if (offHurt || Math.random() < chance) {
      // Most knocks are short; a strong body makes a serious one rarer.
      const serious = Math.random() < seriousChance();
      if (serious) p.seriousSeason = S.season;
      p.injured = serious ? randi(8, 20) : randi(1, 6);
      p.injLen = p.injured;
      p.rust = 0;
      const kind = serious ? pick(['torn knee ligament', 'broken foot', 'torn hamstring', 'ruptured achilles', 'fractured ankle']) : pick(['hamstring strain', 'ankle sprain', 'calf tightness', 'knee knock', 'groin strain', 'thigh bruise']);
      // The training share of the risk decides whether it happened in training.
      const inTraining = !offHurt && Math.random() < trainPart / raw;
      const where = inTraining ? ' in training' : '', wk = `${p.injured} week${p.injured > 1 ? 's' : ''}`;
      msg(`Injury${where}: ${kind}. Out for ${wk}.`, 'bad');
      notify('bad', (serious ? 'Serious injury' : 'Injured') + where, `You picked up a ${kind}${where} and will be out for ${wk}.${inTraining ? ' Every training session carries a small risk.' : ''}${serious ? ' Missing a big part of the season will cost you OVR.' : ''}`);
      report.events.push(`Injured${where} for ${wk}`);
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
  p.weekEquip = 0;
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
  mgrWeek();
  callUpWeek();
  dropEarlyRenewals();
  checkContractBoost();
  veteranRenewal();
  loyaltyOffer();
  inquiryWeek();
  renewTaskWeek();
  noteRenewal();
  shirtRequestWeek();
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
    maybePositionAsk();
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

// A manager who adores a veteran (affection 95+, age 33+) usually offers an extension himself,
// in the last season of his contract.
function veteranRenewal() {
  const p = S.player;
  if (S.week !== 30 || p.loan || p.vetAsked === S.season || p.years > 1 || ageOf(p.by) <= VET_AGE || effAff() < 95) return;
  if (S.offers.some(o => o.type === 'renew')) return;
  p.vetAsked = S.season;
  if (Math.random() >= .7 * renewOdds() * payOdds()) return;
  S.offers.push(makeOffer(myClub(), 'renew', 0, false, true));
  msg(`${myClub().mgr} wants you to stay and has offered you a new contract.`, 'good');
  notify('good', 'The manager wants you to stay', `${myClub().mgr} came to you with a new contract. Check your Home screen.`);
}

// New contracts are only talked about in the last season of your deal: the club won't offer one
// earlier, and you can't ask for one earlier.
const lastYear = () => S.player.years <= 1;
// A renewal on the table from before this rule (or a board task for one) goes away until then.
// Remember that your club put a new contract on the table in the last season of your deal. If it
// never did, it doesn't come looking for you once you are a free agent either.
function noteRenewal() {
  const p = S.player;
  if (!p.loan && lastYear() && S.offers.some(o => o.type === 'renew' && !o.raise && o.club === p.club)) p.renewSeen = S.season;
}
function dropEarlyRenewals() {
  const p = S.player;
  if (lastYear() || p.needsContract) return;
  const had = S.offers.some(o => o.type === 'renew' && !o.raise);
  S.offers = S.offers.filter(o => o.type !== 'renew' || o.raise);
  if (had) msg(`${myClub().name} will talk about a new contract in the last season of your deal.`, 'info');
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
  if (p.loan || p.years < 1 || !lastYear() || ovr - p.ovrAtSign < 4 || effAff() < 45 || clubTalksLocked()) return;
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
  if (p.loan || p.needsContract || !lastYear() || !loyalAge() || clubTalksLocked() || S.offers.some(o => o.type === 'renew')) return;
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

// How badly a club needs a player like you (0–1): nobody near your level in your position, or too
// few players there to fill their shape. The more desperate, the likelier they overpay.
function desperation(c) {
  const g = POS_GROUP[S.player.pos], slots = formationSlots(c, g), ovr = calcOVR();
  const rs = c.players.filter(pl => POS_GROUP[pl.pos] === g).map(pl => pl.r).sort((a, b) => b - a);
  const best = rs[0] ?? 40, weakest = rs[slots - 1] ?? 40, short = Math.max(0, slots + 1 - rs.length);
  return clamp(clamp((ovr - weakest - 3) / 10, 0, 1) * .6 + clamp((ovr - best) / 8, 0, 1) * .3 + Math.min(short, 2) * .2, 0, 1);
}
// A desperate buying club breaks its usual limits: 20–45% above the normal bid, an extra round of talks.
const DESPERATE_PAY = [1.2, 1.45];

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
  const desperate = type === 'transfer' && !fixedWage && fa == null && Math.random() < desperation(c) * .6;
  const wage = Math.max(minWage(c), fixedWage || (desperate ? Math.round(Math.max(market, marketWage(ovr, c)) * rand(...DESPERATE_PAY) / 10) * 10 : market));
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
  // A new deal with your own club always runs at least a season past the one you are on.
  if (type === 'renew' && c.id === S.player.club) years = Math.max(years, (S.player.years || 0) + (S.phase === 'season' ? 0 : 1));
  // A loyalty deal (only when the club or manager comes to you, aged 20 to 28): 25% above your
  // current wage or your market value, whichever is higher, with a clause of 2–3 seasons with no bids from other clubs and no salary talks.
  // Its wage cannot be negotiated.
  const clause = loyalty && type === 'renew' && age >= CLAUSE_AGES[0] && age <= CLAUSE_AGES[1] && S.player.wage > 0 && !fixedWage ? randi(2, 3) : 0;
  if (clause) years = Math.min(5, Math.max(years, clause + (S.phase === 'season' ? 1 : 0)));
  const clauseBase = Math.max(S.player.wage, marketWage(ovr, c));
  const clauseWage = clause ? Math.round(Math.min(clauseBase * (1 + CLAUSE_RAISE), richLeague(c) ? Infinity : Math.max(clauseBase, WAGE_MAX[POS_GROUP[S.player.pos]])) / 10) * 10 : 0;
  let status = squadStatus(c, ovr), promised = false;
  // Veterans are offered smaller roles whatever their form, and for a lot less money: a starter at
  // most at 33–34, rotation at 35, and a reserve from 36 (rotation if still 85+). Loyalty deals aside.
  // Saudi, MLS and Portuguese top-flight clubs sign veterans to play them: no age cap on the role there.
  const vetHub = type === 'transfer' && age >= VET_AGE && clubTier(c) === 1 && !bigTopFlight(c);
  let cap = clause || vetHub ? null : vetRoleCap(age, ovr);
  // From 33 a top-flight club (Saudi, MLS and Portugal aside) that buys you only offers rotation.
  if (cap && type === 'transfer' && bigTopFlight(c) && ROLE_RANK[cap] > ROLE_RANK.Rotation) cap = 'Rotation';
  const capped = cap && ROLE_RANK[status] > ROLE_RANK[cap];
  if (capped) status = cap;
  const ageCut = clause || fixedWage ? 1 : VET_WAGE_CUT[Math.min(age, 37)] || 1;
  // Buying clubs sometimes promise a starting place, more often when you are close to their level. Never
  // a place the veteran role cap rules out.
  if (type === 'transfer' && (status === 'Rotation' || status === 'Reserve') && !(cap && ROLE_RANK[cap] < ROLE_RANK.Starter) && Math.random() < clamp(.45 - (teamStrength(c) - ovr) * .04, .1, .6)) {
    status = 'Starter';
    promised = true;
  }
  // A veteran within 5 of their team rating is signed as a promised starter, anyone else for rotation.
  if (vetHub && ROLE_RANK[status] < ROLE_RANK.Starter) {
    if (ovr >= teamStrength(c) - 5) { status = 'Starter'; promised = true; } else status = 'Rotation';
  }
  // Buying clubs only haggle a set number of times (1 to 3) before walking away.
  const maxRounds = (type === 'transfer' ? randi(1, 3) : 2) + ((S.player.agent || 0) >= 4 ? 1 : 0) + (desperate ? 1 : 0);
  // A release clause: 65% of transfers, and every renewal the club offers you itself (other than a
  // loyalty deal).
  // Above the lowest division every contract has one, of at least a year.
  let block = clause ? 0 : Math.min(years, type === 'transfer' ? (Math.random() < BLOCK_CHANCE ? blockYears() : 0) : clubOffer ? blockYears() : 0);
  if (!clause && !block && clubTier(c) < 3) block = Math.min(years, 1);
  return { id: Math.random().toString(36).slice(2, 9), club: c.id, type, wage: clauseWage || Math.max(minWage(c), Math.round(wage * ageCut / 10) * 10), years, status, ...(capped ? { roleCap: status } : {}), promised, week: S.week, season: S.season, rounds: 0, maxRounds, pen: 0, ...(desperate ? { desperate: true } : {}), ...(fixedWage ? { prime: true } : {}), ...(clause ? { clause } : {}), ...(block ? { block, blockFee: breachFee(c, years) } : {}) };
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
// Offers your club makes itself: a loyalty clause stops you asking, not the club coming to you, once
// six months have passed since you last signed.
const clubTalksLocked = () => negLocked() && !(clauseActive() && S.player.clauseKind === 'loyal' && absWeek() >= (S.player.renewedAt || 0) + NEG_LOCK_WEEKS);

// ---------- release clauses ----------
// A release clause blocks any move and salary talks for 2 years (50% of the time), 3 (30%) or 4 (20%),
// never longer than the contract itself. Other clubs
// can only reach you through your agent. Breaking it costs a fee set by your transfer value when you sign.
const BLOCK_CHANCE = .65;
const blockYears = () => { const r = Math.random(); return r < .5 ? 2 : r < .8 ? 3 : 4; };
// The fee is 1.5 to 2 times your value under the new deal (its club and length).
function breachFee(c, years) {
  const v = playerValue({ ...S.player, club: c.id, loan: null, years, needsContract: false });
  const fee = v * rand(1.5, 2), step = fee >= 1e6 ? 1e5 : 1e4;
  return Math.round(fee / step) * step;
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
// Your whole first season at a new club: no asking for a new contract and no sounding out other
// clubs. Join in summer and it lasts that coming season; join in January and it runs to the summer.
const newClubLock = () => ((S.phase === 'offseason' ? S.season + 1 : S.season) + 1) * SEASON_WEEKS + 1;
const newClub = () => (S.player.newClubUntil || 0) > absWeek();
// Just signed (a new club this season, or a renewal in the last six months): your agent won't shop you around yet.
const justSigned = () => newClub() || absWeek() < (S.player.renewedAt || 0) + NEG_LOCK_WEEKS;
const canSoundOut = () => blockActive() && inWindow() && S.player.soundedAt !== windowKey() && !justSigned() && !offerLocked();
function soundOut() {
  const p = S.player;
  if (!canSoundOut()) return null;
  p.soundedAt = windowKey();
  const ovr = calcOVR(), reach = ovr + 2 + p.rep / 30;
  const pool = Object.values(S.clubs).filter(c => c.id !== p.club && !isBanned(c.id) && topFlightOpen(c) && !leftRecently(c.id) && !inquiries().some(q => q.club === c.id)
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
  notify('talks', 'Talks are on!', `${c.name} are talking to ${myClub().name} about you right now. Now decide how the ${money(clauseFeeNow())} release fee gets paid.`);
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
  const p = S.player, q = inquiries().find(x => x.id === id), fee = clauseFeeNow();
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
  const o = askedOffer();
  S.offers.push(o);
  const what = o.raise ? 'a pay rise' : 'a new contract';
  msg(`You did what the board asked (${renewTaskText(t)}). ${myClub().name} have offered you ${what}.`, 'good');
  notify('good', 'Task complete!', `The board kept their word: ${myClub().name} have offered you ${what}.`);
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

// Goals + assists in all competitions: the better of last season and this one so far.
const STAR_GA = 50;
function seasonGA() {
  const p = S.player, last = (p.career || []).at(-1), st = p.st;
  const now = st ? st.goals + st.assists + (st.cup ? st.cup.goals + st.cup.assists : 0) : 0;
  return Math.max(now, last ? last.goals + last.assists : 0);
}

function generateOffers(count, guarantee = false) {
  const p = S.player, ovr = calcOVR(), { breakout, rising, silver } = scoutBuzz();
  // Free agents always hear from someone; otherwise clubs leave you to settle in for a year, agent
  // calls included. Under a release clause, clubs that would have bid get in touch with your agent instead.
  const divert = !guarantee && blockActive();
  if (!guarantee && offerLocked()) return;
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
  const base = (.25 + p.rep / 200) * (p.listed ? 1.5 : 1) * agent().offers;
  let added = 0;
  const names = [];
  const add = c => {
    if (divert) { if (addInquiry(c)) { added++; names.push(c.name); } return; }
    const o = makeOffer(c, 'transfer'), again = declinedUntil(c.id) > absWeek();
    if (freeAgent() && !judgeAsk(o)) return;
    // An eager club uses up its one extra try.
    if (again) { o.again = true; p.declined[c.id] = { until: declinedUntil(c.id), eager: false }; }
    S.offers.push(o); added++; names.push(c.name);
    msg(again ? `${c.name} won't take no for an answer: they are back with another offer.` : o.counter ? `${c.name} (${league(c.league).name}) think your asking wage is too high and offer ${money(o.wage)}/week instead.` : o.desperate ? `${c.name} (${league(c.league).name}) are desperate for a player like you and have offered well above your value.` : `${c.name} (${league(c.league).name}) have made you an offer.`, 'good');
  };
  // At 34 and 35 a big top-flight club calls only now and then (25%, then 8% of windows), and never more than one.
  const vy = vetYears();
  let bigLeft = !vy ? Infinity : Math.random() < ([0, .25, .08][vy] || 0) ? 1 : 0;
  // Already at a top-flight club: other top-flight clubs only show interest in 1 window in 5, and then
  // just one of them, unless you produce 50+ goals and assists a season. Hand in a transfer request
  // and they hear you are available: 70% of windows, up to two of them. Decided once per window and
  // shared by every look for offers in it (waiting for more offers, weekly January bids).
  const settled = !p.needsContract && clubTier(club(home)) === 1 && seasonGA() < STAR_GA;
  const wk = windowKey() + (p.listed ? 'L' : '');
  if (settled && (!p.topGate || p.topGate.key !== wk)) p.topGate = { key: wk, left: Math.random() < (p.listed ? .7 : .2) ? (p.listed ? 2 : 1) : 0 };
  const gate = settled ? p.topGate : { left: Infinity };
  let topLeft = gate.left;
  for (const c of pool.slice(0, 24)) {
    if (added >= count) break;
    if (bigTopFlight(c) && !bigLeft) continue;
    if (clubTier(c) === 1 && !topLeft) continue;
    // Silver: second-tier clubs are much keener, top-flight clubs a little.
    // Rising (+6 OVR): the bottom half of top flights and second-tier clubs are much keener.
    const w = (clubTier(c) === 1 ? (breakout ? 3 : 1) * (silver ? 1.3 : 1) : clubTier(c) === 2 && silver ? 1.5 : 1)
      * (rising && (smallTopFlight(c) || clubTier(c) === 2) ? 2.2 : 1);
    if (Math.random() < (guarantee ? .5 : base) * w * interest) { add(c); if (bigTopFlight(c)) bigLeft--; if (clubTier(c) === 1) { topLeft--; gate.left = topLeft; } }
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
      const o = makeOffer(c, 'transfer');
      if (freeAgent() && !judgeAsk(o)) return;
      const wage = o.wage;
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
  if (offerLocked()) { msg('Clubs are leaving you to settle in at your new club: no transfer offers or agent calls until you have been there a year.'); return; }
  if (blockActive()) { generateOffers(randi(1, 3) + (breakout ? 2 : 0)); return; }
  // A club you agreed to listen to comes back with a bid.
  if (p.interested && p.interested !== p.club && !isBanned(p.interested) && topFlightOpen(club(p.interested)) && !S.offers.some(o => o.club === p.interested)) S.offers.push(makeOffer(club(p.interested), 'transfer'));
  p.interested = null;
  generateOffers(randi(1, 3) + (breakout ? 2 : 0) + (S.player.listed ? 2 : 0));
}

// A first-team call-up is not a transfer-window bid: it stays until answered or it lapses.
function expireOffers(type) { S.offers = S.offers.filter(o => o.type !== type || o.callup); }

// Summer only: wait a little longer for more clubs, three times per offseason.
// Offers already on the table stay; new clubs add to them.
const canRefreshOffers = () => S.phase === 'offseason' && (S.offerRerolls || 0) > 0 && (S.player.needsContract || !offerLocked());
function refreshOffers() {
  if (!canRefreshOffers()) return 0;
  const p = S.player, before = S.offers.length;
  S.offerRerolls--;
  if (p.needsContract) generateOffers(randi(1, 3), true);
  else generateOffers(randi(1, 2) + (scoutBuzz().breakout ? 1 : 0) + (p.listed ? 1 : 0));
  if (p.needsContract && !S.offers.length && !S.offerRerolls) safetyNet();
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
  const room = (o.type === 'renew' ? BAND_ROOM[objBand()] + boardRoom() : .25) + agent().wage * .4;
  // A desperate club already bid over its limit, and still has a little more to give.
  return o.desperate ? Math.max(wageCeiling(c, room), o.wage * 1.15) : wageCeiling(c, room);
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
  // A pay rise on your current deal: the new wage starts now, and nothing else changes (end date,
  // role, clauses). Other offers on the table stay there.
  if (o.raise) {
    const was = p.wage;
    p.wage = o.wage;
    p.peakWage = Math.max(p.peakWage || 0, o.wage);
    p.renewedAt = absWeek();
    p.negLock = absWeek() + NEG_LOCK_WEEKS;
    S.offers = S.offers.filter(x => x.id !== o.id);
    if (o.negotiated) p.objHard = Math.min(.3, (p.objHard || 0) + .1);
    msg(`Pay rise agreed: ${money(was)} → ${money(o.wage)}/week, starting now. Your contract still ends with ${seasonLabel(contractEnd())}. No more salary talks for about six months.${o.negotiated ? ` ${myClub().mgr} expects more after squeezing him: his objectives will be a little harder.` : ''}`, 'good');
    notify('good', 'Pay rise!', `${money(o.wage)} a week from now on. Your contract still runs to the end of ${seasonLabel(contractEnd())}.`);
    save();
    return;
  }
  // A renewal signed during the season starts with the next one: this season finishes the old deal
  // (same wage, same role), then the new wage, years, role and release clause begin.
  const later = o.type === 'renew' && S.phase === 'season';
  // A move during the season runs to the end of a later season, like a January signing until June
  // a year and a half away: the half season you join in comes on top of the years.
  const midMove = o.type !== 'renew' && S.phase === 'season';
  // A veteran signed for a smaller role keeps it for this contract.
  p.roleCap = o.roleCap ? { club: o.club, status: o.roleCap, from: later ? S.season + 1 : S.season } : null;
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
    testimonial();
    // Your stats so far this season stay with your old club as their own career row.
    closeSpell();
    p.club = o.club;
    p.clubsPlayed = [...new Set([...(p.clubsPlayed || []), o.club])];
    p.offerLock = absWeek() + OFFER_LOCK_WEEKS;
    p.loan = null;
    p.joinedSeason = S.season;
    p.newClubUntil = newClubLock();
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
    p.chanceStreak = 0;
    p.chanceNext = 0;
    p.objHard = o.negotiated ? .1 : 0;
    p.promise = o.promised ? 15 : 0;
    p.negLock = 0;
    p.clauseUntil = 0;
    if (o.promised) msg(`${club(o.club).mgr} has promised you a starting place. Keep him happy and it is yours.`, 'good');
    if (S.seasonSummary) S.seasonSummary.loanNext = false;
    if (o.callup) {
      msg(`Promoted from ${from} to the ${club(o.club).name} first team: ${money(o.wage)}/week until the end of ${seasonLabel(offerEnds(o))}.`, 'good');
      notify('good', `${club(o.club).name} first team!`, `You have made it from the academy to the first team, as ${o.status.toLowerCase()}, on ${money(o.wage)} a week.`);
    } else {
      msg(`Signed for ${club(o.club).name} from ${from}: ${money(o.wage)}/week until the end of ${seasonLabel(offerEnds(o))}.`, 'good');
      notify('good', 'Welcome to ' + club(o.club).name + '!', `You signed a ${o.years}-year deal worth ${money(o.wage)} a week.`);
    }
    addRep(2);
  } else {
    // A new contract with your club replaces the old one, clauses included: an old loyalty (or
    // release) clause ends here, and the new deal's own clause, if it has one, takes its place.
    if (clauseActive()) {
      if ((p.offerLock || 0) <= p.clauseUntil) p.offerLock = Math.min(p.offerLock || 0, absWeek());
      msg(`Your old ${p.clauseKind === 'block' ? 'release' : 'loyalty'} clause is replaced by this new contract${o.clause || o.block ? ' and its own clause' : ''}.`);
      p.clauseUntil = 0;
      p.clauseKind = null;
      p.inquiries = [];
    }
    msg(later ? `Signed a new ${o.years}-year deal starting next season (${seasonLabel(S.season + 1)}): ${money(o.wage)}/week from then. This season you stay on ${money(p.wage)}/week. No more salary talks for about six months.` : `Signed a new ${o.years}-year deal at ${money(o.wage)}/week. No more salary talks for about six months.`, 'good');
    notify('good', 'New contract signed!', later ? `${o.years} more years at ${club(o.club).name} from next season, ${money(o.wage)} a week.` : `${o.years} more years at ${club(o.club).name}, ${money(o.wage)} a week.`);
    p.renewedAt = absWeek();
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
      // A loyalty deal is the club's promise to build around you: +40 points on your start chance here for good.
      if (!chanceBoosted()) p.boostClubs = [...(p.boostClubs || []), p.club];
      p.loyalNext = 0;
      p.negLock = Math.max(p.negLock, p.clauseUntil);
      p.offerLock = Math.max(p.offerLock || 0, p.clauseUntil);
      p.listed = false;
      msg(`"You won't regret this. We'll take care of everything else." Your loyalty clause runs until the end of ${seasonLabel(end)}: no bids from other clubs and no salary talks until then. You are part of their plans now: +${Math.round(CHANCE_BOOST * 100)}% start chance at ${myClub().name} for good.`);
    }
    if (o.negotiated) {
      p.objHard = Math.min(.3, (p.objHard || 0) + .1);
      msg(`${myClub().mgr} expects more after your pay rise. His objectives will be a little harder.`);
    }
  }
  if (o.block) {
    p.clauseKind = 'block';
    p.clauseUntil = (later ? (S.season + 1) * SEASON_WEEKS + 1 : absWeek()) + o.block * SEASON_WEEKS;
    p.clauseFee = o.blockFee;
    p.negLock = Math.max(p.negLock || 0, p.clauseUntil);
    p.offerLock = Math.max(p.offerLock || 0, p.clauseUntil);
    p.listed = false;
    p.inquiries = [];
    msg(`Release clause: for ${o.block} year${o.block > 1 ? 's' : ''} ${club(o.club).name} will block any move and salary talks. Clubs can still reach you through your agent, and breaking the clause costs ${money(o.blockFee)}.`);
  }
  if (later) { p.nextWage = o.wage; p.years = o.years + 1; }
  else { p.wage = o.wage; p.nextWage = 0; p.years = o.years + (midMove ? 1 : 0); }
  p.peakWage = Math.max(p.peakWage || 0, o.wage);
  p.ovrAtSign = calcOVR();
  p.needsContract = false;
  S.offers = [];
  p.free = false;
  p.freeSince = null;
  p.netAt = null;
  // Signing anything closes this transfer window for you: no more bids, no waiting for more offers.
  p.offerLock = Math.max(p.offerLock || 0, windowEndAbs());
  if (S.phase === 'offseason') S.offerRerolls = 0;
  if (S.phase === 'season') { setObjectives(); maybeOrder(); }
  save();
}

function declineOffer(id) {
  const o = S.offers.find(x => x.id === id);
  if (o && o.type === 'renew' && !o.raise) { changeAff(-4); changeBoard(-4); if (o.club === S.player.club && lastYear()) S.player.renewSeen = S.season; }
  // Saying no to a loyalty deal stings a little, and the club waits three months before thinking about it again.
  if (o && o.clause) {
    S.player.loyalNext = absWeek() + LOYAL_GAP;
    msg(`${myClub().mgr} and the board are a little hurt that you turned down their loyalty deal. Manager −4, board −4.`, 'bad');
    notify('bad', 'They were hoping for a yes', `"We understand... but we really thought you felt the same way about us." ${myClub().mgr} and the board are slightly disappointed (manager −4, board −4).`);
  } else if (o && o.raise) msg(`You turned down the pay rise. Your current deal carries on as it is.`); else if (o && o.type === 'renew') msg(`You turned down ${myClub().name}'s new contract. The manager and board are slightly unhappy (−4 each).`, 'bad');
  // Turning down other clubs shows loyalty, especially rivals.
  if (o && o.type === 'transfer' && !S.player.needsContract) changeAff(isRival(club(o.club)) ? 5 : 2);
  // Turning down an eager club's second try ends it: no more chances for six months.
  // Not ready for the first team yet: they look again in 10 weeks.
  if (o && o.callup) { S.player.callupNo = absWeek() + CALLUP_WAIT; msg(`You told ${club(o.club).mgr} you want more games at ${myClub().name} first. ${club(o.club).name} will look again in ${CALLUP_WAIT} weeks.`); }
  else if (o && o.type === 'transfer') S.player.declined = { ...(S.player.declined || {}), [o.club]: { until: absWeek() + DECLINE_WEEKS, eager: !o.again && Math.random() < EAGER } };
  S.offers = S.offers.filter(x => x.id !== id);
  save();
}

// The game week just after the current transfer window closes (now, outside a window).
const windowEndAbs = () => S.phase === 'offseason' ? (S.season + 1) * SEASON_WEEKS + 2
  : S.week >= JAN_WINDOW[0] && S.week <= JAN_WINDOW[1] ? S.season * SEASON_WEEKS + JAN_WINDOW[1] + 1 : absWeek();
const inWindow = () => S.phase === 'offseason' || (S.week >= JAN_WINDOW[0] && S.week <= JAN_WINDOW[1]);

// Hand in a transfer request: the manager and the board take it badly, but clubs hear you are available.
function requestTransfer() {
  const p = S.player;
  if (p.listed || p.loan || clauseActive()) return false;
  p.listed = true;
  // Asking to leave ends the relationship: the manager freezes you out on the spot.
  p.aff = Math.min(p.aff, FROZEN_AFF);
  p.affPen = 0;
  changeBoard(-20);
  msg(`You handed in a transfer request. ${myClub().mgr} has frozen you out, and the board is unhappy (−20).`, 'bad');
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

// What asking gets you. In the last season of your deal, a new contract. Before that, a pay rise on
// the deal you have: more money, same end date, nothing else changes (role, clauses).
const RAISE_MIN = .05, RAISE_MAX = .12, RAISE_OVERPAID = 1.3;
const canRaise = () => S.player.wage < marketWage(calcOVR(), myClub()) * RAISE_OVERPAID;
function askedOffer() {
  const p = S.player, c = myClub();
  if (lastYear()) return makeOffer(c, 'renew');
  const base = makeOffer(c, 'renew');
  const bump = Math.round(p.wage * (1 + rand(RAISE_MIN, RAISE_MAX)) / 10) * 10;
  return { ...base, raise: true, wage: Math.max(base.wage, bump), years: p.years, endSeason: contractEnd(), status: squadStatus(), promised: false, block: 0, blockFee: 0, clause: 0, roleCap: undefined };
}

// ---------- asking a top-flight club for a starting role (33–35) ----------
// At 33 to 35 a top-flight club that offers you rotation or a reserve role can be asked to make you a
// starter. They go over your last season at your previous club: does he still have it at this level?
// Realistic bars, not crazy numbers. One ask per offer, and the answer stands.
const ROLE_ASK_AGES = [33, 35];
const lastSpell = () => { const r = (S.player.career || []).at(-1); return r && r.apps >= 5 ? r : null; };
const canAskRole = o => {
  const a = ageOf(S.player.by), c = S.clubs[o.club];
  return o.type === 'transfer' && !o.roleAsk && a >= ROLE_ASK_AGES[0] && a <= ROLE_ASK_AGES[1] && c && clubTier(c) === 1 && ROLE_RANK[o.status] < ROLE_RANK.Starter && !!lastSpell();
};
// 0 below lo, .5 at mid, 1 from hi.
const ramp = (v, lo, mid, hi) => v <= lo ? 0 : v < mid ? .5 * (v - lo) / (mid - lo) : v < hi ? .5 + .5 * (v - mid) / (hi - mid) : 1;
// Your last season judged for your position. A striker with 15 goals and assists in 34 games is
// decent, 24 is strong; a centre-back about 5 tackles a game and a clean sheet every third game.
function lastSeasonCase(r) {
  const pos = r.pos || S.player.pos, n = r.apps, pg = v => (v || 0) / n, ga = r.goals + r.assists;
  let stat, line;
  if (pos === 'GK') {
    stat = .7 * ramp(pg(r.cleanAll), .15, .3, .42) + .3 * ramp(pg(r.saves), 1.5, 2.8, 3.8);
    line = `${r.cleanAll || 0} clean sheets and ${r.saves || 0} saves in ${n} games`;
  } else if (TACKLERS.includes(pos)) {
    const t = pg(r.tackles) / (TACKLE_PAR[pos] / 40);
    stat = pos === 'CDM' ? .75 * ramp(t, .6, .95, 1.2) + .25 * ramp(pg(ga), .05, .15, .3)
      : .65 * ramp(t, .6, .95, 1.2) + .35 * ramp(pg(r.cleanAll), .15, .3, .42);
    line = `${r.tackles || 0} tackles (${pg(r.tackles).toFixed(1)} a game)${pos === 'CDM' ? `, ${ga} goals and assists` : `, ${r.cleanAll || 0} clean sheets`} in ${n} games`;
  } else {
    stat = ramp(pg(ga) / (GA_PAR[pos] / 40), 1, 1.8, 2.8);
    line = `${r.goals} goals and ${r.assists} assists in ${n} games`;
  }
  return { stat, rating: ramp(r.avg || 0, 6.5, 6.9, 7.3), line: `${line}, a ${(r.avg || 0).toFixed(2)} average rating`, club: r.club };
}
// The numbers count for more from a big league; a full season more than a few games; and the
// closer you are to their level (and the younger), the easier the yes.
function roleAskChance(o) {
  const r = lastSpell(), k = lastSeasonCase(r), c = club(o.club), age = ageOf(S.player.by);
  const was = S.clubs[r.clubId], l = was && league(was.league);
  const level = !l ? .5 : l.tier === 1 ? leagueWeight(l) : l.tier === 2 ? .55 : .35;
  const games = clamp(r.apps / 20, .3, 1);
  const fit = clamp(1 - Math.max(0, teamStrength(c) - calcOVR() - 2) * .07, .35, 1.05);
  const ageF = { 33: 1, 34: .9, 35: .8 }[age] || .8;
  return clamp((.55 * k.stat + .45 * k.rating) * level * games * fit * ageF * .95, .03, .85);
}
// Decided the moment you ask (the club's "thinking" is only on screen). Yes: a promised starting
// place. No: the offer stays as it was.
function askForStart(id) {
  const o = S.offers.find(x => x.id === id);
  if (!o || !canAskRole(o)) return null;
  const c = club(o.club), k = lastSeasonCase(lastSpell()), yes = Math.random() < roleAskChance(o), was = o.status;
  o.roleAsk = yes ? 'yes' : 'no';
  if (yes) { o.status = 'Starter'; o.promised = true; if (o.roleCap) o.roleCap = 'Starter'; }
  msg(yes ? `${c.name} agreed to make you a starter after looking at your last season (${k.line}).` : `${c.name} looked at your last season (${k.line}) and are sticking with a ${was.toLowerCase()} role.`, yes ? 'good' : 'bad');
  save();
  return { yes, line: k.line, from: k.club, club: c.name, mgr: c.mgr, was };
}

// Ask the club for a new deal. Needs the board and manager on side; otherwise it backfires a little.
function requestContract() {
  const p = S.player, wk = S.season * 100 + S.week;
  if (p.loan || p.needsContract || S.offers.some(o => o.type === 'renew')) return 'busy';
  if (newClub()) return 'newclub';
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
    // Before the last season you can only ask for more money: already paid well above your value, there is none.
    if (!lastYear() && !canRaise()) {
      msg(`${myClub().name} won't raise your wage: on ${money(p.wage)} a week you are already paid well above your market value.`, 'bad');
      save();
      return 'overpaid';
    }
    if (Math.random() >= .8) {
      setRenewTask();
      msg(`${myClub().name} are not ready to ${lastYear() ? 'offer a new deal' : 'pay you more'} yet. The board wants ${renewTaskText(p.renewTask)} in the next 8 weeks: do it and the ${lastYear() ? 'contract' : 'pay rise'} is yours.`, 'bad');
      save();
      return 'challenge';
    }
    const o = askedOffer();
    S.offers.push(o);
    msg(o.raise ? `${myClub().name} have offered you a pay rise on your current deal, to ${money(o.wage)} a week until the end of ${seasonLabel(o.endSeason)}.` : `${myClub().name} have put a new contract on the table.`, 'good');
    save();
    return 'offer';
  }
  changeBoard(-3);
  msg('The board refused to discuss a new contract. Board −3.', 'bad');
  save();
  return 'refused';
}

// ---------- managers and their boards ----------
// Every manager has a rating (40–95) and his board's confidence in him (0–100). A manager rated above
// his squad's level gets more out of it (up to +2 team rating in matches), a weak one less. The board
// judges every league game against what the squad should get, and the table every few weeks against
// where the squad should be. Lose its confidence and he is sacked; the board then brings in someone
// out of work, poaches a manager from a smaller club, or gives a newcomer his chance. All simulated:
// nothing the player can control.
const MGR_HONEYMOON = 8, MGR_POOL_MAX = 80;
function mgrOf(c) {
  if (!S.mgrs) S.mgrs = {};
  let m = S.mgrs[c.id];
  if (!m) {
    // First look at a manager: his rating sits near his squad's level, set by his name so it is the
    // same every time (-7 to +7, most within 3), a little higher for the real managers.
    const s = teamStrength(c), noise = ((strHash(`${c.id}|${c.mgr}|r1`) % 101) + (strHash(`${c.id}|${c.mgr}|r2`) % 101)) / 100 - 1;
    m = S.mgrs[c.id] = { r: Math.round(clamp(s + noise * 7 + (c.genMgr ? 0 : 3), 40, 95)), job: 62, since: absWeek() - MGR_HONEYMOON };
  }
  return m;
}
const mgrEdge = c => clamp((mgrOf(c).r - teamStrength(c)) / 5, -2, 2);
const jobLabel = j => j >= 70 ? 'Secure' : j >= 50 ? 'Stable' : j >= 32 ? 'Under pressure' : j >= 18 ? 'On thin ice' : 'Facing the sack';
// Where a squad should finish: its rank by team rating in its league.
function expectedRank(c) {
  const s = teamStrength(c);
  return league(c.league).clubs.filter(id => id !== c.id && teamStrength(club(id)) > s).length + 1;
}
const expPts = d => 1.4 + 1.3 * Math.tanh(d / 9);
// The bigger the club, the less patient its board: bad results hurt more and the sack comes sooner.
// Third tier ×0.7, second ×0.9, top flight ×0.95 for its smallest club, rising ever faster to ×1.75 for its biggest:
// results swing the board's mood that much harder, and it acts sooner (threshold × the square root).
// Worked out once a week per club (it needs the whole league's ratings).
let pressureCache = { key: null, map: {} };
function boardPressure(c) {
  const key = `${S.season}|${S.week}`;
  if (pressureCache.key !== key) pressureCache = { key, map: {} };
  if (pressureCache.map[c.id] == null) {
    const t = clubTier(c);
    pressureCache.map[c.id] = t === 1 ? .95 + tierPrestige(c) ** 2 * .8 : t === 2 ? .9 : .7;
  }
  return pressureCache.map[c.id];
}
const mgrJob = (c, d) => { const m = mgrOf(c); m.job = clamp(m.job + d * boardPressure(c), 0, 100); };
// ---------- the board's targets for its manager ----------
// Like the manager's objectives for you, the board sets its manager targets, and his standing with
// it (its affection, the job score) rises when he hits them and falls when he misses.
// A season target: a league finish set from where the squad should be (its rank by team rating),
// with 3 places of slack, 1 at a big top-flight club: "Finish in the top 8", "Win promotion",
// "Avoid relegation", "Win the league". Judged at the end of the season: hit +12, miss −22.
// A short target, renewed every 10 league games: win at least X of them, or lose no more than Y
// (X and Y set by where the squad should be, a notch harder at a big club). Hit +8, miss −10.
// Both scaled by the board's patience.
const MGR_SHORT = 10;
function seasonTarget(c) {
  const n = league(c.league).clubs.length, t = clubTier(c), exp = expectedRank(c);
  const big = t === 1 && tierPrestige(c) >= .7;
  let top = Math.min(n, exp + (big ? 1 : 3));
  const relZone = t < 3 && n - PROMOTE >= 1;
  if (relZone && top > n - PROMOTE) top = n - PROMOTE;
  // Just promoted: whatever the squad, the board only asks him to stay up.
  const promoted = relZone && c.upSeason === S.season;
  if (promoted) top = n - PROMOTE;
  return { top, ...(promoted ? { promoted: true } : {}), label: promoted ? 'Stay up after promotion' : top === 1 ? 'Win the league' : t > 1 && top <= PROMOTE ? `Win promotion (top ${top})` : relZone && top === n - PROMOTE ? 'Avoid relegation' : `Finish in the top ${top}` };
}
function shortTarget(c) {
  const n = league(c.league).clubs.length, x = (expectedRank(c) - 1) / Math.max(1, n - 1), row = S.table[c.id] || { p: 0, w: 0, l: 0 };
  const base = { start: row.p, w0: row.w, l0: row.l, games: MGR_SHORT };
  // A big top-flight club demands one more win, or one loss fewer. Below the top flight, where results
  // are less predictable, boards ask for a little less: about half a win fewer and one more loss.
  const big = clubTier(c) === 1 && tierPrestige(c) >= .7 ? 1 : 0, low = clubTier(c) > 1 ? 1 : 0;
  return Math.random() < .5
    ? { ...base, kind: 'wins', need: clamp(Math.round(5.5 - 4 * x - low * .6) + big, 2, 8) }
    : { ...base, kind: 'losses', need: clamp(Math.round(2.5 + 4 * x) - big + low, 1, 7) };
}
const shortText = g => g.kind === 'wins' ? `Win at least ${g.need} of ${g.games} league games` : `Lose no more than ${g.need} of ${g.games} league games`;
// Progress on the short target: games played, wins, losses since it was set.
function shortProgress(c, g) {
  const row = S.table[c.id] || { p: 0, w: 0, l: 0 };
  return { played: row.p - g.start, w: row.w - g.w0, l: row.l - g.l0 };
}
// Set this season's targets the first time they are needed.
function mgrTargets(c) {
  const m = mgrOf(c);
  if (m.tSeason !== S.season || !m.target) {
    m.tSeason = S.season;
    m.target = seasonTarget(c);
    m.goal = shortTarget(c);
    m.promo = promoTarget(c);
    if (myMgrClubs().includes(c.id)) msg(`The board has set ${c.mgr} his targets for the season: ${m.target.label.toLowerCase()}, and to ${shortText(m.goal).toLowerCase()}.${m.promo ? ` With this squad they also want promotion (top ${PROMOTE}).` : ''}`);
  }
  if (!m.goal) m.goal = shortTarget(c);
  return m;
}

// ---------- the promotion objective ----------
// Below the top flight, a squad rated among the best in its league (expected to finish within two
// places of the promotion spots) is also told to win promotion. It stays live only while promotion
// is still mathematically possible: once the club can no longer catch the team in the last promotion
// place, even by winning every game left, it is missed on the spot. Promoted: +20. Missed: −15.
// A B team blocked from going up never gets it.
// A B team whose first team is in the division above (or higher) can't go up, so it doesn't take a promotion place.
const cantGoUp = c => { const par = parentOf(c); return !!par && clubTier(par) >= clubTier(c) - 1; };
const promoChance = c => {
  const l = league(c.league);
  return l.tier > 1 && !l.closed && S.leagues.some(x => x.nat === l.nat && x.tier === l.tier - 1 && !x.closed) && !cantGoUp(c);
};
// Where the promotion race stands: points behind the last promotion place (negative when inside it),
// games left, and whether it can still be done.
function promoRace(c) {
  const l = league(c.league), n = l.clubs.length, games = 2 * (n - 1), me = S.table[c.id] || { p: 0, pts: 0 };
  const others = l.clubs.filter(id => id !== c.id && !cantGoUp(club(id))).map(id => (S.table[id] || { pts: 0 }).pts).sort((a, b) => b - a);
  const line = others[PROMOTE - 1] ?? 0, left = Math.max(0, games - me.p);
  return { behind: line - me.pts, left, possible: me.pts + 3 * left >= line };
}
function promoTarget(c) {
  if (!promoChance(c) || expectedRank(c) > PROMOTE + 2) return null;
  return promoRace(c).possible ? { live: true } : null;
}
function checkPromo(c) {
  const m = mgrOf(c);
  if (!m.promo || !m.promo.live || promoRace(c).possible) return;
  m.promo.live = false; m.promo.result = 'miss';
  mgrJob(c, -15);
  if (myMgrClubs().includes(c.id)) msg(`Promotion is mathematically impossible now. ${c.mgr} has missed the board's promotion objective.`, 'bad');
}
// After each league game: is the short target hit, missed, or still open?
function checkShortTarget(c) {
  const m = mgrTargets(c), g = m.goal, pr = shortProgress(c, g), left = g.games - pr.played;
  let done = null;
  if (g.kind === 'wins') done = pr.w >= g.need ? 'hit' : pr.w + left < g.need ? 'miss' : null;
  else done = pr.l > g.need ? 'miss' : left <= 0 ? 'hit' : null;
  if (!done) return;
  mgrJob(c, done === 'hit' ? 8 : -10);
  if (myMgrClubs().includes(c.id)) msg(done === 'hit' ? `Board target hit: ${c.mgr} managed to ${shortText(g).toLowerCase()} (${g.kind === 'wins' ? `${pr.w} won` : `${pr.l} lost`}). The board is pleased.` : `Board target missed: ${c.mgr} was told to ${shortText(g).toLowerCase()} (${g.kind === 'wins' ? `${pr.w} won` : `${pr.l} lost`}). The board is losing patience.`, done === 'hit' ? 'good' : 'bad');
  m.goal = shortTarget(c);
}
// After every league game: points won against points expected from the two squads, and the short target.
function mgrAfterMatch(h, a, gh, ga) {
  const ch = club(h), ca = club(a), d = teamStrength(ch) - teamStrength(ca) + 2;
  const ph = gh > ga ? 3 : gh === ga ? 1 : 0, pa = gh < ga ? 3 : gh === ga ? 1 : 0;
  mgrJob(ch, (ph - expPts(d)) * 1.6);
  mgrJob(ca, (pa - expPts(-d)) * 1.6);
  checkShortTarget(ch); checkShortTarget(ca);
  checkPromo(ch); checkPromo(ca);
}
// The clubs whose managers you hear about first: yours (and your parent club on loan).
const myMgrClubs = () => [S.player.club, S.player.loan && S.player.loan.parent].filter(Boolean);
function mgrWeek() {
  const wk = S.week, seen = new Set(myMgrClubs());
  for (const l of S.leagues) {
    const table = wk >= 10 && wk % 4 === 2 ? leagueTable(l.id) : null, n = l.clubs.length;
    for (const id of l.clubs) {
      const c = club(id), m = mgrOf(c);
      m.job += (60 - m.job) * .02; // the mood settles when nothing much happens
      if (table) {
        // Every four weeks the board looks at the table against its season target: off course hurts,
        // ahead of it helps, and a relegation scrap nobody expected hurts more.
        const pos = table.findIndex(r => r.id === id) + 1, top = mgrTargets(c).target.top, gap = (pos - top) / Math.max(1, n - 1);
        mgrJob(c, clamp(-gap * 18, -7, 4) - (l.tier < 3 && pos > n - PROMOTE && top <= n - PROMOTE ? 4 : 0));
      }
      if (wk < 10 || wk > SEASON_WEEKS - 4 || absWeek() - m.since < MGR_HONEYMOON) continue;
      // A big club's board acts at a higher level of doubt (22 → up to 29 at the very biggest).
      const pr = Math.sqrt(boardPressure(c)), odds = m.job < 12 * pr ? .75 : m.job < 22 * pr ? .35 : 0;
      if (odds && Math.random() < odds) sackManager(c, seen.has(id) || l.id === myClub().league);
    }
  }
}
// End of the league season, before promotion and relegation: ratings move with how the club did
// against what its squad should have done, and a board that has lost faith acts now.
function mgrSeasonEnd() {
  for (const l of S.leagues) {
    const table = leagueTable(l.id), n = l.clubs.length;
    table.forEach((row, i) => {
      const c = club(row.id), m = mgrOf(c), gap = (expectedRank(c) - (i + 1)) / Math.max(1, n - 1);
      m.r = Math.round(clamp(m.r + clamp(gap * 10, -4, 4) + rand(-1, 1), 40, 95));
      if (i === 0) { m.r = Math.min(95, m.r + 1); mgrJob(c, 15); }
      // The season target is judged now: hit +12, miss −22.
      const tg = mgrTargets(c).target, hit = i + 1 <= tg.top, mine = myMgrClubs().includes(c.id);
      // The promotion objective, if still live, is settled by the final table.
      if (m.promo && m.promo.live) {
        const up = table.filter(r => !cantGoUp(club(r.id))).slice(0, PROMOTE).some(r => r.id === c.id);
        m.promo.live = false; m.promo.result = up ? 'hit' : 'miss';
        mgrJob(c, up ? 20 : -15);
        if (mine) msg(up ? `Promotion! ${c.mgr} delivered the board's promotion objective.` : `${c.mgr} missed the board's promotion objective: finished ${i + 1}${ordinal(i + 1)}.`, up ? 'good' : 'bad');
      }
      mgrJob(c, hit ? 12 : -22);
      // Relegation is the worst thing that can happen to a board: a further −30, and he is very
      // likely gone (most of all after the board's only target was to stay up).
      const relegated = l.tier < 3 && n - PROMOTE >= 1 && i + 1 > n - PROMOTE && S.leagues.some(x => x.nat === l.nat && x.tier === l.tier + 1 && !x.closed);
      if (relegated) {
        mgrJob(c, tg.promoted ? -38 : -30);
        if (mine) msg(`Relegated. The board holds ${c.mgr} responsible${tg.promoted ? ': his one job was to keep the club up' : ''}.`, 'bad');
      }
      if (mine) msg(hit ? `${c.mgr} hit the board's season target (${tg.label.toLowerCase()}): finished ${i + 1}${ordinal(i + 1)}.` : `${c.mgr} missed the board's season target (${tg.label.toLowerCase()}): finished ${i + 1}${ordinal(i + 1)}.`, hit ? 'good' : 'bad');
      // A big top-flight club (top 30% of its league) judges the season by that target, not by how
      // bad it was: miss it and the board may sack him even if the season looked decent.
      const missed = !hit && clubTier(c) === 1 && tierPrestige(c) >= .7;
      if (missed && i > 0 && absWeek() - m.since >= MGR_HONEYMOON && Math.random() < .45 + tierPrestige(c) * .3) sackManager(c, mine || l.id === myClub().league);
      else if (m.job < 35 * Math.sqrt(boardPressure(c)) && absWeek() - m.since >= MGR_HONEYMOON && Math.random() < .7) sackManager(c, myMgrClubs().includes(c.id) || l.id === myClub().league);
      else m.job = m.job + (62 - m.job) * .35; // a new season, a little more patience
    });
  }
}
function sackManager(c, tell) {
  const m = mgrOf(c), old = c.mgr;
  S.mgrPool = [...(S.mgrPool || []), { name: old, nat: c.mgrNat, r: Math.max(40, m.r - 1), from: c.id }].slice(-MGR_POOL_MAX);
  const hire = appointManager(c);
  const mine = myMgrClubs().includes(c.id);
  const from = hire.from ? ` from ${club(hire.from) ? club(hire.from).name : 'his old club'}` : hire.pool ? ', out of work since leaving ' + (club(hire.pool) ? club(hire.pool).name : 'his last club') : ', getting his first big job';
  if (mine) {
    msg(`${old} has been sacked by ${c.name}. ${c.mgr}${from} is the new manager (rating ${mgrOf(c).r}).`, 'bad');
    notify('bad', 'Manager sacked', `${c.name} have sacked ${old}. The board has appointed ${c.mgr}${from}. He plays a ${formationOf(c)}, and you will have to win him over.`);
  } else if (tell) msg(`${c.name} have sacked ${old}. ${c.mgr}${from} takes over.`);
}
// The board picks the best man it can get: someone out of work, a manager doing well at a smaller
// club (who walks out on them), or a newcomer.
function appointManager(c, poach = true) {
  const s = teamStrength(c), nat = league(c.league).nat;
  const pool = (S.mgrPool || []).filter(x => x.from !== c.id).map(x => ({ ...x, kind: 'pool', score: x.r + rand(-3, 3) }));
  const employed = poach ? Object.values(S.clubs).filter(x => x.id !== c.id && teamStrength(x) < s - 2 && mgrOf(x).job >= 55
    && (league(x.league).nat === nat || clubTier(x) === 1) && absWeek() - mgrOf(x).since >= MGR_HONEYMOON * 2)
    .map(x => ({ name: x.mgr, nat: x.mgrNat, r: mgrOf(x).r, club: x, kind: 'poach', score: mgrOf(x).r + rand(-3, 3) - 1 })) : [];
  const fresh = { name: freshMgrName(nat), nat, r: Math.round(clamp(s - 2 + gauss() * 4, 40, 92)), kind: 'new', score: 0 };
  fresh.score = fresh.r + rand(-3, 3);
  const best = [...pool, ...employed.sort((a, b) => b.score - a.score).slice(0, 6), fresh].sort((a, b) => b.score - a.score)[0];
  c.mgr = best.name; c.mgrNat = best.nat; c.genMgr = best.kind === 'new' || c.genMgr;
  S.mgrs[c.id] = { r: best.r, job: 70, since: absWeek() };
  if (best.kind === 'pool') S.mgrPool = S.mgrPool.filter(x => !(x.name === best.name && x.from === best.from));
  if (best.kind === 'poach') {
    const left = best.club;
    appointManager(left, false);
    const mine = myMgrClubs().includes(left.id);
    if (mine) {
      msg(`${best.name} has left ${left.name} to take over at ${c.name}. ${left.mgr} is your new manager (rating ${mgrOf(left).r}).`, 'bad');
      notify('bad', 'Your manager has left', `${best.name} walked out to become ${c.name} manager. ${left.name} have appointed ${left.mgr}, who plays a ${formationOf(left)}.`);
    } else if (left.league === myClub().league) msg(`${left.name} have lost ${best.name} to ${c.name}. ${left.mgr} takes over.`);
    newManagerForMe(left);
  }
  newManagerForMe(c);
  return best.kind === 'poach' ? { from: best.club.id } : best.kind === 'pool' ? { pool: best.from } : {};
}
function freshMgrName(nat) {
  const taken = new Set(Object.values(S.clubs).map(c => c.mgr));
  for (let i = 0; i < 10; i++) { const n = randomName(nat); if (!taken.has(n)) return n; }
  return randomName(nat);
}
// A new man in the dugout at your club: a fresh start. Half of what the old one thought of you,
// good or bad, goes with him.
function newManagerForMe(c) {
  const p = S.player;
  if (c.id === p.club) { p.aff = 50 + (p.aff - 50) * .4; p.affPen = 0; p.frozen = false; }
  else if (p.loan && c.id === p.loan.parent && p.loan.parentAff != null) p.loan.parentAff = 50 + (p.loan.parentAff - 50) * .4;
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
// deeper roles need fewer. Keepers are judged on clean sheets and saves instead.
const GA_PAR = { ST: 10, LW: 10, RW: 10, CAM: 10, LM: 8, RM: 8, CM: 6, CDM: 4, LB: 4, RB: 4, CB: 2 };
// Tackles a season needs before the review lifts a defender's or holding midfielder's OVR.
const TACKLE_PAR = { CB: 200, LB: 180, RB: 180, CDM: 220 };
// Tackles a game a holding midfielder needs before winning the ball back lifts his review.
const CDM_TACKLES_PG = 6;
// OVR lost when your club is relegated (a regular in the side; scaled down for fewer games).
const RELEGATION_DROP = [1, 1.5];

// End-of-season OVR review. For outfield players goals and assists decide it: under half of par
// costs OVR, under par holds it, and every G/A over par lifts it more. Ratings, awards and
// injuries adjust it.
function performanceReview(st, avg, awards) {
  const p = S.player, age = ageOf(p.by), notes = [], ovr = calcOVR(), L = league(myClub().league);
  const ga = st.goals + st.assists + (st.cup ? st.cup.goals + st.cup.assists : 0), par = GA_PAR[p.pos];
  let d = 0;
  if (st.apps >= 10 && !par) {
    // Keepers are judged mainly on clean sheets and saves per game (all competitions), like
    // outfield players on G/A; the average rating only nudges it. A real top keeper keeps a clean
    // sheet in about 40% of games and makes 2.5 to 3 saves a game.
    const w = L.tier === 1 ? leagueWeight(L) : L.tier === 2 ? .7 : .5;
    const apps = st.apps + (st.cup ? st.cup.apps : 0), cs = (st.cleanAll || 0) / Math.max(1, apps), sv = (st.saves || 0) / Math.max(1, apps);
    const csD = cs >= .45 ? 3 : cs >= .38 ? 2.2 : cs >= .3 ? 1.4 : cs >= .22 ? .6 : cs >= .15 ? 0 : -.8;
    const svD = sv >= 3.5 ? 1 : sv >= 2.8 ? .6 : sv >= 2.2 ? .25 : 0;
    d += (csD > 0 ? csD * w : csD) + svD * w;
    notes.push(`${st.cleanAll || 0} clean sheets, ${(cs * 100).toFixed(0)}% of games`, `${sv.toFixed(1)} saves a game`);
    const r = avg >= 7.5 ? .4 : avg >= 7 ? .2 : avg < 6.2 ? -.4 : 0;
    if (r) { d += r; notes.push(`${avg.toFixed(2)} average rating`); }
  } else if (st.apps >= 10) {
    // Numbers count for less in the lower leagues.
    const w = L.tier === 1 ? leagueWeight(L) : L.tier === 2 ? .7 : .5;
    if (objRole() === 'CDM') {
      // A holding midfielder is judged on the whole job, not tackles alone: winning the ball back
      // (tackles a game), keeping things tight (clean sheets), chipping in (goals + assists) and how
      // well he plays overall (his rating counts twice as much as for other positions).
      const apps = st.apps + (st.cup ? st.cup.apps : 0), tpg = (st.tackles || 0) / Math.max(1, apps), cs = (st.cleanAll || 0) / Math.max(1, apps);
      const tkD = clamp((tpg - CDM_TACKLES_PG) * .3, -.8, 1.2);
      const csD = cs >= .45 ? .8 : cs >= .35 ? .5 : cs >= .25 ? .2 : cs >= .15 ? 0 : -.3;
      const gaD = clamp((ga - GA_PAR.CDM) * .12, -.4, 1);
      const rD = avg >= 7.6 ? 1.2 : avg >= 7.3 ? .8 : avg >= 7.1 ? .5 : avg >= 6.9 ? .2 : avg >= 6.6 ? 0 : avg >= 6.4 ? -.4 : -.8;
      const parts = tkD + csD + gaD + rD;
      d += parts > 0 ? Math.min(4.5, parts) * w : parts;
      notes.push(`${tpg.toFixed(1)} tackles a game (par ${CDM_TACKLES_PG})`, `${st.cleanAll || 0} clean sheets, ${(cs * 100).toFixed(0)}% of games`, `${ga} goals + assists (par ${GA_PAR.CDM})`, `${avg.toFixed(2)} average rating`);
    } else if (TACKLERS.includes(objRole())) {
      // Defenders and holding midfielders are judged on tackles (all competitions): every 8 over par
      // counts like one goal or assist over par for an attacker.
      const tk = st.tackles || 0, tpar = TACKLE_PAR[objRole()];
      d += tk >= tpar ? Math.min(4.5, .3 + (tk - tpar) / 8 * .15) * w : tk >= tpar / 2 ? 0 : -.8;
      notes.push(`${tk} tackles (par ${tpar})`);
    } else {
      d += ga >= par ? Math.min(4.5, .3 + (ga - par) * .15) * w : ga >= par / 2 ? 0 : -.8;
      notes.push(`${ga} goals + assists (par ${par})`);
    }
    const r = objRole() === 'CDM' ? 0 : avg >= 7.5 ? .4 : avg >= 7 ? .2 : avg < 6.2 ? -.4 : 0;
    if (r) { d += r; notes.push(`${avg.toFixed(2)} average rating`); }
  } else if (age >= 22 && !st.missed) { d -= .6; notes.push('too few games'); }
  awards.forEach(a => { const v = awardValue(a); if (v) { d += v; notes.push(a); } });
  d = Math.min(d, 5);
  // How good the season was before age is taken into account: a strong one also slows the birthday fade.
  const form = Math.max(0, d);
  // Gains shrink after 30 and on the way to 91; teenagers are judged gently, older players harder.
  const ageF = age <= 25 ? 1 : age <= VET_AGE ? .9 : Math.max(.25, .7 - (age - VET_AGE - 1) * .1);
  d = d > 0 ? d * ageF * clamp((MAX_OVR - ovr) / 8, .2, 1) * eliteSlow(ovr) * (p.pos === 'GK' ? GK_GROWTH : 1) * PERF_GAIN : d * (age <= 20 ? .3 : declineFactor(age));
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
  return { change: Math.round(d * 10) / 10, notes, form };
}

// ---------- individual accolades ----------
// The Ballon d'Or and friends are decided against the best players in the world (the AI
// squads), on rating, goals, assists and team success.
const GOLDEN_SHOE_COEF = { ENG: 2, ESP: 2, ITA: 2, GER: 2, FRA: 2, POR: 1.5, NED: 1.5, BEL: 1.5, TUR: 1.5 };
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
      // A B team never goes up into its first team's division (or above it): the next club goes instead.
      const blocked = id => { const par = parentOf(club(id)); return par && clubTier(par) >= up.tier; };
      leagueTable(down.id).filter(r => !blocked(r.id)).slice(0, PROMOTE).forEach(r => moves.push({ id: r.id, from: down.id, to: up.id, up: true }));
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
    // Newly promoted: the board's first target in the new division is to stay there.
    if (m.up) club(m.id).upSeason = S.season + 1;
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
  const gone = p.needsContract;
  if (pos === 1 && !gone) { awards.push(`${L.name} champion`); p.trophies.push({ name: L.name, club: c.name, season: S.season }); addRep(6); }
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
    addComp(st.comps = st.comps || {}, `${natName(p.nat)} (qualifiers & friendlies)`, 'nat', caps, g, a, caps * rand(6.6, 7.2), Math.round(caps * rand(60, 85)));
    awards.push(`${caps} caps for ${natName(p.nat)} (qualifiers and friendlies)`);
  }
  (S.cupWins || []).forEach(w => awards.push(w));
  const review = performanceReview(tot, avg, awards);
  // Remember the final top-flight tables for next season's European places.
  S.lastStandings = {};
  S.leagues.filter(l => l.tier === 1).forEach(l => { S.lastStandings[l.nat] = leagueTable(l.id).map(r => r.id); });

  mgrSeasonEnd();
  S.moves = promotionRelegation();
  const myMove = S.moves.find(m => m.id === c.id);
  if (myMove && !gone) awards.push(myMove.up ? `Promoted to ${league(myMove.to).name}` : `Relegated to ${league(myMove.to).name}`);
  // Going down hurts: a regular in the side loses about 1 to 1.5 OVR, someone who barely played less.
  if (myMove && !gone && !myMove.up && st.apps >= 5) {
    const games = (league(lid).clubs.length - 1) * 2, drop = rand(RELEGATION_DROP[0], RELEGATION_DROP[1]) * clamp(st.apps / Math.max(1, games), .3, 1);
    nudgeOvr(-drop);
    review.change = Math.round((review.change - drop) * 10) / 10;
    review.notes.push(`relegated with ${c.name}`);
  }
  const ovr = calcOVR();
  if (pos === 1 && !gone) notify('good', `${league(lid).name} champions!`, `${c.name} won the league. You were part of it.`);
  if (myMove && !gone) notify(myMove.up ? 'good' : 'bad', myMove.up ? 'Promoted!' : 'Relegated', `${c.name} ${myMove.up ? 'go up' : 'go down'} to the ${league(myMove.to).name}.`);
  const personal = awards.filter(awardValue);
  if (personal.length) notify('good', 'Award winner!', personal.join(' · '));
  // The board judges the season: results and your own performances.
  changeBoard((pos === 1 ? 10 : 0) + (myMove ? (myMove.up ? 8 : -8) : 0) + (st.apps >= 10 ? (avg >= 7 ? 5 : avg < 6.2 ? -4 : 1) : 0));

  // This club's row; earlier clubs this season already have theirs.
  if (st.apps + st.cup.apps > 0 || !(p.seasonSpells || []).length) p.career.push(careerRow(st, c));
  const clubs = [...(p.seasonSpells || []).map(s => club(s.club).name), c.name].filter((n, i, a) => a.indexOf(n) === i);
  S.seasonSummary = { season: S.season, club: c.name, clubs, pos, apps: tot.apps, goals: tot.goals, assists: tot.assists, avg, awards, ovrStart: S.ovrSeasonStart || ovr, ovrEnd: ovr, clean: tot.clean, cleanAll: tot.cleanAll || 0, saves: tot.saves || 0, starts: st.starts, missed: tot.missed, loanNext: false, returning: false, cup: tot.cup, review, honours: acc.honours };

  // Ageing for the player (applied at the birthday that comes with the new season).
  // Nothing until 33; from the 34th birthday a gradual fade that steepens from 38 (slower with good
  // kit). Pace and reflexes go a little quicker than the rest.
  const nextAge = age + 1, sum = S.seasonSummary, rawBefore = rawOVR();
  if (nextAge > VET_AGE) {
    // A strong season keeps you sharp: up to 60% less fade after a great one.
    sum.formShield = clamp((review.form || 0) * .25, 0, .6);
    const rate = (BIRTHDAY_DROP[nextAge] || 2 + (nextAge - 39) * .4) * (1 - .06 * p.equip) * (1 - sum.formShield);
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
  // First season in Saudi Arabia or the MLS from 30: the step down in level costs 3 to 4 OVR in all
  // that season (3 after a great one, 4 after a poor one), whatever matches, review and ageing did.
  // After that you age like anywhere else.
  const before = r => r.season < S.season && r.clubId && club(r.clubId) && richLeague(club(r.clubId));
  if (richLeague(c) && age >= 30 && !p.career.some(before)) {
    const target = (S.ovrSeasonStart || ovr) - (4 - clamp((review.form || 0) / 2, 0, 1));
    const extra = rawOVR() - target;
    if (extra > 0) {
      nudgeOvr(-extra);
      sum.leagueDrop = Math.round(extra * 10) / 10; sum.leagueName = L.name;
      sum.ovrEnd = calcOVR(); sum.rawEnd = Math.round(rawOVR() * 10) / 10;
    }
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

  // A renewal signed during the season starts now.
  if (p.nextWage) { p.wage = p.nextWage; p.nextWage = 0; msg(`Your new contract starts: ${money(p.wage)}/week.`); }
  p.years--;
  S.phase = 'offseason';
  (p.objectives || []).forEach(resolveObjective);
  p.objectives = [];
  p.order = null;
  expireOffers('transfer');
  S.offerRerolls = 3;
  if (p.years <= 0) {
    noteRenewal();
    // On loan all season, your own club had no chance to talk to you, so the old rule stands.
    const silent = !p.loan && p.renewSeen !== S.season;
    if (p.loan) endLoan();
    S.offers = [];
    S.seasonSummary.loanNext = false;
    p.needsContract = true;
    p.freeSince = absWeek();
    p.netAt = null;
    p.clauseUntil = 0;
    p.inquiries = [];
    const home = myClub();
    const wanted = (effAff() >= 35 && p.board >= 30) || squadStatus() === 'Key Player';
    const why = wanted ? renewalRefusal() : null;
    if (silent) {
      // No new contract all season: the club has moved on and doesn't come back for you.
      msg(`Your contract has expired. ${home.name} never offered you a new deal this season, and they won't now. Find a new club.`, 'bad');
      notify('bad', 'No new contract', `${home.name} let your contract run out without an offer. Look at the other clubs' offers.`);
    } else if (why) {
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
  // The market kept trading through the summer (about six weeks).
  for (let i = 0; i < 6; i++) marketWeek();
  applyNextPosition();
  planPositionAsk();
  S.player.seasonPos = S.player.pos;
  if (p.loan) {
    endLoan();
    // Still not in the manager's plans? Out on loan again.
    const c = myClub(), slots = formationSlots(c, POS_GROUP[p.pos]);
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
  testimonial();
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

// ---------- luxuries ----------
// Things to spend a footballer's fortune on. Buying something big gets you noticed (a little
// reputation, more for the rarest pieces). Cars cost insurance and upkeep every week (0.15% of their
// price); jewellery and watches don't. Sell back for 75% (cars) or 85% (jewellery and watches).
const LUXURY = [
  // JDM legends
  { id: 'supra', cat: 'car', brand: 'Toyota', name: 'Supra A80 (MK4)', price: 120000 },
  { id: 'r34', cat: 'car', brand: 'Nissan', name: 'Skyline GT-R R34', price: 260000 },
  { id: 'nsx', cat: 'car', brand: 'Honda', name: 'NSX Type R (NA1)', price: 210000 },
  { id: 'rx7', cat: 'car', brand: 'Mazda', name: 'RX-7 Spirit R (FD)', price: 95000 },
  { id: 'lfa', cat: 'car', brand: 'Lexus', name: 'LFA', price: 850000 },
  { id: 'gtr35', cat: 'car', brand: 'Nissan', name: 'GT-R Nismo (R35)', price: 230000 },
  // German
  { id: 'm4', cat: 'car', brand: 'BMW', name: 'M4 CSL', price: 165000 },
  { id: 'm5', cat: 'car', brand: 'BMW', name: 'M5 Touring', price: 150000 },
  { id: 'gt3rs', cat: 'car', brand: 'Porsche', name: '911 GT3 RS', price: 290000 },
  { id: 'turbos', cat: 'car', brand: 'Porsche', name: '911 Turbo S', price: 260000 },
  { id: 'p918', cat: 'car', brand: 'Porsche', name: '918 Spyder', price: 1800000 },
  { id: 'g63', cat: 'car', brand: 'Mercedes-AMG', name: 'G 63', price: 210000 },
  { id: 'amgone', cat: 'car', brand: 'Mercedes-AMG', name: 'ONE', price: 2700000 },
  { id: 'rs6', cat: 'car', brand: 'Audi', name: 'RS 6 Avant', price: 140000 },
  // Italian
  { id: 'f296', cat: 'car', brand: 'Ferrari', name: '296 GTB', price: 310000 },
  { id: 'sf90', cat: 'car', brand: 'Ferrari', name: 'SF90 Stradale', price: 500000 },
  { id: 'purosangue', cat: 'car', brand: 'Ferrari', name: 'Purosangue', price: 420000 },
  { id: 'laferrari', cat: 'car', brand: 'Ferrari', name: 'LaFerrari', price: 3800000 },
  { id: 'huracan', cat: 'car', brand: 'Lamborghini', name: 'Huracán STO', price: 330000 },
  { id: 'urus', cat: 'car', brand: 'Lamborghini', name: 'Urus Performante', price: 270000 },
  { id: 'revuelto', cat: 'car', brand: 'Lamborghini', name: 'Revuelto', price: 600000 },
  { id: 'mc20', cat: 'car', brand: 'Maserati', name: 'MC20', price: 240000 },
  // British and hypercars
  { id: '750s', cat: 'car', brand: 'McLaren', name: '750S', price: 330000 },
  { id: 'p1', cat: 'car', brand: 'McLaren', name: 'P1', price: 1700000 },
  { id: 'dbs', cat: 'car', brand: 'Aston Martin', name: 'DBS 770 Ultimate', price: 380000 },
  { id: 'cullinan', cat: 'car', brand: 'Rolls-Royce', name: 'Cullinan', price: 400000 },
  { id: 'bentayga', cat: 'car', brand: 'Bentley', name: 'Bentayga Speed', price: 260000 },
  { id: 'chiron', cat: 'car', brand: 'Bugatti', name: 'Chiron Super Sport', price: 3600000 },
  { id: 'jesko', cat: 'car', brand: 'Koenigsegg', name: 'Jesko', price: 3200000 },
  // Watches
  { id: 'sub', cat: 'watch', brand: 'Rolex', name: 'Submariner Date', price: 14000 },
  { id: 'daytona', cat: 'watch', brand: 'Rolex', name: 'Cosmograph Daytona', price: 45000 },
  { id: 'nautilus', cat: 'watch', brand: 'Patek Philippe', name: 'Nautilus 5711', price: 140000 },
  { id: 'royaloak', cat: 'watch', brand: 'Audemars Piguet', name: 'Royal Oak Offshore', price: 70000 },
  { id: 'rm', cat: 'watch', brand: 'Richard Mille', name: 'RM 11-03', price: 260000 },
  { id: 'grandcomp', cat: 'watch', brand: 'Patek Philippe', name: 'Grand Complications', price: 900000 },
  // Jewellery
  { id: 'chain', cat: 'jewel', brand: 'Custom', name: 'Gold Cuban link chain', price: 25000 },
  { id: 'studs', cat: 'jewel', brand: 'Custom', name: 'Diamond stud earrings', price: 18000 },
  { id: 'tennis', cat: 'jewel', brand: 'Cartier', name: 'Diamond tennis bracelet', price: 60000 },
  { id: 'pendant', cat: 'jewel', brand: 'Custom', name: 'Iced-out club crest pendant', price: 120000 },
  { id: 'ring', cat: 'jewel', brand: 'Graff', name: 'Pink diamond ring', price: 650000 },
  { id: 'grillz', cat: 'jewel', brand: 'Custom', name: 'Diamond grillz', price: 40000 },
  // More cars: everyday heroes to one-off hypercars
  { id: 'civictr', cat: 'car', brand: 'Honda', name: 'Civic Type R', price: 55000 },
  { id: 'gr86', cat: 'car', brand: 'Toyota', name: 'GR86', price: 38000 },
  { id: 'grsupra', cat: 'car', brand: 'Toyota', name: 'GR Supra', price: 70000 },
  { id: 'gtr32', cat: 'car', brand: 'Nissan', name: 'Skyline GT-R R32', price: 85000 },
  { id: 'znismo', cat: 'car', brand: 'Nissan', name: 'Z Nismo', price: 70000 },
  { id: 'evo6', cat: 'car', brand: 'Mitsubishi', name: 'Lancer Evo VI Tommi Mäkinen', price: 75000 },
  { id: 'sti22b', cat: 'car', brand: 'Subaru', name: 'Impreza 22B STi', price: 350000 },
  { id: 'gt2rs', cat: 'car', brand: 'Porsche', name: '911 GT2 RS', price: 450000 },
  { id: 'taycan', cat: 'car', brand: 'Porsche', name: 'Taycan Turbo GT', price: 240000 },
  { id: 'carreragt', cat: 'car', brand: 'Porsche', name: 'Carrera GT', price: 1500000 },
  { id: 'xm', cat: 'car', brand: 'BMW', name: 'XM Label', price: 190000 },
  { id: 'm3e46', cat: 'car', brand: 'BMW', name: 'M3 CSL (E46)', price: 140000 },
  { id: 'm1', cat: 'car', brand: 'BMW', name: 'M1 Procar', price: 900000 },
  { id: 'sls', cat: 'car', brand: 'Mercedes-AMG', name: 'SLS Black Series', price: 500000 },
  { id: 'maybach', cat: 'car', brand: 'Mercedes-Maybach', name: 'S 680', price: 260000 },
  { id: 'r8', cat: 'car', brand: 'Audi', name: 'R8 GT', price: 230000 },
  { id: 'roma', cat: 'car', brand: 'Ferrari', name: 'Roma Spider', price: 280000 },
  { id: 'f812', cat: 'car', brand: 'Ferrari', name: '812 Competizione', price: 700000 },
  { id: 'f40', cat: 'car', brand: 'Ferrari', name: 'F40', price: 3000000 },
  { id: 'enzo', cat: 'car', brand: 'Ferrari', name: 'Enzo', price: 4500000 },
  { id: 'svj', cat: 'car', brand: 'Lamborghini', name: 'Aventador SVJ', price: 600000 },
  { id: 'countach', cat: 'car', brand: 'Lamborghini', name: 'Countach LPI 800-4', price: 2600000 },
  { id: 'huayra', cat: 'car', brand: 'Pagani', name: 'Huayra', price: 3200000 },
  { id: 'utopia', cat: 'car', brand: 'Pagani', name: 'Utopia', price: 3500000 },
  { id: 'senna', cat: 'car', brand: 'McLaren', name: 'Senna', price: 1300000 },
  { id: 'mclarenf1', cat: 'car', brand: 'McLaren', name: 'F1', price: 20000000 },
  { id: 'valkyrie', cat: 'car', brand: 'Aston Martin', name: 'Valkyrie', price: 3500000 },
  { id: 'phantom', cat: 'car', brand: 'Rolls-Royce', name: 'Phantom', price: 500000 },
  { id: 'spectre', cat: 'car', brand: 'Rolls-Royce', name: 'Spectre', price: 450000 },
  { id: 'conti', cat: 'car', brand: 'Bentley', name: 'Continental GT Speed', price: 290000 },
  { id: 'veyron', cat: 'car', brand: 'Bugatti', name: 'Veyron Grand Sport', price: 1800000 },
  { id: 'tourbillon', cat: 'car', brand: 'Bugatti', name: 'Tourbillon', price: 3800000 },
  { id: 'regera', cat: 'car', brand: 'Koenigsegg', name: 'Regera', price: 2800000 },
  { id: 'nevera', cat: 'car', brand: 'Rimac', name: 'Nevera', price: 2100000 },
  { id: 'cybertruck', cat: 'car', brand: 'Tesla', name: 'Cybertruck Cyberbeast', price: 110000 },
  { id: 'escalade', cat: 'car', brand: 'Cadillac', name: 'Escalade-V', price: 160000 },
  { id: 'defender', cat: 'car', brand: 'Land Rover', name: 'Defender Octa', price: 170000 },
  // More watches
  { id: 'santos', cat: 'watch', brand: 'Cartier', name: 'Santos de Cartier', price: 9000 },
  { id: 'speedy', cat: 'watch', brand: 'Omega', name: 'Speedmaster Moonwatch', price: 9000 },
  { id: 'gmt', cat: 'watch', brand: 'Rolex', name: 'GMT-Master II Pepsi', price: 30000 },
  { id: 'dday', cat: 'watch', brand: 'Rolex', name: 'Day-Date 40 Platinum', price: 85000 },
  { id: 'rainbow', cat: 'watch', brand: 'Rolex', name: 'Daytona Rainbow', price: 450000 },
  { id: 'aquanaut', cat: 'watch', brand: 'Patek Philippe', name: 'Aquanaut 5168G', price: 160000 },
  { id: 'ro15500', cat: 'watch', brand: 'Audemars Piguet', name: 'Royal Oak 15500', price: 55000 },
  { id: 'rotour', cat: 'watch', brand: 'Audemars Piguet', name: 'Royal Oak Tourbillon', price: 300000 },
  { id: 'bigbang', cat: 'watch', brand: 'Hublot', name: 'Big Bang Unico', price: 25000 },
  { id: 'overseas', cat: 'watch', brand: 'Vacheron Constantin', name: 'Overseas', price: 45000 },
  { id: 'datograph', cat: 'watch', brand: 'A. Lange & Söhne', name: 'Datograph', price: 120000 },
  { id: 'rm27', cat: 'watch', brand: 'Richard Mille', name: 'RM 27-04 Rafael Nadal', price: 1300000 },
  { id: 'billionaire', cat: 'watch', brand: 'Jacob & Co', name: 'Billionaire Timeless Treasure', price: 2000000 },
  // More jewellery
  { id: 'cross', cat: 'jewel', brand: 'Custom', name: 'Diamond cross pendant', price: 30000 },
  { id: 'rope', cat: 'jewel', brand: 'Custom', name: 'White gold rope chain', price: 15000 },
  { id: 'love', cat: 'jewel', brand: 'Cartier', name: 'Love bracelet', price: 8000 },
  { id: 'juste', cat: 'jewel', brand: 'Cartier', name: 'Juste un Clou diamond bracelet', price: 45000 },
  { id: 'solitaire', cat: 'jewel', brand: 'Tiffany & Co.', name: 'Diamond solitaire ring', price: 90000 },
  { id: 'alhambra', cat: 'jewel', brand: 'Van Cleef & Arpels', name: 'Alhambra necklace', price: 35000 },
  { id: 'serpenti', cat: 'jewel', brand: 'Bulgari', name: 'Serpenti diamond necklace', price: 250000 },
  { id: 'icedchain', cat: 'jewel', brand: 'Custom', name: 'Fully iced tennis chain', price: 180000 },
  { id: 'numberpendant', cat: 'jewel', brand: 'Custom', name: 'Diamond shirt-number pendant', price: 75000 },
  { id: 'emerald', cat: 'jewel', brand: 'Harry Winston', name: 'Emerald-cut diamond ring', price: 1500000 },
  { id: 'minitrophy', cat: 'jewel', brand: 'Custom', name: 'Gold mini-trophy replica', price: 400000 },
];
const LUX_CATS = { car: 'Cars', watch: 'Watches', jewel: 'Jewellery' };
const CAR_UPKEEP = .0015, SELL_BACK_LUX = { car: .75, watch: .85, jewel: .85 };
const luxItem = id => LUXURY.find(x => x.id === id);
const collection = () => S.player.collection || [];
const collectionValue = () => collection().reduce((s, c) => s + Math.round(luxItem(c.id).price * SELL_BACK_LUX[luxItem(c.id).cat]), 0);
const carUpkeep = () => collection().reduce((s, c) => s + (luxItem(c.id).cat === 'car' ? Math.round(luxItem(c.id).price * CAR_UPKEEP) : 0), 0);
function buyLuxury(id) {
  const p = S.player, it = luxItem(id);
  if (!it || p.money < it.price) return false;
  p.money -= it.price;
  p.collection = [...collection(), { id, uid: Math.random().toString(36).slice(2, 9), season: S.season }];
  // A headline purchase gets you talked about: up to +3 reputation for the most expensive pieces.
  addRep(clamp(Math.log10(it.price / 10000) * 1.2, .2, 3));
  msg(`You bought a ${it.brand === 'Custom' ? '' : it.brand + ' '}${it.name} for ${money(it.price)}.${it.cat === 'car' ? ` Insurance and upkeep: ${money(Math.round(it.price * CAR_UPKEEP))}/week.` : ''}`, 'good');
  save();
  return true;
}
function sellLuxury(uid) {
  const p = S.player, c = collection().find(x => x.uid === uid);
  if (!c) return false;
  const it = luxItem(c.id), back = Math.round(it.price * SELL_BACK_LUX[it.cat]);
  p.money += back;
  p.collection = collection().filter(x => x.uid !== uid);
  msg(`Sold your ${it.brand === 'Custom' ? '' : it.brand + ' '}${it.name} for ${money(back)}.`);
  save();
  return true;
}

// ---------- investments ----------
// A small stock market of made-up companies. Each week every price moves with the market and on its
// own: steady blue chips, high-flying tech that can halve, and dividend payers that pay out every
// quarter. Trades cost 0.5%. Prices keep moving in the summer too.
const STOCKS = [
  { sym: 'WRLD', name: 'World Index Fund', sector: 'Index', start: 100, mu: .0016, sigma: .018, beta: 1, div: .018 },
  { sym: 'QNTM', name: 'Quantum AI', sector: 'Tech', start: 85, mu: .0035, sigma: .07, beta: 1.6, div: 0 },
  { sym: 'NOVA', name: 'Nova Devices', sector: 'Tech', start: 140, mu: .0025, sigma: .04, beta: 1.3, div: .006 },
  { sym: 'STRD', name: 'Stride Sportswear', sector: 'Sports', start: 62, mu: .0018, sigma: .03, beta: .9, div: .015 },
  { sym: 'PTCH', name: 'Pitchside Media', sector: 'Media', start: 34, mu: .0012, sigma: .045, beta: 1.1, div: .01 },
  { sym: 'CRWN', name: 'Crown Bank', sector: 'Banking', start: 48, mu: .0012, sigma: .025, beta: 1.1, div: .045 },
  { sym: 'HLIO', name: 'Helios Energy', sector: 'Energy', start: 72, mu: .0014, sigma: .032, beta: .8, div: .04 },
  { sym: 'ORBT', name: 'Orbit Space', sector: 'Aerospace', start: 26, mu: .003, sigma: .09, beta: 1.5, div: 0 },
  { sym: 'VRDT', name: 'Verdant Foods', sector: 'Food', start: 55, mu: .0011, sigma: .015, beta: .5, div: .03 },
  { sym: 'TITN', name: 'Titan Mining', sector: 'Mining', start: 41, mu: .0013, sigma: .05, beta: 1.2, div: .035 },
  { sym: 'ZPHR', name: 'Zephyr Airlines', sector: 'Travel', start: 18, mu: .0009, sigma: .06, beta: 1.4, div: 0 },
  { sym: 'APEX', name: 'Apex Motors', sector: 'Autos', start: 210, mu: .0022, sigma: .055, beta: 1.4, div: 0 },
];
const TRADE_FEE = .005, PRICE_HISTORY = 26, DIV_EVERY = 13;
const stock = sym => STOCKS.find(s => s.sym === sym);
function market() {
  if (!S.market) S.market = { tick: 0, prices: Object.fromEntries(STOCKS.map(s => [s.sym, s.start])), hist: Object.fromEntries(STOCKS.map(s => [s.sym, [s.start]])) };
  return S.market;
}
const portfolio = () => S.player.portfolio || {};
const sharePrice = sym => market().prices[sym];
const portfolioValue = () => Object.entries(portfolio()).reduce((s, [sym, h]) => s + h.shares * sharePrice(sym), 0);
// One week of trading: the whole market drifts together, each stock adds its own luck.
function marketWeek() {
  const m = market(), mkt = gauss() * .02;
  m.tick++;
  STOCKS.forEach(s => {
    const r = s.mu + s.beta * mkt + s.sigma * gauss();
    const price = Math.max(.5, Math.round(m.prices[s.sym] * Math.exp(r) * 100) / 100);
    m.prices[s.sym] = price;
    m.hist[s.sym] = [...m.hist[s.sym], price].slice(-PRICE_HISTORY);
  });
  // Dividends every quarter, straight into your bank.
  if (m.tick % DIV_EVERY === 0) {
    const paid = Object.entries(portfolio()).reduce((s, [sym, h]) => s + h.shares * sharePrice(sym) * stock(sym).div / 4, 0);
    if (paid >= 1) { S.player.money += Math.round(paid); msg(`Dividends paid into your account: ${money(Math.round(paid))}.`, 'good'); }
  }
}
function buyShares(sym, amount) {
  const p = S.player, price = sharePrice(sym), spend = Math.min(amount, p.money);
  const shares = Math.floor(spend / (price * (1 + TRADE_FEE)));
  if (!stock(sym) || shares < 1) return 0;
  const cost = Math.round(shares * price * (1 + TRADE_FEE));
  const h = portfolio()[sym] || { shares: 0, cost: 0 };
  p.portfolio = { ...portfolio(), [sym]: { shares: h.shares + shares, cost: h.cost + cost } };
  p.money -= cost;
  save();
  return shares;
}
function sellShares(sym, fraction) {
  const p = S.player, h = portfolio()[sym];
  if (!h) return 0;
  const shares = fraction >= 1 ? h.shares : Math.floor(h.shares * fraction);
  if (shares < 1) return 0;
  const back = Math.round(shares * sharePrice(sym) * (1 - TRADE_FEE));
  p.money += back;
  const left = h.shares - shares, port = { ...portfolio() };
  if (left > 0) port[sym] = { shares: left, cost: Math.round(h.cost * left / h.shares) }; else delete port[sym];
  p.portfolio = port;
  save();
  return back;
}
const netWorth = () => S.player.money + portfolioValue() + collectionValue();

// ---------- transfer value ----------
// What a club would pay for you: mostly OVR (about €2.7M at 70, €14M at 80, €63M at 89), then your
// position (goalscorers cost the most, keepers the least), age, reputation, years left on your contract
// and how much money there is in your league. Form moves it up to 30% either way (see valueForm).
const VALUE_POS = { ST: 1.2, LW: 1.15, RW: 1.15, CAM: 1.1, CM: 1, LM: 1, RM: 1, CDM: .95, CB: .9, LB: .85, RB: .85, GK: .65 };
const valueAge = a => a <= 21 ? 1.5 : a <= 23 ? 1.3 : a <= 26 ? 1.15 : a <= 28 ? 1 : a === 29 ? .85 : a === 30 ? .7 : a === 31 ? .55 : a === 32 ? .45 : a === 33 ? .35 : Math.max(.08, .25 - (a - 34) * .05);
// How a season went, from -1 (awful) to 1 (outstanding): 60% output for the position against its
// season par (G/A, tackles, or clean sheets and saves for keepers), 40% average rating. Output in
// the lower leagues counts for less, like in the end-of-season review.
function seasonScore(row, pos, l) {
  if (!row || row.apps < 3) return null;
  const per = n => n / row.apps / (1 / 40), w = l.tier === 1 ? leagueWeight(l) : l.tier === 2 ? .7 : .5;
  let out;
  if (pos === 'GK') out = clamp((row.cleanAll / row.apps - .25) / .2, -1, 1) + (row.saves / row.apps >= 3 ? .2 : 0);
  else {
    const ratio = TACKLERS.includes(pos) ? per(row.tackles) / TACKLE_PAR[pos] : per(row.goals + row.assists) / GA_PAR[pos];
    out = clamp((ratio - 1) / 1.2, -1, 1);
  }
  if (out > 0) out *= w;
  return clamp(.6 * Math.min(1, out) + .4 * clamp((row.avg - 6.8) / .8, -1, 1), -1, 1);
}
// This season counts fully from 10 games; until then last season fills in at 60% weight.
function valueForm(p) {
  const st = p.st;
  const now = st && seasonScore({ apps: st.apps + st.cup.apps, goals: st.goals + st.cup.goals, assists: st.assists + st.cup.assists, tackles: st.tackles || 0, cleanAll: st.cleanAll || 0, saves: st.saves || 0, avg: (st.rsum + st.cup.rsum) / Math.max(1, st.apps + st.cup.apps) }, p.pos, league(myClub().league));
  const lastRow = (p.career || []).at(-1), lastClub = lastRow && club(lastRow.clubId);
  const last = lastClub ? seasonScore(lastRow, lastRow.pos || p.pos, league(lastClub.league)) : null;
  const k = now == null ? 0 : Math.min(1, (st.apps + st.cup.apps) / 10);
  return 1 + .3 * (k * (now || 0) + (1 - k) * .6 * (last || 0));
}
function playerValue(p = S.player) {
  if (p.needsContract) return 0;
  const c = club(p.loan ? p.loan.parent : p.club), l = league(c.league), ovr = calcOVR(p);
  const base = 5e5 * Math.exp((ovr - 60) / 6);
  const contract = p.years <= 0 ? .3 : p.years === 1 ? .7 : p.years === 2 ? .9 : 1;
  const market = l.tier === 3 ? .35 : l.tier === 2 ? .6 : VET_LEAGUES.includes(l.nat) ? .8 : 1;
  const v = base * (VALUE_POS[p.pos] || 1) * valueAge(ageOf(p.by)) * (.8 + p.rep / 250) * contract * market * valueForm(p);
  const step = v >= 1e7 ? 5e5 : v >= 1e6 ? 1e5 : 1e4;
  return Math.max(1e4, Math.round(v / step) * step);
}

// ---------- paused careers ----------
// Careers you stepped away from without retiring. A whole save is about 2 MB, too big to keep
// several in localStorage, so each one lives in IndexedDB; a small list for the start screen
// stays in localStorage.
const PAUSED_KEY = 'ptl_paused_v1', IDB_NAME = 'ptl', IDB_STORE = 'paused';
function pausedList() { try { return JSON.parse(localStorage.getItem(PAUSED_KEY)) || []; } catch (e) { return []; } }
function setPausedList(list) { try { localStorage.setItem(PAUSED_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ } }
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, mode), req = fn(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = () => rej(tx.error);
  });
}

// Put the career in progress aside and clear the slot. Returns false if it could not be stored,
// in which case nothing is deleted.
async function pauseCurrent() {
  if (!S || S.phase === 'retired') return true;
  const p = S.player, id = p.careerId || (p.careerId = Date.now());
  try { await idbDo('readwrite', st => st.put(JSON.stringify(S), id)); } catch (e) { return false; }
  const row = {
    id, name: p.name, pos: p.pos, nat: p.nat, age: ageOf(p.by), ovr: calcOVR(), season: seasonLabel(),
    club: p.club ? myClub().name : 'Choosing a club', clubId: p.club || null, seasons: (p.career || []).length, paused: Date.now(),
  };
  setPausedList([row, ...pausedList().filter(r => r.id !== id)]);
  wipe();
  return true;
}

// Pick a paused career back up. The one you were playing (if any) is paused in its place.
async function resumePaused(id) {
  let raw;
  try { raw = await idbDo('readonly', st => st.get(id)); } catch (e) { return false; }
  if (!raw) return false;
  if (S && S.phase !== 'retired' && !(await pauseCurrent())) return false;
  S = JSON.parse(raw);
  migrate();
  save();
  setPausedList(pausedList().filter(r => r.id !== id));
  try { await idbDo('readwrite', st => st.delete(id)); } catch (e) { /* the list no longer points at it */ }
  return true;
}

async function deletePaused(id) {
  setPausedList(pausedList().filter(r => r.id !== id));
  try { await idbDo('readwrite', st => st.delete(id)); } catch (e) { /* already gone */ }
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
  // A renewal on offer that would end no later than your current deal is stretched a season past it.
  (S.offers || []).forEach(o => { if (o.type === 'renew' && !o.raise && o.club === p.club) o.years = Math.max(o.years, (p.years || 0) + (S.phase === 'season' ? 0 : 1)); });
  // Veteran offers from Saudi, MLS and Portuguese clubs made under the old age cap get the new role.
  if (ageOf(p.by) >= VET_AGE) (S.offers || []).forEach(o => {
    const c = S.clubs[o.club];
    if (o.type !== 'transfer' || !c || clubTier(c) !== 1 || bigTopFlight(c) || ROLE_RANK[o.status] >= ROLE_RANK.Starter) return;
    delete o.roleCap;
    if (calcOVR() >= teamStrength(c) - 5) { o.status = 'Starter'; o.promised = true; } else o.status = 'Rotation';
  });
  // The settling-in lock used to be six months: make it a year from joining, and drop agent calls
  // that came in before that year was up.
  if (!p.lockYear) {
    if (p.offerLock) p.offerLock += OFFER_LOCK_WEEKS - 26;
    p.lockYear = true;
    if (offerLocked() && p.inquiries) p.inquiries = p.inquiries.filter(q => q.talks);
  }
  // Enquiries from a club you just left are dropped.
  if (p.inquiries && S.clubs) p.inquiries = p.inquiries.filter(q => q.talks || !leftRecently(q.club));
  // Agreed to a new position before you could play it straight away: play it from now.
  if (p.nextPos && !p.playPos) p.playPos = p.nextPos;
  if (p.playPos && p.adjustUntil == null) p.adjustUntil = absWeek() + ADJUST_WEEKS;
  // Stats from before the EA card shape: reshape them to it at the same OVR, keeping half of what
  // made you different in the stats that count and a quarter in the others.
  if (!p.eaV) eaReshape();
  // Stats from an older shape: reshape to the current one at the same OVR.
  if ((p.eaV || 0) < 3) shapeReshape(p.eaV === 2 && (p.pos === 'LB' || p.pos === 'RB') ? FB_V2 : PROFILE_V1[p.pos]);
  // Switched main position before stats were reshaped: rebuild them from last season's OVR there.
  const lastRow = (p.career || []).at(-1);
  if (p.rebalanced == null && lastRow && lastRow.pos && lastRow.pos !== p.pos && p.pos !== 'GK' && lastRow.ovr - calcOVR() > SWITCH_MAX_DROP) rebalanceAttrs(lastRow.pos, lastRow.ovr);
  // Reshaped with the first version (too much of the old position kept): reshape again to the new shape.
  else if (p.rebalanced != null && p.rebalanceV === undefined && p.pos !== 'GK') rebalanceAttrs(p.pos, calcOVR() + randi(0, SWITCH_MAX_DROP));
  // Reshaped before unused stats drifted too (a winger keeping 91 Defending): drift them now.
  else if (p.rebalanceV === 2 && POS_PROFILE[p.pos]) { shapeUnused({ ...p.attrs }); p.rebalanceV = 3; }
  // Saves from before the first-season lock: a club joined this summer still counts as new.
  if (p.newClubUntil == null) p.newClubUntil = p.joinedSeason === S.season && S.phase === 'offseason' ? (S.season + 2) * SEASON_WEEKS + 1 : 0;
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
    // Built in 2026 terms like the database, then moved to this career's calendar.
    labelBase = START_YEAR;
    const l = buildLeague(L, S.clubs);
    labelBase = null;
    shiftAges(l.clubs.map(id => S.clubs[id]), baseYear() - START_YEAR);
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
// Keepers need 100 clean sheets (all competitions) there instead of 100 goals and assists;
// defenders need either 80 clean sheets or the 100 goals and assists.
// Playing for both sides of a rivalry (say Real Madrid and Barcelona) rules you out as a legend at both.
const LEGEND = { seasons: 5, ga: 100, clean: 100, defClean: 80, apps: 150 };
function clubLegacy(rec) {
  const byClub = {}, gk = POS_GROUP[rec.pos] === 'GK', def = POS_GROUP[rec.pos] === 'DEF';
  rec.career.filter(r => !/\(loan\)/.test(r.club)).forEach(r => {
    const c = byClub[r.club] = byClub[r.club] || { club: r.club, clubId: r.clubId, seasons: new Set(), apps: 0, goals: 0, assists: 0, clean: 0, titles: {} };
    c.seasons.add(r.season); c.apps += r.apps; c.goals += r.goals; c.assists += r.assists; c.clean += r.cleanAll || 0;
    // A league title is a trophy named after the league that club played in that season.
    (rec.trophies || []).filter(t => t.season === r.season && t.club === r.club && t.name === r.league).forEach(t => { c.titles[t.name] = (c.titles[t.name] || 0) + 1; });
  });
  const names = Object.keys(byClub), rivalsOf = n => names.filter(m => m !== n && RIVALRIES.some(([x, y]) => (x === n && y === m) || (x === m && y === n)));
  return Object.values(byClub).map(c => {
    const numbers = gk ? c.clean >= LEGEND.clean : c.goals + c.assists >= LEGEND.ga || (def && c.clean >= LEGEND.defClean);
    const earned = c.seasons.size > LEGEND.seasons && numbers && c.apps > LEGEND.apps, rivals = rivalsOf(c.club);
    return { ...c, seasons: c.seasons.size, ga: c.goals + c.assists, gk, def, rivals, earned, legend: earned && !rivals.length };
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
    startYear: baseYear(),
    id: p.careerId || (p.careerId = Date.now()), name: p.name, nat: p.nat, pos: p.pos, career: p.career, trophies: p.trophies, awards: p.awards,
    caps: p.caps, intlGoals: p.intlGoals || 0, attrs: roundAttrs(p.attrs), money: p.money, by: p.by, lastClub: p.club ? myClub().name : '–', retiredAge: ageOf(p.by),
    peak: Math.max(calcOVR(), ...p.career.map(r => r.ovr)), rep: Math.round(p.rep),
  };
}
// ---------- card status at retirement ----------
// Like EA's Icons and Heroes: a Legacy score from what you won and how good you were, plus a fans'
// vote, decides whether your retirement card is an Icon, a Hero or a plain card.
// Trophies: the first matching line counts; a league title is a trophy named after the league you
// played in that season; anything else is a domestic cup.
const LEGACY_TROPHY = [[/Club World Cup/, 6], [/World Cup( \d{4})?$/, 12], [/Champions League/, 12],
  [/European Championship|Euro|Copa América|Africa Cup|Asian Cup|Gold Cup|Nations League/, 8], [/Europa League|Conference League|Libertadores/, 5]];
const LEGACY_AWARD = [[/Ballon d'Or/, 25], [/The Best|Golden Shoe|Yashin/, 8], [/Golden Boot|Player of the (Season|Year)|Golden Ball|Top Scorer/, 4], [/Team of the Season|World 11/, 1]];
// Icon: 120+ with 60%+ of the fans behind you, or 180+ whatever they say. Hero: 50+ with 50%+ of
// the fans, or a legend at any club whatever the score (with a peak OVR of 75 or more).
const ICON_SCORE = 120, ICON_ANY = 180, ICON_VOTE = 60, HERO_SCORE = 50, HERO_VOTE = 50, HERO_LEGEND_PEAK = 75;
function legacyScore(rec) {
  const groups = {};
  const add = (label, pts) => { const g = groups[label] = groups[label] || { label, n: 0, pts: 0 }; g.n++; g.pts += pts; };
  (rec.trophies || []).forEach(t => {
    if ((rec.career || []).some(r => r.season === t.season && r.league === t.name)) { add('league title', 5); return; }
    const hit = LEGACY_TROPHY.find(([re]) => re.test(t.name));
    if (hit) add(t.name.replace(/ \d{4}$/, ''), hit[1]); else add('domestic cup', 2);
  });
  (rec.awards || []).forEach(a => { const hit = LEGACY_AWARD.find(([re]) => re.test(a.name)); add(hit ? a.name.replace(/ \d{4}$/, '') : 'other award', hit ? hit[1] : 2); });
  const legends = clubLegacy(rec).filter(c => c.legend);
  legends.forEach(c => add(`legend at ${c.club}`, 10));
  if ((rec.caps || 0) >= 10) groups.caps = { label: `${rec.caps} caps`, n: 1, pts: Math.floor(rec.caps / 10) };
  if ((rec.peak || 0) > 80) groups.peak = { label: `peak OVR ${rec.peak}`, n: 1, pts: (rec.peak - 80) * 2 };
  const parts = Object.values(groups).sort((a, b) => b.pts - a.pts);
  return { score: parts.reduce((s, g) => s + g.pts, 0), parts };
}
// The fans' vote: what fans remember is years at the top, not one big night. Seasons you ended at
// 85+ OVR, seasons with a standout award (Golden Boot, Player of the Season, Team of the Season...),
// the biggest trophies, legend status and a long one-club career lift it; playing for a club's
// rivals drags it down. Reputation is only a small bonus, so maxing it out decides nothing. A little
// luck, the same every time for the same career.
const STANDOUT = /Golden Boot|Golden Shoe|Top Scorer|Top Assists|Player of the (Season|Year)|Golden Ball|Team of the Season|World 11|Ballon d'Or|The Best|Yashin/;
const BIG_ONES = /World Cup( \d{4})?$|Champions League|European Championship|Copa América|Africa Cup|Asian Cup/;
function fanVote(rec) {
  const clubs = clubLegacy(rec), legends = clubs.filter(c => c.legend).length;
  const elite = new Set((rec.career || []).filter(r => (r.ovr || 0) >= 85).map(r => r.season)).size;
  const standout = new Set((rec.awards || []).filter(a => STANDOUT.test(a.name)).map(a => a.season ?? a.name)).size;
  const big = (rec.trophies || []).filter(t => BIG_ONES.test(t.name) && !/Club World Cup/.test(t.name)).length;
  const oneClub = clubs.length === 1 && clubs[0].seasons >= 8, rivals = clubs.some(c => c.rivals.length);
  const luck = strHash(`${rec.id}|${rec.name}|vote`) % 13 - 6;
  const vote = 10 + Math.min(40, elite * 5) + Math.min(24, standout * 4) + Math.min(12, big * 3) + legends * 8
    + (oneClub ? 10 : 0) - (rivals ? 10 : 0) + (rec.rep || 0) / 10 + luck;
  const notes = [elite && `${elite} season${elite > 1 ? 's' : ''} at 85+`, standout && `${standout} standout season${standout > 1 ? 's' : ''}`,
    big && `${big} major trophies`.replace(/^1 major trophies/, '1 major trophy'), legends && 'club legend', oneClub && 'one-club player', rivals && 'played for rivals'].filter(Boolean);
  return { vote: Math.round(clamp(vote, 3, 98)), notes };
}
function cardStatus(rec) {
  const { score, parts } = legacyScore(rec), { vote, notes: voteNotes } = fanVote(rec), legend = clubLegacy(rec).some(c => c.legend) && (rec.peak || 0) >= HERO_LEGEND_PEAK;
  const status = score >= ICON_ANY || (score >= ICON_SCORE && vote >= ICON_VOTE) ? 'icon'
    : (score >= HERO_SCORE && vote >= HERO_VOTE) || legend ? 'hero' : 'base';
  const tier = (rec.peak || 0) >= 75 ? 'gold' : (rec.peak || 0) >= 65 ? 'silver' : 'bronze';
  return { status, tier, score, parts, vote, voteNotes };
}

// The retirement Icon card, the way EA FC does its Icons: the OVR is your average across the seasons
// you were 25 to 33 (your peak OVR if you retired before 25), and the positions are the three you
// played most games in. Games from before positions were counted per game go to that
// season's main position.
function iconCard(rec) {
  const rows = rec.career || [], last = rows.length ? Math.max(...rows.map(r => r.season)) : 0;
  const ageAt = s => rec.by != null ? (rec.startYear || START_YEAR) + s - rec.by : rec.retiredAge - (last - s);
  const bySeason = {};
  rows.forEach(r => { bySeason[r.season] = r.ovr; });
  const prime = Object.keys(bySeason).filter(s => ageAt(+s) >= 25 && ageAt(+s) <= 33).map(s => bySeason[s]);
  const ovr = prime.length ? Math.round(prime.reduce((a, b) => a + b, 0) / prime.length) : rec.peak;
  const apps = {};
  rows.forEach(r => {
    const pa = { ...(r.posApps || {}) }, counted = Object.values(pa).reduce((a, b) => a + b, 0);
    if (r.apps > counted) pa[r.pos] = (pa[r.pos] || 0) + r.apps - counted;
    for (const k in pa) apps[k] = (apps[k] || 0) + pa[k];
  });
  const order = Object.entries(apps).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const pos = order.length ? order[0][0] : rec.pos;
  // Old careers saved without stats get the typical stats of their position and card OVR.
  return { ovr, prime: prime.length, pos, alts: order.slice(1, 3).map(([k]) => k), apps: order.slice(0, 3), stats: iconStats(rec, rows, ageAt) || typicalAttrs(pos, ovr) };
}
// The card's six stats, like an EA card: each one averaged over the same seasons as the OVR (aged
// 25 to 33, or your best season if you retired younger). Seasons saved before stats were recorded
// are estimated from your stats at retirement, moved by that season's OVR (every stat rises and
// falls together as OVR changes). null for old careers saved without any stats.
function iconStats(rec, rows, ageAt) {
  const end = rec.attrs, endRow = rows.reduce((a, r) => !a || r.season > a.season ? r : a, null);
  const keys = end ? Object.keys(end) : rows.find(r => r.attrs) ? Object.keys(rows.find(r => r.attrs).attrs) : null;
  if (!keys) return null;
  const of = r => r.attrs && keys.every(k => r.attrs[k] != null) ? r.attrs
    : end && endRow ? Object.fromEntries(keys.map(k => [k, end[k] + (r.ovr - endRow.ovr)])) : null;
  // One entry per season (a season split between two clubs keeps the later one).
  const seasons = Object.values(Object.fromEntries(rows.map(r => [r.season, r])));
  let pool = seasons.filter(r => { const a = ageAt(r.season); return a >= 25 && a <= 33; });
  if (!pool.length && rows.length) pool = [rows.reduce((a, r) => r.ovr > a.ovr ? r : a)];
  const sets = pool.map(of).filter(Boolean);
  if (!sets.length) return end ? Object.fromEntries(keys.map(k => [k, Math.round(end[k])])) : null;
  return Object.fromEntries(keys.map(k => [k, clamp(Math.round(sets.reduce((s, a) => s + a[k], 0) / sets.length), 1, 99)]));
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
