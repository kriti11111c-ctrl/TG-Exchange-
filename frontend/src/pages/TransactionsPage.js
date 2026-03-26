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
  ArrowDown,
  ArrowUp,
  ArrowsDownUp
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

// Navigation Component
const DashboardNav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="transactions-logo">
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
          <Link to="/trade" className="text-[#8F8F9D] hover:text-[#00E599] transition-colors" data-testid="nav-trade">
            <ArrowsLeftRight size={24} />
          </Link>
          <Link to="/transactions" className="text-white hover:text-[#00E599] transition-colors" data-testid="nav-transactions">
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

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [summaryStats, setSummaryStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTrades: 0,
    welcomeBonus: 0,
    salary: 0,
    rankReward: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, { withCredentials: true });
      const txList = response.data || [];
      setTransactions(txList);
      
      // Calculate all summary stats
      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalTrades = 0;
      let welcomeBonus = 0;
      let salary = 0;
      let rankReward = 0;
      
      txList.forEach(tx => {
        const amount = tx.amount || 0;
        const totalUsd = tx.total_usd || amount;
        
        if (tx.type === 'deposit') totalDeposits += totalUsd;
        if (tx.type === 'withdraw') totalWithdrawals += totalUsd;
        if (tx.type === 'buy' || tx.type === 'sell') totalTrades += totalUsd;
        if (tx.type === 'welcome_bonus') welcomeBonus += amount;
        if (tx.type === 'monthly_salary' || tx.type === 'team_bonus') salary += amount;
        if (tx.type === 'levelup_reward') rankReward += amount;
        if (tx.type === 'referral_bonus') salary += amount;
      });
      
      setSummaryStats({ totalDeposits, totalWithdrawals, totalTrades, welcomeBonus, salary, rankReward });
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <ArrowDown size={16} className="text-[#00E599]" />;
      case 'withdraw':
        return <ArrowUp size={16} className="text-[#FF3B30]" />;
      case 'buy':
        return <ArrowsDownUp size={16} className="text-[#00E599]" />;
      case 'sell':
        return <ArrowsDownUp size={16} className="text-[#FF3B30]" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'deposit':
      case 'buy':
        return 'bg-[#00E599]/20 text-[#00E599]';
      case 'withdraw':
      case 'sell':
        return 'bg-[#FF3B30]/20 text-[#FF3B30]';
      default:
        return 'bg-white/10 text-white';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-[#00E599]/20 text-[#00E599]';
      case 'pending':
        return 'bg-[#F5A623]/20 text-[#F5A623]';
      case 'failed':
        return 'bg-[#FF3B30]/20 text-[#FF3B30]';
      default:
        return 'bg-white/10 text-white';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'trades') return tx.type === 'buy' || tx.type === 'sell';
    if (filter === 'deposits') return tx.type === 'deposit';
    if (filter === 'withdrawals') return tx.type === 'withdraw';
    // Card-based filters
    if (filter === 'welcome_bonus') return tx.type === 'welcome_bonus';
    if (filter === 'salary') return tx.type === 'monthly_salary' || tx.type === 'team_bonus' || tx.type === 'referral_bonus';
    if (filter === 'rank_reward') return tx.type === 'levelup_reward';
    return true;
  });

  const handleCardClick = (cardType) => {
    // Toggle filter - if same card clicked again, show all
    if (filter === cardType) {
      setFilter('all');
    } else {
      setFilter(cardType);
    }
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 
                className="text-2xl font-bold mb-2" 
                style={{ fontFamily: 'Unbounded' }}
                data-testid="transactions-title"
              >
                Transaction History
              </h1>
              <p className="text-[#8F8F9D]">View all your transactions</p>
            </div>
          </div>

          {/* Summary Cards - 6 Cards in 2 Rows */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {/* Row 1: Basic Stats */}
            <div 
              onClick={() => handleCardClick('deposits')}
              className={`bg-[#12121A] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${filter === 'deposits' ? 'border-[#00E599] ring-2 ring-[#00E599]/30' : 'border-white/10 hover:border-[#00E599]/50'}`}
              data-testid="card-deposits"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#00E599]/20 flex items-center justify-center">
                  <ArrowDown size={18} className="text-[#00E599]" />
                </div>
                <span className="text-[#8F8F9D] text-sm">Total Deposits</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">${summaryStats.totalDeposits.toFixed(2)}</p>
            </div>

            <div 
              onClick={() => handleCardClick('withdrawals')}
              className={`bg-[#12121A] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${filter === 'withdrawals' ? 'border-[#FF3B30] ring-2 ring-[#FF3B30]/30' : 'border-white/10 hover:border-[#FF3B30]/50'}`}
              data-testid="card-withdrawals"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/20 flex items-center justify-center">
                  <ArrowUp size={18} className="text-[#FF3B30]" />
                </div>
                <span className="text-[#8F8F9D] text-sm">Total Withdrawals</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">${summaryStats.totalWithdrawals.toFixed(2)}</p>
            </div>

            <div 
              onClick={() => handleCardClick('trades')}
              className={`bg-[#12121A] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${filter === 'trades' ? 'border-[#F5A623] ring-2 ring-[#F5A623]/30' : 'border-white/10 hover:border-[#F5A623]/50'}`}
              data-testid="card-trades"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5A623]/20 flex items-center justify-center">
                  <ArrowsDownUp size={18} className="text-[#F5A623]" />
                </div>
                <span className="text-[#8F8F9D] text-sm">Total Trades</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">${summaryStats.totalTrades.toFixed(2)}</p>
            </div>

            {/* Row 2: Bonus Stats */}
            <div 
              onClick={() => handleCardClick('welcome_bonus')}
              className={`bg-gradient-to-br from-[#00E599]/10 to-[#12121A] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${filter === 'welcome_bonus' ? 'border-[#00E599] ring-2 ring-[#00E599]/30' : 'border-[#00E599]/30 hover:border-[#00E599]/60'}`}
              data-testid="card-welcome-bonus"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#00E599]/20 flex items-center justify-center">
                  <span className="text-[#00E599] text-lg">🎁</span>
                </div>
                <span className="text-[#00E599] text-sm font-medium">Welcome Bonus</span>
              </div>
              <p className="text-xl font-bold text-[#00E599] font-mono">${summaryStats.welcomeBonus.toFixed(2)}</p>
            </div>

            <div 
              onClick={() => handleCardClick('salary')}
              className={`bg-gradient-to-br from-[#F5A623]/10 to-[#12121A] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${filter === 'salary' ? 'border-[#F5A623] ring-2 ring-[#F5A623]/30' : 'border-[#F5A623]/30 hover:border-[#F5A623]/60'}`}
              data-testid="card-salary"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5A623]/20 flex items-center justify-center">
                  <span className="text-[#F5A623] text-lg">💰</span>
                </div>
                <span className="text-[#F5A623] text-sm font-medium">Salary</span>
              </div>
              <p className="text-xl font-bold text-[#F5A623] font-mono">${summaryStats.salary.toFixed(2)}</p>
            </div>

            <div 
              onClick={() => handleCardClick('rank_reward')}
              className={`bg-gradient-to-br from-[#9B59B6]/10 to-[#12121A] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${filter === 'rank_reward' ? 'border-[#9B59B6] ring-2 ring-[#9B59B6]/30' : 'border-[#9B59B6]/30 hover:border-[#9B59B6]/60'}`}
              data-testid="card-rank-reward"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#9B59B6]/20 flex items-center justify-center">
                  <span className="text-[#9B59B6] text-lg">🏆</span>
                </div>
                <span className="text-[#9B59B6] text-sm font-medium">Rank Reward</span>
              </div>
              <p className="text-xl font-bold text-[#9B59B6] font-mono">${summaryStats.rankReward.toFixed(2)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {['all', 'trades', 'deposits', 'withdrawals'].map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f 
                  ? 'bg-[#00E599] text-black hover:bg-[#00C282]' 
                  : 'border-white/20 hover:bg-white/10'
                }
                data-testid={`filter-${f}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="bg-[#12121A] border border-white/10" data-testid="transactions-table">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <ClockCounterClockwise size={48} className="text-[#8F8F9D] mx-auto mb-4" />
                <p className="text-[#8F8F9D]">No transactions found</p>
                <Link to="/trade">
                  <Button className="mt-4 bg-[#00E599] hover:bg-[#00C282] text-black">
                    Start Trading
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-[#8F8F9D] border-b border-white/10">
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Asset</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                      <th className="px-6 py-4 font-medium text-right">Price</th>
                      <th className="px-6 py-4 font-medium text-right">Total</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.tx_id} 
                        className="border-b border-white/5 table-row-hover hover:text-white"
                        data-testid={`tx-row-${tx.tx_id}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getTypeColor(tx.type)} border-0 font-medium`}>
                              <span className="flex items-center gap-1">
                                {getTypeIcon(tx.type)}
                                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                              </span>
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#00E599]/20 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#00E599]">
                                {tx.coin.toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{tx.coin.toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {tx.amount.toFixed(tx.coin === 'usdt' ? 2 : 6)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-[#8F8F9D]">
                          {tx.price_usd ? `$${tx.price_usd.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {tx.total_usd ? `$${tx.total_usd.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${getStatusColor(tx.status)} border-0`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-[#8F8F9D]">
                          {formatDate(tx.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TransactionsPage;
