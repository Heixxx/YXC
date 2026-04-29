/**
 * Run a single council pass locally.
 *
 * Usage:
 *   tsx scripts/test-council.ts EUR/USD BUY
 *   tsx scripts/test-council.ts GBP/USD SELL
 *
 * Make sure .env is loaded (use `dotenv -e .env -- tsx ...` or similar).
 */
import { runCouncilForCandidate } from '../src/workflow/council';
import { fetchTwelveDataQuote } from '../src/lib/twelvedata';
import type { Candidate } from '../src/lib/types';

async function main() {
  const pair = process.argv[2] ?? 'EUR/USD';
  const direction = (process.argv[3] ?? 'BUY') as 'BUY' | 'SELL';

  console.log(`\n🏛️  Running council for ${pair} ${direction}...\n`);

  const quote = await fetchTwelveDataQuote(pair);

  const candidate: Candidate = {
    pair,
    direction,
    l0Confidence: 70,
    triggeredStrategies: ['S1:EMA-pullback', 'S5:trend', 'S6:momentum'],
    currentPrice: quote.price,
  };

  const result = await runCouncilForCandidate(candidate);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Pair: ${pair}  Direction: ${direction}  Price: ${quote.price}`);
  console.log(`Duration: ${result.durationMs}ms`);
  console.log(`Decision: ${result.decision}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Verdicts:');
  console.log('  Trend:    ', result.verdicts.trend);
  console.log('  MeanRev:  ', result.verdicts.meanRev);
  console.log('  Breakout: ', result.verdicts.breakout);
  console.log('  Macro:    ', result.verdicts.macro);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (result.signal) {
    console.log('SIGNAL PUBLISHED:');
    console.log('  Confidence:    ', result.signal.confidence);
    console.log('  Entry:         ', result.signal.entry);
    console.log('  Stop:          ', result.signal.stop);
    console.log('  TPs:           ', result.signal.takeProfits);
    console.log('  Position size: ', result.signal.positionSizePct, '%');
    console.log('  Hold est:      ', result.signal.expectedHoldMinutes, 'min');
    console.log('  Thesis:        ', result.signal.thesis);
    console.log('  Main risk:     ', result.signal.mainRisk);
    console.log('  Backtest:      ', result.signal.backtestWinRate, '% win,', result.signal.backtestSampleSize, 'samples');
  } else {
    console.log('NO SIGNAL.  Reason:', result.reason);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
