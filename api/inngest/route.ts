import { serve } from 'inngest/next';
import { inngest } from '../../src/inngest/client';
import { runCouncilFn } from '../../src/inngest/councilFn';

export const config = { runtime: 'nodejs', maxDuration: 60 };

const handler = serve({
  client: inngest,
  functions: [runCouncilFn],
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
