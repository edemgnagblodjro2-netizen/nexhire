import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'fs';

const URL = 'https://attentezero.ca';
const TEAL = '#0e7e6e';
const TEAL_DARK = '#0a5e52';
const TEAL_LIGHT = '#e6f4f1';
const TEXT = '#1a2e2b';
const MUTED = '#5a6f6c';
const FONT = 'DejaVu Sans, sans-serif';

async function qrPngBuffer(size) {
  return await QRCode.toBuffer(URL, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: size,
    color: { dark: TEAL_DARK, light: '#ffffff' },
  });
}

async function buildA5() {
  const W = 1748, H = 2480;
  const qrSize = 520;
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = 1830;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${TEAL}"/>
      <stop offset="1" stop-color="${TEAL_DARK}"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="780" fill="url(#bg)"/>
  <circle cx="${W - 80}" cy="120" r="220" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="120" cy="700" r="180" fill="#ffffff" fill-opacity="0.05"/>

  <g transform="translate(${(W - 220) / 2}, 130)">
    <rect width="220" height="220" rx="48" fill="#ffffff"/>
    <text x="110" y="158" font-family="${FONT}" font-weight="bold" font-size="120" fill="${TEAL}" text-anchor="middle">A0</text>
  </g>

  <text x="${W / 2}" y="500" font-family="${FONT}" font-weight="bold" font-size="120" fill="#ffffff" text-anchor="middle">AttenteZéro</text>
  <text x="${W / 2}" y="600" font-family="${FONT}" font-size="44" fill="#ffffff" text-anchor="middle" fill-opacity="0.95">Le bon service, près de chez vous,</text>
  <text x="${W / 2}" y="660" font-family="${FONT}" font-size="44" fill="#ffffff" text-anchor="middle" fill-opacity="0.95">sans attendre.</text>

  <text x="${W / 2}" y="920" font-family="${FONT}" font-weight="bold" font-size="52" fill="${TEXT}" text-anchor="middle">Tous les services communautaires</text>
  <text x="${W / 2}" y="990" font-family="${FONT}" font-weight="bold" font-size="52" fill="${TEXT}" text-anchor="middle">du Québec dans votre poche</text>

  <g font-family="${FONT}" fill="${TEXT}">
    <g transform="translate(180, 1130)">
      <circle cx="40" cy="40" r="40" fill="${TEAL_LIGHT}"/>
      <text x="120" y="35" font-size="40" font-weight="bold">Plus de 1 000 services</text>
      <text x="120" y="85" font-size="32" fill="${MUTED}">Logement, santé, garderies, banques, transport…</text>
    </g>
    <g transform="translate(180, 1280)">
      <circle cx="40" cy="40" r="40" fill="${TEAL_LIGHT}"/>
      <text x="120" y="35" font-size="40" font-weight="bold">Assistant IA multilingue</text>
      <text x="120" y="85" font-size="32" fill="${MUTED}">FR · EN · ES · AR · HT — réponse instantanée</text>
    </g>
    <g transform="translate(180, 1430)">
      <circle cx="40" cy="40" r="40" fill="${TEAL_LIGHT}"/>
      <text x="120" y="35" font-size="40" font-weight="bold">Géolocalisation</text>
      <text x="120" y="85" font-size="32" fill="${MUTED}">Les services les plus proches, avec itinéraire</text>
    </g>
    <g transform="translate(180, 1580)">
      <circle cx="40" cy="40" r="40" fill="${TEAL_LIGHT}"/>
      <text x="120" y="35" font-size="40" font-weight="bold">Aide urgente 24/7</text>
      <text x="120" y="85" font-size="32" fill="${MUTED}">811, 211, hébergement, santé mentale</text>
    </g>
  </g>

  <rect x="80" y="1740" width="${W - 160}" height="700" rx="32" fill="${TEAL_LIGHT}"/>
  <text x="${W / 2}" y="1800" font-family="${FONT}" font-weight="bold" font-size="42" fill="${TEAL_DARK}" text-anchor="middle">Téléchargez gratuitement — scannez le code</text>
  <rect x="${qrX - 20}" y="${qrY - 20}" width="${qrSize + 40}" height="${qrSize + 40}" rx="20" fill="#ffffff"/>

  <text x="${W / 2}" y="${qrY + qrSize + 60}" font-family="${FONT}" font-weight="bold" font-size="42" fill="${TEAL_DARK}" text-anchor="middle">attentezero.ca</text>
  <text x="${W / 2}" y="${qrY + qrSize + 105}" font-family="${FONT}" font-size="28" fill="${MUTED}" text-anchor="middle">info@attentezero.ca  ·  Disponible sur Google Play</text>
</svg>`;

  fs.writeFileSync('a5.svg', svg);
  const qrBuf = await qrPngBuffer(qrSize);
  await sharp(Buffer.from(svg))
    .composite([{ input: qrBuf, left: qrX, top: qrY }])
    .png()
    .toFile('AttenteZero_A5.png');
  await sharp('AttenteZero_A5.png').jpeg({ quality: 92 }).toFile('AttenteZero_A5.jpg');
}

async function buildSquare() {
  const W = 2160, H = 2160;
  const qrSize = 600;
  const qrX = W - qrSize - 160;
  const qrY = H - qrSize - 280;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${TEAL}"/>
      <stop offset="1" stop-color="${TEAL_DARK}"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 200}" cy="200" r="320" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="200" cy="${H - 200}" r="280" fill="#ffffff" fill-opacity="0.05"/>

  <g transform="translate(140, 140)">
    <rect width="220" height="220" rx="48" fill="#ffffff"/>
    <text x="110" y="158" font-family="${FONT}" font-weight="bold" font-size="120" fill="${TEAL}" text-anchor="middle">A0</text>
  </g>

  <text x="400" y="240" font-family="${FONT}" font-weight="bold" font-size="130" fill="#ffffff">AttenteZéro</text>
  <text x="400" y="320" font-family="${FONT}" font-size="48" fill="#ffffff" fill-opacity="0.9">Services communautaires du Québec</text>

  <text x="140" y="600" font-family="${FONT}" font-weight="bold" font-size="92" fill="#ffffff">Le bon service,</text>
  <text x="140" y="710" font-family="${FONT}" font-weight="bold" font-size="92" fill="#ffffff">près de chez vous,</text>
  <text x="140" y="820" font-family="${FONT}" font-weight="bold" font-size="92" fill="#ffffff">sans attendre.</text>

  <g font-family="${FONT}" fill="#ffffff">
    <text x="140" y="1000" font-size="50" font-weight="bold">• Plus de 1 000 services</text>
    <text x="140" y="1090" font-size="50" font-weight="bold">• Assistant IA multilingue</text>
    <text x="140" y="1180" font-size="50" font-weight="bold">• Géolocalisation</text>
    <text x="140" y="1270" font-size="50" font-weight="bold">• Aide urgente 24/7</text>
  </g>

  <rect x="${qrX - 60}" y="${qrY - 60}" width="${qrSize + 120}" height="${qrSize + 240}" rx="32" fill="#ffffff"/>
  <text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 70}" font-family="${FONT}" font-weight="bold" font-size="40" fill="${TEAL_DARK}" text-anchor="middle">attentezero.ca</text>
  <text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 120}" font-family="${FONT}" font-size="28" fill="${MUTED}" text-anchor="middle">Scannez pour télécharger</text>

  <text x="140" y="${H - 180}" font-family="${FONT}" font-weight="bold" font-size="40" fill="#ffffff">📧 info@attentezero.ca</text>
  <text x="140" y="${H - 110}" font-family="${FONT}" font-size="36" fill="#ffffff" fill-opacity="0.85">Disponible sur Google Play · attentezero.ca</text>
</svg>`;

  fs.writeFileSync('square.svg', svg);
  const qrBuf = await qrPngBuffer(qrSize);
  await sharp(Buffer.from(svg))
    .composite([{ input: qrBuf, left: qrX, top: qrY }])
    .png()
    .toFile('AttenteZero_Square.png');
  await sharp('AttenteZero_Square.png').jpeg({ quality: 92 }).toFile('AttenteZero_Square.jpg');
}

async function buildQR() {
  await QRCode.toFile('AttenteZero_QR.png', URL, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 1200,
    color: { dark: TEAL_DARK, light: '#ffffff' },
  });
}

await buildA5();
await buildSquare();
await buildQR();
console.log('done');
