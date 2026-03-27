import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API, useTheme } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { 
  Vault, 
  ChartLineUp, 
  Wallet as WalletIcon, 
  ArrowsLeftRight, 
  ClockCounterClockwise,
  SignOut,
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  Eye,
  EyeSlash,
  CaretRight,
  MagnifyingGlass,
  Copy,
  Info,
  CaretDown,
  Coins,
  ChartLine,
  Percent,
  Clock,
  Sun,
  Moon,
  User
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import BottomNav from "../components/BottomNav";

// Top Header
const WalletHeader = ({ user, logout, isDark, toggleTheme }) => {
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';

  return (
    <div className={`${bg} px-4 py-3 flex items-center justify-between`}>
      <Link to="/dashboard" className="flex items-center gap-2">
        <img src="/images/tg-logo.png" alt="TG Exchange" className="w-7 h-7 rounded-full" />
        <span className={`font-bold text-lg ${text}`}>TG Exchange</span>
      </Link>
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors ${isDark ? 'bg-[#2B3139] hover:bg-[#3B4149] text-[#F0B90B]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          data-testid="wallet-theme-toggle"
        >
          {isDark ? <Sun size={20} weight="fill" /> : <Moon size={20} weight="fill" />}
        </button>
        {/* Profile Link */}
        <Link to="/profile">
          <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center">
            <User size={18} className="text-black" weight="fill" />
          </div>
        </Link>
      </div>
    </div>
  );
};

const WalletPage = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [depositLimits, setDepositLimits] = useState(null);
  const [withdrawalLimits, setWithdrawalLimits] = useState(null);
  
  // Dialog states
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  
  // Form states
  const [selectedCoin, setSelectedCoin] = useState("usdt");
  const [amount, setAmount] = useState("");
  const [selectedDepositAmount, setSelectedDepositAmount] = useState(null);
  const [address, setAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [transferTo, setTransferTo] = useState("margin");
  const [submitting, setSubmitting] = useState(false);

  // Theme colors
  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-[#FAFAFA]';
  const cardBg = isDark ? 'bg-[#0B0E11]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#1E2329]' : 'bg-gray-100';
  const hoverBg = isDark ? 'hover:bg-[#1E2329]' : 'hover:bg-gray-100';
  const actionBtnBg = isDark ? 'bg-[#2B3139]' : 'bg-gray-200';
  const actionBtnHover = isDark ? 'hover:bg-[#3B4149]' : 'hover:bg-gray-300';
  const dividerBg = isDark ? 'bg-[#181A20]' : 'bg-gray-100';
  const dialogBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const dialogInputBg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-100';

  const supportedCoins = [
    { id: "btc", name: "Bitcoin", symbol: "BTC", color: "#F7931A", apy: "1.0047", logo: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png" },
    { id: "eth", name: "Ethereum", symbol: "ETH", color: "#627EEA", apy: "2.15", logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
    { id: "usdt", name: "Tether", symbol: "USDT", color: "#26A17B", apy: "5.25", logo: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { id: "bnb", name: "BNB", symbol: "BNB", color: "#F0B90B", apy: "0.85", logo: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
    { id: "xrp", name: "XRP", symbol: "XRP", color: "#23292F", apy: "3.50", logo: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
    { id: "sol", name: "Solana", symbol: "SOL", color: "#9945FF", apy: "4.20", logo: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png" },
  ];

  const accountTypes = [
    { id: "spot", name: "Spot", color: "#3B82F6", balance: 0 },
    { id: "margin", name: "Margin", color: "#F59E0B", balance: 0 },
    { id: "futures", name: "Futures", color: "#10B981", balance: 0 },
    { id: "omni", name: "Omni", color: "#22D3EE", balance: 0 },
    { id: "earn", name: "Earn", color: "#F43F5E", balance: 0 },
  ];

  const depositAddresses = {
    btc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    eth: "0x742d35Cc6634C0532925a3b844Bc9e7595f3e472",
    usdt: "0x742d35Cc6634C0532925a3b844Bc9e7595f3e472",
    bnb: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2",
    xrp: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    sol: "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy",
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletRes, pricesRes, depositLimitsRes] = await Promise.all([
        axios.get(`${API}/wallet`, { withCredentials: true }),
        axios.get(`${API}/market/prices`),
        axios.get(`${API}/wallet/deposit-limits`, { withCredentials: true })
      ]);
      setWallet(walletRes.data);
      setPrices(pricesRes.data);
      setDepositLimits(depositLimitsRes.data);
      
      // Fetch withdrawal limits
      const withdrawLimitsRes = await axios.get(`${API}/wallet/withdrawal-limits`, { withCredentials: true });
      setWithdrawalLimits(withdrawLimitsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCoinValue = (coin, amount) => {
    if (coin === 'usdt') return amount;
    const coinMap = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', xrp: 'ripple', sol: 'solana' };
    const priceData = prices.find(p => p.coin_id === coinMap[coin]);
    return priceData ? amount * priceData.current_price : 0;
  };

  const getCoinPrice = (coin) => {
    if (coin === 'usdt') return 1;
    const coinMap = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', xrp: 'ripple', sol: 'solana' };
    const priceData = prices.find(p => p.coin_id === coinMap[coin]);
    return priceData?.current_price || 0;
  };

  const getTotalValue = () => {
    if (!wallet) return 0;
    return Object.entries(wallet.balances).reduce((total, [coin, amount]) => {
      return total + getCoinValue(coin, amount);
    }, 0);
  };

  // Calculate PnL (mock data for demo)
  const getPnL = () => {
    const total = getTotalValue();
    const pnlPercent = -1.28; // Mock
    const pnlValue = total * (pnlPercent / 100);
    return { value: pnlValue, percent: pnlPercent };
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const depositAmount = selectedDepositAmount || parseFloat(amount);
    
    try {
      await axios.post(`${API}/wallet/deposit`, {
        coin: selectedCoin,
        amount: depositAmount,
        tx_hash: txHash || `tx_${Date.now()}`
      }, { withCredentials: true });
      toast.success(`Deposited $${depositAmount} ${selectedCoin.toUpperCase()} successfully!`);
      setDepositOpen(false);
      setAmount("");
      setSelectedDepositAmount(null);
      setTxHash("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Deposit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    
    // Check minimum withdrawal
    if (withdrawAmount < 10) {
      toast.error("Minimum withdrawal is $10");
      return;
    }
    
    // Check withdrawable balance
    if (withdrawalLimits && withdrawAmount > withdrawalLimits.withdrawable_balance) {
      toast.error(`Maximum withdrawable: $${withdrawalLimits.withdrawable_balance.toFixed(2)} (Welcome bonus is not withdrawable)`);
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/wallet/withdraw`, {
        coin: selectedCoin,
        amount: withdrawAmount,
        address: address
      }, { withCredentials: true });
      toast.success(`Withdrawal of $${withdrawAmount} ${selectedCoin.toUpperCase()} initiated!`);
      setWithdrawOpen(false);
      setAmount("");
      setAddress("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    // Mock transfer between accounts
    toast.success(`Transferred ${amount} ${selectedCoin.toUpperCase()} to ${transferTo}`);
    setTransferOpen(false);
    setAmount("");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied!");
  };

  const filteredCoins = supportedCoins.filter(coin => 
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <p className={text}>Loading...</p>
      </div>
    );
  }

  const pnl = getPnL();
  const totalBalance = getTotalValue();

  return (
    <div className={`min-h-screen ${bg} pb-20`}>
      <WalletHeader user={user} logout={logout} isDark={isDark} toggleTheme={toggleTheme} />
      
      {/* Tabs - Overview, Spot, Margin, Futures, Omni, Earn */}
      <div className={`border-b ${border} overflow-x-auto ${cardBg}`}>
        <div className="flex px-4">
          {["Overview", "Spot", "Margin", "Futures", "Omni", "Earn"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.toLowerCase() 
                  ? `${text} border-b-2 border-[#F0B90B]` 
                  : textMuted
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Total Balance Card */}
      <div className={`px-4 py-6 ${cardBg}`}>
        {/* Welcome Bonus Banner */}
        {wallet?.welcome_bonus && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#F0B90B]/20 to-[#F0B90B]/10 border border-[#F0B90B]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#F0B90B] flex items-center justify-center">
                  <Coins size={18} className="text-black" />
                </div>
                <div>
                  <p className="text-[#F0B90B] font-semibold text-sm">Welcome Bonus</p>
                  <p className={`text-xs ${textMuted}`}>
                    {wallet.welcome_bonus.days_remaining}d {wallet.welcome_bonus.hours_remaining}h remaining
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#F0B90B] font-bold text-lg">${wallet.welcome_bonus.amount}</p>
                <p className={`text-[10px] ${textMuted}`}>Not withdrawable</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <span className={`${textMuted} text-sm`}>Total Balance</span>
          <button onClick={() => setShowBalance(!showBalance)}>
            {showBalance ? <Eye size={16} className={textMuted} /> : <EyeSlash size={16} className={textMuted} />}
          </button>
        </div>
        
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-4xl font-bold ${text} font-mono`}>
            {showBalance ? totalBalance.toFixed(2) : '****'}
          </span>
          <div className={`flex items-center gap-1 ${text} text-sm`}>
            <span>USD</span>
            <CaretDown size={14} />
          </div>
        </div>
        
        {/* Withdrawable Balance Info */}
        {withdrawalLimits && wallet?.welcome_bonus && (
          <div className={`flex items-center gap-2 mb-2 ${textMuted} text-xs`}>
            <Info size={14} />
            <span>Withdrawable: ${withdrawalLimits.withdrawable_balance?.toFixed(2) || '0.00'}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className={`${textMuted} text-sm`}>Today's PnL</span>
          <span className={`text-sm ${pnl.value >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {showBalance ? `${pnl.value >= 0 ? '+' : ''}$${pnl.value.toFixed(2)} (${pnl.percent >= 0 ? '+' : ''}${pnl.percent.toFixed(2)}%)` : '****'}
          </span>
          <CaretRight size={14} className={textMuted} />
        </div>
      </div>

      {/* Action Buttons - Deposit, Withdraw, Transfer, History */}
      <div className={`px-4 pb-6 ${cardBg}`}>
        <div className="flex justify-around">
          {/* Deposit - Link to DepositPage */}
          <Link to="/deposit" className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full ${actionBtnBg} flex items-center justify-center ${actionBtnHover} transition-colors`}>
              <ArrowDown size={24} className={text} />
            </div>
            <span className={`${text} text-sm`}>Deposit</span>
          </Link>

          {/* Withdraw - Link to WithdrawPage */}
          <Link to="/withdraw" className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full ${actionBtnBg} flex items-center justify-center ${actionBtnHover} transition-colors`}>
              <ArrowUp size={24} className={text} />
            </div>
            <span className={`${text} text-sm`}>Withdraw</span>
          </Link>

          {/* Transfer */}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-full ${actionBtnBg} flex items-center justify-center ${actionBtnHover} transition-colors`}>
                  <ArrowsDownUp size={24} className={text} />
                </div>
                <span className={`${text} text-sm`}>Transfer</span>
              </button>
            </DialogTrigger>
            <DialogContent className={`${dialogBg} ${border}`}>
              <DialogHeader>
                <DialogTitle className={text}>Transfer Between Accounts</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4 mt-4">
                <div>
                  <Label className={textMuted}>From</Label>
                  <Select defaultValue="spot">
                    <SelectTrigger className={`${dialogInputBg} ${border} ${text} mt-1`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${dialogBg} ${border}`}>
                      <SelectItem value="spot" className={text}>Spot</SelectItem>
                      <SelectItem value="margin" className={text}>Margin</SelectItem>
                      <SelectItem value="futures" className={text}>Futures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={textMuted}>To</Label>
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className={`${dialogInputBg} ${border} ${text} mt-1`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${dialogBg} ${border}`}>
                      <SelectItem value="margin" className={text}>Margin</SelectItem>
                      <SelectItem value="futures" className={text}>Futures</SelectItem>
                      <SelectItem value="earn" className={text}>Earn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={textMuted}>Coin</Label>
                  <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                    <SelectTrigger className={`${dialogInputBg} ${border} ${text} mt-1`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${dialogBg} ${border}`}>
                      {supportedCoins.map(coin => (
                        <SelectItem key={coin.id} value={coin.id} className={text}>{coin.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={textMuted}>Amount</Label>
                  <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${dialogInputBg} ${border} ${text} mt-1`} required />
                </div>
                <Button type="submit" className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold">
                  Transfer
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* History */}
          <button onClick={() => navigate('/transactions')} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full ${actionBtnBg} flex items-center justify-center ${actionBtnHover} transition-colors`}>
              <ClockCounterClockwise size={24} className={text} />
            </div>
            <span className={`${text} text-sm`}>History</span>
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className={`px-4 pb-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`${text} font-medium`}>Account</span>
            <Info size={14} className={textMuted} />
          </div>
          <CaretDown size={16} className={textMuted} />
        </div>
        
        {/* Progress Bar */}
        <div className={`h-2 ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'} rounded-full overflow-hidden mb-4`}>
          <div className="h-full bg-[#3B82F6]" style={{ width: '100%' }} />
        </div>
        
        {/* Account Types List */}
        <div className="space-y-3">
          {accountTypes.map((account, index) => {
            const accountBalance = index === 0 ? totalBalance : 0; // Only Spot has balance
            const percentage = index === 0 ? 100 : 0;
            
            return (
              <div key={account.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                  <span className={text}>{account.name}</span>
                </div>
                <div className="text-right">
                  <p className={`${text} font-mono`}>${showBalance ? accountBalance.toFixed(2) : '****'}</p>
                  <p className={`text-xs ${textMuted}`}>{percentage.toFixed(2)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className={`h-2 ${dividerBg}`} />

      {/* Crypto Assets Section */}
      <div className={`px-4 py-4`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`${text} font-medium text-lg`}>My Assets</span>
          <MagnifyingGlass size={20} className={textMuted} />
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlass size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coins"
            className={`pl-9 ${inputBg} ${border} ${text}`}
          />
        </div>
        
        {/* Simple Crypto List - Like Markets */}
        <div className={`${cardBg} rounded-xl border ${border} overflow-hidden`}>
          {filteredCoins.map((coin, index) => {
            const balance = wallet?.balances?.[coin.id] || 0;
            const value = getCoinValue(coin.id, balance);
            
            return (
              <div 
                key={coin.id}
                className={`flex items-center justify-between p-4 ${index !== filteredCoins.length - 1 ? `border-b ${border}` : ''} cursor-pointer hover:bg-[#F0B90B]/5 transition-colors`}
                onClick={() => navigate(`/trade?coin=${coin.id}`)}
              >
                {/* Left: Logo + Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/10">
                    <img 
                      src={coin.logo} 
                      alt={coin.symbol}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<span class="text-white font-bold">${coin.symbol.charAt(0)}</span>`;
                      }}
                    />
                  </div>
                  <div>
                    <span className={`${text} font-semibold`}>{coin.symbol}</span>
                    <p className={`${textMuted} text-xs`}>{coin.name}</p>
                  </div>
                </div>
                
                {/* Right: Quantity */}
                <div className="text-right">
                  <p className={`${text} font-mono font-semibold`}>
                    {showBalance ? balance.toFixed(balance < 1 ? 4 : 2) : '****'} {coin.symbol}
                  </p>
                  <p className={`${textMuted} text-xs`}>
                    ≈ ${showBalance ? value.toFixed(2) : '****'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Bottom Spacing */}
      <div className="h-20"></div>

      <BottomNav />
    </div>
  );
};

export default WalletPage;
