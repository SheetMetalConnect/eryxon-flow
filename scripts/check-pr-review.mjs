#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const commentFields = 'id body url createdAt updatedAt author{login}';
const metadataQuery = 'query($id:ID!){node(id:$id){... on PullRequest{id number url title headRefOid baseRefOid state isDraft reviewDecision mergeable mergeStateStatus}}}';

function runGh(args, input) {
  const result = spawnSync('gh', args, { input, encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `gh failed (${result.status})`);
  return JSON.parse(result.stdout);
}

function graphql(gh, query, variables) {
  const result = gh(['api', 'graphql', '--input', '-'], JSON.stringify({ query, variables }));
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '));
  if (!result.data?.node) throw new Error('GitHub returned an incomplete review snapshot');
  return result.data.node;
}

function connection(gh, id, type, field, fields) {
  const query = `query($id:ID!,$cursor:String){node(id:$id){... on ${type}{${field}(first:100,after:$cursor){nodes{${fields}} pageInfo{hasNextPage endCursor}}}}}`;
  const nodes = [];
  const cursors = new Set();
  let cursor = null;
  do {
    const page = graphql(gh, query, { id, cursor })[field];
    if (!Array.isArray(page?.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw new Error(`Incomplete ${field} pagination`);
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new Error(`Incomplete ${field} pagination cursor`);
    cursors.add(cursor);
  } while (true);
  return nodes;
}

function readSnapshot(gh, target, repo) {
  const pr = graphql(gh, metadataQuery, { id: target.id });
  const threads = connection(gh, target.id, 'PullRequest', 'reviewThreads', 'id path line isResolved isOutdated');
  for (const thread of threads) thread.comments = connection(gh, thread.id, 'PullRequestReviewThread', 'comments', commentFields);
  const reviews = connection(gh, target.id, 'PullRequest', 'reviews', `${commentFields} state submittedAt commit{oid}`);
  const comments = connection(gh, target.id, 'PullRequest', 'comments', commentFields);
  const reviewRequests = connection(gh, target.id, 'PullRequest', 'reviewRequests', `id asCodeOwner requestedReviewer{
    __typename ... on User{login} ... on Team{combinedSlug} ... on Mannequin{login}
    ... on Bot{login} ... on EnterpriseTeam{combinedSlug}
  }`);
  const endpoint = `repos/${repo}/commits/${pr.headRefOid}`;
  const checkPages = gh(['api', `${endpoint}/check-runs?per_page=100&filter=latest`, '--paginate', '--slurp']);
  const statusPages = gh(['api', `${endpoint}/status?per_page=100`, '--paginate', '--slurp']);
  const checks = checkPages.flatMap((page) => {
    if (!Array.isArray(page.check_runs)) throw new Error('Incomplete check-run response');
    return page.check_runs.map(({ id, name, status, conclusion, html_url }) => ({ id, name, status, conclusion, url: html_url }));
  });
  const statuses = statusPages.flatMap((page) => {
    if (!Array.isArray(page.statuses)) throw new Error('Incomplete status response');
    return page.statuses.map(({ id, context, state, target_url }) => ({ id, name: context, state, url: target_url }));
  });
  return { pr, threads, reviews, comments, reviewRequests, checks, statuses };
}

function fingerprint(snapshot) {
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
  }
  return createHash('sha256').update(JSON.stringify(canonical(snapshot))).digest('hex');
}

export function checkReview({ pr: selector, repo, expectHead, expectFingerprint }, gh = runGh) {
  if (!selector || selector.startsWith('-')) throw new Error('Specify a PR number or URL');
  const target = gh(['pr', 'view', selector, ...(repo ? ['--repo', repo] : []), '--json', 'id,number,url']);
  const url = new URL(target.url);
  if (url.hostname !== 'github.com') throw new Error('This script currently supports github.com repositories only');
  repo = url.pathname.split('/').slice(1, 3).join('/');
  const first = readSnapshot(gh, target, repo);
  const snapshot = readSnapshot(gh, target, repo);
  const observedPr = graphql(gh, metadataQuery, { id: target.id });
  const digest = fingerprint(snapshot);
  const blockers = [];
  if (fingerprint(first) !== digest || fingerprint(snapshot.pr) !== fingerprint(observedPr)) blockers.push('PR head, feedback, or checks changed while reading; rerun the review check');
  if (expectHead && expectHead !== snapshot.pr.headRefOid) blockers.push(`Expected head ${expectHead}, found ${snapshot.pr.headRefOid}`);
  if (expectFingerprint && expectFingerprint !== digest) blockers.push('Expected fingerprint differs; inspect the new snapshot before merging');
  if (snapshot.pr.state !== 'OPEN') blockers.push(`PR is ${snapshot.pr.state}`);
  if (snapshot.pr.isDraft) blockers.push('PR is a draft');
  if (snapshot.pr.mergeable !== 'MERGEABLE') blockers.push(`Mergeability is ${snapshot.pr.mergeable}`);
  if (['BLOCKED', 'BEHIND', 'DIRTY', 'UNKNOWN'].includes(snapshot.pr.mergeStateStatus)) blockers.push(`Merge state is ${snapshot.pr.mergeStateStatus}`);
  if (snapshot.pr.reviewDecision === 'REVIEW_REQUIRED') blockers.push('Required approval is missing');
  if (snapshot.pr.reviewDecision === 'CHANGES_REQUESTED') blockers.push('GitHub review decision: changes requested');
  const opinions = new Map();
  for (const review of [...snapshot.reviews].sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))) {
    if (['APPROVED', 'CHANGES_REQUESTED'].includes(review.state)) opinions.set(review.author?.login ?? review.id, review);
    if (review.state === 'PENDING') blockers.push(`Unsubmitted review: ${review.url}`);
  }
  for (const [author, review] of opinions) if (review.state === 'CHANGES_REQUESTED') blockers.push(`Changes requested by ${author}: ${review.url}`);
  for (const thread of snapshot.threads) if (!thread.isResolved) blockers.push(`Unresolved thread ${thread.id}${thread.isOutdated ? ' (outdated)' : ''}: ${thread.path}:${thread.line ?? '?'} ${thread.comments[0]?.url ?? ''}`);
  if (snapshot.checks.length + snapshot.statuses.length === 0) blockers.push('No CI checks reported for this head');
  for (const check of snapshot.checks) {
    if (check.status !== 'completed' || !['success', 'neutral', 'skipped'].includes(check.conclusion)) blockers.push(`CI ${check.name}: ${check.conclusion ?? check.status} ${check.url ?? ''}`);
  }
  for (const status of snapshot.statuses) if (status.state !== 'success') blockers.push(`Status ${status.name}: ${status.state} ${status.url ?? ''}`);
  return { ready: blockers.length === 0, observedHead: observedPr.headRefOid, checkedAt: new Date().toISOString(), head: snapshot.pr.headRefOid, fingerprint: digest, blockers, snapshot };
}

