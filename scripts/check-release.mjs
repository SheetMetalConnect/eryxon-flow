import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(pkg.version)) {
  throw new Error('Release version must be stable SemVer X.Y.Z.');
}
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
  throw new Error('Package and lockfile versions must match.');
}
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const heading = `## [${pkg.version}]`;
const start = changelog.indexOf(heading);
if (start < 0) throw new Error('Release needs a matching changelog entry.');
const end = changelog.indexOf('\n## [', start + heading.length);
const notes = changelog.slice(start, end < 0 ? undefined : end).trim();
console.log(process.argv.includes('--notes') ? notes : pkg.version);
