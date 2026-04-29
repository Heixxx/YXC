# ForexAI Engine — PRO Signals Backend

Multi-agent strategy council for forex trading signals. Five specialized AI agents (Trend, Mean-Reversion, Breakout, Macro, Risk) collaborate to validate candidate signals from your frontend, with a final Judge model deciding PUBLISH / HOLD / DROP. Each agent has access to real tools (multi-timeframe candles, micro-backtest, economic calendar, correlation matrix, session context).

## Architecture

```
Frontend (React/Lovable)
  ↓ runs Layer 0 (7 deterministic strategies) over 24 forex pairs
  ↓ selects top 5 candidates with L0 confidence ≥ 60
  ↓ POST /api/council  { candidates: [...] }
                            ↓
[Vercel Function: runCouncilForCandidate × 5 in parallel]
                            ↓
   ┌────────────────────────────────────────────┐
   │   Strategy Council (4 agents in parallel)  │
   │   ├── Trend Specialist     [DeepSeek]      │
   │   ├── Mean-Rev Specialist  [DeepSeek]      │
   │   ├── Breakout Specialist  [DeepSeek]      │
   │   └── Macro Specialist     [Perplexity]    │
   │   each with tools: klines, backtest,       │
   │   session, calendar, correlation           │
   └────────────────────────────────────────────┘
                            ↓
                    Risk Manager [DeepSeek]
                  (concrete entry/SL/TP/size)
                            ↓
                       Judge [Claude]
                  (PUBLISH / HOLD / DROP)
                            ↓
              Vercel KV stores published Signal[]
                            ↓
       Frontend GET /api/signals → render in PRO tab
```

Cost per council run (5 candidates): ~$0.05-0.10 with current model mix (DeepSeek for strategy + Perplexity for macro + Claude for judge).

## Deployment — step by step

### 1. Get API keys

| Provider     | What for                          | Where to sign up                            | Plan needed                |
|--------------|------------------------------------|---------------------------------------------|----------------------------|
| Twelve Data  | Forex 1h/4h/daily candles + quotes | https://twelvedata.com/account              | Basic $29/mo or free 800/d |
| Anthropic    | Claude (Judge agent)               | https://console.anthropic.com               | $5 prepaid is enough       |
| DeepSeek     | 4 strategy agents + risk           | https://platform.deepseek.com               | $5 prepaid is enough       |
| Perplexity   | Macro agent (web search)           | https://www.perplexity.ai/settings/api      | Pay-as-you-go              |
| Trading Econ | (optional) Economic calendar       | https://tradingeconomics.com/api            | Free tier 100 req/day      |

### 2. Push code to GitHub

```bash
cd forexai-engine
git init && git add . && git commit -m "Initial commit"
gh repo create forexai-engine --private --source=. --push
```

### 3. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel link        # creates project
vercel             # first deploy (preview)
```

Or via dashboard: https://vercel.com/new → Import GitHub repo → Deploy.

You need **Vercel Pro plan ($20/mo)** because Hobby plan caps function timeout at 10s, and the council needs up to 60s for 5 candidates.

### 4. Add Vercel KV (cache + signal storage)

In your Vercel project dashboard:
- Storage → Create → KV
- Connect to project → it auto-populates `KV_*` env vars

### 5. Add environment variables

Vercel dashboard → Project → Settings → Environment Variables. Copy from `.env.example`:

```
TWELVEDATA_API_KEY=...
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
PERPLEXITY_API_KEY=...
TRADINGECONOMICS_API_KEY=...   # optional
ALLOWED_ORIGIN=https://your-frontend.lovable.app
INNGEST_EVENT_KEY=...           # from app.inngest.com
INNGEST_SIGNING_KEY=...
```

### 6. Connect Inngest (optional but recommended)

1. Sign up at https://app.inngest.com
2. Create new app → copy event key + signing key into Vercel env vars
3. Inngest dashboard → Apps → Sync → enter URL `https://your-engine.vercel.app/api/inngest`
4. Inngest auto-registers `runCouncilFn`

### 7. Redeploy

```bash
vercel --prod
```

Note your production URL: e.g. `https://forexai-engine-yourname.vercel.app`.

### 8. Smoke test

