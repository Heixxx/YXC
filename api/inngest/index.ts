import { serve } from 'inngest/next';
import { inngest } from '../../src/inngest/client';
import { runCouncilFn } from '../../src/inngest/councilFn';

export const config = { runtime: 'nodejs', maxDuration: 60 };

export default serve({
  client: inngest,
  functions: [runCouncilFn],
});
