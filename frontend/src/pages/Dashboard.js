import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { 
  Vault, 
  ChartLineUp, 
  Wallet, 
  ArrowsLeftRight, 
  ClockCounterClockwise,
  SignOut,
  TrendUp,
  TrendDown,
  CaretUp,
  CaretDown
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

// Navigation Component
const DashboardNav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="dashboard-logo">
          <Vault size={32} weight="duotone" className="text-[#00E599]" />
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Unbounded' }}>
            CryptoVault
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-white hover:text-[#00E599] transition-colors" data-testid="nav-dashboard">
            <ChartLineUp size={24} />
          </Link>
          <Link to="/wallet" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-wallet">
            <Wallet size={24} />
          </Link>
          <Link to="/trade" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-trade">
            <ArrowsLeftRight size={24} />
          </Link>
          <Link to="/transactions" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-transactions">
            <ClockCounterClockwise size={24} />
          </Link>
          <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
            <span className="text-sm text-[#8F8F9D]" data-testid="user-name">{user?.name}</span>
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

const Dashboard = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const response = await axios.get(`${API}/market/chart/${selectedCoin}?days=7`);
        const formattedData = response.data.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          price: price
        }));
        setChartData(formattedData);
      } catch (error) {
        console.error("Error fetching chart:", error);
      }
    };

    fetchChart();
  }, [selectedCoin]);

  // Calculate portfolio value
  const calculatePortfolioValue = () => {
    if (!wallet || !prices.length) return 0;
    
    let total = wallet.balances.usdt || 0;
    
    const coinMap = {
      btc: 'bitcoin',
      eth: 'ethereum',
      bnb: 'binancecoin',
      xrp: 'ripple',
      sol: 'solana'
    };

    Object.entries(wallet.balances).forEach(([coin, amount]) => {
      if (coin === 'usdt') return;
      const coinId = coinMap[coin];
      const priceData = prices.find(p => p.coin_id === coinId);
      if (priceData && amount > 0) {
        total += amount * priceData.current_price;
      }
    });

    return total;
  };

  const formatNumber = (num, decimals = 2) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
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
              data-testid="dashboard-title"
            >
              Dashboard
            </h1>
            <p className="text-[#8F8F9D]">Welcome back, {user?.name}</p>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Portfolio Value */}
            <div className="md:col-span-2 bg-[#12121A] border border-white/10 p-6" data-testid="portfolio-card">
              <p className="text-[#8F8F9D] text-sm mb-2">Portfolio Value</p>
              <p className="text-4xl font-bold font-mono text-[#00E599]" data-testid="portfolio-value">
                ${calculatePortfolioValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendUp size={16} className="text-[#00E599]" />
                <span className="text-sm text-[#00E599]">+12.5% this week</span>
              </div>
            </div>

            {/* USDT Balance */}
            <div className="bg-[#12121A] border border-white/10 p-6" data-testid="usdt-balance-card">
              <p className="text-[#8F8F9D] text-sm mb-2">USDT Balance</p>
              <p className="text-2xl font-bold font-mono" data-testid="usdt-balance">
                ${wallet?.balances?.usdt?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <p className="text-xs text-[#8F8F9D] mt-1">Available for trading</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#12121A] border border-white/10 p-6 flex flex-col justify-center gap-3">
              <Link to="/trade" data-testid="quick-trade-btn">
                <Button className="w-full bg-[#00E599] hover:bg-[#00C282] text-black font-semibold">
                  Trade Now
                </Button>
              </Link>
              <Link to="/wallet" data-testid="quick-deposit-btn">
                <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">
                  Deposit
                </Button>
              </Link>
            </div>
          </div>

          {/* Chart and Market */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Price Chart */}
            <div className="lg:col-span-2 bg-[#12121A] border border-white/10 p-6" data-testid="price-chart">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold" style={{ fontFamily: 'Unbounded' }}>Price Chart</h2>
                <select 
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value)}
                  className="bg-[#0A0A0A] border border-white/20 rounded px-3 py-2 text-sm"
                  data-testid="chart-coin-select"
                >
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="ethereum">Ethereum (ETH)</option>
                  <option value="binancecoin">BNB</option>
                  <option value="solana">Solana (SOL)</option>
                </select>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E599" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00E599" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8F8F9D', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8F8F9D', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      domain={['auto', 'auto']}
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
                      stroke="#00E599" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Holdings */}
            <div className="bg-[#12121A] border border-white/10 p-6" data-testid="holdings-card">
              <h2 className="font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>Your Holdings</h2>
              <div className="space-y-4">
                {wallet && Object.entries(wallet.balances).map(([coin, amount]) => {
                  if (amount <= 0) return null;
                  const coinMap = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', xrp: 'ripple', sol: 'solana', usdt: 'tether' };
                  const priceData = prices.find(p => p.coin_id === coinMap[coin]);
                  const value = coin === 'usdt' ? amount : (priceData ? amount * priceData.current_price : 0);
                  
                  return (
                    <div 
                      key={coin} 
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      data-testid={`holding-${coin}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00E599]/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#00E599]">{coin.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{coin.toUpperCase()}</p>
                          <p className="text-xs text-[#8F8F9D] font-mono">{amount.toFixed(coin === 'usdt' ? 2 : 6)}</p>
                        </div>
                      </div>
                      <p className="font-mono text-sm">${value.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Market Overview */}
          <div className="bg-[#12121A] border border-white/10" data-testid="market-table">
            <div className="p-6 border-b border-white/10">
              <h2 className="font-bold" style={{ fontFamily: 'Unbounded' }}>Market Overview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[#8F8F9D] border-b border-white/10">
                    <th className="px-6 py-4 font-medium">#</th>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium text-right">Price</th>
                    <th className="px-6 py-4 font-medium text-right">24h Change</th>
                    <th className="px-6 py-4 font-medium text-right">Market Cap</th>
                    <th className="px-6 py-4 font-medium text-right">Volume (24h)</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((coin, index) => (
                    <tr 
                      key={coin.coin_id} 
                      className="border-b border-white/5 table-row-hover hover:text-white"
                      data-testid={`market-row-${coin.symbol}`}
                    >
                      <td className="px-6 py-4 text-[#8F8F9D]">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {coin.image && (
                            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                          )}
                          <div>
                            <p className="font-medium">{coin.name}</p>
                            <p className="text-xs text-[#8F8F9D]">{coin.symbol.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        ${coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`flex items-center justify-end gap-1 font-mono ${coin.price_change_percentage_24h >= 0 ? 'text-[#00E599]' : 'text-[#FF3B30]'}`}>
                          {coin.price_change_percentage_24h >= 0 ? <CaretUp size={14} /> : <CaretDown size={14} />}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[#8F8F9D]">
                        {formatNumber(coin.market_cap)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[#8F8F9D]">
                        {formatNumber(coin.volume_24h)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/trade?coin=${coin.symbol}`}>
                          <Button 
                            size="sm" 
                            className="bg-[#00E599] hover:bg-[#00C282] text-black text-xs"
                            data-testid={`trade-btn-${coin.symbol}`}
                          >
                            Trade
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
