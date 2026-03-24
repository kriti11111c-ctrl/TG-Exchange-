import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
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
  Clock
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

// Navigation Component (Bottom Nav for mobile feel)
const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0B0E11] border-t border-[#2B3139] z-50">
      <div className="flex items-center justify-around py-2">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 text-[#848E9C] hover:text-white">
          <Vault size={24} />
          <span className="text-xs">Home</span>
        </Link>
        <Link to="/trade" className="flex flex-col items-center gap-1 text-[#848E9C] hover:text-white">
          <ChartLineUp size={24} />
          <span className="text-xs">Markets</span>
        </Link>
        <Link to="/trade" className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-[#F0B90B] rounded-full flex items-center justify-center -mt-4">
            <ArrowsLeftRight size={24} className="text-black" />
          </div>
          <span className="text-xs text-[#F0B90B]">Trade</span>
        </Link>
        <Link to="/transactions" className="flex flex-col items-center gap-1 text-[#848E9C] hover:text-white">
          <Clock size={24} />
          <span className="text-xs">Futures</span>
        </Link>
        <Link to="/wallet" className="flex flex-col items-center gap-1 text-[#F0B90B]">
          <WalletIcon size={24} />
          <span className="text-xs">Assets</span>
        </Link>
      </div>
    </nav>
  );
};

// Top Header
const WalletHeader = ({ user, logout }) => {
  return (
    <div className="bg-[#0B0E11] px-4 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="flex items-center gap-2">
        <Vault size={28} weight="duotone" className="text-[#F0B90B]" />
        <span className="font-bold text-lg text-white">CryptoVault</span>
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#848E9C]">{user?.name}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={logout}
          className="text-[#848E9C] hover:text-[#F0B90B] hover:bg-transparent p-1"
        >
          <SignOut size={18} />
        </Button>
      </div>
    </div>
  );
};

const WalletPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  
  // Form states
  const [selectedCoin, setSelectedCoin] = useState("btc");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [transferTo, setTransferTo] = useState("margin");
  const [submitting, setSubmitting] = useState(false);

  const supportedCoins = [
    { id: "btc", name: "Bitcoin", symbol: "BTC", color: "#F7931A", apy: "1.0047" },
    { id: "eth", name: "Ethereum", symbol: "ETH", color: "#627EEA", apy: "2.15" },
    { id: "usdt", name: "Tether", symbol: "USDT", color: "#26A17B", apy: "5.25" },
    { id: "bnb", name: "BNB", symbol: "BNB", color: "#F0B90B", apy: "0.85" },
    { id: "xrp", name: "XRP", symbol: "XRP", color: "#23292F", apy: "3.50" },
    { id: "sol", name: "Solana", symbol: "SOL", color: "#9945FF", apy: "4.20" },
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
    try {
      await axios.post(`${API}/wallet/deposit`, {
        coin: selectedCoin,
        amount: parseFloat(amount),
        tx_hash: txHash || `tx_${Date.now()}`
      }, { withCredentials: true });
      toast.success(`Deposited ${amount} ${selectedCoin.toUpperCase()} successfully!`);
      setDepositOpen(false);
      setAmount("");
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
    setSubmitting(true);
    try {
      await axios.post(`${API}/wallet/withdraw`, {
        coin: selectedCoin,
        amount: parseFloat(amount),
        address: address
      }, { withCredentials: true });
      toast.success(`Withdrawal of ${amount} ${selectedCoin.toUpperCase()} initiated!`);
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
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  const pnl = getPnL();
  const totalBalance = getTotalValue();

  return (
    <div className="min-h-screen bg-[#0B0E11] pb-20">
      <WalletHeader user={user} logout={logout} />
      
      {/* Tabs - Overview, Spot, Margin, Futures, Omni, Earn */}
      <div className="border-b border-[#2B3139] overflow-x-auto">
        <div className="flex px-4">
          {["Overview", "Spot", "Margin", "Futures", "Omni", "Earn"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.toLowerCase() 
                  ? 'text-white border-b-2 border-[#F0B90B]' 
                  : 'text-[#848E9C]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#848E9C] text-sm">Total Balance</span>
          <button onClick={() => setShowBalance(!showBalance)}>
            {showBalance ? <Eye size={16} className="text-[#848E9C]" /> : <EyeSlash size={16} className="text-[#848E9C]" />}
          </button>
        </div>
        
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold text-white font-mono">
            {showBalance ? totalBalance.toFixed(2) : '****'}
          </span>
          <div className="flex items-center gap-1 text-white text-sm">
            <span>USD</span>
            <CaretDown size={14} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[#848E9C] text-sm">Today's PnL</span>
          <span className={`text-sm ${pnl.value >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {showBalance ? `${pnl.value >= 0 ? '+' : ''}$${pnl.value.toFixed(2)} (${pnl.percent >= 0 ? '+' : ''}${pnl.percent.toFixed(2)}%)` : '****'}
          </span>
          <CaretRight size={14} className="text-[#848E9C]" />
        </div>
      </div>

      {/* Action Buttons - Deposit, Withdraw, Transfer, History */}
      <div className="px-4 pb-6">
        <div className="flex justify-around">
          {/* Deposit */}
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center hover:bg-[#3B4149] transition-colors">
                  <ArrowDown size={24} className="text-white" />
                </div>
                <span className="text-white text-sm">Deposit</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E2329] border-[#2B3139]">
              <DialogHeader>
                <DialogTitle className="text-white">Deposit Crypto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDeposit} className="space-y-4 mt-4">
                <div>
                  <Label className="text-[#848E9C]">Select Coin</Label>
                  <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                    <SelectTrigger className="bg-[#0B0E11] border-[#2B3139] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2329] border-[#2B3139]">
                      {supportedCoins.map(coin => (
                        <SelectItem key={coin.id} value={coin.id} className="text-white">
                          {coin.name} ({coin.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#848E9C]">Deposit Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={depositAddresses[selectedCoin]} readOnly className="bg-[#0B0E11] border-[#2B3139] text-white font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(depositAddresses[selectedCoin])} className="border-[#2B3139]">
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-[#848E9C]">Amount (Demo)</Label>
                  <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-[#0B0E11] border-[#2B3139] text-white mt-1" required />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold">
                  {submitting ? "Processing..." : "Confirm Deposit"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Withdraw */}
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center hover:bg-[#3B4149] transition-colors">
                  <ArrowUp size={24} className="text-white" />
                </div>
                <span className="text-white text-sm">Withdraw</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E2329] border-[#2B3139]">
              <DialogHeader>
                <DialogTitle className="text-white">Withdraw Crypto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleWithdraw} className="space-y-4 mt-4">
                <div>
                  <Label className="text-[#848E9C]">Select Coin</Label>
                  <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                    <SelectTrigger className="bg-[#0B0E11] border-[#2B3139] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2329] border-[#2B3139]">
                      {supportedCoins.map(coin => (
                        <SelectItem key={coin.id} value={coin.id} className="text-white">
                          {coin.name} ({coin.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex justify-between">
                    <Label className="text-[#848E9C]">Amount</Label>
                    <span className="text-xs text-[#848E9C]">Available: {wallet?.balances?.[selectedCoin]?.toFixed(6) || '0'}</span>
                  </div>
                  <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-[#0B0E11] border-[#2B3139] text-white mt-1" required />
                </div>
                <div>
                  <Label className="text-[#848E9C]">Withdrawal Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" className="bg-[#0B0E11] border-[#2B3139] text-white font-mono mt-1" required />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-semibold">
                  {submitting ? "Processing..." : "Withdraw"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Transfer */}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center hover:bg-[#3B4149] transition-colors">
                  <ArrowsDownUp size={24} className="text-white" />
                </div>
                <span className="text-white text-sm">Transfer</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E2329] border-[#2B3139]">
              <DialogHeader>
                <DialogTitle className="text-white">Transfer Between Accounts</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4 mt-4">
                <div>
                  <Label className="text-[#848E9C]">From</Label>
                  <Select defaultValue="spot">
                    <SelectTrigger className="bg-[#0B0E11] border-[#2B3139] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2329] border-[#2B3139]">
                      <SelectItem value="spot" className="text-white">Spot</SelectItem>
                      <SelectItem value="margin" className="text-white">Margin</SelectItem>
                      <SelectItem value="futures" className="text-white">Futures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#848E9C]">To</Label>
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className="bg-[#0B0E11] border-[#2B3139] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2329] border-[#2B3139]">
                      <SelectItem value="margin" className="text-white">Margin</SelectItem>
                      <SelectItem value="futures" className="text-white">Futures</SelectItem>
                      <SelectItem value="earn" className="text-white">Earn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#848E9C]">Coin</Label>
                  <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                    <SelectTrigger className="bg-[#0B0E11] border-[#2B3139] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2329] border-[#2B3139]">
                      {supportedCoins.map(coin => (
                        <SelectItem key={coin.id} value={coin.id} className="text-white">{coin.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#848E9C]">Amount</Label>
                  <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-[#0B0E11] border-[#2B3139] text-white mt-1" required />
                </div>
                <Button type="submit" className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold">
                  Transfer
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* History */}
          <button onClick={() => navigate('/transactions')} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center hover:bg-[#3B4149] transition-colors">
              <ClockCounterClockwise size={24} className="text-white" />
            </div>
            <span className="text-white text-sm">History</span>
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">Account</span>
            <Info size={14} className="text-[#848E9C]" />
          </div>
          <CaretDown size={16} className="text-[#848E9C]" />
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden mb-4">
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
                  <span className="text-white">{account.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-mono">${showBalance ? accountBalance.toFixed(2) : '****'}</p>
                  <p className="text-xs text-[#848E9C]">{percentage.toFixed(2)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-2 bg-[#181A20]" />

      {/* Crypto Assets Section */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-medium text-lg">Crypto</span>
          <MagnifyingGlass size={20} className="text-[#848E9C]" />
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coins"
            className="pl-9 bg-[#1E2329] border-[#2B3139] text-white"
          />
        </div>
        
        {/* Column Headers */}
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[#848E9C] text-xs">Assets</span>
          <span className="text-[#848E9C] text-xs">Amount</span>
        </div>
        
        {/* Crypto List */}
        <div className="space-y-1">
          {filteredCoins.map(coin => {
            const balance = wallet?.balances?.[coin.id] || 0;
            const value = getCoinValue(coin.id, balance);
            const price = getCoinPrice(coin.id);
            
            return (
              <div 
                key={coin.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1E2329] transition-colors cursor-pointer"
                onClick={() => navigate(`/trade?coin=${coin.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: coin.color }}
                  >
                    <span className="text-white font-bold text-sm">{coin.symbol.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{coin.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0ECB81]/20 text-[#0ECB81]">
                        APY ↑ {coin.apy}%
                      </span>
                    </div>
                    <span className="text-[#848E9C] text-sm">{coin.name}</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-white font-mono">{showBalance ? balance.toFixed(balance < 1 ? 8 : 4) : '****'}</p>
                    <p className="text-[#848E9C] text-sm">≈ ${showBalance ? value.toFixed(2) : '****'}</p>
                  </div>
                  <CaretRight size={16} className="text-[#848E9C]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default WalletPage;
