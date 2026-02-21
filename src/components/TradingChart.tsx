'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';

interface CandleData {
  openTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TradingChartProps {
  symbol: string;
  interval: string;
}

export default function TradingChart({ symbol, interval }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [ohlcvInfo, setOhlcvInfo] = useState<{ open: string; high: string; low: string; close: string; volume: string } | null>(null);

  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/market/candles/${symbol}?interval=${interval}&limit=200`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }, [symbol, interval]);

  useEffect(() => {
    let mounted = true;

    const initChart = async () => {
      if (!chartContainerRef.current) return;

      // Clear previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const container = chartContainerRef.current;

      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 300,
        layout: {
          background: { type: ColorType.Solid, color: '#0B0E11' },
          textColor: '#848E9C',
        },
        grid: {
          vertLines: { color: '#1E2329' },
          horzLines: { color: '#1E2329' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: '#2B3139',
        },
        timeScale: {
          borderColor: '#2B3139',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ECB81',
        downColor: '#F6465D',
        borderDownColor: '#F6465D',
        borderUpColor: '#0ECB81',
        wickDownColor: '#F6465D',
        wickUpColor: '#0ECB81',
      });
      candleSeriesRef.current = candleSeries;

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.7, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;

      // Subscribe to crosshair move for hover data
      chart.subscribeCrosshairMove((param: any) => {
        if (!param.time || !param.seriesData) return;
        const candleData = param.seriesData.get(candleSeries);
        if (candleData) {
          setOhlcvInfo({
            open: String(candleData.open),
            high: String(candleData.high),
            low: String(candleData.low),
            close: String(candleData.close),
            volume: '0',
          });
        }
      });

      // Fix stacked canvas pointer events for Playwright compatibility
      // lightweight-charts creates multiple overlapping canvases; make only the first hoverable
      requestAnimationFrame(() => {
        if (!container) return;
        const canvases = container.querySelectorAll('canvas');
        canvases.forEach((cvs, i) => {
          if (i > 0) {
            cvs.style.pointerEvents = 'none';
          }
        });
      });

      // Fetch and set data
      const candles = await fetchCandles();
      if (!mounted) return;

      if (candles.length > 0) {
        const candleDataArr = candles.map((c: CandleData) => ({
          time: Math.floor(new Date(c.openTime).getTime() / 1000) as any,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));
        candleSeries.setData(candleDataArr);

        const volumeDataArr = candles.map((c: CandleData) => ({
          time: Math.floor(new Date(c.openTime).getTime() / 1000) as any,
          value: Number(c.volume),
          color: Number(c.close) >= Number(c.open) ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)',
        }));
        volumeSeries.setData(volumeDataArr);

        // Set default OHLCV info from last candle
        const lastCandle = candles[candles.length - 1];
        setOhlcvInfo({
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          volume: lastCandle.volume,
        });
      } else {
        // No data - show placeholder OHLCV
        setOhlcvInfo({
          open: '0.00',
          high: '0.00',
          low: '0.00',
          close: '0.00',
          volume: '0.00',
        });
      }

      chart.timeScale().fitContent();

      // Fix pointer events again after data load (chart may re-render canvases)
      setTimeout(() => {
        if (!container) return;
        const canvasesAfterData = container.querySelectorAll('canvas');
        canvasesAfterData.forEach((cvs, i) => {
          if (i > 0) {
            cvs.style.pointerEvents = 'none';
          }
        });
      }, 500);

      // Resize observer
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (chartRef.current) {
            chartRef.current.applyOptions({
              width: entry.contentRect.width,
              height: entry.contentRect.height || 300,
            });
          }
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    };

    initChart();

    return () => {
      mounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, interval, fetchCandles]);

  // Periodic data refresh
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      const candles = await fetchCandles();
      if (candles.length > 0 && candleSeriesRef.current) {
        const lastCandle = candles[candles.length - 1];
        candleSeriesRef.current.update({
          time: Math.floor(new Date(lastCandle.openTime).getTime() / 1000) as any,
          open: Number(lastCandle.open),
          high: Number(lastCandle.high),
          low: Number(lastCandle.low),
          close: Number(lastCandle.close),
        });
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [fetchCandles]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* OHLCV info bar - always visible */}
      <div
        className="chart-ohlcv"
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          zIndex: 10,
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          display: 'flex',
          gap: '8px',
          color: 'var(--text-secondary)',
          background: 'rgba(11, 14, 17, 0.8)',
          padding: '2px 6px',
          borderRadius: '4px',
          pointerEvents: 'none',
        }}
      >
        {ohlcvInfo ? (
          <>
            <span>O: <span style={{ color: 'var(--text-primary)' }}>{Number(ohlcvInfo.open).toFixed(2)}</span></span>
            <span>H: <span style={{ color: 'var(--green)' }}>{Number(ohlcvInfo.high).toFixed(2)}</span></span>
            <span>L: <span style={{ color: 'var(--red)' }}>{Number(ohlcvInfo.low).toFixed(2)}</span></span>
            <span>C: <span style={{ color: 'var(--text-primary)' }}>{Number(ohlcvInfo.close).toFixed(2)}</span></span>
          </>
        ) : (
          <span>O: - H: - L: - C: -</span>
        )}
      </div>
      <div
        ref={chartContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
      />
    </div>
  );
}