```bash
curl -X POST https://your-engine.vercel.app/api/council \
  -H "Content-Type: application/json" \
  -d '{
    "candidates": [{
      "pair": "EUR/USD",
      "direction": "BUY",
      "l0Confidence": 72,
      "triggeredStrategies": ["S1","S5","S6"],
      "currentPrice": 1.0852
    }]
  }'
```

You should get back a JSON response with `signals` array (or empty + decisions explaining why).

### 9. Local development

```bash
npm install
cp .env.example .env       # fill in keys
npm run inngest:dev        # in one terminal
npm run dev                # in another (vercel dev)
npm run test:council EUR/USD BUY    # quick smoke test
```

## Frontend integration

After backend is live, paste the Lovable prompt from `docs/LOVABLE_PROMPT.md` into your frontend project — it adds a Standard/PRO toggle in the Signals tab and fetches PRO signals from this engine.

## File map

```
src/
├── lib/
│   ├── types.ts               Zod schemas for Signal, Candidate, agent verdicts
│   ├── twelvedata.ts          Forex data client (TwelveData REST)
│   ├── indicators.ts          EMA/RSI/ATR/BB/Donchian + multi-TF snapshot
│   ├── strategies.ts          Layer 0 replay (used in micro-backtest)
│   ├── cache.ts               Vercel KV wrapper
│   └── llm.ts                 Anthropic / DeepSeek / Perplexity clients
├── tools/                     Mastra-style tools (each with Zod input/output)
│   ├── fetchKlinesMultiTF.ts
│   ├── runMicroBacktest.ts    ← KILLER FEATURE: replays L0 on history
│   ├── fetchCalendar.ts
│   ├── fetchCorrelationMatrix.ts
│   └── fetchSessionContext.ts
├── agents/
│   ├── trendAgent.ts          Mastra Agent definition (uses tools)
│   ├── meanRevAgent.ts        (kept for reference / optional pure-Mastra mode)
│   ├── breakoutAgent.ts
│   ├── strategyRunners.ts     Production runners — direct LLM + manual tool dispatch
│   ├── macroAgent.ts          Perplexity-driven (web search)
│   ├── riskAgent.ts           Concrete trade levels
│   └── judgeAgent.ts          Final aggregator (Claude tool_use)
├── workflow/
│   └── council.ts             Orchestration: fan-out → judge → Signal
└── inngest/
    ├── client.ts
    └── councilFn.ts           Async path with retry per candidate

api/
├── council/route.ts           POST /api/council  (sync or async via ?mode=async)
├── signals/route.ts           GET  /api/signals  (cached read)
└── inngest/route.ts           Inngest webhook receiver

scripts/
└── test-council.ts            Local council smoke test
```

## Tuning

If after a week of running you see:

- **Too many DROPs** (PUBLISH < 1 per cycle): loosen Judge thresholds in `src/agents/judgeAgent.ts` — change `winRate < 45%` to `< 40%`, allow `confirms == 1` to PUBLISH.
- **Too many false positives** (low realized win rate): tighten Risk Agent `positionSizePct` rules; require `regimeMatch === true` in Judge.
- **High costs**: switch Judge from Claude to DeepSeek (already in fallback path) — drops Judge cost by ~10×.
- **Slow latency** (> 30s per candidate): inspect `result.durationMs` per agent in `/api/council` response. Most likely Perplexity macro is slow — extend its cache TTL from 30 → 60 minutes.

## Limits

- Twelve Data Basic: 50 calls/min, 800/day. With 5 candidates × 3 timeframes × every 5 min, that's ~60-90 calls/hour per pair. The cache (TTL: 5min for 15min, 15min for 1h, 1h for 4h, 6h for daily) keeps you well under quota.
- DeepSeek: no hard rate limit on context but throttles around 60 req/min — fine for 5 candidates × 4 agents = 20 calls per cycle.
- Perplexity: 50 req/min on standard tier — cache covers re-runs within 30 min.
- Anthropic: 50 req/min default — only 1 call per candidate (judge), so fine.

## Security note

CORS is gated by `ALLOWED_ORIGIN`. Set this to your Lovable production URL. For development, you can temporarily set it to `*` but never in prod — anyone could spam your council and burn your API budget.
