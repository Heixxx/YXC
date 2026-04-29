import { inngest } from './client';
import { runCouncilForCandidate } from '../workflow/council';
import { kvLPush, kvSet } from '../lib/cache';
import type { Candidate, Signal } from '../lib/types';

/**
 * Triggered by frontend or by scheduled cron — runs the council for a batch of
 * candidates. Each candidate gets its own step so Inngest retries only the failing
 * one, not the whole batch.
 */
export const runCouncilFn = inngest.createFunction(
  {
    id: 'run-council',
    name: 'Run Strategy Council',
    concurrency: { limit: 5 }, // max 5 candidates in parallel
    retries: 1,
  },
  { event: 'council/run' },
  async ({ event, step }) => {
    const candidates = (event.data as { candidates: Candidate[] }).candidates;
    if (!candidates?.length) return { ok: false, error: 'no candidates' };

    const results = await Promise.all(
      candidates.map((c) =>
        step.run(`council-${c.pair.replace('/', '_')}`, () => runCouncilForCandidate(c))
      )
    );

    const published: Signal[] = [];
    for (const r of results) {
      if (r.signal && r.decision !== 'DROP') {
        published.push(r.signal);
        await kvLPush('signals:forex:pro', r.signal, 100);
        await kvSet(`signal:${r.signal.id}`, r.signal, 60 * 60 * 6);
      }
    }
    await kvSet('signals:forex:pro:latest', published, 60 * 30);

    return {
      ok: true,
      processed: candidates.length,
      published: published.length,
      results: results.map((r) => ({
        pair: r.candidate.pair,
        decision: r.decision,
        durationMs: r.durationMs,
      })),
    };
  }
);

/** Optional: scheduled cron — currently disabled. Enable by uncommenting in api/inngest/route.ts. */
export const scheduledCouncilFn = inngest.createFunction(
  { id: 'scheduled-council', name: 'Scheduled Council (placeholder)' },
  // Frontend triggers council via /api/council; uncomment cron if you want
  // backend-driven scheduling later.
  // { cron: '*/5 * * * *' },
  { event: 'council/scheduled-noop' },
  async () => ({ note: 'scheduled cron disabled — frontend drives council via /api/council' })
);
