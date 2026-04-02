/**
 * useMarketStream — hook para consumir o SSE de preços de um mercado.
 *
 * Conecta ao endpoint /api/stream/markets/:id via EventSource e mantém
 * o estado de probabilidade/pool atualizado em tempo real.
 * Reconecta automaticamente com backoff exponencial em caso de falha.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MarketStreamData {
  marketId: number;
  status: string;
  poolYes: number;
  poolNo: number;
  totalVolume: number;
  /** Probabilidade YES em %, ex: 62.34 */
  probYes: number;
  /** Probabilidade NO em %, ex: 37.66 */
  probNo: number;
  lastTradeAt: string | null;
  ts: number;
}

export interface ActivityStreamItem {
  id: number;
  type: 'BUY' | 'SELL';
  side: 'YES' | 'NO';
  amount: number;
  marketId: number;
  question: string | null;
  username: string;
  createdAt: string;
}

interface UseMarketStreamOptions {
  /** Se false, não conecta (útil para SSR/guard condicional) */
  enabled?: boolean;
}

interface UseMarketStreamResult {
  data: MarketStreamData | null;
  connected: boolean;
  error: string | null;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useMarketStream(
  marketId: number | null | undefined,
  options: UseMarketStreamOptions = {},
): UseMarketStreamResult {
  const { enabled = true } = options;

  const [data, setData] = useState<MarketStreamData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    if (!marketId || !enabled) return;

    const url = `${API_BASE}/api/stream/markets/${marketId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
      setError(null);
      retryCount.current = 0;
    });

    es.addEventListener('price', (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as MarketStreamData;
        setData(payload);
      } catch {
        // Ignorar payloads malformados
      }
    });

    es.addEventListener('error', (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as { code: string };
        setError(payload.code);
      } catch {
        // evento de erro genérico, não tem data JSON
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;

      // Backoff exponencial: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
      retryCount.current += 1;

      retryRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [marketId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  return { data, connected, error };
}

// ─── Hook feed global ─────────────────────────────────────────────────────────

interface UseFeedStreamResult {
  items: ActivityStreamItem[];
  connected: boolean;
}

/**
 * useActivityFeedStream — conecta ao feed global de atividade via SSE.
 * Mantém um buffer das últimas `maxItems` atividades (default: 50).
 */
export function useActivityFeedStream(maxItems = 50): UseFeedStreamResult {
  const [items, setItems] = useState<ActivityStreamItem[]>([]);
  const [connected, setConnected] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    const connect = () => {
      const url = `${API_BASE}/api/stream/feed`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener('connected', () => {
        setConnected(true);
        retryCount.current = 0;
      });

      es.addEventListener('activity', (e: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(e.data) as { items: ActivityStreamItem[] };
          setItems((prev) => {
            const merged = [...payload.items, ...prev];
            // Deduplicar por id e limitar buffer
            const seen = new Set<number>();
            const deduped: ActivityStreamItem[] = [];
            for (const item of merged) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                deduped.push(item);
              }
            }
            return deduped.slice(0, maxItems);
          });
        } catch {
          // Ignorar
        }
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;

        const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
        retryCount.current += 1;
        retryRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [maxItems]);

  return { items, connected };
}
