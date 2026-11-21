// Draws the store app's icon and splash artwork (a football on the game's navy, amber accents) into app/assets,
// ready for Capacitor's asset tool, which makes every Android size from them:
//   cd app; node ../tools/make-app-art.js; npx capacitor-assets generate --android
// Uses sharp from app/node_modules (installed with @capacitor/assets).
const path = require('path');
const fs = require('fs');
const sharp = require(require.resolve('sharp', { paths: [path.join(__dirname, '..', 'app')] }));

const NAVY = '#0c1524', LINE = '#2a3d5a', AMBER = '#ffb547', PANEL = '#14213a';
const out = path.join(__dirname, '..', 'app', 'assets');
fs.mkdirSync(out, { recursive: true });

const pt = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
const poly = pts => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
const pentagon = (cx, cy, r, rot) => Array.from({ length: 5 }, (_, i) => pt(cx, cy, r, rot + i * 72));

// A classic ball: a dark pentagon in the middle, five more round the edge (cut off by the ball), seams between.
function ball(cx, cy, R) {
  const id = `b${Math.round(cx)}${Math.round(cy)}`;
  const pr = R * 0.33, far = R * 0.92;
  const centre = pentagon(cx, cy, pr, -90);
  const outer = Array.from({ length: 5 }, (_, k) => {
    const a = -90 + k * 72, [ox, oy] = pt(cx, cy, far, a);
    return pentagon(ox, oy, pr, a + 180);
  });
  let seams = '';
  for (let k = 0; k < 5; k++) {
    // Centre pentagon corner to the corner of the outer pentagon that points at it.
    seams += `<line x1="${centre[k][0]}" y1="${centre[k][1]}" x2="${outer[k][0][0]}" y2="${outer[k][0][1]}"/>`;
    // Outer pentagons joined to their neighbours, closing the white hexagons.
    const a = outer[k], b = outer[(k + 1) % 5];
    seams += `<line x1="${a[2][0]}" y1="${a[2][1]}" x2="${b[3][0]}" y2="${b[3][1]}"/>`;
  }
  return `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
      <radialGradient id="${id}g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e1ec"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${R + R * 0.07}" fill="${AMBER}"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}g)"/>
    <g clip-path="url(#${id})">
      <g stroke="${PANEL}" stroke-width="${(R * 0.035).toFixed(1)}" stroke-linecap="round">${seams}</g>
      <polygon points="${poly(centre)}" fill="${PANEL}"/>
      ${outer.map(o => `<polygon points="${poly(o)}" fill="${PANEL}"/>`).join('')}
    </g>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${PANEL}" stroke-width="${(R * 0.03).toFixed(1)}"/>`;
}

// Faint pitch markings for the icon background.
const pitch = s => `<rect width="${s}" height="${s}" fill="${NAVY}"/>
  <g fill="none" stroke="${LINE}" stroke-width="${s * 0.022}">
    <line x1="0" y1="${s / 2}" x2="${s}" y2="${s / 2}"/>
    <circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.36}"/>
    <rect x="${s * 0.3}" y="${-s * 0.02}" width="${s * 0.4}" height="${s * 0.12}"/>
    <rect x="${s * 0.3}" y="${s * 0.9}" width="${s * 0.4}" height="${s * 0.12}"/>
  </g>`;
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

async function main() {
  const S = 1024;
  // Adaptive icon: Android masks it to a circle, squircle or square, so the ball stays inside the middle 66%.
  await sharp(svg(S, S, pitch(S))).png().toFile(path.join(out, 'icon-background.png'));
  await sharp(svg(S, S, ball(S / 2, S / 2, S * 0.27))).png().toFile(path.join(out, 'icon-foreground.png'));
  // Older Android and the store listing: background and ball together, the ball a little bigger.
  await sharp(svg(S, S, pitch(S) + ball(S / 2, S / 2, S * 0.33))).png().toFile(path.join(out, 'icon-only.png'));
  // Splash: the ball over the name, on plain navy.
  const W = 2732, font = 'font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" text-anchor="middle"';
  const splash = `<rect width="${W}" height="${W}" fill="${NAVY}"/>${ball(W / 2, W / 2 - 170, 230)}
    <text x="${W / 2}" y="${W / 2 + 230}" ${font} font-size="150" fill="#f1f4f9" letter-spacing="6">PITCH TO <tspan fill="${AMBER}">LEGEND</tspan></text>`;
  await sharp(svg(W, W, splash)).png().toFile(path.join(out, 'splash.png'));
  await sharp(svg(W, W, splash)).png().toFile(path.join(out, 'splash-dark.png'));
  console.log('Icon and splash artwork written to app/assets');
}
main().catch(e => { console.error(e); process.exit(1); });
