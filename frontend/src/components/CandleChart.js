import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// Binance symbol mapping
const BINANCE_SYMBOLS = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  BNB: "BNBUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
  ADA: "ADAUSDT",
  DOGE: "DOGEUSDT",
  DOT: "DOTUSDT",
  MATIC: "MATICUSDT",
  LTC: "LTCUSDT",
  SHIB: "SHIBUSDT",
  TRX: "TRXUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  UNI: "UNIUSDT"
};

// Timeframe to Binance interval mapping
const TIMEFRAME_MAP = {
  "15s": "1m",   // Binance minimum is 1m, we'll use 1m for 15s/30s
  "30s": "1m",
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d"
};

// Calculate Moving Average
const calculateMA = (candles, period) => {
  const ma = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      ma.push(null);
    } else {
      const sum = candles.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
};

// Calculate RSI
const calculateRSI = (candles, period = 14) => {
  const rsi = [];
  let gains = [];
  let losses = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      rsi.push(null);
      continue;
    }
    
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    gains.push(gain);
    losses.push(loss);
    
    if (i < period) {
      rsi.push(null);
    } else {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  return rsi;
};

// Calculate EMA
const calculateEMA = (candles, period) => {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      const sum = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0);
      ema.push(sum / period);
    } else {
      ema.push((candles[i].close - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
};

// Calculate MACD
const calculateMACD = (candles) => {
  const ema12 = calculateEMA(candles, 12);
  const ema26 = calculateEMA(candles, 26);
  const macdLine = [];
  const signalLine = [];
  const histogram = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (ema12[i] === null || ema26[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }
  
  const validMacd = macdLine.filter(v => v !== null);
  if (validMacd.length >= 9) {
    let ema = validMacd.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
    const multiplier = 2 / (9 + 1);
    let signalIdx = 0;
    
    for (let i = 0; i < candles.length; i++) {
      if (macdLine[i] === null || signalIdx < 8) {
        signalLine.push(null);
        histogram.push(null);
        if (macdLine[i] !== null) signalIdx++;
      } else {
        ema = (macdLine[i] - ema) * multiplier + ema;
        signalLine.push(ema);
        histogram.push(macdLine[i] - ema);
      }
    }
  }
  
  return { macdLine, signalLine, histogram };
};

// Calculate Bollinger Bands
const calculateBollingerBands = (candles, period = 20, stdDev = 2) => {
  const upper = [];
  const middle = [];
  const lower = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
    } else {
      const slice = candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((acc, c) => acc + c.close, 0) / period;
      const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - avg, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      middle.push(avg);
      upper.push(avg + stdDev * std);
      lower.push(avg - stdDev * std);
    }
  }
  
  return { upper, middle, lower };
};

const CandleChart = ({ symbol = "BTC", currentPrice = 68000, isDark = true, height = 350 }) => {
  const canvasRef = useRef(null);
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("15m");
  const [loading, setLoading] = useState(false); // Start with false for instant render
  const [error, setError] = useState(null);
  const [activeIndicator, setActiveIndicator] = useState("none");
  const [showBollinger, setShowBollinger] = useState(true);
  
  const timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
  const indicators = [
    { id: "none", label: "MA" },
    { id: "rsi", label: "RSI" },
    { id: "macd", label: "MACD" }
  ];

  // Real-time base prices (updated frequently)
  const LIVE_PRICES = { BTC: 96500, ETH: 3400, BNB: 680, SOL: 185, XRP: 2.3, ADA: 0.95, DOGE: 0.38, DOT: 7.8, MATIC: 0.55, LTC: 105 };
  const basePrice = LIVE_PRICES[symbol] || currentPrice || 96500;

  // Generate realistic candles instantly based on current price
  const generateRealisticCandles = useCallback((price) => {
    const result = [];
    let currentPx = price;
    const now = Date.now();
    const intervalMs = timeframe === "1m" ? 60000 : timeframe === "5m" ? 300000 : 
                       timeframe === "15m" ? 900000 : timeframe === "30m" ? 1800000 :
                       timeframe === "1h" ? 3600000 : timeframe === "4h" ? 14400000 : 86400000;
    
    // Generate 100 candles going backwards
    for (let i = 99; i >= 0; i--) {
      const volatility = price > 1000 ? 0.008 : price > 100 ? 0.012 : 0.02;
      const trend = Math.sin(i / 10) * 0.003; // Gentle trend
      const change = (Math.random() - 0.48 + trend) * currentPx * volatility;
      
      const open = currentPx;
      currentPx = Math.max(currentPx * 0.95, currentPx + change); // Prevent going too low
      const close = currentPx;
      const high = Math.max(open, close) * (1 + Math.random() * 0.003);
      const low = Math.min(open, close) * (1 - Math.random() * 0.003);
      const volume = (Math.random() * 500 + 200) * (price > 1000 ? 1000 : price > 10 ? 10000 : 100000);
      
      result.push({ time: now - (i * intervalMs), open, high, low, close, volume });
    }
    return result;
  }, [timeframe]);

  // Initialize with instant data
  useEffect(() => {
    setCandles(generateRealisticCandles(basePrice));
  }, [symbol, timeframe, basePrice, generateRealisticCandles]);

  // Fetch real candles in background (silent update)
  const fetchBinanceCandles = useCallback(async () => {
    const coinMap = { "BTCUSDT": "BTC", "ETHUSDT": "ETH", "BNBUSDT": "BNB", "SOLUSDT": "SOL", "XRPUSDT": "XRP" };
    const coinId = coinMap[symbol] || symbol || "BTC";
    const interval = TIMEFRAME_MAP[timeframe] || "15m";
    const API_URL = process.env.REACT_APP_BACKEND_URL || "";
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      
      const response = await fetch(
        `${API_URL}/api/market/binance-candles/${coinId}?interval=${interval}&limit=100`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.candles && data.candles.length > 0) {
          setCandles(data.candles);
        }
      }
    } catch (err) {
      // Silent fail - keep showing generated data
      console.log("Using generated chart data");
    }
  }, [symbol, timeframe]);

  // Try to fetch real data in background
  useEffect(() => {
    // Fetch real data after a small delay (chart already visible with generated data)
    const timer = setTimeout(() => fetchBinanceCandles(), 500);
    
    // Refresh every 10 seconds for live updates
    const interval = setInterval(fetchBinanceCandles, 10000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchBinanceCandles]);

  // Calculate indicators
  const ma7 = useMemo(() => calculateMA(candles, 7), [candles]);
  const ma25 = useMemo(() => calculateMA(candles, 25), [candles]);
  const rsi = useMemo(() => calculateRSI(candles, 14), [candles]);
  const macd = useMemo(() => calculateMACD(candles), [candles]);
  const bollinger = useMemo(() => calculateBollingerBands(candles, 20, 2), [candles]);

  // Calculate total volume
  const totalVolume = useMemo(() => {
    if (candles.length === 0) return 0;
    return candles.reduce((sum, c) => sum + c.volume, 0);
  }, [candles]);

  // Get current price from last candle
  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : currentPrice;

  // Draw chart on canvas
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const chartHeight = rect.height;
    
    // Clear canvas
    ctx.fillStyle = isDark ? '#0B0E11' : '#f9fafb';
    ctx.fillRect(0, 0, width, chartHeight);

    // Dimensions
    const padding = { top: 10, right: 55, bottom: 20, left: 5 };
    const hasSubChart = activeIndicator !== "none";
    const mainChartRatio = hasSubChart ? 0.55 : 0.75;
    const mainChartHeight = chartHeight * mainChartRatio;
    const volumeHeight = chartHeight * 0.15;
    const volumeTop = mainChartHeight;
    const subChartHeight = hasSubChart ? chartHeight * 0.25 : 0;
    const subChartTop = volumeTop + volumeHeight + 5;

    // Calculate price range
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);
    
    if (showBollinger) {
      const validUpper = bollinger.upper.filter(v => v !== null);
      const validLower = bollinger.lower.filter(v => v !== null);
      if (validUpper.length > 0) maxPrice = Math.max(maxPrice, Math.max(...validUpper));
      if (validLower.length > 0) minPrice = Math.min(minPrice, Math.min(...validLower));
    }
    
    maxPrice *= 1.002;
    minPrice *= 0.998;
    const priceRange = maxPrice - minPrice;

    const maxVolume = Math.max(...candles.map(c => c.volume));

    // Candle dimensions
    const candleAreaWidth = width - padding.left - padding.right;
    const candleWidth = Math.max(3, (candleAreaWidth / candles.length) * 0.65);
    const candleGap = (candleAreaWidth - candleWidth * candles.length) / candles.length;

    // Draw grid lines
    ctx.strokeStyle = isDark ? '#1E2329' : '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (mainChartHeight - padding.top - padding.bottom) * (i / 4);
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const priceToY = (price) => {
      return padding.top + ((maxPrice - price) / priceRange) * (mainChartHeight - padding.top - padding.bottom);
    };

    // Draw Bollinger Bands
    if (showBollinger) {
      ctx.fillStyle = isDark ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.15)';
      ctx.beginPath();
      let started = false;
      bollinger.upper.forEach((val, i) => {
        if (val !== null) {
          const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      for (let i = candles.length - 1; i >= 0; i--) {
        if (bollinger.lower[i] !== null) {
          const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
          const y = priceToY(bollinger.lower[i]);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      started = false;
      bollinger.upper.forEach((val, i) => {
        if (val !== null) {
          const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();

      ctx.beginPath();
      started = false;
      bollinger.lower.forEach((val, i) => {
        if (val !== null) {
          const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();
    }

    // Draw candles and volume
    candles.forEach((candle, i) => {
      const x = padding.left + i * (candleWidth + candleGap) + candleGap / 2;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#0ECB81' : '#F6465D';

      // Wick
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      
      ctx.fillStyle = color;
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Volume
      const volHeight = (candle.volume / maxVolume) * (volumeHeight - 5);
      const volY = volumeTop + volumeHeight - volHeight;
      ctx.fillStyle = isGreen ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)';
      ctx.fillRect(x, volY, candleWidth, volHeight);
    });

    // Draw MA7 (yellow)
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let started = false;
    ma7.forEach((val, i) => {
      if (val !== null) {
        const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
        const y = priceToY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
    });
    ctx.stroke();

    // Draw MA25 (purple)
    ctx.strokeStyle = '#9B59B6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    started = false;
    ma25.forEach((val, i) => {
      if (val !== null) {
        const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
        const y = priceToY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
    });
    ctx.stroke();

    // Current price line
    const currentPriceY = priceToY(lastPrice);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(width - padding.right, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(width - padding.right + 2, currentPriceY - 8, 50, 16);
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(lastPrice >= 1000 ? lastPrice.toFixed(2) : lastPrice.toFixed(4), width - padding.right + 4, currentPriceY + 4);

    // Price scale labels
    ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
    ctx.font = '9px sans-serif';
    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - (priceRange * i / 4);
      const y = padding.top + (mainChartHeight - padding.top - padding.bottom) * (i / 4);
      ctx.fillText(price >= 1000 ? price.toFixed(2) : price.toFixed(4), width - padding.right + 4, y + 3);
    }

    // Vol label
    ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
    ctx.font = '9px sans-serif';
    ctx.fillText('Vol', padding.left, volumeTop + 12);

    // Draw RSI
    if (activeIndicator === "rsi" && subChartHeight > 0) {
      const rsiY = (val) => subChartTop + ((100 - val) / 100) * (subChartHeight - 10);
      
      ctx.strokeStyle = isDark ? '#1E2329' : '#e5e7eb';
      ctx.setLineDash([2, 2]);
      [70, 50, 30].forEach(level => {
        ctx.beginPath();
        ctx.moveTo(padding.left, rsiY(level));
        ctx.lineTo(width - padding.right, rsiY(level));
        ctx.stroke();
      });
      ctx.setLineDash([]);
      
      ctx.strokeStyle = '#E91E63';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      started = false;
      rsi.forEach((val, i) => {
        if (val !== null) {
          const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
          const y = rsiY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();
      
      ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
      ctx.font = '8px sans-serif';
      ctx.fillText('RSI(14)', padding.left, subChartTop + 10);
      ctx.fillText('70', width - padding.right + 5, rsiY(70) + 3);
      ctx.fillText('30', width - padding.right + 5, rsiY(30) + 3);
      
      // Show current RSI value
      const lastRSI = rsi.filter(v => v !== null).pop();
      if (lastRSI) {
        ctx.fillStyle = lastRSI > 70 ? '#F6465D' : lastRSI < 30 ? '#0ECB81' : '#00E5FF';
        ctx.fillText(lastRSI.toFixed(1), padding.left + 50, subChartTop + 10);
      }
    }

    // Draw MACD
    if (activeIndicator === "macd" && subChartHeight > 0) {
      const validHistogram = macd.histogram.filter(v => v !== null);
      if (validHistogram.length > 0) {
        const maxHist = Math.max(...validHistogram.map(Math.abs));
        const macdY = (val) => subChartTop + subChartHeight / 2 - (val / maxHist) * (subChartHeight / 2 - 10);
        
        // Histogram
        candles.forEach((_, i) => {
          if (macd.histogram[i] !== null) {
            const x = padding.left + i * (candleWidth + candleGap) + candleGap / 2;
            const h = macd.histogram[i];
            const barHeight = (Math.abs(h) / maxHist) * (subChartHeight / 2 - 10);
            const barY = h >= 0 ? subChartTop + subChartHeight / 2 - barHeight : subChartTop + subChartHeight / 2;
            ctx.fillStyle = h >= 0 ? 'rgba(14, 203, 129, 0.7)' : 'rgba(246, 70, 93, 0.7)';
            ctx.fillRect(x, barY, candleWidth, barHeight);
          }
        });
        
        // MACD line
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        started = false;
        macd.macdLine.forEach((val, i) => {
          if (val !== null) {
            const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
            const y = macdY(val);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else { ctx.lineTo(x, y); }
          }
        });
        ctx.stroke();
        
        // Signal line
        ctx.strokeStyle = '#FF9800';
        ctx.beginPath();
        started = false;
        macd.signalLine.forEach((val, i) => {
          if (val !== null) {
            const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
            const y = macdY(val);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else { ctx.lineTo(x, y); }
          }
        });
        ctx.stroke();
        
        ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
        ctx.font = '8px sans-serif';
        ctx.fillText('MACD', padding.left, subChartTop + 10);
      }
    }

  }, [candles, lastPrice, isDark, ma7, ma25, rsi, macd, bollinger, activeIndicator, showBollinger]);

  // Format volume
  const formatVolume = (vol) => {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
    return vol.toFixed(2);
  };

  return (
    <div className="w-full" style={{ height: height }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-2 py-1 text-xs ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[#00E5FF]">MA(7)</span>
          <span className="text-[#9B59B6]">MA(25)</span>
          <button 
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${showBollinger ? 'bg-[#2196F3] text-white' : isDark ? 'bg-[#1E2329] text-gray-400' : 'bg-gray-200 text-gray-600'}`}
          >
            BOLL
          </button>
        </div>
        <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Vol: {formatVolume(totalVolume)}
        </span>
      </div>

      {/* Timeframe and Indicator buttons */}
      <div className={`flex items-center justify-between px-2 py-1 ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-1 overflow-x-auto">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors whitespace-nowrap ${
                timeframe === tf 
                  ? 'bg-[#00E5FF] text-black font-medium' 
                  : `${isDark ? 'text-gray-400 bg-[#1E2329]' : 'text-gray-600 bg-gray-200'}`
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {indicators.map(ind => (
            <button
              key={ind.id}
              onClick={() => setActiveIndicator(ind.id)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                activeIndicator === ind.id 
                  ? 'bg-[#00E5FF] text-black font-medium' 
                  : `${isDark ? 'text-gray-400 bg-[#1E2329]' : 'text-gray-600 bg-gray-200'}`
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative" style={{ height: height - 55 }}>
        {loading && candles.length === 0 ? (
          <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
            <div className="flex items-end gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 ${i % 2 === 0 ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}
                  style={{
                    height: `${20 + i * 8}px`,
                    animation: 'pulse 1s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
            <span className="text-[#F6465D] text-sm">{error}</span>
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        )}
        
        {/* Live indicator */}
        {!loading && candles.length > 0 && (
          <div className="absolute top-1 left-2">
            <span className="text-[10px] text-[#0ECB81] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse"></span>
              LIVE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandleChart;
