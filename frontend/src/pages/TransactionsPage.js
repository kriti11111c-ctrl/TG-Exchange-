import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import BottomNav from "../components/BottomNav";
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
            TG Xchange
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, { withCredentials: true });
      const txList = response.data || [];
      setTransactions(txList);
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
    if (filter === 'referral_bonus') return tx.type === 'referral_bonus';
    if (filter === 'welcome_bonus') return tx.type === 'welcome_bonus';
    if (filter === 'salary') return tx.type === 'monthly_salary' || tx.type === 'team_bonus';
    if (filter === 'rank_reward') return tx.type === 'levelup_reward';
    return true;
  });

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

          {/* Filters - Simple Classic Buttons with Equal Size */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { key: 'all', label: 'All' },
              { key: 'trades', label: 'Trades' },
              { key: 'deposits', label: 'Deposits' },
              { key: 'withdrawals', label: 'Withdraw' },
              { key: 'referral_bonus', label: 'Referral' },
              { key: 'welcome_bonus', label: 'Welcome' },
              { key: 'salary', label: 'Salary' },
              { key: 'rank_reward', label: 'Rank' }
            ].map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f.key)}
                className={`w-full text-center text-xs px-1 truncate ${filter === f.key 
                  ? 'bg-[#00E599] text-black hover:bg-[#00C282] font-medium' 
                  : 'border-white/20 hover:bg-white/10 text-white'
                }`}
                data-testid={`filter-${f.key}`}
              >
                {f.label}
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
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default TransactionsPage;
