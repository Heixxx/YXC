import type { Candle, Timeframe } from './types';
import { kvGet, kvSet } from './cache';

const TD_BASE = 'https://api.twelvedata.com';

const TF_MAP: Record<Timeframe, string> = {
  '15min': '15min',
  '1h': '1h',
  '4h': '4h',
  '1day': '1day',
};

const TTL_BY_TF: Record<Timeframe, number> = {
  '15min': 60 * 5,    // 5 min cache
  '1h': 60 * 15,      // 15 min
  '4h': 60 * 60,      // 1h
  '1day': 60 * 60 * 6,// 6h
};

interface TDTimeSeriesResp {
  meta?: { symbol: string; interval: string };
  values?: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume?: string;
  }>;
  status?: string;
  message?: string;
  code?: number;
}

export async function fetchTwelveDataCandles(
  pair: string,           // "EUR/USD"
  timeframe: Timeframe,
  outputsize: number = 200
): Promise<Candle[]> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('TWELVEDATA_API_KEY missing');

  const cacheKey = `td:${pair}:${timeframe}:${outputsize}`;
  const cached = await kvGet<Candle[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${TD_BASE}/time_series`);
  url.searchParams.set('symbol', pair);
  url.searchParams.set('interval', TF_MAP[timeframe]);
  url.searchParams.set('outputsize', String(outputsize));
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('order', 'ASC');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TwelveData HTTP ${res.status}: ${await res.text()}`);
  }
  const data: TDTimeSeriesResp = await res.json();

  if (data.status === 'error' || !data.values) {
    throw new Error(`TwelveData API error: ${data.message || 'unknown'}`);
  }

  const candles: Candle[] = data.values.map((v) => ({
    timestamp: new Date(v.datetime + 'Z').getTime(),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: v.volume ? parseFloat(v.volume) : 0,
  }));

  await kvSet(cacheKey, candles, TTL_BY_TF[timeframe]);
  return candles;
}

export async function fetchTwelveDataQuote(pair: string): Promise<{
  price: number;
  bid: number;
  ask: number;
  spread: number;
}> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('TWELVEDATA_API_KEY missing');

  const url = new URL(`${TD_BASE}/quote`);
  url.searchParams.set('symbol', pair);
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TwelveData quote HTTP ${res.status}`);
  const data = await res.json() as {
    close?: string;
    bid?: string;
    ask?: string;
    status?: string;
    message?: string;
  };

  if (data.status === 'error') {
    throw new Error(`TwelveData quote error: ${data.message}`);
  }

  const price = parseFloat(data.close ?? '0');
  const bid = data.bid ? parseFloat(data.bid) : price;
  const ask = data.ask ? parseFloat(data.ask) : price;
  return { price, bid, ask, spread: Math.abs(ask - bid) };
}
