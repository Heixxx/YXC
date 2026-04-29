import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const fetchSessionContextTool = createTool({
  id: 'fetch_session_context',
  description:
    'Identify which forex trading session is currently active (Tokyo / London / New York). ' +
    'Useful for risk-sizing decisions: London + NY overlap has highest liquidity, ' +
    'Asian-only sessions have wider spreads and choppier moves.',
  inputSchema: z.object({
    pair: z.string(),
  }),
  outputSchema: z.object({
    pair: z.string(),
    activeSessions: z.array(z.enum(['TOKYO', 'LONDON', 'NEW_YORK'])),
    isHighLiquidity: z.boolean().describe('True during London-NY overlap'),
    nextSession: z.string(),
    note: z.string(),
  }),
  execute: async ({ context }) => {
    const { pair } = context;
    const utcHour = new Date().getUTCHours();
    const active: Array<'TOKYO' | 'LONDON' | 'NEW_YORK'> = [];

    // Tokyo: 23:00 - 08:00 UTC
    if (utcHour >= 23 || utcHour < 8) active.push('TOKYO');
    // London: 07:00 - 16:00 UTC
    if (utcHour >= 7 && utcHour < 16) active.push('LONDON');
    // New York: 12:00 - 21:00 UTC
    if (utcHour >= 12 && utcHour < 21) active.push('NEW_YORK');

    const isHighLiquidity = active.includes('LONDON') && active.includes('NEW_YORK');

    let nextSession = 'TOKYO opens 23:00 UTC';
    if (utcHour < 7) nextSession = 'LONDON opens 07:00 UTC';
    else if (utcHour < 12) nextSession = 'NEW_YORK opens 12:00 UTC';
    else if (utcHour < 16) nextSession = 'LONDON closes 16:00 UTC';
    else if (utcHour < 21) nextSession = 'NEW_YORK closes 21:00 UTC';
    else if (utcHour < 23) nextSession = 'TOKYO opens 23:00 UTC';

    let note = '';
    if (isHighLiquidity) note = 'London-NY overlap: high liquidity, tight spreads, suitable for breakouts.';
    else if (active.length === 0) note = 'No major session active: thin liquidity, avoid breakouts.';
    else if (active.includes('TOKYO') && active.length === 1) note = 'Asian-only session: choppy ranges typical, mean-reversion may work better than trend.';
    else note = 'Single major session active.';

    return { pair, activeSessions: active, isHighLiquidity, nextSession, note };
  },
});