export function formatReport(report) {
  const { snapshot, blockers } = report;
  const requestedReviewers = snapshot.reviewRequests.map(({ requestedReviewer: reviewer, asCodeOwner }) => {
    const label = reviewer ? `${reviewer.__typename} ${reviewer.login ?? reviewer.combinedSlug}` : 'unknown reviewer';
    return `${label}${asCodeOwner ? ' (code owner)' : ''}`;
  });
  const lines = [
    `${report.ready ? 'STRUCTURAL GATES PASS' : 'STRUCTURAL GATES BLOCKED'}: ${snapshot.pr.url}`,
    'Human feedback inspection and current-head reviewer completion evidence are still required.',
    `Checked: ${report.checkedAt}`,
    `Head: ${report.head}`,
    ...(report.observedHead !== report.head ? [`Head at end of read: ${report.observedHead}`] : []),
    `Fingerprint: ${report.fingerprint}`,
    `Requested reviewers: ${requestedReviewers.join(', ') || 'none'}`,
    ...blockers.map((blocker) => `BLOCK: ${blocker}`),
    `Checks: ${snapshot.checks.length}; statuses: ${snapshot.statuses.length}; threads: ${snapshot.threads.length}; reviews: ${snapshot.reviews.length}; discussion comments: ${snapshot.comments.length}`,
  ];
  const printComment = (comment) => lines.push(`${comment.author?.login ?? 'deleted user'} — ${comment.url}`, comment.body || '(no text)');
  for (const thread of snapshot.threads) {
    lines.push(`\nTHREAD ${thread.id}: ${thread.isResolved ? 'resolved' : 'OPEN'}${thread.isOutdated ? ', outdated' : ''} ${thread.path}:${thread.line ?? '?'}`);
    thread.comments.forEach(printComment);
  }
  for (const review of snapshot.reviews) {
    lines.push(`\nREVIEW ${review.state}`);
    const reviewedHead = review.commit?.oid;
    lines.push(`Reviewed commit: ${reviewedHead ?? 'unknown'}${reviewedHead ? (reviewedHead === report.head ? ' (current head)' : ' (earlier commit)') : ''}`);
    printComment(review);
  }
  for (const comment of snapshot.comments) {
    lines.push('\nDISCUSSION');
    printComment(comment);
  }
  lines.push('\nPoint-in-time snapshot only. Inspect review text, rerun after every push and immediately before merge, and merge only the reviewed head.');
  // GitHub comments are untrusted text, including terminal escape sequences.
  return lines.join('\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      repo: { type: 'string' }, 'expect-head': { type: 'string' }, 'expect-fingerprint': { type: 'string' }, json: { type: 'boolean' },
    } });
    if (positionals.length !== 1) throw new Error('Usage: node scripts/check-pr-review.mjs <PR number|URL> [--repo owner/name] [--expect-head SHA] [--expect-fingerprint SHA256] [--json]');
    const report = checkReview({ pr: positionals[0], repo: values.repo, expectHead: values['expect-head'], expectFingerprint: values['expect-fingerprint'] });
    console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));
    process.exitCode = report.ready ? 0 : 1;
  } catch (error) {
    console.error(`Review snapshot failed: ${error.message}`);
    process.exitCode = 2;
  }
}
