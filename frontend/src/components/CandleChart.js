import { useState, useEffect, useMemo, useCallback } from "react";

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
  LTC: "litecoin",
  SHIB: "shiba-inu",
  TRX: "tron",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap"
};

// Generate realistic historical candle data based on current price
const generateHistoricalCandles = (currentPrice, numCandles = 50, volatilityPercent = 2) => {
  const candles = [];
  let price = currentPrice * (1 - volatilityPercent/100 * numCandles * 0.3); // Start lower to create uptrend
  
  for (let i = 0; i < numCandles; i++) {
    const volatility = price * (volatilityPercent / 100);
    const trend = (currentPrice - price) / (numCandles - i) * 0.5; // Gentle trend towards current price
    const open = price;
    const change = trend + (Math.random() - 0.5) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
    const volume = Math.random() * 1000000 + 500000;
    
    candles.push({
      time: Date.now() - (numCandles - i) * 900000, // 15 min candles
      open,
      high,
      low,
      close,
      volume
    });
    
    price = close;
  }
  
  // Ensure last candle ends at current price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = currentPrice;
    last.high = Math.max(last.high, currentPrice);
    last.low = Math.min(last.low, currentPrice);
  }
  
  return candles;
};

const CandleChart = ({ symbol = "BTC", currentPrice = 68000, isDark = true, height = 200 }) => {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("1m");
  const [loading, setLoading] = useState(true);
  const [initialPrice, setInitialPrice] = useState(null);
  
  const bg = isDark ? '#0B0E11' : '#f9fafb';
  const gridColor = isDark ? '#1E2329' : '#e5e7eb';
  const textColor = isDark ? '#848E9C' : '#6b7280';

  // Initialize candles when we get the first valid price
  useEffect(() => {
    if (currentPrice > 0 && !initialPrice) {
      setInitialPrice(currentPrice);
      const newCandles = generateHistoricalCandles(currentPrice, 50, 2);
      setCandles(newCandles);
      setLoading(false);
    }
  }, [currentPrice, initialPrice]);

  // Update last candle with current price (for real-time effect)
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

  // Handle timeframe change - regenerate candles
  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    if (currentPrice > 0) {
      // Different volatility for different timeframes
      const volatility = tf === "30m" ? 3 : tf === "15m" ? 2.5 : tf === "1m" ? 2 : 1.5;
      const newCandles = generateHistoricalCandles(currentPrice, 50, volatility);
      setCandles(newCandles);
    }
  };

  // Handle symbol change - reset candles
  useEffect(() => {
    setInitialPrice(null);
    setLoading(true);
  }, [symbol]);

  const timeframes = ["15s", "30s", "1m", "15m", "30m"];
  
  // Calculate chart dimensions
  const chartHeight = height - 40;
  const candleWidth = 6;
  const candleGap = 3;
  
  // Calculate price range
  const priceRange = useMemo(() => {
    if (candles.length === 0) return { min: 0, max: 0 };
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const max = Math.max(...highs);
    const min = Math.min(...lows);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [candles]);

  // Convert price to Y coordinate
  const priceToY = (price) => {
    const range = priceRange.max - priceRange.min;
    if (range === 0) return chartHeight / 2;
    return chartHeight - ((price - priceRange.min) / range) * chartHeight;
  };

  // Format price for display
  const formatPrice = (price) => {
    if (price >= 1000) return price.toFixed(0);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(6);
  };

  // Calculate volume
  const totalVolume = useMemo(() => {
    if (candles.length === 0) return 0;
    return candles.reduce((sum, c) => sum + c.volume, 0);
  }, [candles]);

  return (
    <div className="w-full" style={{ height: height, backgroundColor: bg }}>
      {/* Timeframe buttons */}
      <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
        {timeframes.map(tf => (
          <button
            key={tf}
            onClick={() => handleTimeframeChange(tf)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              timeframe === tf 
                ? 'bg-[#F0B90B] text-black font-medium' 
                : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`
            }`}
          >
            {tf}
          </button>
        ))}
        <div className="flex-1" />
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Vol: {(totalVolume / 1000000).toFixed(2)}M
        </span>
      </div>
      
      {/* Chart area */}
      <div className="relative px-2" style={{ height: chartHeight }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
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
        )}
        
        {!loading && candles.length > 0 && (
          <>
            {/* Price labels on right */}
            <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col justify-between text-right pr-1" style={{ fontSize: 9, color: textColor }}>
              <span>{formatPrice(priceRange.max)}</span>
              <span>{formatPrice((priceRange.max + priceRange.min) / 2)}</span>
              <span>{formatPrice(priceRange.min)}</span>
            </div>
            
            {/* Candles */}
            <svg 
              className="w-full h-full" 
              viewBox={`0 0 ${candles.length * (candleWidth + candleGap)} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={chartHeight * pct}
                  x2={candles.length * (candleWidth + candleGap)}
                  y2={chartHeight * pct}
                  stroke={gridColor}
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              ))}
              
              {/* Candles */}
              {candles.map((candle, i) => {
                const x = i * (candleWidth + candleGap);
                const isGreen = candle.close >= candle.open;
                const color = isGreen ? '#0ECB81' : '#F6465D';
                
                const bodyTop = priceToY(Math.max(candle.open, candle.close));
                const bodyBottom = priceToY(Math.min(candle.open, candle.close));
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);
                
                const wickTop = priceToY(candle.high);
                const wickBottom = priceToY(candle.low);
                
                return (
                  <g key={i}>
                    {/* Wick */}
                    <line
                      x1={x + candleWidth / 2}
                      y1={wickTop}
                      x2={x + candleWidth / 2}
                      y2={wickBottom}
                      stroke={color}
                      strokeWidth="1"
                    />
                    {/* Body */}
                    <rect
                      x={x}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={color}
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
              
              {/* Current price line */}
              <line
                x1="0"
                y1={priceToY(candles[candles.length - 1].close)}
                x2={candles.length * (candleWidth + candleGap)}
                y2={priceToY(candles[candles.length - 1].close)}
                stroke="#F0B90B"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
            </svg>
            
            {/* Current price label */}
            <div 
              className="absolute right-12 px-1 py-0.5 bg-[#F0B90B] text-black text-[10px] font-medium rounded"
              style={{ top: Math.max(0, Math.min(chartHeight - 16, priceToY(candles[candles.length - 1].close) - 8)) }}
            >
              {formatPrice(candles[candles.length - 1].close)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CandleChart;
