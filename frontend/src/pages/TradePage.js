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
      
      for (let i = 0; i < 12; i++) {
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
    <div className="bg-[#0B0E11] border border-[#2B3139] h-full">
      <div className="p-3 border-b border-[#2B3139] flex items-center justify-between">
        <span className="text-sm font-medium text-white">Order Book</span>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-[#2B3139] rounded">
            <List size={14} className="text-[#848E9C]" />
          </button>
        </div>
      </div>
      
      <div className="px-3 py-2 grid grid-cols-3 text-xs text-[#848E9C] border-b border-[#2B3139]">
        <span>Price(USDT)</span>
        <span className="text-right">Amount({selectedCoin?.toUpperCase()})</span>
        <span className="text-right">Total</span>
      </div>
      
      {/* Asks (Sell orders) */}
      <div className="max-h-[200px] overflow-hidden">
        {orders.asks.map((order, i) => (
          <div key={`ask-${i}`} className="relative px-3 py-1 grid grid-cols-3 text-xs hover:bg-[#1E2329]">
            <div 
              className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10" 
              style={{ width: `${(order.amount / maxTotal) * 100}%` }}
            />
            <span className="text-[#F6465D] font-mono relative z-10">{order.price.toFixed(2)}</span>
            <span className="text-right text-[#EAECEF] font-mono relative z-10">{order.amount.toFixed(5)}</span>
            <span className="text-right text-[#848E9C] font-mono relative z-10">{(order.price * order.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      {/* Current Price */}
      <div className="px-3 py-2 border-y border-[#2B3139] bg-[#1E2329]">
        <span className="text-lg font-bold text-[#0ECB81] font-mono">
          {currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-[#848E9C] ml-2">≈ ${currentPrice?.toLocaleString()}</span>
      </div>
      
      {/* Bids (Buy orders) */}
      <div className="max-h-[200px] overflow-hidden">
        {orders.bids.map((order, i) => (
          <div key={`bid-${i}`} className="relative px-3 py-1 grid grid-cols-3 text-xs hover:bg-[#1E2329]">
            <div 
              className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10" 
              style={{ width: `${(order.amount / maxTotal) * 100}%` }}
            />
            <span className="text-[#0ECB81] font-mono relative z-10">{order.price.toFixed(2)}</span>
            <span className="text-right text-[#EAECEF] font-mono relative z-10">{order.amount.toFixed(5)}</span>
            <span className="text-right text-[#848E9C] font-mono relative z-10">{(order.price * order.amount).toFixed(2)}</span>
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
      
      for (let i = 0; i < 20; i++) {
        const isBuy = Math.random() > 0.5;
        const tradePrice = price * (1 + (Math.random() - 0.5) * 0.002);
        const amount = (Math.random() * 0.5 + 0.001).toFixed(5);
        const time = new Date(Date.now() - i * 30000);
        
        newTrades.push({
          price: tradePrice,
          amount: parseFloat(amount),
          time: time.toLocaleTimeString('en-US', { hour12: false }),
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
    <div className="bg-[#0B0E11] border border-[#2B3139] h-full">
      <div className="p-3 border-b border-[#2B3139]">
        <span className="text-sm font-medium text-white">Recent Trades</span>
      </div>
      
      <div className="px-3 py-2 grid grid-cols-3 text-xs text-[#848E9C] border-b border-[#2B3139]">
        <span>Price(USDT)</span>
        <span className="text-right">Amount({selectedCoin?.toUpperCase()})</span>
        <span className="text-right">Time</span>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {trades.map((trade, i) => (
          <div key={i} className="px-3 py-1 grid grid-cols-3 text-xs hover:bg-[#1E2329]">
            <span className={`font-mono ${trade.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {trade.price.toFixed(2)}
            </span>
            <span className="text-right text-[#EAECEF] font-mono">{trade.amount.toFixed(5)}</span>
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

// Price Chart Component (Simplified candlestick-like)
const PriceChart = ({ chartData, currentPrice, priceChange }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !chartData.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = '#0B0E11';
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = '#2B3139';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    if (chartData.length < 2) return;
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Draw area
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    chartData.forEach((point, i) => {
      const x = padding + (i / (chartData.length - 1)) * chartWidth;
      const y = height - padding - ((point.price - minPrice) / priceRange) * chartHeight;
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, priceChange >= 0 ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)');
    gradient.addColorStop(1, 'rgba(14, 203, 129, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    chartData.forEach((point, i) => {
      const x = padding + (i / (chartData.length - 1)) * chartWidth;
      const y = height - padding - ((point.price - minPrice) / priceRange) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = priceChange >= 0 ? '#0ECB81' : '#F6465D';
    ctx.lineWidth = 2;
    ctx.stroke();
    
  }, [chartData, priceChange]);

  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] h-full">
      <div className="p-3 border-b border-[#2B3139] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-white font-mono">
            {currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-mono ${priceChange >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-2 text-xs">
          {['1H', '4H', '1D', '1W'].map(tf => (
            <button key={tf} className="px-2 py-1 text-[#848E9C] hover:text-white hover:bg-[#2B3139] rounded">
              {tf}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} width={800} height={300} className="w-full" />
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
        <div className="grid grid-cols-12 gap-[1px] bg-[#2B3139]">
          {/* Left - Trading Pairs */}
          <div className="col-span-2 hidden lg:block">
            <TradingPairs 
              prices={prices} 
              selectedCoin={selectedCoin} 
              onSelectCoin={setSelectedCoin}
            />
          </div>
          
          {/* Center - Chart */}
          <div className="col-span-12 lg:col-span-6">
            <PriceChart 
              chartData={chartData} 
              currentPrice={getCurrentPrice()} 
              priceChange={getPriceChange()}
            />
            
            {/* Buy/Sell Panel */}
            <div className="bg-[#0B0E11] border border-[#2B3139] p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Buy Side */}
                <div>
                  <Tabs value={orderType} onValueChange={setOrderType} className="mb-4">
                    <TabsList className="bg-transparent border-b border-[#2B3139] w-full justify-start rounded-none p-0">
                      <TabsTrigger value="limit" className="text-xs data-[state=active]:text-[#F0B90B] data-[state=active]:border-b-2 data-[state=active]:border-[#F0B90B] rounded-none">
                        Limit
                      </TabsTrigger>
                      <TabsTrigger value="market" className="text-xs data-[state=active]:text-[#F0B90B] data-[state=active]:border-b-2 data-[state=active]:border-[#F0B90B] rounded-none">
                        Market
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <form onSubmit={(e) => { setTradeType('buy'); handleTrade(e); }}>
                    <div className="space-y-3">
                      <div className="text-xs text-[#848E9C] flex justify-between">
                        <span>Avbl</span>
                        <span className="text-white">{wallet?.balances?.usdt?.toFixed(2) || '0.00'} USDT</span>
                      </div>
                      
                      {orderType === 'limit' && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">Price</span>
                          <Input
                            type="number"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="pl-14 pr-16 bg-[#1E2329] border-[#2B3139] text-right font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">USDT</span>
                        </div>
                      )}
                      
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">Amount</span>
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-16 pr-16 bg-[#1E2329] border-[#2B3139] text-right font-mono"
                          data-testid="buy-amount-input"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">{selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => { setTradeType('buy'); setPercentage(pct); }}
                            className="py-1 text-xs bg-[#1E2329] text-[#848E9C] hover:bg-[#2B3139] rounded"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">Total</span>
                        <Input
                          type="text"
                          value={calculateTotal().toFixed(2)}
                          readOnly
                          className="pl-14 pr-16 bg-[#1E2329] border-[#2B3139] text-right font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">USDT</span>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={submitting || !amount}
                        className="w-full bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-semibold"
                        data-testid="buy-submit-btn"
                      >
                        Buy {selectedCoin.toUpperCase()}
                      </Button>
                    </div>
                  </form>
                </div>
                
                {/* Sell Side */}
                <div>
                  <Tabs value={orderType} onValueChange={setOrderType} className="mb-4">
                    <TabsList className="bg-transparent border-b border-[#2B3139] w-full justify-start rounded-none p-0">
                      <TabsTrigger value="limit" className="text-xs data-[state=active]:text-[#F0B90B] data-[state=active]:border-b-2 data-[state=active]:border-[#F0B90B] rounded-none">
                        Limit
                      </TabsTrigger>
                      <TabsTrigger value="market" className="text-xs data-[state=active]:text-[#F0B90B] data-[state=active]:border-b-2 data-[state=active]:border-[#F0B90B] rounded-none">
                        Market
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <form onSubmit={(e) => { setTradeType('sell'); handleTrade(e); }}>
                    <div className="space-y-3">
                      <div className="text-xs text-[#848E9C] flex justify-between">
                        <span>Avbl</span>
                        <span className="text-white">{wallet?.balances?.[selectedCoin]?.toFixed(6) || '0.00'} {selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      {orderType === 'limit' && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">Price</span>
                          <Input
                            type="number"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="pl-14 pr-16 bg-[#1E2329] border-[#2B3139] text-right font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">USDT</span>
                        </div>
                      )}
                      
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">Amount</span>
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-16 pr-16 bg-[#1E2329] border-[#2B3139] text-right font-mono"
                          data-testid="sell-amount-input"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">{selectedCoin.toUpperCase()}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => { setTradeType('sell'); setPercentage(pct); }}
                            className="py-1 text-xs bg-[#1E2329] text-[#848E9C] hover:bg-[#2B3139] rounded"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">Total</span>
                        <Input
                          type="text"
                          value={calculateTotal().toFixed(2)}
                          readOnly
                          className="pl-14 pr-16 bg-[#1E2329] border-[#2B3139] text-right font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C]">USDT</span>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={submitting || !amount}
                        className="w-full bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-semibold"
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
          
          {/* Right - Order Book & Trades */}
          <div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-[1px]">
            <OrderBook selectedCoin={selectedCoin} currentPrice={getCurrentPrice()} />
            <RecentTrades selectedCoin={selectedCoin} currentPrice={getCurrentPrice()} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TradePage;
