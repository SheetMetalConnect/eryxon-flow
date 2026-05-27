import fs from 'node:fs/promises';
import path from 'node:path';

const posts = [
  { slug: 'why-eryxon-flow-moved-to-apache-2-0', title: 'Why Eryxon Flow moved to Apache 2.0', eyebrow: 'Open source for job shops', accent: 'Use it freely. Deploy it your way.' },
  { slug: 'work-orders-from-erp-to-shop-floor-and-back', title: 'Work orders from ERP to shop floor and back', eyebrow: 'Shop-floor workflow', accent: 'Track the route, not the paper.' },
  { slug: 'how-eryxon-flow-turns-qrm-and-polca-into-daily-shop-floor-decisions', title: 'How Eryxon Flow turns QRM and POLCA into daily shop-floor decisions', eyebrow: 'ERP integration', accent: 'Push jobs once. Sync status back.' },
  { slug: 'how-eryxon-flow-supports-qrm-in-high-mix-low-volume-shops', title: 'How Eryxon Flow supports QRM in high-mix, low-volume shops', eyebrow: 'QRM planning', accent: 'One limit per cell reveals the bottleneck.' },
  { slug: 'latest-development-and-road-to-v0-7', title: 'Latest development at Eryxon Flow and the road to v0.7', eyebrow: 'Operator usability', accent: 'Three queue states beat one long list.' },
];

const outRoot = path.join(process.cwd(), 'website/public/social/blog');

const esc = (s) => s
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

function wrap(text, max = 34) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length <= max) line = candidate;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function svgBase(width, height, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<defs>\n  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">\n    <stop offset="0%" stop-color="#060a14"/>\n    <stop offset="100%" stop-color="#0f1c33"/>\n  </linearGradient>\n  <radialGradient id="glow" cx="0.78" cy="0.2" r="0.8">\n    <stop offset="0%" stop-color="#1e90ff" stop-opacity="0.42"/>\n    <stop offset="100%" stop-color="#1e90ff" stop-opacity="0"/>\n  </radialGradient>\n</defs>\n<rect width="100%" height="100%" fill="url(#bg)"/>\n<rect width="100%" height="100%" fill="url(#glow)"/>\n${content}\n</svg>\n`;
}

for (const p of posts) {
  const dir = path.join(outRoot, p.slug);
  await fs.mkdir(dir, { recursive: true });
  const titleLines = wrap(p.title);

  const ogText = titleLines.map((l, i) => `<text x="74" y="${250 + i*66}" fill="#f6f9ff" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700">${esc(l)}</text>`).join('\n');
  const og = svgBase(1200, 630, `
<text x="74" y="94" fill="#7cc4ff" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600">${esc(p.eyebrow)}</text>
${ogText}
<text x="74" y="578" fill="#93a6c9" font-family="Inter, Arial, sans-serif" font-size="24">eryxon.eu</text>
<text x="256" y="578" fill="#e6eefc" font-family="Inter, Arial, sans-serif" font-size="24">eryxon flow</text>`);

  const li = svgBase(1200, 627, `
<text x="70" y="88" fill="#7cc4ff" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">${esc(p.eyebrow)}</text>
<text x="70" y="250" fill="#f6f9ff" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="700">${esc(wrap(p.accent, 36).slice(0,2).join(' '))}</text>
<rect x="70" y="454" rx="18" width="500" height="88" fill="rgba(30,144,255,0.16)" stroke="rgba(124,196,255,0.45)"/>
<text x="96" y="508" fill="#d8e9ff" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600">eryxon.eu/articles</text>`);

  const sq = svgBase(1080, 1080, `
<text x="72" y="98" fill="#7cc4ff" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600">${esc(p.eyebrow)}</text>
<text x="72" y="420" fill="#f6f9ff" font-family="Inter, Arial, sans-serif" font-size="68" font-weight="700">${esc(wrap(p.accent, 20).slice(0,2).join(' '))}</text>
<text x="72" y="1000" fill="#d8e9ff" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="600">eryxon.eu</text>`);

  await Promise.all([
    fs.writeFile(path.join(dir, 'og.svg'), og, 'utf8'),
    fs.writeFile(path.join(dir, 'linkedin.svg'), li, 'utf8'),
    fs.writeFile(path.join(dir, 'square.svg'), sq, 'utf8'),
  ]);
}

console.log(`Generated SVG social fallbacks for ${posts.length} posts.`);
