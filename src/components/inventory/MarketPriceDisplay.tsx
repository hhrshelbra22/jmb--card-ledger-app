'use client';

import { useEffect, useState, useCallback } from 'react';
import { useProfile } from '@/lib/query/profile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock } from 'lucide-react';

const DISCLAIMER = 'Market values shown are estimates or user-provided.';

export interface MarketPriceData {
  estimated_value_each: number;
  loose_price: number | null;
  graded_price: number | null;
  source_url?: string;
}

interface MarketPriceDisplayProps {
  cardName: string;
  game: string;
  setName?: string;
  condition?: string;
  onUsePrice?: (valuePerUnit: number) => void;
  onMarketData?: (data: MarketPriceData) => void;
}

const DEBOUNCE_MS = 800;
const MIN_CARD_NAME_LEN = 3;

export function MarketPriceDisplay({
  cardName,
  game,
  setName = '',
  condition = '',
  onUsePrice,
  onMarketData,
}: MarketPriceDisplayProps) {
  const { data: profile } = useProfile();
  const isPro = profile?.role !== 'pro';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MarketPriceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketPrice = useCallback(async () => {
    const trimmed = cardName.trim();
    if (trimmed.length < MIN_CARD_NAME_LEN || !isPro) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const params = new URLSearchParams({
        cardName: trimmed,
        game: game || '',
        setName: setName || '',
        condition: condition || '',
      });
      const res = await fetch(`/api/market-price?${params.toString()}`);

      if (res.status === 403) {
        setError('Pro subscription required');
        return;
      }
      if (res.status === 404) {
        setError('Card not found in PriceCharting');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: string }).error ?? 'Failed to load market price',
        );
        return;
      }

      const json = (await res.json()) as MarketPriceData;
      setData(json);
      onMarketData?.(json);
    } catch {
      setError('Failed to load market price');
    } finally {
      setLoading(false);
    }
  }, [cardName, game, setName, condition, isPro, onMarketData]);

  useEffect(() => {
    setData(null);
    setError(null);
    const trimmed = cardName.trim();
    if (trimmed.length < MIN_CARD_NAME_LEN || !isPro) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      void fetchMarketPrice();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [cardName, game, setName, condition, isPro, fetchMarketPrice]);

  if (!isPro) {
    return (
      <div className="space-y-1.5">
        <div className="relative rounded-md border border-border bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            <span className="text-xs sm:text-sm">Market price</span>
          </div>
          <div
            className="mt-1.5 h-6 w-24 rounded bg-muted blur-sm"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60">
            <span className="text-xs font-medium text-muted-foreground">
              Upgrade to Pro
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-16 w-full rounded-md" />
        <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1.5">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs sm:text-sm text-muted-foreground">{error}</p>
        </div>
        {error !== 'Card not found in PriceCharting' && (
          <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Enter at least {MIN_CARD_NAME_LEN} characters to see market price.
        </p>
        <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    );
  }

  const value = data.estimated_value_each;
  const formatted =
    typeof value === 'number' && Number.isFinite(value)
      ? `$${value.toFixed(2)}`
      : '—';

  return (
    <div className="space-y-1.5">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Est. market price</p>
            <p className="text-sm font-semibold sm:text-base">{formatted}</p>
          </div>
          {onUsePrice != null && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onUsePrice(data.estimated_value_each)}
            >
              Use this price
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  );
}
