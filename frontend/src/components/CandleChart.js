import { useState, useEffect, useMemo, useRef } from "react";

// Generate realistic historical candle data
const generateHistoricalCandles = (currentPrice, numCandles = 80, volatilityPercent = 3) => {
  const candles = [];
  let price = currentPrice * (1 - volatilityPercent/100 * numCandles * 0.12);
  
  for (let i = 0; i < numCandles; i++) {
    const volatility = price * (volatilityPercent / 100);
    const trend = (currentPrice - price) / (numCandles - i) * 0.25;
    const randomFactor = (Math.random() - 0.5) * 2;
    const open = price;
    const change = trend + randomFactor * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = (Math.random() * 500 + 100) * (1 + Math.abs(change/price) * 10);
    
    candles.push({
      time: Date.now() - (numCandles - i) * 900000,
      open,
      high,
      low,
      close,
      volume
    });
    
    price = close;
  }
  
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = currentPrice;
    last.high = Math.max(last.high, currentPrice);
    last.low = Math.min(last.low, currentPrice);
  }
  
  return candles;
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
  
  // Calculate signal line (9-period EMA of MACD)
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
  const [loading, setLoading] = useState(true);
  const [initialPrice, setInitialPrice] = useState(null);
  const [activeIndicator, setActiveIndicator] = useState("none"); // none, rsi, macd
  const [showBollinger, setShowBollinger] = useState(false);
  
  const timeframes = ["15s", "30s", "1m", "15m", "30m"];
  const indicators = [
    { id: "none", label: "MA" },
    { id: "rsi", label: "RSI" },
    { id: "macd", label: "MACD" }
  ];

  // Initialize candles
  useEffect(() => {
    if (currentPrice > 0 && !initialPrice) {
      setInitialPrice(currentPrice);
      const newCandles = generateHistoricalCandles(currentPrice, 80, 3);
      setCandles(newCandles);
      setLoading(false);
    }
  }, [currentPrice, initialPrice]);

  // Update last candle with current price
  useEffect(() => {
    if (candles.length > 0 && currentPrice > 0) {
      setCandles(prev => {
        const updated = [...prev];
        const last = { ...updated[updated.length - 1] };
        last.close = currentPrice;
        last.high = Math.max(last.high, currentPrice);
        last.low = Math.min(last.low, currentPrice);
        updated[updated.length - 1] = last;
        return updated;
      });
    }
  }, [currentPrice]);

  // Handle timeframe change
  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    if (currentPrice > 0) {
      const volatility = tf === "30m" ? 4 : tf === "15m" ? 3 : 2;
      const newCandles = generateHistoricalCandles(currentPrice, 80, volatility);
      setCandles(newCandles);
    }
  };

  // Reset on symbol change
  useEffect(() => {
    setInitialPrice(null);
    setLoading(true);
  }, [symbol]);

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
    
    // Include Bollinger bands in range if active
    if (showBollinger) {
      const validUpper = bollinger.upper.filter(v => v !== null);
      const validLower = bollinger.lower.filter(v => v !== null);
      if (validUpper.length > 0) maxPrice = Math.max(maxPrice, Math.max(...validUpper));
      if (validLower.length > 0) minPrice = Math.min(minPrice, Math.min(...validLower));
    }
    
    maxPrice *= 1.002;
    minPrice *= 0.998;
    const priceRange = maxPrice - minPrice;

    // Calculate volume range
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

    // Price to Y coordinate (for main chart)
    const priceToY = (price) => {
      return padding.top + ((maxPrice - price) / priceRange) * (mainChartHeight - padding.top - padding.bottom);
    };

    // Draw Bollinger Bands (if active)
    if (showBollinger) {
      // Fill between bands
      ctx.fillStyle = isDark ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.15)';
      ctx.beginPath();
      let started = false;
      bollinger.upper.forEach((val, i) => {
        if (val !== null) {
          const x = padding.left + i * (candleWidth + candleGap) + candleWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
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

      // Draw upper band
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

      // Draw lower band
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

      // Draw candle wick
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw candle body
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      
      ctx.fillStyle = color;
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Draw volume bar
      const volHeight = (candle.volume / maxVolume) * (volumeHeight - 5);
      const volY = volumeTop + volumeHeight - volHeight;
      ctx.fillStyle = isGreen ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)';
      ctx.fillRect(x, volY, candleWidth, volHeight);
    });

    // Draw MA7 line (yellow)
    ctx.strokeStyle = '#F0B90B';
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

    // Draw MA25 line (purple)
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

    // Draw current price line
    const currentPriceY = priceToY(currentPrice);
    ctx.strokeStyle = '#F0B90B';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(width - padding.right, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw current price label
    ctx.fillStyle = '#F0B90B';
    ctx.fillRect(width - padding.right + 2, currentPriceY - 8, 50, 16);
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentPrice >= 1000 ? currentPrice.toFixed(0) : currentPrice.toFixed(2), width - padding.right + 5, currentPriceY + 4);

    // Draw price labels
    ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
    ctx.font = '9px sans-serif';
    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - (priceRange * i / 4);
      const y = padding.top + (mainChartHeight - padding.top - padding.bottom) * (i / 4);
      ctx.fillText(price >= 1000 ? price.toFixed(0) : price.toFixed(2), width - padding.right + 5, y + 3);
    }

    // Draw "Vol" label
    ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
    ctx.font = '9px sans-serif';
    ctx.fillText('Vol', padding.left, volumeTop + 12);

    // Draw RSI sub-chart
    if (activeIndicator === "rsi" && subChartHeight > 0) {
      const rsiY = (val) => subChartTop + ((100 - val) / 100) * (subChartHeight - 10);
      
      // Draw RSI background levels
      ctx.strokeStyle = isDark ? '#1E2329' : '#e5e7eb';
      ctx.setLineDash([2, 2]);
      [70, 50, 30].forEach(level => {
        ctx.beginPath();
        ctx.moveTo(padding.left, rsiY(level));
        ctx.lineTo(width - padding.right, rsiY(level));
        ctx.stroke();
      });
      ctx.setLineDash([]);
      
      // Draw RSI line
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
      
      // RSI labels
      ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
      ctx.font = '8px sans-serif';
      ctx.fillText('RSI(14)', padding.left, subChartTop + 10);
      ctx.fillText('70', width - padding.right + 5, rsiY(70) + 3);
      ctx.fillText('30', width - padding.right + 5, rsiY(30) + 3);
    }

    // Draw MACD sub-chart
    if (activeIndicator === "macd" && subChartHeight > 0) {
      const validHistogram = macd.histogram.filter(v => v !== null);
      if (validHistogram.length > 0) {
        const maxHist = Math.max(...validHistogram.map(Math.abs));
        const macdY = (val) => subChartTop + subChartHeight / 2 - (val / maxHist) * (subChartHeight / 2 - 10);
        
        // Draw histogram
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
        
        // Draw MACD line
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
        
        // Draw Signal line
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
        
        // MACD labels
        ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
        ctx.font = '8px sans-serif';
        ctx.fillText('MACD', padding.left, subChartTop + 10);
      }
    }

  }, [candles, currentPrice, isDark, ma7, ma25, rsi, macd, bollinger, activeIndicator, showBollinger]);

  return (
    <div className="w-full" style={{ height: height }}>
      {/* Header with indicators */}
      <div className={`flex items-center justify-between px-2 py-1 text-xs ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[#F0B90B]">MA(7)</span>
          <span className="text-[#9B59B6]">MA(25)</span>
          <button 
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${showBollinger ? 'bg-[#2196F3] text-white' : isDark ? 'bg-[#1E2329] text-gray-400' : 'bg-gray-200 text-gray-600'}`}
          >
            BOLL
          </button>
        </div>
        <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Vol: {(totalVolume / 1000000).toFixed(2)}M
        </span>
      </div>

      {/* Timeframe and Indicator buttons */}
      <div className={`flex items-center justify-between px-2 py-1 ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-1">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                timeframe === tf 
                  ? 'bg-[#F0B90B] text-black font-medium' 
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
                  ? 'bg-[#F0B90B] text-black font-medium' 
                  : `${isDark ? 'text-gray-400 bg-[#1E2329]' : 'text-gray-600 bg-gray-200'}`
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart area */}
      <div className="relative" style={{ height: height - 55 }}>
        {loading ? (
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
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        )}
      </div>
    </div>
  );
};

export default CandleChart;
