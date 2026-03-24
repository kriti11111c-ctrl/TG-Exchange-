import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Copy,
  QrCode
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

// Navigation Component
const DashboardNav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="wallet-logo">
          <Vault size={32} weight="duotone" className="text-[#00E599]" />
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Unbounded' }}>
            CryptoVault
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-dashboard">
            <ChartLineUp size={24} />
          </Link>
          <Link to="/wallet" className="text-white hover:text-[#00E599] transition-colors" data-testid="nav-wallet">
            <WalletIcon size={24} />
          </Link>
          <Link to="/trade" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-trade">
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

const WalletPage = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  
  // Form states
  const [selectedCoin, setSelectedCoin] = useState("btc");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supportedCoins = [
    { id: "btc", name: "Bitcoin", symbol: "BTC" },
    { id: "eth", name: "Ethereum", symbol: "ETH" },
    { id: "usdt", name: "Tether", symbol: "USDT" },
    { id: "bnb", name: "BNB", symbol: "BNB" },
    { id: "xrp", name: "XRP", symbol: "XRP" },
    { id: "sol", name: "Solana", symbol: "SOL" },
  ];

  // Simulated deposit addresses
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!");
  };

  const getCoinValue = (coin, amount) => {
    if (coin === 'usdt') return amount;
    const coinMap = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', xrp: 'ripple', sol: 'solana' };
    const priceData = prices.find(p => p.coin_id === coinMap[coin]);
    return priceData ? amount * priceData.current_price : 0;
  };

  const getTotalValue = () => {
    if (!wallet) return 0;
    return Object.entries(wallet.balances).reduce((total, [coin, amount]) => {
      return total + getCoinValue(coin, amount);
    }, 0);
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 
                className="text-2xl font-bold mb-2" 
                style={{ fontFamily: 'Unbounded' }}
                data-testid="wallet-title"
              >
                Wallet
              </h1>
              <p className="text-[#8F8F9D]">Manage your crypto assets</p>
            </div>
            <div className="flex gap-4">
              {/* Deposit Dialog */}
              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#00E599] hover:bg-[#00C282] text-black font-semibold flex items-center gap-2" data-testid="deposit-btn">
                    <ArrowDown size={20} /> Deposit
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#12121A] border-white/10">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: 'Unbounded' }}>Deposit Crypto</DialogTitle>
                    <DialogDescription>
                      Send crypto to your CryptoVault wallet
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleDeposit} className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label>Select Coin</Label>
                      <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                        <SelectTrigger className="bg-[#0A0A0A] border-white/20" data-testid="deposit-coin-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#12121A] border-white/10">
                          {supportedCoins.map(coin => (
                            <SelectItem key={coin.id} value={coin.id}>
                              {coin.name} ({coin.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Deposit Address</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={depositAddresses[selectedCoin]}
                          readOnly
                          className="bg-[#0A0A0A] border-white/20 font-mono text-xs"
                          data-testid="deposit-address"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(depositAddresses[selectedCoin])}
                          className="border-white/20"
                          data-testid="copy-address-btn"
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                      <p className="text-xs text-[#8F8F9D]">
                        Send only {selectedCoin.toUpperCase()} to this address
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount (for demo)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-[#0A0A0A] border-white/20"
                        required
                        data-testid="deposit-amount-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Transaction Hash (optional)</Label>
                      <Input
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="0x..."
                        className="bg-[#0A0A0A] border-white/20 font-mono"
                        data-testid="deposit-txhash-input"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full bg-[#00E599] hover:bg-[#00C282] text-black font-semibold"
                      data-testid="deposit-submit-btn"
                    >
                      {submitting ? "Processing..." : "Confirm Deposit"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Withdraw Dialog */}
              <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-white/20 hover:bg-white/10 flex items-center gap-2" data-testid="withdraw-btn">
                    <ArrowUp size={20} /> Withdraw
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#12121A] border-white/10">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: 'Unbounded' }}>Withdraw Crypto</DialogTitle>
                    <DialogDescription>
                      Withdraw crypto to an external wallet
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleWithdraw} className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label>Select Coin</Label>
                      <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                        <SelectTrigger className="bg-[#0A0A0A] border-white/20" data-testid="withdraw-coin-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#12121A] border-white/10">
                          {supportedCoins.map(coin => (
                            <SelectItem key={coin.id} value={coin.id}>
                              {coin.name} ({coin.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Amount</Label>
                        <span className="text-xs text-[#8F8F9D]">
                          Available: {wallet?.balances?.[selectedCoin]?.toFixed(6) || '0'} {selectedCoin.toUpperCase()}
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-[#0A0A0A] border-white/20"
                        required
                        data-testid="withdraw-amount-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Withdrawal Address</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter wallet address"
                        className="bg-[#0A0A0A] border-white/20 font-mono"
                        required
                        data-testid="withdraw-address-input"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full bg-[#FF3B30] hover:bg-[#E62E23] text-white font-semibold"
                      data-testid="withdraw-submit-btn"
                    >
                      {submitting ? "Processing..." : "Confirm Withdrawal"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Total Balance Card */}
          <div className="bg-[#12121A] border border-white/10 p-8 mb-8" data-testid="total-balance-card">
            <p className="text-[#8F8F9D] text-sm mb-2">Total Balance</p>
            <p className="text-4xl font-bold font-mono text-[#00E599]" data-testid="total-balance">
              ${getTotalValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Assets List */}
          <div className="bg-[#12121A] border border-white/10" data-testid="assets-list">
            <div className="p-6 border-b border-white/10">
              <h2 className="font-bold" style={{ fontFamily: 'Unbounded' }}>Your Assets</h2>
            </div>
            <div className="divide-y divide-white/5">
              {wallet && supportedCoins.map(coin => {
                const balance = wallet.balances[coin.id] || 0;
                const value = getCoinValue(coin.id, balance);
                
                return (
                  <div 
                    key={coin.id}
                    className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                    data-testid={`asset-${coin.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#00E599]/20 flex items-center justify-center">
                        <span className="font-bold text-[#00E599]">{coin.symbol}</span>
                      </div>
                      <div>
                        <p className="font-medium">{coin.name}</p>
                        <p className="text-sm text-[#8F8F9D]">{coin.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium" data-testid={`balance-${coin.id}`}>
                        {balance.toFixed(coin.id === 'usdt' ? 2 : 6)} {coin.symbol}
                      </p>
                      <p className="text-sm text-[#8F8F9D] font-mono">
                        ≈ ${value.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WalletPage;
