import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme, API } from "../App";
import axios from "axios";
import { 
  CaretLeft,
  ArrowUp,
  ArrowDown,
  Wallet,
  Gift,
  Users,
  TrendUp,
  ArrowsLeftRight,
  Clock,
  CurrencyCircleDollar,
  Funnel
} from "@phosphor-icons/react";
import BottomNav from "../components/BottomNav";

const TransactionsPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    total_income: 0,
    total_expense: 0,
    net_balance: 0
  });

  const bg = isDark ? 'bg-[#0B0E11]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/wallet/all-history`, {
        withCredentials: true
      });
      setHistory(res.data.history || []);
      setStats({
        total_income: res.data.total_income || 0,
        total_expense: res.data.total_expense || 0,
        net_balance: res.data.net_balance || 0
      });
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getIcon = (type) => {
    switch(type) {
      case "deposit":
      case "admin_adjustment":
        return <ArrowDown size={20} className="text-[#0ECB81]" />;
      case "withdrawal":
        return <ArrowUp size={20} className="text-[#F6465D]" />;
      case "welcome_bonus":
      case "bonus":
        return <Gift size={20} className="text-[#00E5FF]" />;
      case "referral":
      case "referral_bonus":
      case "commission":
        return <Users size={20} className="text-purple-400" />;
      case "trade_code":
      case "trade_profit":
        return <TrendUp size={20} className="text-[#0ECB81]" />;
      case "salary":
        return <CurrencyCircleDollar size={20} className="text-yellow-400" />;
      case "spot_to_futures":
      case "futures_to_spot":
      case "transfer":
        return <ArrowsLeftRight size={20} className="text-blue-400" />;
      default:
        return <Wallet size={20} className={textMuted} />;
    }
  };

  const getBgColor = (type) => {
    switch(type) {
      case "deposit":
      case "admin_adjustment":
        return "bg-[#0ECB81]/20";
      case "withdrawal":
        return "bg-[#F6465D]/20";
      case "welcome_bonus":
      case "bonus":
        return "bg-[#00E5FF]/20";
      case "referral":
      case "referral_bonus":
      case "commission":
        return "bg-purple-500/20";
      case "trade_code":
      case "trade_profit":
        return "bg-[#0ECB81]/20";
      case "salary":
        return "bg-yellow-500/20";
      case "spot_to_futures":
      case "futures_to_spot":
      case "transfer":
        return "bg-blue-500/20";
      default:
        return isDark ? "bg-[#2B3139]" : "bg-gray-100";
    }
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "deposit", label: "Deposits" },
    { id: "withdrawal", label: "Withdrawals" },
    { id: "bonus", label: "Bonus" },
    { id: "trade", label: "Trades" },
    { id: "referral", label: "Referral" }
  ];

  const filteredHistory = history.filter(item => {
    if (filter === "all") return true;
    if (filter === "deposit") return item.type === "deposit" || item.type === "admin_adjustment";
    if (filter === "withdrawal") return item.type === "withdrawal";
    if (filter === "bonus") return ["welcome_bonus", "bonus"].includes(item.type);
    if (filter === "trade") return ["trade_code", "trade_profit", "trade"].includes(item.type);
    if (filter === "referral") return ["referral", "referral_bonus", "commission", "salary"].includes(item.type);
    return true;
  });

  // Group by date
  const groupedHistory = filteredHistory.reduce((groups, item) => {
    const date = item.date || "Unknown";
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  return (
    <div className={`min-h-screen ${bg} pb-24`}>
      {/* Header */}
      <header className={`${cardBg} border-b ${border} sticky top-0 z-50`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#2B3139]' : 'hover:bg-gray-100'}`}>
              <CaretLeft size={24} className={text} />
            </button>
            <h1 className={`text-lg font-bold ${text}`}>Transaction History</h1>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className={`${cardBg} rounded-xl p-3 border ${border}`}>
            <p className={`text-[10px] ${textMuted}`}>Total Income</p>
            <p className="text-[#0ECB81] font-bold text-sm">+${stats.total_income.toLocaleString()}</p>
          </div>
          <div className={`${cardBg} rounded-xl p-3 border ${border}`}>
            <p className={`text-[10px] ${textMuted}`}>Total Expense</p>
            <p className="text-[#F6465D] font-bold text-sm">-${stats.total_expense.toLocaleString()}</p>
          </div>
          <div className={`${cardBg} rounded-xl p-3 border ${border}`}>
            <p className={`text-[10px] ${textMuted}`}>Net Balance</p>
            <p className={`font-bold text-sm ${stats.net_balance >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              ${stats.net_balance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-[#00E5FF] text-black'
                  : `${isDark ? 'bg-[#2B3139] text-gray-300' : 'bg-gray-200 text-gray-700'}`
              }`}
              data-testid={`filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00E5FF]"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className={`${cardBg} rounded-xl p-8 text-center border ${border}`}>
            <Clock size={48} className={`${textMuted} mx-auto mb-3`} />
            <p className={text}>No transactions found</p>
            <p className={`text-sm ${textMuted}`}>Your transaction history will appear here</p>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className="space-y-2">
              {/* Date Header */}
              <div className="flex items-center gap-2 py-2">
                <div className={`h-px flex-1 ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}></div>
                <span className={`text-xs font-medium ${textMuted} px-2`}>{date}</span>
                <div className={`h-px flex-1 ${isDark ? 'bg-[#2B3139]' : 'bg-gray-200'}`}></div>
              </div>

              {/* Transactions for this date */}
              {items.map((item, index) => (
                <div 
                  key={item.id || index}
                  className={`${cardBg} rounded-xl p-4 border ${border}`}
                  data-testid={`tx-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${getBgColor(item.type)} flex items-center justify-center flex-shrink-0`}>
                      {getIcon(item.type)}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${text} text-sm truncate`}>{item.description}</p>
                        <p className={`font-bold ${item.is_income ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {item.is_income ? '+' : '-'}${item.amount?.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getBgColor(item.type)} font-medium`}>
                          {item.category}
                        </span>
                        <span className={`text-xs ${textMuted}`}>{item.time} UTC</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {item.details && (item.details.profit_percent || item.details.trade_amount) && (
                    <div className={`mt-3 pt-3 border-t border-dashed ${border} grid grid-cols-2 gap-2 text-xs`}>
                      {item.details.trade_amount && (
                        <div>
                          <span className={textMuted}>Trade Amount:</span>
                          <span className={`${text} ml-1`}>${item.details.trade_amount?.toFixed(2)}</span>
                        </div>
                      )}
                      {item.details.profit_percent && (
                        <div>
                          <span className={textMuted}>Profit:</span>
                          <span className="text-[#0ECB81] ml-1 font-bold">{item.details.profit_percent}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default TransactionsPage;
