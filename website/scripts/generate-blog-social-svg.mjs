import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node website/scripts/generate-blog-social-svg.mjs <slug>');
  process.exit(1);
}

const profileBySlug = {
  'latest-development-and-road-to-v0-7': {
    title: 'Latest Development at Eryxon Flow',
    subtitle: 'Road to v0.7',
    kicker: 'Build update'
  },
  "why-eryxon-flow-moved-to-apache-2-0": {
    title: "Why Eryxon Flow moved to Apache 2.0",
    subtitle: "Deployment freedom for job shops",
    kicker: "License update"
  }
};

const profile = profileBySlug[slug];
if (!profile) {
  console.error(`No profile configured for slug: ${slug}`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, '..');
const blogOutDir = path.join(siteDir, 'public', 'social', 'blog', slug);
const articleAliasOutDir = path.join(
  siteDir,
  'public',
  'social',
  'articles',
  slug === 'why-eryxon-flow-moved-to-apache-2-0' ? slug : slug
);
await fs.mkdir(blogOutDir, { recursive: true });
await fs.mkdir(articleAliasOutDir, { recursive: true });

function escapeXml(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function svgTemplate({ width, height, title, subtitle, kicker }) {
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safeKicker = escapeXml(kicker);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="40" y="40" width="${Math.max(width - 80, 100)}" height="${Math.max(height - 80, 100)}" rx="20" fill="#111827" stroke="#334155"/>
  <text x="72" y="130" fill="#22d3ee" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">Eryxon Flow</text>
  <text x="72" y="190" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">${safeKicker}</text>
  <text x="72" y="255" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="50" font-weight="700">${safeTitle}</text>
  <text x="72" y="315" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="500">${safeSubtitle}</text>
  <text x="72" y="${height - 54}" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="22">eryxon.eu</text>
</svg>`;
}

const outputs = [
  ['og', 1200, 630],
  ['linkedin', 1200, 627],
  ['x', 1600, 900],
  ['square', 1080, 1080]
];

for (const [name, width, height] of outputs) {
  const svg = svgTemplate({ width, height, ...profile });
  await fs.writeFile(path.join(blogOutDir, `${name}.svg`), svg, 'utf8');
  await sharp(Buffer.from(svg)).png().toFile(path.join(articleAliasOutDir, `${name}.png`));
}

console.log(`Generated social SVG assets in ${blogOutDir}`);
console.log(`Generated social PNG aliases in ${articleAliasOutDir}`);
