# Prompt do wklejenia w Lovable (frontend)

Po zdeployowaniu `forexai-engine` na Vercel, wklej poniższy prompt aby dodać toggle Standard/PRO w zakładce Signals i fetchowanie sygnałów PRO z backendu.

---

```
Dodaj toggle "Standard | PRO" w zakładce FOREX strony Signals. PRO sygnały
pochodzą z osobnego backendu (ForexAI Engine na Vercel) i są generowane przez
multi-agent council. Zachowaj całą obecną logikę dla CRYPTO i Standard FOREX
bez zmian.

═══════════════════════════════════════════════════════════════════
KONTEKST OBECNEGO KODU
═══════════════════════════════════════════════════════════════════

src/hooks/useSignals.ts:
- Eksportuje hook useSignals(category) zwracający { signals, isRefreshing,
  ensembleEnabled, setEnsembleEnabled, ... }
- Signal interface ma pola: id, instrument, category, direction, entry,
  target, stop, confidence, vitality, timestamp, layers[5], layerConfidences[5],
  status, spread, sourceLayers
- Linie 282-352: ensemble pipeline dla FOREX i CRYPTO

src/pages/Signals.tsx:
- Pokazuje SignalCard'y dla aktywnej kategorii FOREX/CRYPTO
- Ma przyciski Refresh, banner z bidaniem statusu rynku, listę kart

═══════════════════════════════════════════════════════════════════
ZMIANY
═══════════════════════════════════════════════════════════════════

1. ROZSZERZ Signal interface w src/hooks/useSignals.ts:

   Dodaj opcjonalne pola PRO (które standard signals nie mają, więc będą undefined):

   export interface Signal {
     // ...istniejące pola...
     tier?: 'STANDARD' | 'PRO';
     thesis?: string;
     mainRisk?: string;
     positionSizePct?: number;
     riskRewardTp1?: number;
     expectedHoldMinutes?: number;
     backtestWinRate?: number;
     backtestSampleSize?: number;
     takeProfits?: [number, number, number];
   }

   W obecnej logice generującej standard signals, ustaw tier: 'STANDARD'.

2. STWÓRZ src/hooks/useProSignals.ts (nowy plik):

   import { useState, useEffect, useCallback } from 'react';
   import type { Signal } from './useSignals';

   const ENGINE_URL = import.meta.env.VITE_FOREXAI_ENGINE_URL ||
     'https://your-engine.vercel.app';

   export interface Candidate {
     pair: string;
     direction: 'BUY' | 'SELL';
     l0Confidence: number;
     triggeredStrategies: string[];
     currentPrice: number;
   }

   export function useProSignals(category: 'FOREX' | 'CRYPTO') {
     const [signals, setSignals] = useState<Signal[]>([]);
     const [isLoading, setIsLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

     // Fetch latest published PRO signals from cache (cheap)
     const fetchLatest = useCallback(async () => {
       if (category !== 'FOREX') return; // PRO only for FOREX
       try {
         const res = await fetch(`${ENGINE_URL}/api/signals?tier=PRO`);
         if (!res.ok) throw new Error(`HTTP ${res.status}`);
         const data = await res.json();
         if (Array.isArray(data.signals)) {
           setSignals(data.signals.map((s: Signal) => ({ ...s, tier: 'PRO' })));
         }
       } catch (err) {
         setError(err instanceof Error ? err.message : 'fetch failed');
       }
     }, [category]);

     // Trigger council generation (sends candidates to engine)
     const generate = useCallback(async (candidates: Candidate[]) => {
       if (category !== 'FOREX' || candidates.length === 0) return;
       setIsLoading(true);
       setError(null);
       try {
         const res = await fetch(`${ENGINE_URL}/api/council`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ candidates: candidates.slice(0, 5) }),
         });
         if (!res.ok) throw new Error(`Engine HTTP ${res.status}`);
         const data = await res.json();
         if (Array.isArray(data.signals)) {
           setSignals(data.signals.map((s: Signal) => ({ ...s, tier: 'PRO' })));
         }
       } catch (err) {
         setError(err instanceof Error ? err.message : 'council failed');
       } finally {
         setIsLoading(false);
       }
     }, [category]);

     useEffect(() => {
       fetchLatest();
       const interval = setInterval(fetchLatest, 60_000); // poll every 60s
       return () => clearInterval(interval);
     }, [fetchLatest]);

     return { signals, isLoading, error, generate, refresh: fetchLatest };
   }

3. DODAJ TOGGLE w src/pages/Signals.tsx:

   a) Importuj useProSignals.

   b) Dodaj state na poziomie komponentu:
      const [tier, setTier] = useState<'STANDARD' | 'PRO'>('STANDARD');

   c) Wywołaj oba hooki:
      const standardData = useSignals(category);
      const proData = useProSignals(category);

   d) Wybierz odpowiednie dane do renderowania:
      const activeSignals = tier === 'PRO' && category === 'FOREX'
        ? proData.signals
        : standardData.signals;

   e) Dodaj toggle visualnie powyżej listy kart (TYLKO gdy category === 'FOREX'):

      {category === 'FOREX' && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setTier('STANDARD')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tier === 'STANDARD' ? 'bg-blue-600 text-white' :
              'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setTier('PRO')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              tier === 'PRO' ? 'bg-yellow-500 text-black' :
              'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>⭐</span> PRO Council
          </button>
          {tier === 'PRO' && proData.isLoading && (
            <span className="text-xs text-gray-400 ml-2">
              Council deliberating...
            </span>
          )}
          {tier === 'PRO' && proData.error && (
            <span className="text-xs text-red-400 ml-2">
              Engine error: {proData.error}
            </span>
          )}
        </div>
      )}

   f) Gdy user klika Refresh i tier === 'PRO', wywołaj proData.generate(candidates):

      Dla PRO musisz przekazać top 5 kandydatów z L0. W useSignals.ts dodaj
      eksport funkcji helper'a `extractCandidates(signals: Signal[]): Candidate[]`
      która z aktualnych standard signals tworzy listę dla council:

      // w useSignals.ts:
      export function extractCandidates(signals: Signal[]): Candidate[] {
        return signals
          .filter(s => s.layers[0] === true && s.confidence >= 60)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
          .map(s => ({
            pair: s.instrument,
            direction: s.direction as 'BUY' | 'SELL',
            l0Confidence: s.layerConfidences[0],
            triggeredStrategies: s.sourceLayers,
            currentPrice: s.entry,
          }));
      }

      W Signals.tsx, handleRefresh:
      const handleRefresh = async () => {
        if (tier === 'PRO' && category === 'FOREX') {
          const candidates = extractCandidates(standardData.signals);
          await proData.generate(candidates);
        } else {
          standardData.refresh();
        }
      };

4. SignalCard.tsx — DODAJ wskaźnik PRO:

   W headerze karty, obok ageLabel, dodaj badge gdy signal.tier === 'PRO':

   {signal.tier === 'PRO' && (
     <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
       ⭐ PRO
     </span>
   )}

   Pod sekcją consensus (linia ~167), gdy signal.tier === 'PRO' i są dane,
   dodaj rozwijany blok "Council Insights":

   {signal.tier === 'PRO' && signal.thesis && (
     <details className="mt-3 pt-3 border-t border-gray-700">
       <summary className="text-xs cursor-pointer text-gray-400 hover:text-gray-200">
         Council Insights
       </summary>
       <div className="mt-2 space-y-1 text-xs">
         <div><span className="text-gray-400">Thesis:</span> {signal.thesis}</div>
         {signal.mainRisk && (
           <div><span className="text-gray-400">Main risk:</span> {signal.mainRisk}</div>
         )}
         {signal.backtestWinRate !== undefined && (
           <div>
             <span className="text-gray-400">Backtest:</span>{' '}
             {signal.backtestWinRate}% win rate (n={signal.backtestSampleSize})
           </div>
         )}
         {signal.positionSizePct !== undefined && (
           <div>
             <span className="text-gray-400">Position size:</span>{' '}
             {signal.positionSizePct}%
           </div>
         )}
         {signal.expectedHoldMinutes !== undefined && (
           <div>
             <span className="text-gray-400">Expected hold:</span>{' '}
             {signal.expectedHoldMinutes < 60
               ? `${signal.expectedHoldMinutes}min`
               : `${Math.floor(signal.expectedHoldMinutes / 60)}h ${signal.expectedHoldMinutes % 60}min`}
           </div>
         )}
       </div>
     </details>
   )}

5. ŚRODOWISKO Lovable (env vars):

   W ustawieniach projektu Lovable dodaj:
   VITE_FOREXAI_ENGINE_URL = https://your-engine.vercel.app

═══════════════════════════════════════════════════════════════════
ZASADY KTÓRYCH NIE NARUSZAĆ
═══════════════════════════════════════════════════════════════════

- Standard (zwykła zakładka) działa identycznie jak teraz — żadnych
  zmian w obecnym ensemble pipeline.
- CRYPTO bez tieru PRO — toggle pokazuje się tylko dla FOREX.
- Signal interface zachowuje wszystkie obecne pola; nowe pola PRO
  są opcjonalne.
- SignalCard.tsx zachowuje obecny układ; nowe elementy (badge PRO,
  Council Insights) są dodatkowe i pokazują się tylko gdy
  signal.tier === 'PRO' AND dane są obecne.
- Refresh dla Standard pozostaje natychmiastowy; refresh dla PRO
  może trwać 15-30s (council pracuje) — pokazuj spinner / message
  "Council deliberating...".
```
