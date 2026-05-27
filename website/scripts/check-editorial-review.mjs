import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const blogDir = path.join(root, "src/content/blog");
const articlesDir = path.join(root, "src/content/docs/articles");

const reviewPattern = /<!--\s*editorial-review\s*\n([\s\S]*?)\neditorial-review\s*-->/m;
const frontmatterPattern = /^---\n([\s\S]*?)\n---\n?/;

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    if (!entry.isFile()) return [];
    if (!/\.(md|mdx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function getFrontmatter(content) {
  const match = content.match(frontmatterPattern);
  return match ? match[1] : "";
}

function getDraftState(frontmatter) {
  const match = frontmatter.match(/^draft:\s*(true|false)\s*$/m);
  if (!match) return false;
  return match[1] === "true";
}

function getReview(content) {
  const match = content.match(reviewPattern);
  if (!match) return null;

  const review = {};
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const splitIndex = line.indexOf(":");
    if (splitIndex === -1) continue;
    const key = line.slice(0, splitIndex).trim();
    const value = line.slice(splitIndex + 1).trim();
    review[key] = value;
  }
  return review;
}

function isArticleTemplate(filePath) {
  const base = path.basename(filePath);
  return base.startsWith("_") || base === "index.md" || base === "index.mdx";
}

function validatePublishedFile(filePath, review, errors) {
  if (!review) {
    errors.push(`${filePath}: missing editorial-review block`);
    return;
  }

  if (review.status !== "approved") {
    errors.push(`${filePath}: editorial-review status must be approved before publish`);
  }

  for (const field of ["reviewer", "date", "guide"]) {
    if (!review[field]) {
      errors.push(`${filePath}: editorial-review ${field} is required before publish`);
    }
  }
}

const errors = [];

for (const filePath of walkMarkdownFiles(blogDir)) {
  if (path.basename(filePath).startsWith("_")) continue;
  const content = fs.readFileSync(filePath, "utf8");
  const frontmatter = getFrontmatter(content);
  const isDraft = getDraftState(frontmatter);
  const review = getReview(content);

  if (!isDraft) validatePublishedFile(path.relative(root, filePath), review, errors);
}

for (const filePath of walkMarkdownFiles(articlesDir)) {
  if (isArticleTemplate(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf8");
  const review = getReview(content);
  validatePublishedFile(path.relative(root, filePath), review, errors);
}

if (errors.length > 0) {
  console.error("Editorial review gate failed.\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Editorial review gate passed.");
