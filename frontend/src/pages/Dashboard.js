import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
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
  CaretDown,
  Sun,
  Moon,
  Star,
  Fire,
  Rocket,
  Trophy,
  Gift,
  MagnifyingGlass,
  Bell,
  Headset,
  User
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// Navigation Component
const DashboardNav = ({ isDark, toggleTheme }) => {
  const { user, logout } = useAuth();

  const bg = isDark ? 'bg-[#0B0E11]/80 backdrop-blur-lg' : 'bg-white/80 backdrop-blur-lg';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#8F8F9D]' : 'text-gray-500';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${bg} border-b ${border}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="dashboard-logo">
          <Vault size={32} weight="duotone" className="text-[#00E599]" />
          <span className={`font-bold text-xl tracking-tight ${text}`} style={{ fontFamily: 'Unbounded' }}>
            CryptoVault
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className={`${text} hover:text-[#00E599] transition-colors`} data-testid="nav-dashboard">
            <ChartLineUp size={24} />
          </Link>
          <Link to="/wallet" className={`${textMuted} hover:text-[#00E599] transition-colors`} data-testid="nav-wallet">
            <Wallet size={24} />
          </Link>
          <Link to="/trade" className={`${textMuted} hover:text-[#00E599] transition-colors`} data-testid="nav-trade">
            <ArrowsLeftRight size={24} />
          </Link>
          <Link to="/transactions" className={`${textMuted} hover:text-[#00E599] transition-colors`} data-testid="nav-transactions">
            <ClockCounterClockwise size={24} />
          </Link>
          <div className={`flex items-center gap-4 ml-4 pl-4 border-l ${border}`}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${isDark ? 'bg-[#2B3139] hover:bg-[#3B4149] text-[#F0B90B]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              data-testid="dashboard-theme-toggle"
            >
              {isDark ? <Sun size={20} weight="fill" /> : <Moon size={20} weight="fill" />}
            </button>
            {/* Profile Link */}
            <Link to="/profile" className={`${textMuted} hover:text-[#00E599] transition-colors`}>
              <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center">
                <User size={18} className="text-black" weight="fill" />
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className={`${textMuted} hover:text-[#FF3B30] hover:bg-transparent`}
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
  const { isDark, toggleTheme } = useTheme();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("favorites");
  const [searchQuery, setSearchQuery] = useState("");

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-100';
  const hoverBg = isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100';

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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Promotional banners data
  const banners = [
    {
      title: "Trade Competition",
      subtitle: "Share $100,000 in Rewards",
      gradient: "from-[#F0B90B] to-[#F8D12F]",
      icon: "🏆"
    },
    {
      title: "Spot Earn Upgrade",
      subtitle: "Up to 15% APY",
      gradient: "from-[#0ECB81] to-[#00E599]",
      icon: "💰"
    },
    {
      title: "New Listing Event",
      subtitle: "Trade & Win Rewards",
      gradient: "from-[#9B59B6] to-[#8E44AD]",
      icon: "🚀"
    }
  ];

  // Market tabs
  const marketTabs = [
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "hot", label: "Hot", icon: Fire },
    { id: "gainers", label: "Gainers", icon: TrendUp },
    { id: "losers", label: "Losers", icon: TrendDown },
    { id: "new", label: "New", icon: Rocket }
  ];

  // Format volume
  const formatVolume = (vol) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol?.toFixed(2) || '0';
  };

  // Get filtered and sorted prices based on active tab
  const getFilteredPrices = () => {
    let filtered = [...prices];
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch(activeTab) {
      case "gainers":
        return filtered.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
      case "losers":
        return filtered.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
      case "hot":
        return filtered.sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));
      default:
        return filtered;
    }
  };

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
      <div className={`min-h-screen ${bg}`}>
        <DashboardNav isDark={isDark} toggleTheme={toggleTheme} />
        <div className="pt-24 flex items-center justify-center">
          <p className={text}>Loading...</p>
        </div>
      </div>
    );
  }

  const filteredPrices = getFilteredPrices();

  return (
    <div className={`min-h-screen ${bg}`}>
      <DashboardNav isDark={isDark} toggleTheme={toggleTheme} />
      
      <main className="pt-20 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlass size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coins..."
                className={`pl-10 ${inputBg} ${border} ${text} h-10`}
              />
            </div>
          </div>

          {/* Promotional Banners Carousel */}
          <div className="mb-6 overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {banners.map((banner, index) => (
                <div 
                  key={index}
                  className={`relative w-72 h-28 rounded-xl overflow-hidden bg-gradient-to-r ${banner.gradient} p-4 cursor-pointer hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-black font-bold text-lg">{banner.title}</h3>
                      <p className="text-black/70 text-sm mt-1">{banner.subtitle}</p>
                    </div>
                    <span className="text-3xl">{banner.icon}</span>
                  </div>
                  <div className="absolute bottom-2 left-4 flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`w-6 h-1 rounded-full ${i === index ? 'bg-black' : 'bg-black/30'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Tabs */}
          <div className={`border-b ${border} mb-4 overflow-x-auto`}>
            <div className="flex gap-6 min-w-max">
              {marketTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-colors ${
                      activeTab === tab.id 
                        ? `${text} border-b-2 border-[#F0B90B]` 
                        : `${textMuted} hover:text-[#F0B90B]`
                    }`}
                  >
                    <Icon size={16} weight={activeTab === tab.id ? "fill" : "regular"} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Market Table Header */}
          <div className={`grid grid-cols-12 gap-2 px-3 py-2 text-xs ${textMuted}`}>
            <div className="col-span-4">Pairs</div>
            <div className="col-span-3 text-right">24h Vol</div>
            <div className="col-span-3 text-right">Last Price</div>
            <div className="col-span-2 text-right">Change</div>
          </div>

          {/* Market List */}
          <div className="space-y-1">
            {filteredPrices.map((coin, index) => (
              <Link 
                key={coin.coin_id || index}
                to={`/trade?coin=${coin.symbol}`}
                className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-lg ${hoverBg} transition-colors cursor-pointer`}
              >
                {/* Pair Name */}
                <div className="col-span-4 flex items-center gap-2">
                  <Star size={14} className={textMuted} weight="regular" />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`font-medium ${text}`}>{coin.symbol?.toUpperCase()}</span>
                      {coin.volume_24h > 100000000 && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B]">3x</span>
                      )}
                    </div>
                    <span className={`text-xs ${textMuted}`}>/USDT</span>
                  </div>
                </div>
                
                {/* 24h Volume */}
                <div className={`col-span-3 text-right ${textMuted} text-sm font-mono self-center`}>
                  {formatVolume(coin.volume_24h)}
                </div>
                
                {/* Last Price */}
                <div className="col-span-3 text-right self-center">
                  <p className={`${text} font-mono text-sm`}>
                    {coin.current_price < 1 
                      ? coin.current_price?.toFixed(4) 
                      : coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs ${textMuted}`}>
                    ${coin.current_price < 1 
                      ? coin.current_price?.toFixed(4) 
                      : coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Change */}
                <div className="col-span-2 text-right self-center">
                  <span className={`text-sm font-mono px-2 py-1 rounded ${
                    (coin.price_change_percentage_24h || 0) >= 0 
                      ? 'bg-[#0ECB81] text-white' 
                      : 'bg-[#F6465D] text-white'
                  }`}>
                    {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}
                    {coin.price_change_percentage_24h?.toFixed(2) || '0.00'}%
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom Navigation for Mobile */}
          <nav className={`fixed bottom-0 left-0 right-0 ${isDark ? 'bg-[#0B0E11]' : 'bg-white'} border-t ${border} z-50 md:hidden`}>
            <div className="flex items-center justify-around py-2">
              <Link to="/dashboard" className="flex flex-col items-center gap-1 text-[#F0B90B]">
                <Vault size={24} />
                <span className="text-xs">Home</span>
              </Link>
              <Link to="/trade" className={`flex flex-col items-center gap-1 ${textMuted}`}>
                <ChartLineUp size={24} />
                <span className="text-xs">Markets</span>
              </Link>
              <Link to="/trade" className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-[#F0B90B] rounded-full flex items-center justify-center -mt-4">
                  <ArrowsLeftRight size={24} className="text-black" />
                </div>
                <span className="text-xs text-[#F0B90B]">Trade</span>
              </Link>
              <Link to="/transactions" className={`flex flex-col items-center gap-1 ${textMuted}`}>
                <Trophy size={24} />
                <span className="text-xs">Futures</span>
              </Link>
              <Link to="/wallet" className={`flex flex-col items-center gap-1 ${textMuted}`}>
                <Wallet size={24} />
                <span className="text-xs">Assets</span>
              </Link>
            </div>
          </nav>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
