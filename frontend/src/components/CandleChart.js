import { useState, useEffect, useMemo, useRef } from "react";

// Coin ID mapping for API
const COIN_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  LTC: "litecoin"
};

// Generate realistic historical candle data
const generateHistoricalCandles = (currentPrice, numCandles = 60, volatilityPercent = 3) => {
  const candles = [];
  let price = currentPrice * (1 - volatilityPercent/100 * numCandles * 0.15);
  
  for (let i = 0; i < numCandles; i++) {
    const volatility = price * (volatilityPercent / 100);
    const trend = (currentPrice - price) / (numCandles - i) * 0.3;
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

const CandleChart = ({ symbol = "BTC", currentPrice = 68000, isDark = true, height = 280 }) => {
  const canvasRef = useRef(null);
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("15m");
  const [loading, setLoading] = useState(true);
  const [initialPrice, setInitialPrice] = useState(null);
  
  const timeframes = ["15s", "30s", "1m", "15m", "30m"];

  // Initialize candles
  useEffect(() => {
    if (currentPrice > 0 && !initialPrice) {
      setInitialPrice(currentPrice);
      const newCandles = generateHistoricalCandles(currentPrice, 60, 3);
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
      const newCandles = generateHistoricalCandles(currentPrice, 60, volatility);
      setCandles(newCandles);
    }
  };

  // Reset on symbol change
  useEffect(() => {
    setInitialPrice(null);
    setLoading(true);
  }, [symbol]);

  // Calculate MAs
  const ma7 = useMemo(() => calculateMA(candles, 7), [candles]);
  const ma25 = useMemo(() => calculateMA(candles, 25), [candles]);

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
    
    // Set canvas size
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
    const padding = { top: 10, right: 50, bottom: 25, left: 5 };
    const mainChartHeight = chartHeight * 0.75;
    const volumeHeight = chartHeight * 0.2;
    const volumeTop = mainChartHeight + 5;

    // Calculate price range
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const maxPrice = Math.max(...highs) * 1.002;
    const minPrice = Math.min(...lows) * 0.998;
    const priceRange = maxPrice - minPrice;

    // Calculate volume range
    const maxVolume = Math.max(...candles.map(c => c.volume));

    // Candle dimensions
    const candleAreaWidth = width - padding.left - padding.right;
    const candleWidth = Math.max(4, (candleAreaWidth / candles.length) * 0.7);
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
      ctx.fillStyle = isGreen ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)';
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
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
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
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
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
    ctx.fillRect(width - padding.right + 2, currentPriceY - 8, 46, 16);
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentPrice >= 1000 ? currentPrice.toFixed(0) : currentPrice.toFixed(2), width - padding.right + 4, currentPriceY + 4);

    // Draw price labels on right
    ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - (priceRange * i / 4);
      const y = padding.top + (mainChartHeight - padding.top - padding.bottom) * (i / 4);
      ctx.fillText(price >= 1000 ? price.toFixed(0) : price.toFixed(2), width - padding.right + 4, y + 3);
    }

    // Draw "Vol" label
    ctx.fillStyle = isDark ? '#848E9C' : '#6b7280';
    ctx.font = '9px sans-serif';
    ctx.fillText('Vol', padding.left, volumeTop + 10);

  }, [candles, currentPrice, isDark, ma7, ma25]);

  // Format price
  const formatPrice = (price) => {
    if (price >= 1000) return price.toFixed(0);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(6);
  };

  return (
    <div className="w-full" style={{ height: height }}>
      {/* Header with MA indicators */}
      <div className={`flex items-center justify-between px-2 py-1 text-xs ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <span className="text-[#F0B90B]">MA(7)</span>
          <span className="text-[#9B59B6]">MA(25)</span>
          <span className={isDark ? 'text-[#0ECB81]' : 'text-green-600'}>Vol</span>
        </div>
        <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Vol: {(totalVolume / 1000000).toFixed(2)}M
        </span>
      </div>

      {/* Timeframe buttons */}
      <div className={`flex items-center gap-1 px-2 py-1 ${isDark ? 'bg-[#0B0E11]' : 'bg-gray-50'}`}>
        {timeframes.map(tf => (
          <button
            key={tf}
            onClick={() => handleTimeframeChange(tf)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              timeframe === tf 
                ? 'bg-[#F0B90B] text-black font-medium' 
                : `${isDark ? 'text-gray-400 hover:text-white bg-[#1E2329]' : 'text-gray-600 hover:text-black bg-gray-200'}`
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
      
      {/* Chart area */}
      <div className="relative" style={{ height: height - 60 }}>
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
