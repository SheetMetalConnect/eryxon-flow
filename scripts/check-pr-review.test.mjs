import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReview, formatReport } from './check-pr-review.mjs';

const head = 'a'.repeat(40);
const comment = (id, body = id) => ({ id, body, url: `https://github.com/acme/app/pull/7#${id}`, author: { login: 'reviewer' }, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' });
function fixture(change = () => {}) {
  let snapshot = 0;
  const calls = [];
  const gh = (args, input) => {
    calls.push({ args, input });
    if (args[0] === 'pr') return { id: 'PR7', number: 7, url: 'https://github.com/acme/app/pull/7' };
    if (args[1] !== 'graphql') {
      assert.ok(args.includes('--paginate') && args.includes('--slurp'));
      if (args[1].includes('check-runs')) return [{ check_runs: [{ id: 1, name: 'CI', status: 'completed', conclusion: 'success', html_url: 'https://github.com/check/1' }] }, { check_runs: [] }];
      if (args[1].includes('/status?')) return [{ statuses: [] }];
      assert.fail(`Unexpected REST endpoint: ${args[1]}`);
    }
    const { query, variables } = JSON.parse(input);
    assert.ok(query.startsWith('query('));
    let value;
    if (query.includes('headRefOid')) {
      snapshot++;
      value = { id: 'PR7', number: 7, url: 'https://github.com/acme/app/pull/7', title: 'Improve review loop', headRefOid: head, baseRefOid: 'b'.repeat(40), state: 'OPEN', isDraft: false, reviewDecision: null, mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' };
    } else {
      const field = query.match(/\{(reviewThreads|reviews|comments)\(first:/)[1];
      const data = {
        PR7: { reviewThreads: [{ id: 'T1', path: 'app.ts', line: 10, isResolved: true, isOutdated: false }, { id: 'T2', path: 'old.ts', line: null, isResolved: true, isOutdated: true }], reviews: [{ ...comment('R1', 'Review summary'), state: 'COMMENTED', submittedAt: '2026-09-01T00:00:00Z' }], comments: [comment('D1'), comment('D2', 'Late discussion point')] },
        T1: { comments: [comment('C1'), comment('C2', 'Reply beyond the first page')] },
        T2: { comments: [comment('C3')] },
      };
      const rows = data[variables.id][field];
      const index = variables.cursor ? Number(variables.cursor) : 0;
      value = { [field]: { nodes: rows.slice(index, index + 1), pageInfo: { hasNextPage: index + 1 < rows.length, endCursor: String(index + 1) } } };
    }
    change(value, snapshot, query);
    return { data: { node: value } };
  };
  return { gh, calls };
}

test('reads every connection page and nested reply, reports all review points, never writes', () => {
  const { gh, calls } = fixture();
  const report = checkReview({ pr: '7' }, gh);
  assert.equal(report.ready, true);
  assert.equal(report.snapshot.threads.length, 2);
  assert.equal(report.snapshot.threads[0].comments[1].body, 'Reply beyond the first page');
  assert.equal(report.snapshot.comments[1].body, 'Late discussion point');
  assert.match(formatReport(report), /Reply beyond the first page/);
  assert.match(formatReport(report), /Review summary/);
  assert.ok(calls.some(({ input }) => input?.includes('"cursor":"1"')));
  assert.equal(report.fingerprint.length, 64);
});

test('outdated unresolved threads block readiness', () => {
  const { gh } = fixture((value) => { if (value.reviewThreads?.nodes[0]?.id === 'T2') value.reviewThreads.nodes[0].isResolved = false; });
  const report = checkReview({ pr: '7' }, gh);
  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((text) => text.includes('T2') && text.includes('outdated')));
});

test('late feedback on the same head changes the fingerprint and blocks a racing read', () => {
  const first = checkReview({ pr: '7' }, fixture().gh);
  const { gh } = fixture((value, snapshot) => {
    if (snapshot === 2 && value.comments?.nodes[0]?.id === 'D2') value.comments.nodes[0].body = 'New actionable feedback';
  });
  const report = checkReview({ pr: '7' }, gh);
  assert.equal(report.ready, false);
  assert.notEqual(report.fingerprint, first.fingerprint);
  assert.ok(report.blockers.some((text) => text.includes('changed while')));
  assert.match(formatReport(report), /New actionable feedback/);
});

test('a new head during the read or an expected-head mismatch blocks readiness', () => {
  const { gh } = fixture((value, snapshot) => { if (value.headRefOid && snapshot === 2) value.headRefOid = 'c'.repeat(40); });
  const report = checkReview({ pr: '7', expectHead: head }, gh);
  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((text) => text.includes('Expected head')));
});

test('a stale expected fingerprint blocks even after late feedback stabilizes', () => {
  const old = checkReview({ pr: '7' }, fixture().gh);
  const { gh } = fixture((value) => { if (value.comments?.nodes[0]?.id === 'D2') value.comments.nodes[0].body = 'Follow-up after push'; });
  const report = checkReview({ pr: '7', expectFingerprint: old.fingerprint }, gh);
  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((text) => text.includes('Expected fingerprint')));
});

test('changes requested block even without a required-review branch rule', () => {
  const { gh } = fixture((value) => { if (value.reviews) value.reviews.nodes[0].state = 'CHANGES_REQUESTED'; });
  assert.equal(checkReview({ pr: '7' }, gh).ready, false);
});

test('pending and failed CI block; skipped and neutral completed checks are accepted', () => {
  for (const [status, conclusion, ready] of [['in_progress', null, false], ['completed', 'failure', false], ['completed', 'cancelled', false], ['completed', 'skipped', true], ['completed', 'neutral', true]]) {
    const base = fixture().gh;
    const gh = (args, input) => {
      const result = base(args, input);
      if (result[0]?.check_runs?.[0]) Object.assign(result[0].check_runs[0], { status, conclusion });
      return result;
    };
    assert.equal(checkReview({ pr: '7' }, gh).ready, ready, `${status}/${conclusion}`);
  }
});

test('failed legacy status on a later REST page blocks', () => {
  const base = fixture().gh;
  const gh = (args, input) => args[1]?.includes('/status?') ? [{ statuses: [] }, { statuses: [{ id: 8, context: 'external', state: 'failure', target_url: 'https://example.test/check' }] }] : base(args, input);
  assert.equal(checkReview({ pr: '7' }, gh).ready, false);
});

test('API errors and incomplete pagination cannot produce a ready snapshot', () => {
  const base = fixture().gh;
  assert.throws(() => checkReview({ pr: '7' }, (args, input) => args[1] === 'graphql' ? { errors: [{ message: 'Rate limited' }] } : base(args, input)), /Rate limited/);
  const { gh } = fixture((value) => { if (value.reviewThreads) value.reviewThreads.pageInfo.endCursor = null; });
  assert.throws(() => checkReview({ pr: '7' }, gh), /pagination/);
});

test('a head pushed during the final collection cannot reuse green checks from the old head', () => {
  const { gh } = fixture((value, snapshot) => { if (value.headRefOid && snapshot === 3) value.headRefOid = 'd'.repeat(40); });
  const report = checkReview({ pr: '7' }, gh);
  assert.equal(report.ready, false);
  assert.equal(report.head, head);
  assert.equal(report.observedHead, 'd'.repeat(40));
  assert.match(formatReport(report), /Head at end of read/);
});

test('a later approval supersedes changes requested, but a comment does not', () => {
  for (const [state, ready] of [['APPROVED', true], ['COMMENTED', false]]) {
    const { gh } = fixture((value) => {
      if (value.reviews) {
        value.reviews.nodes = [
          { ...comment('R1'), state: 'CHANGES_REQUESTED', submittedAt: '2026-09-01T00:00:00Z' },
          { ...comment('R2'), state, submittedAt: '2026-09-02T00:00:00Z' },
        ];
      }
    });
    assert.equal(checkReview({ pr: '7' }, gh).ready, ready);
  }
});

test('no checks and a missing required review fail closed', () => {
  const { gh: base } = fixture((value) => { if (value.headRefOid) value.reviewDecision = 'REVIEW_REQUIRED'; });
  const gh = (args, input) => args[1]?.includes('check-runs') ? [{ check_runs: [] }] : base(args, input);
  const report = checkReview({ pr: '7' }, gh);
  assert.ok(report.blockers.includes('Required approval is missing'));
  assert.ok(report.blockers.includes('No CI checks reported for this head'));
});
