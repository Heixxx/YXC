import { serve } from 'inngest/vercel';
import { inngest } from '../../src/inngest/client';
import { runCouncilFn } from '../../src/inngest/councilFn';

export const config = { runtime: 'nodejs', maxDuration: 60 };

const handler = serve({
  client: inngest,
  functions: [runCouncilFn],
});

export default handler;
