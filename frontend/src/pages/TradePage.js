import { useState, useEffect } from "react";
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
  ArrowRight
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

// Navigation Component
const DashboardNav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="trade-logo">
          <Vault size={32} weight="duotone" className="text-[#00E599]" />
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Unbounded' }}>
            CryptoVault
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-dashboard">
            <ChartLineUp size={24} />
          </Link>
          <Link to="/wallet" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-wallet">
            <Wallet size={24} />
          </Link>
          <Link to="/trade" className="text-white hover:text-[#00E599] transition-colors" data-testid="nav-trade">
            <ArrowsLeftRight size={24} />
          </Link>
          <Link to="/transactions" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-transactions">
            <ClockCounterClockwise size={24} />
          </Link>
          <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
            <span className="text-sm text-[#8F8F9D]">{user?.name}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-[#8F8F9D] hover:text-[#FF3B30] hover:bg-transparent"
              data-testid="logout-btn"
            >
              <SignOut size={20} />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const TradePage = () => {
  const [searchParams] = useSearchParams();
  const initialCoin = searchParams.get('coin') || 'btc';
  
  const [selectedCoin, setSelectedCoin] = useState(initialCoin);
  const [tradeType, setTradeType] = useState("buy");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const tradableCoins = [
    { id: "btc", name: "Bitcoin", symbol: "BTC", coinId: "bitcoin" },
    { id: "eth", name: "Ethereum", symbol: "ETH", coinId: "ethereum" },
    { id: "bnb", name: "BNB", symbol: "BNB", coinId: "binancecoin" },
    { id: "xrp", name: "XRP", symbol: "XRP", coinId: "ripple" },
    { id: "sol", name: "Solana", symbol: "SOL", coinId: "solana" },
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchChart();
  }, [selectedCoin]);

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
      const formattedData = response.data.prices.map(([timestamp, price]) => ({
        time: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: price
      }));
      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching chart:", error);
    }
  };

  const getCurrentPrice = () => {
    const coinData = tradableCoins.find(c => c.id === selectedCoin);
    const priceData = prices.find(p => p.coin_id === coinData?.coinId);
    return priceData?.current_price || 0;
  };

  const getPriceChange = () => {
    const coinData = tradableCoins.find(c => c.id === selectedCoin);
    const priceData = prices.find(p => p.coin_id === coinData?.coinId);
    return priceData?.price_change_percentage_24h || 0;
  };

  const calculateTotal = () => {
    const price = getCurrentPrice();
    const qty = parseFloat(amount) || 0;
    return price * qty;
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
      const price = getCurrentPrice();
      return price > 0 ? (wallet.balances.usdt || 0) / price : 0;
    }
    return wallet.balances[selectedCoin] || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <DashboardNav />
        <div className="pt-24 flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  const currentCoin = tradableCoins.find(c => c.id === selectedCoin);
  const priceChange = getPriceChange();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <DashboardNav />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 
              className="text-2xl font-bold mb-2" 
              style={{ fontFamily: 'Unbounded' }}
              data-testid="trade-title"
            >
              Trade
            </h1>
            <p className="text-[#8F8F9D]">Buy and sell cryptocurrencies</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart and Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price Header */}
              <div className="bg-[#12121A] border border-white/10 p-6" data-testid="price-header">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#00E599]/20 flex items-center justify-center">
                      <span className="font-bold text-[#00E599]">{currentCoin?.symbol}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ fontFamily: 'Unbounded' }}>
                        {currentCoin?.name}
                      </h2>
                      <p className="text-[#8F8F9D]">{currentCoin?.symbol}/USDT</p>
                    </div>
                  </div>
                  <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                    <SelectTrigger className="w-40 bg-[#0A0A0A] border-white/20" data-testid="coin-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12121A] border-white/10">
                      {tradableCoins.map(coin => (
                        <SelectItem key={coin.id} value={coin.id}>
                          {coin.name} ({coin.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-4">
                  <p className="text-4xl font-bold font-mono" data-testid="current-price">
                    ${getCurrentPrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span 
                    className={`flex items-center gap-1 font-mono ${priceChange >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}
                    data-testid="price-change"
                  >
                    {priceChange >= 0 ? <CaretUp size={20} /> : <CaretDown size={20} />}
                    {Math.abs(priceChange).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-[#12121A] border border-white/10 p-6" data-testid="trade-chart">
                <h3 className="font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>24h Price Chart</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTradePrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={priceChange >= 0 ? "#00E599" : "#FF3B30"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={priceChange >= 0 ? "#00E599" : "#FF3B30"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="time" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8F8F9D', fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8F8F9D', fontSize: 10 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        domain={['auto', 'auto']}
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#12121A', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px'
                        }}
                        labelStyle={{ color: '#8F8F9D' }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke={priceChange >= 0 ? "#00E599" : "#FF3B30"} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTradePrice)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Market Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {prices.filter(p => p.coin_id === currentCoin?.coinId).map(coin => (
                  <>
                    <div key="marketcap" className="bg-[#12121A] border border-white/10 p-4">
                      <p className="text-xs text-[#8F8F9D] mb-1">Market Cap</p>
                      <p className="font-mono text-sm">${(coin.market_cap / 1e9).toFixed(2)}B</p>
                    </div>
                    <div key="volume" className="bg-[#12121A] border border-white/10 p-4">
                      <p className="text-xs text-[#8F8F9D] mb-1">24h Volume</p>
                      <p className="font-mono text-sm">${(coin.volume_24h / 1e9).toFixed(2)}B</p>
                    </div>
                    <div key="high" className="bg-[#12121A] border border-white/10 p-4">
                      <p className="text-xs text-[#8F8F9D] mb-1">24h Change</p>
                      <p className={`font-mono text-sm ${coin.price_change_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
                        ${Math.abs(coin.price_change_24h).toFixed(2)}
                      </p>
                    </div>
                    <div key="rank" className="bg-[#12121A] border border-white/10 p-4">
                      <p className="text-xs text-[#8F8F9D] mb-1">Symbol</p>
                      <p className="font-mono text-sm">{coin.symbol.toUpperCase()}</p>
                    </div>
                  </>
                ))}
              </div>
            </div>

            {/* Trade Form */}
            <div className="bg-[#12121A] border border-white/10 p-6" data-testid="trade-form">
              <Tabs value={tradeType} onValueChange={setTradeType} className="w-full">
                <TabsList className="w-full bg-[#0A0A0A] p-1 mb-6">
                  <TabsTrigger 
                    value="buy" 
                    className="flex-1 data-[state=active]:bg-[#00E599] data-[state=active]:text-black"
                    data-testid="buy-tab"
                  >
                    Buy
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sell"
                    className="flex-1 data-[state=active]:bg-[#FF3B30] data-[state=active]:text-white"
                    data-testid="sell-tab"
                  >
                    Sell
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleTrade} className="space-y-6">
                  {/* Available Balance */}
                  <div className="bg-[#0A0A0A] p-4 rounded">
                    <p className="text-xs text-[#8F8F9D] mb-1">Available Balance</p>
                    <p className="font-mono font-medium" data-testid="available-balance">
                      {tradeType === 'buy' 
                        ? `${wallet?.balances?.usdt?.toFixed(2) || '0.00'} USDT`
                        : `${wallet?.balances?.[selectedCoin]?.toFixed(6) || '0.000000'} ${selectedCoin.toUpperCase()}`
                      }
                    </p>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Amount ({currentCoin?.symbol})</Label>
                      <button 
                        type="button"
                        onClick={() => setAmount(getMaxAmount().toString())}
                        className="text-xs text-[#00E599] hover:underline"
                        data-testid="max-btn"
                      >
                        Max
                      </button>
                    </div>
                    <Input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-[#0A0A0A] border-white/20 font-mono"
                      required
                      data-testid="amount-input"
                    />
                  </div>

                  {/* Total */}
                  <div className="bg-[#0A0A0A] p-4 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8F8F9D]">Total</span>
                      <span className="font-mono font-medium" data-testid="total-value">
                        ${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-6 font-semibold ${
                      tradeType === 'buy' 
                        ? 'bg-[#00E599] hover:bg-[#00C282] text-black' 
                        : 'bg-[#FF3B30] hover:bg-[#E62E23] text-white'
                    }`}
                    data-testid="trade-submit-btn"
                  >
                    {submitting 
                      ? "Processing..." 
                      : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${currentCoin?.symbol}`
                    }
                  </Button>
                </form>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TradePage;
