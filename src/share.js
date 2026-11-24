// Sharing helpers: ready-made messages, quick-share links, a QR code, and a
// story-sized image of the table. No network calls; everything runs in the browser.
import qrcode from 'qrcode-generator';

export const TEMPLATES = {
  family: {
    label: 'Family',
    text: (who, url, home) => `Happy Thanksgiving! 🦃 I set ${who} table on DecoThanks. Would you leave me a thank-you card before Thursday? It only takes a minute, and only I can read it:\n${url}\n\nWant your own table? Make one here: ${home}`,
  },
  friends: {
    label: 'Friends',
    text: (who, url, home) => `Friendsgiving energy 🍂 I made a Thanksgiving table. Leave me a little thank-you card (sealed, only I can read it 👀):\n${url}\n\nMake your own table too, it's free: ${home}`,
  },
  work: {
    label: 'Coworkers',
    text: (who, url, home) => `Happy Thanksgiving, everyone! I made a small thank-you table. If you'd like to leave a note, here it is:\n${url}\n\nYou can make your own at ${home}`,
  },
};

export function shareLinks(message, subject) {
  const m = encodeURIComponent(message);
  return {
    whatsapp: `https://wa.me/?text=${m}`,
    sms: `sms:?&body=${m}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${m}`,
  };
}

function makeQr(text) {
  if (!text || text.length > 1200) return null; // very long offline links don't fit a scannable code
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr;
}

// An SVG QR code with a quiet zone, sized by CSS.
export function qrSvg(text) {
  const qr = makeQr(text);
  if (!qr) return '';
  const n = qr.getModuleCount(), q = 2, size = n + q * 2;
  let path = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + q} ${r + q}h1v1h-1z`;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for your table link" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fffaf1"/><path d="${path}" fill="#3f2b22"/></svg>`;
}

const loadImage = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws a 1080×1920 story image: title, the decorated table, a QR code and an invitation to make your own.
export async function storyImage({ title, items, cardCount, url, home, tableArt }) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  await Promise.all([document.fonts.load('600 80px Fraunces'), document.fonts.load('700 34px "DM Sans"')]).catch(() => {});

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fff8ec'); bg.addColorStop(0.6, '#f8e7cf'); bg.addColorStop(1, '#efd2ad');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c0603a';
  ctx.font = '700 30px "DM Sans", sans-serif';
  ctx.fillText('YOU’RE INVITED TO THE TABLE', W / 2, 150);
  ctx.fillStyle = '#3f2b22';
  ctx.font = '600 92px Fraunces, Georgia, serif';
  const lines = wrapLines(ctx, title, 940).slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 270 + i * 100));
  ctx.fillStyle = '#c0603a';
  ctx.fillText('Thanksgiving table', W / 2, 270 + lines.length * 100);

  // The table, drawn the same way as on screen: a 3:2 canvas, pieces placed by percentage.
  const tw = 980, th = tw / 1.5, tx = (W - tw) / 2, ty = 520;
  ctx.save();
  roundRect(ctx, tx, ty, tw, th, 40); ctx.fillStyle = '#ead8c0'; ctx.fill(); ctx.clip();
  try { ctx.drawImage(await loadImage(tableArt), tx, ty, tw, th); } catch { /* art failed to load: keep the plain card */ }
  for (const it of items) {
    try {
      const img = await loadImage(it.asset);
      const w = tw * 0.19 * it.scale, h = tw * 0.15 * it.scale;
      const ratio = Math.min(w / img.width, h / img.height);
      ctx.save();
      ctx.translate(tx + (it.x / 100) * tw, ty + (it.y / 100) * th);
      ctx.rotate((it.rotate * Math.PI) / 180);
      ctx.shadowColor = '#53312238'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 7;
      ctx.drawImage(img, (-img.width * ratio) / 2, (-img.height * ratio) / 2, img.width * ratio, img.height * ratio);
      ctx.restore();
    } catch { /* skip a piece that fails to load */ }
  }
  ctx.restore();

  ctx.fillStyle = '#7d6253';
  ctx.font = '500 34px "DM Sans", sans-serif';
  ctx.fillText(cardCount ? `💌 ${cardCount} thank-you card${cardCount === 1 ? '' : 's'} so far` : '💌 Be the first to leave a card', W / 2, ty + th + 70);

  ctx.fillStyle = '#3f2b22';
  ctx.font = '600 64px Fraunces, Georgia, serif';
  ctx.fillText('Leave me a thank-you card', W / 2, 1390);

  const qr = makeQr(url);
  if (qr) {
    const size = 300, x = (W - size) / 2, y = 1440, n = qr.getModuleCount(), cell = size / (n + 4);
    roundRect(ctx, x - 20, y - 20, size + 40, size + 40, 28); ctx.fillStyle = '#fffaf1'; ctx.fill();
    ctx.fillStyle = '#3f2b22';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(x + (c + 2) * cell, y + (r + 2) * cell, Math.ceil(cell), Math.ceil(cell));
  }

  ctx.fillStyle = '#c0603a';
  ctx.font = '700 32px "DM Sans", sans-serif';
  ctx.fillText('Scan to leave a card · Make your own on DecoThanks', W / 2, 1830);
  ctx.fillStyle = '#9a7a66';
  ctx.font = '500 24px "DM Sans", sans-serif';
  ctx.fillText(home.replace(/^https?:\/\//, ''), W / 2, 1875);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
