import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { 
  Vault, 
  ChartLineUp, 
  Wallet, 
  ArrowsLeftRight, 
  ClockCounterClockwise,
  SignOut,
  CaretUp,
  CaretDown,
  ArrowDown,
  ArrowUp,
  MagnifyingGlass,
  Star,
  List,
  Sun,
  Moon,
  Clock,
  Folder,
  Warning
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import BottomNav from "../components/BottomNav";

// Navigation Component with Theme Toggle
const DashboardNav = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors ${isDark ? 'bg-[#0B0E11] border-[#2B3139]' : 'bg-white border-gray-200'}`}>
      <div className="max-w-full mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="trade-logo">
            <img src="/images/tg-logo.png" alt="TG Exchange" className="w-7 h-7 rounded-full" />
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>TG Exchange</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/dashboard" className={`${isDark ? 'text-[#848E9C] hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Dashboard</Link>
            <Link to="/trade" className="text-[#00E5FF]">Trade</Link>
            <Link to="/wallet" className={`${isDark ? 'text-[#848E9C] hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Wallet</Link>
            <Link to="/transactions" className={`${isDark ? 'text-[#848E9C] hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>History</Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${isDark ? 'bg-[#2B3139] hover:bg-[#3B4149] text-[#00E5FF]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            data-testid="theme-toggle"
          >
            {isDark ? <Sun size={20} weight="fill" /> : <Moon size={20} weight="fill" />}
          </button>
          
          <span className={`text-sm ${isDark ? 'text-[#848E9C]' : 'text-gray-600'}`}>{user?.name}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className={`${isDark ? 'text-[#848E9C] hover:text-[#00E5FF]' : 'text-gray-600 hover:text-red-500'} hover:bg-transparent`}
            data-testid="logout-btn"
          >
            <SignOut size={18} />
          </Button>
        </div>
      </div>
    </nav>
  );
};

// Order Book Component
const OrderBook = ({ selectedCoin, currentPrice, isDark }) => {
  const [orders, setOrders] = useState({ asks: [], bids: [] });

  useEffect(() => {
    // Generate realistic order book data
    const generateOrders = () => {
      const price = currentPrice || 69500;
      const asks = [];
      const bids = [];
      
      for (let i = 0; i < 8; i++) {
        const askPrice = price * (1 + (i + 1) * 0.0005);
        const bidPrice = price * (1 - (i + 1) * 0.0005);
        const askAmount = (Math.random() * 2 + 0.1).toFixed(5);
        const bidAmount = (Math.random() * 2 + 0.1).toFixed(5);
        
        asks.push({ price: askPrice, amount: parseFloat(askAmount), total: askPrice * askAmount });
        bids.push({ price: bidPrice, amount: parseFloat(bidAmount), total: bidPrice * bidAmount });
      }
      
      setOrders({ asks: asks.reverse(), bids });
    };
    
    generateOrders();
    const interval = setInterval(generateOrders, 3000);
    return () => clearInterval(interval);
  }, [currentPrice]);

  const maxTotal = Math.max(
    ...orders.asks.map(o => o.amount),
    ...orders.bids.map(o => o.amount)
  );

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const textPrice = isDark ? 'text-[#EAECEF]' : 'text-gray-800';
  const priceBg = isDark ? 'bg-[#1E2329]' : 'bg-gray-100';

  return (
    <div className={`${bg} border ${border} h-full overflow-hidden`}>
      <div className={`p-2 border-b ${border}`}>
        <span className={`text-xs font-medium ${text}`}>Order Book</span>
      </div>
      
      <div className={`px-2 py-1 grid grid-cols-3 text-[10px] ${textMuted} border-b ${border}`}>
        <span>Price</span>
        <span className="text-right">Amt</span>
        <span className="text-right">Total</span>
      </div>
      
      {/* Asks (Sell orders) */}
      <div className="max-h-[120px] lg:max-h-[150px] overflow-hidden">
        {orders.asks.map((order, i) => (
          <div key={`ask-${i}`} className="relative px-2 py-0.5 grid grid-cols-3 text-[10px]">
            <div 
              className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10" 
              style={{ width: `${(order.amount / maxTotal) * 100}%` }}
            />
            <span className="text-[#F6465D] font-mono relative z-10">{order.price.toFixed(1)}</span>
            <span className={`text-right ${textPrice} font-mono relative z-10`}>{order.amount.toFixed(4)}</span>
            <span className={`text-right ${textMuted} font-mono relative z-10`}>{(order.price * order.amount / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
      
      {/* Current Price */}
      <div className={`px-2 py-1 border-y ${border} ${priceBg}`}>
        <span className="text-sm font-bold text-[#0ECB81] font-mono">
          {currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>
      
      {/* Bids (Buy orders) */}
      <div className="max-h-[120px] lg:max-h-[150px] overflow-hidden">
        {orders.bids.map((order, i) => (
          <div key={`bid-${i}`} className="relative px-2 py-0.5 grid grid-cols-3 text-[10px]">
            <div 
              className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10" 
              style={{ width: `${(order.amount / maxTotal) * 100}%` }}
            />
            <span className="text-[#0ECB81] font-mono relative z-10">{order.price.toFixed(1)}</span>
            <span className={`text-right ${textPrice} font-mono relative z-10`}>{order.amount.toFixed(4)}</span>
            <span className={`text-right ${textMuted} font-mono relative z-10`}>{(order.price * order.amount / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Trades Component
const RecentTrades = ({ selectedCoin, currentPrice, isDark }) => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const generateTrades = () => {
      const price = currentPrice || 69500;
      const newTrades = [];
      
      for (let i = 0; i < 15; i++) {
        const isBuy = Math.random() > 0.5;
        const tradePrice = price * (1 + (Math.random() - 0.5) * 0.002);
        const amount = (Math.random() * 0.5 + 0.001).toFixed(5);
        const time = new Date(Date.now() - i * 30000);
        
        newTrades.push({
          price: tradePrice,
          amount: parseFloat(amount),
          time: time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isBuy
        });
      }
      
      setTrades(newTrades);
    };
    
    generateTrades();
    const interval = setInterval(generateTrades, 5000);
    return () => clearInterval(interval);
  }, [currentPrice]);

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const textPrice = isDark ? 'text-[#EAECEF]' : 'text-gray-800';

  return (
    <div className={`${bg} border ${border} h-full overflow-hidden`}>
      <div className={`p-2 border-b ${border}`}>
        <span className={`text-xs font-medium ${text}`}>Recent Trades</span>
      </div>
      
      <div className={`px-2 py-1 grid grid-cols-3 text-[10px] ${textMuted} border-b ${border}`}>
        <span>Price</span>
        <span className="text-right">Amt</span>
        <span className="text-right">Time</span>
      </div>
      
      <div className="max-h-[250px] lg:max-h-[350px] overflow-y-auto">
        {trades.map((trade, i) => (
          <div key={i} className="px-2 py-0.5 grid grid-cols-3 text-[10px]">
            <span className={`font-mono ${trade.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {trade.price.toFixed(1)}
            </span>
            <span className={`text-right ${textPrice} font-mono`}>{trade.amount.toFixed(4)}</span>
            <span className={`text-right ${textMuted} font-mono`}>{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Trading Pairs Sidebar
const TradingPairs = ({ prices, selectedCoin, onSelectCoin, isDark }) => {
  const [search, setSearch] = useState("");
  
  const filteredPrices = prices.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const textPrice = isDark ? 'text-[#EAECEF]' : 'text-gray-800';
  const inputBg = isDark ? 'bg-[#1E2329]' : 'bg-gray-100';
  const hoverBg = isDark ? 'hover:bg-[#1E2329]' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-[#1E2329]' : 'bg-gray-100';

  return (
    <div className={`${bg} border ${border} h-full`}>
      <div className={`p-3 border-b ${border}`}>
        <div className="relative">
          <MagnifyingGlass size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className={`pl-7 py-1 h-8 ${inputBg} ${border} text-xs ${text}`}
          />
        </div>
      </div>
      
      <div className={`px-3 py-2 grid grid-cols-3 text-xs ${textMuted} border-b ${border}`}>
        <span>Pair</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h%</span>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {filteredPrices.map((coin) => (
          <div 
            key={coin.coin_id}
            onClick={() => onSelectCoin(coin.symbol)}
            className={`px-3 py-2 grid grid-cols-3 text-xs cursor-pointer ${hoverBg} ${
              selectedCoin === coin.symbol ? activeBg : ''
            }`}
          >
            <div className="flex items-center gap-1">
              <Star size={12} className={textMuted} />
              <span className={`${text} font-medium`}>{coin.symbol.toUpperCase()}</span>
              <span className={textMuted}>/USDT</span>
            </div>
            <span className={`text-right ${textPrice} font-mono`}>
              {coin.current_price < 1 ? coin.current_price.toFixed(4) : coin.current_price.toLocaleString()}
            </span>
            <span className={`text-right font-mono ${coin.price_change_percentage_24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Candlestick Chart Component (Real Trading Chart with Timeframes)
const CandlestickChart = ({ currentPrice, priceChange, selectedCoin, isDark }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1H');
  const [candleData, setCandleData] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [loading, setLoading] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState(['MA', 'VOL']); // Default: MA and VOL enabled
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // Technical Indicator Calculations
  const calculateMA = (data, period) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
        result.push(sum / period);
      }
    }
    return result;
  };

  const calculateEMA = (data, period) => {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        result.push(ema);
      } else {
        ema = (data[i].close - ema) * multiplier + ema;
        result.push(ema);
      }
    }
    return result;
  };

  const calculateRSI = (data, period = 14) => {
    const result = [];
    let gains = [];
    let losses = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(null);
        continue;
      }

      const change = data[i].close - data[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      gains.push(gain);
      losses.push(loss);

      if (i < period) {
        result.push(null);
      } else {
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) {
          result.push(100);
        } else {
          const rs = avgGain / avgLoss;
          result.push(100 - (100 / (1 + rs)));
        }
      }
    }
    return result;
  };

  const calculateMACD = (data) => {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = ema12.map((v, i) => (v && ema26[i]) ? v - ema26[i] : null);
    
    // Signal line (9-period EMA of MACD)
    const signalData = macdLine.map((v, i) => ({ close: v || 0 }));
    const signalLine = calculateEMA(signalData, 9);
    
    // Histogram
    const histogram = macdLine.map((v, i) => (v && signalLine[i]) ? v - signalLine[i] : null);
    
    return { macdLine, signalLine, histogram };
  };

  // Timeframe to Binance interval mapping
  const timeframeToBinance = {
    '15m': { interval: '15m', limit: 96 },   // 24 hours of 15m candles
    '1H': { interval: '1h', limit: 48 },     // 48 hours of 1H candles
    '4H': { interval: '4h', limit: 42 },     // 7 days of 4H candles
    '1D': { interval: '1d', limit: 30 },     // 30 days of daily candles
    '1W': { interval: '1w', limit: 26 },     // 26 weeks (6 months)
  };

  const coinIdMap = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'bnb': 'binancecoin',
    'xrp': 'ripple',
    'sol': 'solana'
  };

  // Get container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Increase height based on active indicators
        const hasSubChart = activeIndicators.includes('RSI') || activeIndicators.includes('MACD');
        const hasVolume = activeIndicators.includes('VOL');
        
        let height = 280;
        if (hasSubChart && hasVolume) height = 420;
        else if (hasSubChart) height = 350;
        else if (hasVolume) height = 340;
        
        setDimensions({
          width: Math.max(300, rect.width),
          height: height
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [activeIndicators]);

  // Fetch real OHLC data from Binance API (EXACTLY matches real exchanges)
  useEffect(() => {
    const fetchOHLC = async () => {
      setLoading(true);
      try {
        const coinId = coinIdMap[selectedCoin] || 'bitcoin';
        const { interval, limit } = timeframeToBinance[timeframe];
        
        // Use Binance API for exact real-time data
        const response = await axios.get(`${API}/market/binance-klines/${coinId}?interval=${interval}&limit=${limit}`);
        
        if (response.data.candles && response.data.candles.length > 0) {
          let candles = response.data.candles;
          
          // Add time labels
          candles = candles.map(c => ({
            ...c,
            timeLabel: formatTimeLabel(new Date(c.time), timeframe)
          }));
          
          setCandleData(candles);
        }
      } catch (error) {
        console.error('Error fetching OHLC from Binance:', error);
        // Fallback to CoinGecko if Binance fails
        try {
          const coinId = coinIdMap[selectedCoin] || 'bitcoin';
          const days = timeframe === '1W' ? 180 : timeframe === '1D' ? 30 : timeframe === '4H' ? 14 : 1;
          const response = await axios.get(`${API}/market/ohlc/${coinId}?days=${days}`);
          if (response.data.candles) {
            let candles = response.data.candles.slice(-50);
            candles = candles.map(c => ({
              ...c,
              timeLabel: formatTimeLabel(new Date(c.time), timeframe)
            }));
            setCandleData(candles);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOHLC();
    // Refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchOHLC, 30000);
    return () => clearInterval(interval);
  }, [timeframe, selectedCoin]);

  const formatTimeLabel = (date, tf) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (tf === '1W') {
      return `${monthNames[date.getMonth()]} ${day}`;
    } else if (tf === '1D') {
      return `${month}/${day}`;
    }
    return `${hours}:${minutes}`;
  };

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || candleData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);
    
    const width = dimensions.width;
    const height = dimensions.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background - theme aware
    ctx.fillStyle = isDark ? '#0B0E11' : '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Determine chart areas - now includes volume section
    const hasSubChart = activeIndicators.includes('RSI') || activeIndicators.includes('MACD');
    const hasVolume = activeIndicators.includes('VOL');
    
    // Adjust heights based on active indicators
    let mainChartHeight, volumeHeight, subChartHeight, volumeTop, subChartTop;
    
    if (hasSubChart && hasVolume) {
      mainChartHeight = height * 0.50;
      volumeHeight = height * 0.15;
      subChartHeight = height * 0.25;
      volumeTop = mainChartHeight + 5;
      subChartTop = volumeTop + volumeHeight + 5;
    } else if (hasSubChart) {
      mainChartHeight = height * 0.65;
      volumeHeight = 0;
      subChartHeight = height * 0.25;
      subChartTop = mainChartHeight + 10;
    } else if (hasVolume) {
      mainChartHeight = height * 0.70;
      volumeHeight = height * 0.20;
      subChartHeight = 0;
      volumeTop = mainChartHeight + 5;
    } else {
      mainChartHeight = height * 0.85;
      volumeHeight = 0;
      subChartHeight = 0;
    }
    
    // Calculate price range
    const allPrices = candleData.flatMap(c => [c.high, c.low]);
    
    // Include MA values in price range if active
    let ma7Values = [], ma25Values = [];
    if (activeIndicators.includes('MA')) {
      ma7Values = calculateMA(candleData, 7).filter(v => v !== null);
      ma25Values = calculateMA(candleData, 25).filter(v => v !== null);
      allPrices.push(...ma7Values, ...ma25Values);
    }
    
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const pricePadding = (maxPrice - minPrice) * 0.1;
    const adjustedMin = minPrice - pricePadding;
    const adjustedMax = maxPrice + pricePadding;
    const priceRange = adjustedMax - adjustedMin;
    
    const padding = { top: 15, right: 55, bottom: (hasSubChart || hasVolume) ? 5 : 30, left: 5 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = mainChartHeight - padding.top - padding.bottom;
    
    // Draw grid lines
    ctx.strokeStyle = isDark ? '#1E2329' : '#E5E7EB';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Price labels
      const price = adjustedMax - (priceRange / 4) * i;
      ctx.fillStyle = isDark ? '#848E9C' : '#6B7280';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(price < 100 ? 2 : 0), width - padding.right + 3, y + 3);
    }
    
    // Calculate candle dimensions
    const totalCandleSpace = chartWidth;
    const candleWidth = Math.max(3, Math.min(10, (totalCandleSpace / candleData.length) * 0.75));
    const spacing = (totalCandleSpace - candleWidth * candleData.length) / (candleData.length + 1);
    
    // Draw candles
    candleData.forEach((candle, i) => {
      const x = padding.left + spacing + i * (candleWidth + spacing);
      const isGreen = candle.close >= candle.open;
      
      const highY = padding.top + ((adjustedMax - candle.high) / priceRange) * chartHeight;
      const lowY = padding.top + ((adjustedMax - candle.low) / priceRange) * chartHeight;
      const openY = padding.top + ((adjustedMax - candle.open) / priceRange) * chartHeight;
      const closeY = padding.top + ((adjustedMax - candle.close) / priceRange) * chartHeight;
      
      const candleColor = isGreen ? '#0ECB81' : '#F6465D';
      
      // Draw wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();
      
      // Draw body
      ctx.fillStyle = candleColor;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    });
    
    // Draw MA lines if active
    if (activeIndicators.includes('MA')) {
      const ma7 = calculateMA(candleData, 7);
      const ma25 = calculateMA(candleData, 25);
      
      // MA7 - Yellow line
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      candleData.forEach((candle, i) => {
        if (ma7[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = padding.top + ((adjustedMax - ma7[i]) / priceRange) * chartHeight;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      
      // MA25 - Purple line
      ctx.strokeStyle = '#9B59B6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      started = false;
      candleData.forEach((candle, i) => {
        if (ma25[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = padding.top + ((adjustedMax - ma25[i]) / priceRange) * chartHeight;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }
    
    // Draw current price line
    if (currentPrice && currentPrice >= adjustedMin && currentPrice <= adjustedMax) {
      const priceY = padding.top + ((adjustedMax - currentPrice) / priceRange) * chartHeight;
      
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceY);
      ctx.lineTo(width - padding.right, priceY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Price label
      ctx.fillStyle = '#00E5FF';
      ctx.fillRect(width - padding.right, priceY - 8, 53, 16);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(currentPrice.toFixed(currentPrice < 100 ? 2 : 0), width - padding.right + 2, priceY + 3);
    }
    
    // Draw Volume bars if active
    if (hasVolume && volumeHeight > 0) {
      const volumes = candleData.map(c => c.volume || 0);
      const maxVolume = Math.max(...volumes);
      const volChartHeight = volumeHeight - 20;
      
      // Volume background
      ctx.fillStyle = isDark ? '#0B0E11' : '#FFFFFF';
      ctx.fillRect(0, volumeTop, width, volumeHeight);
      
      // Separator line
      ctx.strokeStyle = isDark ? '#2B3139' : '#E5E7EB';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, volumeTop);
      ctx.lineTo(width, volumeTop);
      ctx.stroke();
      
      // Volume label with current volume
      const lastVolume = volumes[volumes.length - 1] || 0;
      ctx.fillStyle = isDark ? '#848E9C' : '#6B7280';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Vol: ${lastVolume.toFixed(2)}`, padding.left, volumeTop + 12);
      
      // Calculate Volume MA(5) and MA(10)
      const volMA5 = [];
      const volMA10 = [];
      for (let i = 0; i < volumes.length; i++) {
        if (i >= 4) {
          const sum5 = volumes.slice(i - 4, i + 1).reduce((a, b) => a + b, 0);
          volMA5.push(sum5 / 5);
        } else {
          volMA5.push(null);
        }
        if (i >= 9) {
          const sum10 = volumes.slice(i - 9, i + 1).reduce((a, b) => a + b, 0);
          volMA10.push(sum10 / 10);
        } else {
          volMA10.push(null);
        }
      }
      
      // Draw volume bars
      candleData.forEach((candle, i) => {
        const x = padding.left + spacing + i * (candleWidth + spacing);
        const isGreen = candle.close >= candle.open;
        const volHeight = maxVolume > 0 ? (volumes[i] / maxVolume) * volChartHeight : 0;
        
        ctx.fillStyle = isGreen ? 'rgba(14, 203, 129, 0.7)' : 'rgba(246, 70, 93, 0.7)';
        ctx.fillRect(x, volumeTop + 15 + volChartHeight - volHeight, candleWidth, volHeight);
      });
      
      // Draw Volume MA(5) line - Yellow
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let maStarted = false;
      candleData.forEach((candle, i) => {
        if (volMA5[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = volumeTop + 15 + volChartHeight - (volMA5[i] / maxVolume) * volChartHeight;
          if (!maStarted) {
            ctx.moveTo(x, y);
            maStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      
      // Draw Volume MA(10) line - Purple/Blue
      ctx.strokeStyle = '#9B59B6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      maStarted = false;
      candleData.forEach((candle, i) => {
        if (volMA10[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = volumeTop + 15 + volChartHeight - (volMA10[i] / maxVolume) * volChartHeight;
          if (!maStarted) {
            ctx.moveTo(x, y);
            maStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      
      // MA labels
      const lastMA5 = volMA5.filter(v => v !== null).pop() || 0;
      const lastMA10 = volMA10.filter(v => v !== null).pop() || 0;
      ctx.font = '8px Arial';
      ctx.fillStyle = '#00E5FF';
      ctx.fillText(`MA(5): ${lastMA5.toFixed(2)}`, padding.left + 60, volumeTop + 12);
      ctx.fillStyle = '#9B59B6';
      ctx.fillText(`MA(10): ${lastMA10.toFixed(2)}`, padding.left + 140, volumeTop + 12);
    }
    
    // Draw RSI if active
    if (activeIndicators.includes('RSI') && hasSubChart) {
      const rsi = calculateRSI(candleData, 14);
      const rsiChartHeight = subChartHeight - 20;
      
      // RSI background
      ctx.fillStyle = isDark ? '#0B0E11' : '#FFFFFF';
      ctx.fillRect(0, subChartTop, width, subChartHeight);
      
      // RSI label
      ctx.fillStyle = isDark ? '#848E9C' : '#6B7280';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('RSI(14)', padding.left, subChartTop + 10);
      
      // RSI lines (30, 70)
      ctx.strokeStyle = isDark ? '#2B3139' : '#E5E7EB';
      ctx.lineWidth = 0.5;
      const rsi70Y = subChartTop + 15 + (1 - 70/100) * rsiChartHeight;
      const rsi30Y = subChartTop + 15 + (1 - 30/100) * rsiChartHeight;
      
      ctx.beginPath();
      ctx.moveTo(padding.left, rsi70Y);
      ctx.lineTo(width - padding.right, rsi70Y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(padding.left, rsi30Y);
      ctx.lineTo(width - padding.right, rsi30Y);
      ctx.stroke();
      
      // RSI labels
      ctx.fillStyle = isDark ? '#848E9C' : '#6B7280';
      ctx.font = '8px Arial';
      ctx.fillText('70', width - padding.right + 3, rsi70Y + 3);
      ctx.fillText('30', width - padding.right + 3, rsi30Y + 3);
      
      // Draw RSI line
      ctx.strokeStyle = '#E91E63';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let rsiStarted = false;
      candleData.forEach((candle, i) => {
        if (rsi[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = subChartTop + 15 + (1 - rsi[i]/100) * rsiChartHeight;
          if (!rsiStarted) {
            ctx.moveTo(x, y);
            rsiStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }
    
    // Draw MACD if active
    if (activeIndicators.includes('MACD') && hasSubChart) {
      const { macdLine, signalLine, histogram } = calculateMACD(candleData);
      const macdChartHeight = subChartHeight - 20;
      
      // Find MACD range
      const allMacd = [...macdLine.filter(v => v !== null), ...signalLine.filter(v => v !== null)];
      const macdMax = Math.max(...allMacd.map(v => Math.abs(v)));
      
      // MACD background
      ctx.fillStyle = isDark ? '#0B0E11' : '#FFFFFF';
      ctx.fillRect(0, subChartTop, width, subChartHeight);
      
      // MACD label
      ctx.fillStyle = isDark ? '#848E9C' : '#6B7280';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('MACD(12,26,9)', padding.left, subChartTop + 10);
      
      // Zero line
      ctx.strokeStyle = isDark ? '#2B3139' : '#E5E7EB';
      ctx.lineWidth = 0.5;
      const zeroY = subChartTop + 15 + macdChartHeight / 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(width - padding.right, zeroY);
      ctx.stroke();
      
      // Draw histogram
      candleData.forEach((candle, i) => {
        if (histogram[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing);
          const barHeight = (histogram[i] / macdMax) * (macdChartHeight / 2);
          ctx.fillStyle = histogram[i] >= 0 ? 'rgba(14, 203, 129, 0.6)' : 'rgba(246, 70, 93, 0.6)';
          if (histogram[i] >= 0) {
            ctx.fillRect(x, zeroY - barHeight, candleWidth, barHeight);
          } else {
            ctx.fillRect(x, zeroY, candleWidth, Math.abs(barHeight));
          }
        }
      });
      
      // Draw MACD line
      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let macdStarted = false;
      candleData.forEach((candle, i) => {
        if (macdLine[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = zeroY - (macdLine[i] / macdMax) * (macdChartHeight / 2);
          if (!macdStarted) {
            ctx.moveTo(x, y);
            macdStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      
      // Draw Signal line
      ctx.strokeStyle = '#E67E22';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let signalStarted = false;
      candleData.forEach((candle, i) => {
        if (signalLine[i] !== null) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          const y = zeroY - (signalLine[i] / macdMax) * (macdChartHeight / 2);
          if (!signalStarted) {
            ctx.moveTo(x, y);
            signalStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }
    
    // Draw time labels at the bottom
    if (!hasSubChart) {
      const labelInterval = Math.ceil(candleData.length / 5);
      ctx.fillStyle = isDark ? '#848E9C' : '#6B7280';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      
      candleData.forEach((candle, i) => {
        if (i % labelInterval === 0) {
          const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
          ctx.fillText(candle.timeLabel, x, height - 8);
        }
      });
    }
    
  }, [candleData, currentPrice, dimensions, isDark, activeIndicators]);

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
  };

  const toggleIndicator = (indicator) => {
    setActiveIndicators(prev => {
      if (prev.includes(indicator)) {
        return prev.filter(i => i !== indicator);
      } else {
        // RSI and MACD are mutually exclusive (only one sub-chart at a time)
        if (indicator === 'RSI' || indicator === 'MACD') {
          return [...prev.filter(i => i !== 'RSI' && i !== 'MACD'), indicator];
        }
        // MA and VOL can be added independently
        return [...prev, indicator];
      }
    });
  };

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const btnBg = isDark ? 'bg-[#0B0E11]/90' : 'bg-white/90';
  const dropdownBg = isDark ? 'bg-[#1E2329]' : 'bg-white';

  return (
    <div className={`${bg} border ${border} overflow-hidden`}>
      {/* Chart Header with Price, Timeframes, and Indicators */}
      <div className={`p-2 border-b ${border} flex flex-wrap items-center justify-between gap-2`}>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${text} font-mono`}>
            {currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-mono ${priceChange >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Timeframe Buttons */}
          <div className="flex gap-1 text-[10px]">
            {['15m', '1H', '4H', '1D', '1W'].map(tf => (
              <button 
                key={tf} 
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2 py-1 rounded ${
                  timeframe === tf 
                    ? 'bg-[#00E5FF] text-black font-bold' 
                    : `${textMuted} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-200'}`
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          {/* Indicator Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className={`px-2 py-1 text-[10px] rounded border ${border} ${textMuted} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-200'}`}
              data-testid="indicator-menu-btn"
            >
              Indicators {activeIndicators.length > 0 && `(${activeIndicators.length})`}
            </button>
            
            {showIndicatorMenu && (
              <div className={`absolute right-0 top-full mt-1 ${dropdownBg} border ${border} rounded-md shadow-lg z-50 min-w-[140px]`}>
                <div className="p-2 space-y-1">
                  <p className={`text-[9px] ${textMuted} mb-2`}>Main Chart</p>
                  <button
                    onClick={() => toggleIndicator('MA')}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded flex items-center justify-between ${
                      activeIndicators.includes('MA') 
                        ? 'bg-[#00E5FF]/20 text-[#00E5FF]' 
                        : `${text} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`
                    }`}
                    data-testid="indicator-ma"
                  >
                    <span>MA (7, 25)</span>
                    {activeIndicators.includes('MA') && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => toggleIndicator('VOL')}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded flex items-center justify-between ${
                      activeIndicators.includes('VOL') 
                        ? 'bg-[#0ECB81]/20 text-[#0ECB81]' 
                        : `${text} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`
                    }`}
                    data-testid="indicator-vol"
                  >
                    <span>VOL (5, 10)</span>
                    {activeIndicators.includes('VOL') && <span>✓</span>}
                  </button>
                  
                  <p className={`text-[9px] ${textMuted} mt-2 mb-2`}>Sub Chart</p>
                  <button
                    onClick={() => toggleIndicator('RSI')}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded flex items-center justify-between ${
                      activeIndicators.includes('RSI') 
                        ? 'bg-[#E91E63]/20 text-[#E91E63]' 
                        : `${text} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`
                    }`}
                    data-testid="indicator-rsi"
                  >
                    <span>RSI (14)</span>
                    {activeIndicators.includes('RSI') && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => toggleIndicator('MACD')}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded flex items-center justify-between ${
                      activeIndicators.includes('MACD') 
                        ? 'bg-[#3498DB]/20 text-[#3498DB]' 
                        : `${text} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`
                    }`}
                    data-testid="indicator-macd"
                  >
                    <span>MACD (12,26,9)</span>
                    {activeIndicators.includes('MACD') && <span>✓</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Indicator Legend */}
      {activeIndicators.length > 0 && (
        <div className={`px-2 py-1 flex flex-wrap gap-3 text-[9px] ${border} border-b`}>
          {activeIndicators.includes('MA') && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#00E5FF]"></span>
                <span className={textMuted}>MA(7)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#9B59B6]"></span>
                <span className={textMuted}>MA(25)</span>
              </span>
            </>
          )}
          {activeIndicators.includes('VOL') && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 bg-[#0ECB81]/70"></span>
                <span className={textMuted}>Vol</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#00E5FF]"></span>
                <span className={textMuted}>MA(5)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#9B59B6]"></span>
                <span className={textMuted}>MA(10)</span>
              </span>
            </>
          )}
          {activeIndicators.includes('RSI') && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#E91E63]"></span>
              <span className={textMuted}>RSI(14)</span>
            </span>
          )}
          {activeIndicators.includes('MACD') && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#3498DB]"></span>
                <span className={textMuted}>MACD</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#E67E22]"></span>
                <span className={textMuted}>Signal</span>
              </span>
            </>
          )}
        </div>
      )}
      
      {/* Chart Canvas */}
      <div ref={containerRef} className="relative w-full" style={{ 
        minHeight: (activeIndicators.includes('RSI') || activeIndicators.includes('MACD')) 
          ? (activeIndicators.includes('VOL') ? '420px' : '350px')
          : (activeIndicators.includes('VOL') ? '340px' : '280px')
      }}>
        {loading && candleData.length === 0 ? (
          <div className={`absolute inset-0 flex items-center justify-center ${textMuted}`}>
            Loading chart...
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full" />
        )}
        <div className={`absolute top-1 left-1 text-[9px] ${textMuted} ${btnBg} px-1 rounded`}>
          {selectedCoin?.toUpperCase()}/USDT • {timeframe === '15m' ? '15 min' : timeframe === '1H' ? '1 hour' : timeframe === '4H' ? '4 hours' : timeframe === '1D' ? '1 day' : '1 week'}
        </div>
      </div>
    </div>
  );
};

// Orders Panel Component (Open Orders, Holdings, Spot Grid, History)
const OrdersPanel = ({ wallet, selectedCoin, prices, isDark }) => {
  const [activeTab, setActiveTab] = useState("open");
  const [trades, setTrades] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';

  // Fetch trade history
  useEffect(() => {
    const fetchTrades = async () => {
      setLoadingTrades(true);
      try {
        const response = await axios.get(`${API}/transactions`, { withCredentials: false });
        const tradeTransactions = response.data.filter(t => t.type === 'buy' || t.type === 'sell');
        setTrades(tradeTransactions);
      } catch (error) {
        console.error("Error fetching trades:", error);
      } finally {
        setLoadingTrades(false);
      }
    };
    fetchTrades();
  }, []);

  // Calculate holdings
  const getHoldings = () => {
    if (!wallet?.balances) return [];
    
    const holdings = [];
    const coinMap = {
      btc: { name: 'Bitcoin', coinId: 'bitcoin' },
      eth: { name: 'Ethereum', coinId: 'ethereum' },
      bnb: { name: 'BNB', coinId: 'binancecoin' },
      xrp: { name: 'XRP', coinId: 'ripple' },
      sol: { name: 'Solana', coinId: 'solana' },
      usdt: { name: 'USDT', coinId: 'tether' }
    };

    Object.entries(wallet.balances).forEach(([coin, amount]) => {
      if (amount > 0) {
        const coinInfo = coinMap[coin] || { name: coin.toUpperCase(), coinId: coin };
        const priceData = prices.find(p => p.coin_id === coinInfo.coinId);
        const currentPrice = coin === 'usdt' ? 1 : (priceData?.current_price || 0);
        const value = amount * currentPrice;
        
        holdings.push({
          coin: coin.toUpperCase(),
          name: coinInfo.name,
          amount,
          price: currentPrice,
          value,
          change: priceData?.price_change_percentage_24h || 0
        });
      }
    });

    return holdings.sort((a, b) => b.value - a.value);
  };

  const holdings = getHoldings();
  const totalHoldings = holdings.length;
  const openOrders = 0; // For now, no open orders (limit orders not implemented)

  const tabs = [
    { id: "open", label: "Open Orders", count: openOrders },
    { id: "holdings", label: "Holdings", count: totalHoldings },
    { id: "spotgrid", label: "Spot Grid", count: null }
  ];

  return (
    <div className={`${bg} border-t ${border}`}>
      {/* Tab Header */}
      <div className={`flex items-center justify-between px-4 border-b ${border}`}>
        <div className="flex items-center gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium relative ${
                activeTab === tab.id ? text : textMuted
              }`}
            >
              {tab.label} {tab.count !== null && `(${tab.count})`}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00E5FF]"></div>
              )}
            </button>
          ))}
        </div>
        
        {/* History Icon - Links to History Page */}
        <Link 
          to="/trade-history"
          className={`p-2 rounded-lg ${textMuted} ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}
          title="Trade History"
        >
          <ClockCounterClockwise size={20} />
        </Link>
      </div>

      {/* Tab Content */}
      <div className="p-4 min-h-[200px]">
        {/* Open Orders Tab */}
        {activeTab === "open" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-[#2B3139]' : 'bg-gray-100'} flex items-center justify-center mb-3`}>
              <Warning size={32} className={textMuted} />
            </div>
            <p className={text}>Available Funds: {wallet?.balances?.usdt?.toFixed(2) || '0.00'} USDT</p>
            <p className={`text-sm ${textMuted} mt-1`}>Transfer funds to your Spot wallet to trade</p>
            <button className={`mt-4 px-6 py-2 rounded-lg border ${border} ${text} font-medium text-sm hover:bg-[#00E5FF]/10`}>
              Increase Balance
            </button>
          </div>
        )}

        {/* Holdings Tab */}
        {activeTab === "holdings" && (
          <div>
            {holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Folder size={48} className={textMuted} />
                <p className={`${textMuted} mt-2`}>No holdings yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className={`grid grid-cols-5 text-xs ${textMuted} pb-2 border-b ${border}`}>
                  <span>Coin</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Value</span>
                  <span className="text-right">24h %</span>
                </div>
                
                {/* Holdings List */}
                {holdings.map((holding, index) => (
                  <div key={index} className={`grid grid-cols-5 text-sm py-2 items-center border-b ${border} border-opacity-50`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${text}`}>{holding.coin}</span>
                    </div>
                    <span className={`text-right font-mono ${text}`}>
                      {holding.amount < 0.0001 ? holding.amount.toFixed(8) : holding.amount.toFixed(4)}
                    </span>
                    <span className={`text-right font-mono ${textMuted}`}>
                      ${holding.price < 1 ? holding.price.toFixed(4) : holding.price.toLocaleString()}
                    </span>
                    <span className={`text-right font-mono ${text}`}>
                      ${holding.value.toFixed(2)}
                    </span>
                    <span className={`text-right font-mono ${holding.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(2)}%
                    </span>
                  </div>
                ))}
                
                {/* Total */}
                <div className={`flex justify-between pt-2 text-sm font-medium ${text}`}>
                  <span>Total Value:</span>
                  <span>${holdings.reduce((sum, h) => sum + h.value, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spot Grid Tab */}
        {activeTab === "spotgrid" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-16 h-16 rounded-full bg-[#00E5FF]/20 flex items-center justify-center mb-3`}>
              <Clock size={32} className="text-[#00E5FF]" />
            </div>
            <p className={`text-lg font-medium ${text}`}>Coming Soon</p>
            <p className={`text-sm ${textMuted} mt-1 text-center`}>Spot Grid trading bot will be available soon</p>
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === "history" && (
          <div>
            {loadingTrades ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <ClockCounterClockwise size={48} className={textMuted} />
                <p className={`${textMuted} mt-2`}>No trade history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className={`grid grid-cols-6 text-xs ${textMuted} pb-2 border-b ${border}`}>
                  <span>Time</span>
                  <span>Type</span>
                  <span>Pair</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Total</span>
                </div>
                
                {/* Trade List */}
                {trades.slice(0, 10).map((trade, index) => (
                  <div key={index} className={`grid grid-cols-6 text-xs py-2 items-center border-b ${border} border-opacity-50`}>
                    <span className={textMuted}>
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </span>
                    <span className={trade.type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                      {trade.type.toUpperCase()}
                    </span>
                    <span className={text}>
                      {trade.coin?.toUpperCase()}/USDT
                    </span>
                    <span className={`text-right font-mono ${text}`}>
                      {trade.amount?.toFixed(4)}
                    </span>
                    <span className={`text-right font-mono ${textMuted}`}>
                      ${trade.price_at_trade?.toFixed(2) || '0.00'}
                    </span>
                    <span className={`text-right font-mono ${text}`}>
                      ${trade.total_usd?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Trade Page
const TradePage = () => {
  const [searchParams] = useSearchParams();
  const initialCoin = searchParams.get('coin') || 'btc';
  const { isDark } = useTheme();
  
  const [selectedCoin, setSelectedCoin] = useState(initialCoin);
  const [orderType, setOrderType] = useState("limit");
  const [tradeType, setTradeType] = useState("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const tradableCoins = [
    { id: "btc", name: "Bitcoin", symbol: "btc", coinId: "bitcoin" },
    { id: "eth", name: "Ethereum", symbol: "eth", coinId: "ethereum" },
    { id: "bnb", name: "BNB", symbol: "bnb", coinId: "binancecoin" },
    { id: "xrp", name: "XRP", symbol: "xrp", coinId: "ripple" },
    { id: "sol", name: "Solana", symbol: "sol", coinId: "solana" },
  ];

  const [realtimePrice, setRealtimePrice] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchChart();
  }, [selectedCoin]);

  useEffect(() => {
    // Set default price when coin changes
    const coinData = prices.find(p => p.symbol === selectedCoin);
    if (coinData) {
      setPrice(coinData.current_price.toString());
    }
  }, [selectedCoin, prices]);

  // Fetch real-time price from OKX (matches exchanges exactly)
  useEffect(() => {
    const fetchRealtimePrice = async () => {
      try {
        const coinData = tradableCoins.find(c => c.id === selectedCoin);
        const response = await axios.get(`${API}/market/realtime-price/${coinData?.coinId || 'bitcoin'}`);
        if (response.data.price) {
          setRealtimePrice(response.data);
        }
      } catch (error) {
        console.error("Error fetching realtime price:", error);
      }
    };

    fetchRealtimePrice();
    // Refresh every 10 seconds for real-time feel
    const interval = setInterval(fetchRealtimePrice, 10000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  const fetchData = async () => {
    try {
      const [walletRes, pricesRes] = await Promise.all([
        axios.get(`${API}/wallet`, { withCredentials: false }),
        axios.get(`${API}/market/prices`)
      ]);
      setWallet(walletRes.data);
      setPrices(pricesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChart = async () => {
    try {
      const coinData = tradableCoins.find(c => c.id === selectedCoin);
      const response = await axios.get(`${API}/market/chart/${coinData?.coinId || 'bitcoin'}?days=1`);
      const formattedData = response.data.prices?.map(([timestamp, price]) => ({
        time: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: price
      })) || [];
      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching chart:", error);
    }
  };

  const getCurrentPrice = () => {
    // Use real-time price from OKX if available
    if (realtimePrice?.price) {
      return realtimePrice.price;
    }
    const coinData = prices.find(p => p.symbol === selectedCoin);
    return coinData?.current_price || 0;
  };

  const getPriceChange = () => {
    const coinData = prices.find(p => p.symbol === selectedCoin);
    return coinData?.price_change_percentage_24h || 0;
  };

  const get24hHigh = () => {
    if (realtimePrice?.high_24h) return realtimePrice.high_24h;
    return getCurrentPrice() * 1.02;
  };

  const get24hLow = () => {
    if (realtimePrice?.low_24h) return realtimePrice.low_24h;
    return getCurrentPrice() * 0.98;
  };

  const calculateTotal = () => {
    const qty = parseFloat(amount) || 0;
    const priceVal = parseFloat(price) || getCurrentPrice();
    return priceVal * qty;
  };

  const handleTrade = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await axios.post(`${API}/trade`, {
        coin: selectedCoin,
        amount: parseFloat(amount),
        trade_type: tradeType
      }, { withCredentials: false });

      const action = tradeType === 'buy' ? 'Bought' : 'Sold';
      toast.success(`${action} ${amount} ${selectedCoin.toUpperCase()} for $${response.data.total_usd.toFixed(2)}`);
      setAmount("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Trade failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getMaxAmount = () => {
    if (!wallet) return 0;
    if (tradeType === 'buy') {
      const priceVal = parseFloat(price) || getCurrentPrice();
      return priceVal > 0 ? (wallet.balances.usdt || 0) / priceVal : 0;
    }
    return wallet.balances[selectedCoin] || 0;
  };

  const setPercentage = (pct) => {
    const max = getMaxAmount();
    setAmount((max * pct / 100).toFixed(6));
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]'}`}>
        <DashboardNav />
        <div className="pt-16 flex items-center justify-center h-screen">
          <p className={isDark ? 'text-white' : 'text-gray-900'}>Loading...</p>
        </div>
      </div>
    );
  }

  const currentCoin = tradableCoins.find(c => c.id === selectedCoin);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#1E2329]' : 'bg-gray-100';

  return (
    <div className={`min-h-screen ${bg}`}>
      <DashboardNav />
      
      <main className="pt-14">
        {/* Trading Pair Header */}
        <div className={`${cardBg} border-b ${border} px-4 py-3`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${text}`}>{selectedCoin.toUpperCase()}/USDT</span>
              <span className={`text-sm ${getPriceChange() >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {getPriceChange() >= 0 ? '+' : ''}{getPriceChange().toFixed(2)}%
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs">
              <div>
                <span className={textMuted}>24h High</span>
                <p className={`${text} font-mono`}>{get24hHigh().toLocaleString()}</p>
              </div>
              <div>
                <span className={textMuted}>24h Low</span>
                <p className={`${text} font-mono`}>{get24hLow().toLocaleString()}</p>
              </div>
              <div>
                <span className={textMuted}>24h Volume</span>
                <p className={`${text} font-mono`}>{realtimePrice?.volume_24h?.toLocaleString() || '12,345.67'} {selectedCoin.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className={`flex flex-col lg:grid lg:grid-cols-12 lg:gap-[1px] ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}>
          {/* Left - Trading Pairs (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-2">
            <TradingPairs 
              prices={prices} 
              selectedCoin={selectedCoin} 
              onSelectCoin={setSelectedCoin}
              isDark={isDark}
            />
          </div>
          
          {/* Center - Chart */}
          <div className="w-full lg:col-span-6 overflow-hidden">
            <CandlestickChart 
              currentPrice={getCurrentPrice()} 
              priceChange={getPriceChange()}
              selectedCoin={selectedCoin}
              isDark={isDark}
            />
            
            {/* Buy/Sell Panel */}
            <div className={`${cardBg} border ${border} p-3 md:p-4`}>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {/* Buy Side */}
                <div className="min-w-0">
                  <div className={`text-xs ${textMuted} flex justify-between mb-2`}>
                    <span>Avbl</span>
                    <span className={`${text} truncate ml-1`}>{wallet?.balances?.usdt?.toFixed(2) || '0.00'} USDT</span>
                  </div>
                  
                  <form onSubmit={(e) => { setTradeType('buy'); handleTrade(e); }}>
                    <div className="space-y-2">
                      {orderType === 'limit' && (
                        <div className="relative">
                          <Input
                            type="number"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="Price"
                            className={`pr-12 text-xs ${inputBg} ${border} text-right font-mono h-9 ${text}`}
                          />
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${textMuted}`}>USDT</span>
                        </div>
                      )}
                      
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Amount"
                          className={`pr-12 text-xs ${inputBg} ${border} text-right font-mono h-9 ${text}`}
                          data-testid="buy-amount-input"
                        />
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${textMuted}`}>{selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => { setTradeType('buy'); setPercentage(pct); }}
                            className={`py-1 text-[10px] ${inputBg} ${textMuted} hover:opacity-80 rounded`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                      
                      <div className="relative">
                        <Input
                          type="text"
                          value={calculateTotal().toFixed(2)}
                          readOnly
                          placeholder="Total"
                          className={`pr-12 text-xs ${inputBg} ${border} text-right font-mono h-9 ${text}`}
                        />
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${textMuted}`}>USDT</span>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={submitting || !amount}
                        className="w-full h-10 bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-semibold text-sm"
                        data-testid="buy-submit-btn"
                      >
                        Buy {selectedCoin.toUpperCase()}
                      </Button>
                    </div>
                  </form>
                </div>
                
                {/* Sell Side */}
                <div className="min-w-0">
                  <div className={`text-xs ${textMuted} flex justify-between mb-2`}>
                    <span>Avbl</span>
                    <span className={`${text} truncate ml-1`}>{wallet?.balances?.[selectedCoin]?.toFixed(4) || '0'} {selectedCoin.toUpperCase()}</span>
                  </div>
                  
                  <form onSubmit={(e) => { setTradeType('sell'); handleTrade(e); }}>
                    <div className="space-y-2">
                      {orderType === 'limit' && (
                        <div className="relative">
                          <Input
                            type="number"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="Price"
                            className={`pr-12 text-xs ${inputBg} ${border} text-right font-mono h-9 ${text}`}
                          />
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${textMuted}`}>USDT</span>
                        </div>
                      )}
                      
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Amount"
                          className={`pr-12 text-xs ${inputBg} ${border} text-right font-mono h-9 ${text}`}
                          data-testid="sell-amount-input"
                        />
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${textMuted}`}>{selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => { setTradeType('sell'); setPercentage(pct); }}
                            className={`py-1 text-[10px] ${inputBg} ${textMuted} hover:opacity-80 rounded`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                      
                      <div className="relative">
                        <Input
                          type="text"
                          value={calculateTotal().toFixed(2)}
                          readOnly
                          placeholder="Total"
                          className={`pr-12 text-xs ${inputBg} ${border} text-right font-mono h-9 ${text}`}
                        />
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${textMuted}`}>USDT</span>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={submitting || !amount}
                        className="w-full h-10 bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-semibold text-sm"
                        data-testid="sell-submit-btn"
                      >
                        Sell {selectedCoin.toUpperCase()}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right - Order Book & Trades (Side by side on mobile, stacked on desktop) */}
          <div className="w-full lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-[1px]">
            <OrderBook selectedCoin={selectedCoin} currentPrice={getCurrentPrice()} isDark={isDark} />
            <RecentTrades selectedCoin={selectedCoin} currentPrice={getCurrentPrice()} isDark={isDark} />
          </div>
        </div>
        
        {/* Orders Panel - Open Orders, Holdings, Spot Grid, History */}
        <OrdersPanel 
          wallet={wallet} 
          selectedCoin={selectedCoin} 
          prices={prices} 
          isDark={isDark} 
        />
        
        {/* Bottom Spacing for Navigation */}
        <div className="h-20"></div>
        
        {/* Bottom Navigation */}
        <BottomNav />
      </main>
    </div>
  );
};

export default TradePage;
