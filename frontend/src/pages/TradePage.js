import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, API } from "../App";
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
  List
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// Navigation Component
const DashboardNav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0E11] border-b border-[#2B3139]">
      <div className="max-w-full mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="trade-logo">
            <Vault size={28} weight="duotone" className="text-[#F0B90B]" />
            <span className="font-bold text-lg text-white">CryptoVault</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-[#848E9C] hover:text-white">Dashboard</Link>
            <Link to="/trade" className="text-[#F0B90B]">Trade</Link>
            <Link to="/wallet" className="text-[#848E9C] hover:text-white">Wallet</Link>
            <Link to="/transactions" className="text-[#848E9C] hover:text-white">History</Link>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#848E9C]">{user?.name}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="text-[#848E9C] hover:text-[#F0B90B] hover:bg-transparent"
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
const OrderBook = ({ selectedCoin, currentPrice }) => {
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

  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] h-full overflow-hidden">
      <div className="p-2 border-b border-[#2B3139]">
        <span className="text-xs font-medium text-white">Order Book</span>
      </div>
      
      <div className="px-2 py-1 grid grid-cols-3 text-[10px] text-[#848E9C] border-b border-[#2B3139]">
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
            <span className="text-right text-[#EAECEF] font-mono relative z-10">{order.amount.toFixed(4)}</span>
            <span className="text-right text-[#848E9C] font-mono relative z-10">{(order.price * order.amount / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
      
      {/* Current Price */}
      <div className="px-2 py-1 border-y border-[#2B3139] bg-[#1E2329]">
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
            <span className="text-right text-[#EAECEF] font-mono relative z-10">{order.amount.toFixed(4)}</span>
            <span className="text-right text-[#848E9C] font-mono relative z-10">{(order.price * order.amount / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Trades Component
const RecentTrades = ({ selectedCoin, currentPrice }) => {
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

  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] h-full overflow-hidden">
      <div className="p-2 border-b border-[#2B3139]">
        <span className="text-xs font-medium text-white">Recent Trades</span>
      </div>
      
      <div className="px-2 py-1 grid grid-cols-3 text-[10px] text-[#848E9C] border-b border-[#2B3139]">
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
            <span className="text-right text-[#EAECEF] font-mono">{trade.amount.toFixed(4)}</span>
            <span className="text-right text-[#848E9C] font-mono">{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Trading Pairs Sidebar
const TradingPairs = ({ prices, selectedCoin, onSelectCoin }) => {
  const [search, setSearch] = useState("");
  
  const filteredPrices = prices.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] h-full">
      <div className="p-3 border-b border-[#2B3139]">
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#848E9C]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-7 py-1 h-8 bg-[#1E2329] border-[#2B3139] text-xs"
          />
        </div>
      </div>
      
      <div className="px-3 py-2 grid grid-cols-3 text-xs text-[#848E9C] border-b border-[#2B3139]">
        <span>Pair</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h%</span>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {filteredPrices.map((coin) => (
          <div 
            key={coin.coin_id}
            onClick={() => onSelectCoin(coin.symbol)}
            className={`px-3 py-2 grid grid-cols-3 text-xs cursor-pointer hover:bg-[#1E2329] ${
              selectedCoin === coin.symbol ? 'bg-[#1E2329]' : ''
            }`}
          >
            <div className="flex items-center gap-1">
              <Star size={12} className="text-[#848E9C]" />
              <span className="text-white font-medium">{coin.symbol.toUpperCase()}</span>
              <span className="text-[#848E9C]">/USDT</span>
            </div>
            <span className="text-right text-[#EAECEF] font-mono">
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
const CandlestickChart = ({ currentPrice, priceChange, selectedCoin }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1H');
  const [candleData, setCandleData] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 250 });
  const [loading, setLoading] = useState(true);

  // Timeframe to CoinGecko days mapping
  // CoinGecko OHLC granularity:
  // 1-2 days: 30 min candles
  // 3-30 days: 4 hour candles  
  // 31+ days: daily candles
  const timeframeToDays = {
    '15m': 1,   // 30min candles, take every candle
    '1H': 1,    // 30min candles, aggregate 2 for 1H
    '4H': 14,   // 4H candles directly
    '1D': 30,   // 30 days = 4H candles, aggregate to daily
    '1W': 180,  // 180 days = daily candles, aggregate to weekly
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
        setDimensions({
          width: Math.max(300, rect.width),
          height: 250
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch real OHLC data from CoinGecko
  useEffect(() => {
    const fetchOHLC = async () => {
      setLoading(true);
      try {
        const coinId = coinIdMap[selectedCoin] || 'bitcoin';
        const days = timeframeToDays[timeframe];
        
        const response = await axios.get(`${API}/market/ohlc/${coinId}?days=${days}`);
        
        if (response.data.candles && response.data.candles.length > 0) {
          let candles = response.data.candles;
          
          // Process based on timeframe
          if (timeframe === '15m') {
            // Take last 48 candles (30min each = 24 hours)
            candles = candles.slice(-48);
          } else if (timeframe === '1H') {
            // Aggregate every 2 candles for 1H (since CoinGecko gives 30min for 1 day)
            const aggregated = [];
            for (let i = 0; i < candles.length; i += 2) {
              if (i + 1 < candles.length) {
                aggregated.push({
                  time: candles[i].time,
                  open: candles[i].open,
                  high: Math.max(candles[i].high, candles[i + 1].high),
                  low: Math.min(candles[i].low, candles[i + 1].low),
                  close: candles[i + 1].close
                });
              } else {
                aggregated.push(candles[i]);
              }
            }
            candles = aggregated.slice(-24);
          } else if (timeframe === '4H') {
            // 4H candles - take last 42 (7 days worth)
            candles = candles.slice(-42);
          } else if (timeframe === '1D') {
            // For 90 days, CoinGecko gives 4H candles
            // Aggregate every 6 candles for daily
            const aggregated = [];
            for (let i = 0; i < candles.length; i += 6) {
              const chunk = candles.slice(i, Math.min(i + 6, candles.length));
              if (chunk.length >= 4) {
                aggregated.push({
                  time: chunk[0].time,
                  open: chunk[0].open,
                  high: Math.max(...chunk.map(c => c.high)),
                  low: Math.min(...chunk.map(c => c.low)),
                  close: chunk[chunk.length - 1].close
                });
              }
            }
            candles = aggregated.slice(-30); // Last 30 days
          } else if (timeframe === '1W') {
            // For 365 days, aggregate to weekly
            const aggregated = [];
            for (let i = 0; i < candles.length; i += 7) {
              const chunk = candles.slice(i, Math.min(i + 7, candles.length));
              if (chunk.length >= 3) {
                aggregated.push({
                  time: chunk[0].time,
                  open: chunk[0].open,
                  high: Math.max(...chunk.map(c => c.high)),
                  low: Math.min(...chunk.map(c => c.low)),
                  close: chunk[chunk.length - 1].close
                });
              }
            }
            candles = aggregated.slice(-20); // Last 20 weeks
          }
          
          // Add time labels
          candles = candles.map(c => ({
            ...c,
            timeLabel: formatTimeLabel(new Date(c.time), timeframe)
          }));
          
          setCandleData(candles);
        }
      } catch (error) {
        console.error('Error fetching OHLC:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOHLC();
    // Refresh every 2 minutes
    const interval = setInterval(fetchOHLC, 120000);
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
    
    // Background
    ctx.fillStyle = '#0B0E11';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate price range
    const allPrices = candleData.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const pricePadding = (maxPrice - minPrice) * 0.1;
    const adjustedMin = minPrice - pricePadding;
    const adjustedMax = maxPrice + pricePadding;
    const priceRange = adjustedMax - adjustedMin;
    
    const padding = { top: 15, right: 55, bottom: 30, left: 5 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Draw grid lines
    ctx.strokeStyle = '#1E2329';
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
      ctx.fillStyle = '#848E9C';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(price < 100 ? 2 : 0), width - padding.right + 3, y + 3);
    }
    
    // Calculate candle dimensions
    const totalCandleSpace = chartWidth;
    const candleWidth = Math.max(3, Math.min(10, (totalCandleSpace / candleData.length) * 0.75));
    const spacing = (totalCandleSpace - candleWidth * candleData.length) / (candleData.length + 1);
    
    // Draw time labels
    const labelInterval = Math.ceil(candleData.length / 5);
    ctx.fillStyle = '#848E9C';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    
    candleData.forEach((candle, i) => {
      if (i % labelInterval === 0) {
        const x = padding.left + spacing + i * (candleWidth + spacing) + candleWidth / 2;
        ctx.fillText(candle.timeLabel, x, height - 8);
      }
    });
    
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
    
    // Draw current price line
    if (currentPrice && currentPrice >= adjustedMin && currentPrice <= adjustedMax) {
      const priceY = padding.top + ((adjustedMax - currentPrice) / priceRange) * chartHeight;
      
      ctx.strokeStyle = '#F0B90B';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceY);
      ctx.lineTo(width - padding.right, priceY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Price label
      ctx.fillStyle = '#F0B90B';
      ctx.fillRect(width - padding.right, priceY - 8, 53, 16);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(currentPrice.toFixed(currentPrice < 100 ? 2 : 0), width - padding.right + 2, priceY + 3);
    }
    
    // Draw volume bars
    const volumes = candleData.map((c, i) => {
      const prevClose = i > 0 ? candleData[i-1].close : c.open;
      return Math.abs(c.close - prevClose) * 100000;
    });
    const maxVolume = Math.max(...volumes);
    const volumeHeight = 25;
    const volumeTop = height - padding.bottom - volumeHeight - 3;
    
    candleData.forEach((candle, i) => {
      const x = padding.left + spacing + i * (candleWidth + spacing);
      const isGreen = candle.close >= candle.open;
      const volHeight = (volumes[i] / maxVolume) * volumeHeight;
      
      ctx.fillStyle = isGreen ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)';
      ctx.fillRect(x, volumeTop + volumeHeight - volHeight, candleWidth, volHeight);
    });
    
  }, [candleData, currentPrice, dimensions]);

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
  };

  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] overflow-hidden">
      <div className="p-2 border-b border-[#2B3139] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white font-mono">
            {currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-mono ${priceChange >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-1 text-[10px]">
          {['15m', '1H', '4H', '1D', '1W'].map(tf => (
            <button 
              key={tf} 
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 py-1 rounded ${
                timeframe === tf 
                  ? 'bg-[#F0B90B] text-black font-bold' 
                  : 'text-[#848E9C] hover:bg-[#2B3139]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="relative w-full" style={{ minHeight: '250px' }}>
        {loading && candleData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[#848E9C]">
            Loading chart...
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full" />
        )}
        <div className="absolute top-1 left-1 text-[9px] text-[#848E9C] bg-[#0B0E11]/90 px-1 rounded">
          {selectedCoin?.toUpperCase()}/USDT • {timeframe === '15m' ? '15 min' : timeframe === '1H' ? '1 hour' : timeframe === '4H' ? '4 hours' : timeframe === '1D' ? '1 day' : '1 week'}
        </div>
      </div>
    </div>
  );
};

// Main Trade Page
const TradePage = () => {
  const [searchParams] = useSearchParams();
  const initialCoin = searchParams.get('coin') || 'btc';
  
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

  const fetchData = async () => {
    try {
      const [walletRes, pricesRes] = await Promise.all([
        axios.get(`${API}/wallet`, { withCredentials: true }),
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
    const coinData = prices.find(p => p.symbol === selectedCoin);
    return coinData?.current_price || 0;
  };

  const getPriceChange = () => {
    const coinData = prices.find(p => p.symbol === selectedCoin);
    return coinData?.price_change_percentage_24h || 0;
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
      }, { withCredentials: true });

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
      <div className="min-h-screen bg-[#0B0E11]">
        <DashboardNav />
        <div className="pt-16 flex items-center justify-center h-screen">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  const currentCoin = tradableCoins.find(c => c.id === selectedCoin);

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      <DashboardNav />
      
      <main className="pt-12">
        {/* Trading Pair Header */}
        <div className="bg-[#0B0E11] border-b border-[#2B3139] px-4 py-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{selectedCoin.toUpperCase()}/USDT</span>
              <span className={`text-sm ${getPriceChange() >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {getPriceChange() >= 0 ? '+' : ''}{getPriceChange().toFixed(2)}%
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs">
              <div>
                <span className="text-[#848E9C]">24h High</span>
                <p className="text-white font-mono">{(getCurrentPrice() * 1.02).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#848E9C]">24h Low</span>
                <p className="text-white font-mono">{(getCurrentPrice() * 0.98).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#848E9C]">24h Volume</span>
                <p className="text-white font-mono">12,345.67 {selectedCoin.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-[1px] bg-[#2B3139]">
          {/* Left - Trading Pairs (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-2">
            <TradingPairs 
              prices={prices} 
              selectedCoin={selectedCoin} 
              onSelectCoin={setSelectedCoin}
            />
          </div>
          
          {/* Center - Chart */}
          <div className="w-full lg:col-span-6 overflow-hidden">
            <CandlestickChart 
              currentPrice={getCurrentPrice()} 
              priceChange={getPriceChange()}
              selectedCoin={selectedCoin}
            />
            
            {/* Buy/Sell Panel */}
            <div className="bg-[#0B0E11] border border-[#2B3139] p-3 md:p-4">
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {/* Buy Side */}
                <div className="min-w-0">
                  <div className="text-xs text-[#848E9C] flex justify-between mb-2">
                    <span>Avbl</span>
                    <span className="text-white truncate ml-1">{wallet?.balances?.usdt?.toFixed(2) || '0.00'} USDT</span>
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
                            className="pr-12 text-xs bg-[#1E2329] border-[#2B3139] text-right font-mono h-9"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848E9C]">USDT</span>
                        </div>
                      )}
                      
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Amount"
                          className="pr-12 text-xs bg-[#1E2329] border-[#2B3139] text-right font-mono h-9"
                          data-testid="buy-amount-input"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848E9C]">{selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => { setTradeType('buy'); setPercentage(pct); }}
                            className="py-1 text-[10px] bg-[#1E2329] text-[#848E9C] hover:bg-[#2B3139] rounded"
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
                          className="pr-12 text-xs bg-[#1E2329] border-[#2B3139] text-right font-mono h-9"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848E9C]">USDT</span>
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
                  <div className="text-xs text-[#848E9C] flex justify-between mb-2">
                    <span>Avbl</span>
                    <span className="text-white truncate ml-1">{wallet?.balances?.[selectedCoin]?.toFixed(4) || '0'} {selectedCoin.toUpperCase()}</span>
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
                            className="pr-12 text-xs bg-[#1E2329] border-[#2B3139] text-right font-mono h-9"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848E9C]">USDT</span>
                        </div>
                      )}
                      
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Amount"
                          className="pr-12 text-xs bg-[#1E2329] border-[#2B3139] text-right font-mono h-9"
                          data-testid="sell-amount-input"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848E9C]">{selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => { setTradeType('sell'); setPercentage(pct); }}
                            className="py-1 text-[10px] bg-[#1E2329] text-[#848E9C] hover:bg-[#2B3139] rounded"
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
                          className="pr-12 text-xs bg-[#1E2329] border-[#2B3139] text-right font-mono h-9"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848E9C]">USDT</span>
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
            <OrderBook selectedCoin={selectedCoin} currentPrice={getCurrentPrice()} />
            <RecentTrades selectedCoin={selectedCoin} currentPrice={getCurrentPrice()} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TradePage;
