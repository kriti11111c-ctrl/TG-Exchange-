import { useState, useEffect, useMemo } from "react";

// Generate realistic candle data
const generateCandleData = (basePrice, numCandles = 50) => {
  const candles = [];
  let price = basePrice;
  
  for (let i = 0; i < numCandles; i++) {
    const volatility = price * 0.02; // 2% volatility
    const open = price;
    const change = (Math.random() - 0.5) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.random() * 1000000 + 500000;
    
    candles.push({
      time: Date.now() - (numCandles - i) * 60000, // 1 min candles
      open,
      high,
      low,
      close,
      volume
    });
    
    price = close;
  }
  
  return candles;
};

const CandleChart = ({ symbol = "BTC", currentPrice = 68000, isDark = true, height = 200 }) => {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("15m");
  
  const bg = isDark ? '#0B0E11' : '#f9fafb';
  const gridColor = isDark ? '#1E2329' : '#e5e7eb';
  const textColor = isDark ? '#848E9C' : '#6b7280';
  
  useEffect(() => {
    // Generate initial candles
    setCandles(generateCandleData(currentPrice, 50));
    
    // Update candles periodically
    const interval = setInterval(() => {
      setCandles(prev => {
        const newCandles = [...prev];
        const lastCandle = newCandles[newCandles.length - 1];
        const volatility = currentPrice * 0.005;
        
        // Update last candle
        const change = (Math.random() - 0.5) * volatility;
        lastCandle.close = lastCandle.close + change;
        lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
        lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
        
        return newCandles;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentPrice]);

  const timeframes = ["1m", "5m", "15m", "1H", "4H", "1D"];
  
  // Calculate chart dimensions
  const chartWidth = 100; // percentage
  const chartHeight = height - 40; // Leave space for timeframe buttons
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

  return (
    <div className="w-full" style={{ height: height, backgroundColor: bg }}>
      {/* Timeframe buttons */}
      <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
        {timeframes.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2 py-1 text-xs rounded ${
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
          Vol: {(candles[candles.length - 1]?.volume / 1000000).toFixed(2)}M
        </span>
      </div>
      
      {/* Chart area */}
      <div className="relative px-2" style={{ height: chartHeight }}>
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
                  fill={isGreen ? color : color}
                  stroke={color}
                  strokeWidth="0.5"
                />
              </g>
            );
          })}
          
          {/* Current price line */}
          {candles.length > 0 && (
            <>
              <line
                x1="0"
                y1={priceToY(candles[candles.length - 1].close)}
                x2={candles.length * (candleWidth + candleGap)}
                y2={priceToY(candles[candles.length - 1].close)}
                stroke="#F0B90B"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
            </>
          )}
        </svg>
        
        {/* Current price label */}
        {candles.length > 0 && (
          <div 
            className="absolute right-12 px-1 py-0.5 bg-[#F0B90B] text-black text-[10px] font-medium rounded"
            style={{ top: priceToY(candles[candles.length - 1].close) - 8 }}
          >
            {formatPrice(candles[candles.length - 1].close)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandleChart;
