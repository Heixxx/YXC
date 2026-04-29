import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'forexai-engine',
  name: 'ForexAI Engine',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
