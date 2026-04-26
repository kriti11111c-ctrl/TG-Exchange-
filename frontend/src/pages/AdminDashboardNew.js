import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  House,
  Users,
  Money,
  Wallet,
  Key,
  Crown,
  Ticket,
  IdentificationCard,
  SignOut,
  ArrowsClockwise,
  CaretRight,
  MagnifyingGlass,
  Copy,
  Eye,
  EyeSlash,
  UserSwitch,
  CheckCircle,
  XCircle,
  Prohibit
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const AdminDashboardNew = () => {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [rankMembers, setRankMembers] = useState([]);
  const [tradeCodes, setTradeCodes] = useState([]);
  const [kycRequests, setKycRequests] = useState([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [showPrivateKeys, setShowPrivateKeys] = useState({});
  const [loggingInAs, setLoggingInAs] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const adminToken = localStorage.getItem("admin_token");
  const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");

  useEffect(() => {
    if (!adminToken) {
      navigate("/admin");
      return;
    }
    fetchStats();
  }, [adminToken, navigate]);

  const fetchStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.get(`${API}/admin/stats`, { headers });
      setStats(res.data);
      setLoading(false);
    } catch (error) {
      if (error.response?.status === 401) navigate("/admin");
      setLoading(false);
    }
  };

  const fetchCardData = async (cardType) => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    try {
      switch(cardType) {
        case "users":
          const usersRes = await axios.get(`${API}/admin/users`, { headers });
          setUsers(usersRes.data.users || []);
          break;
        case "deposit":
          const depRes = await axios.get(`${API}/admin/deposit-requests`, { headers });
          setDeposits(depRes.data.requests || []);
          break;
        case "withdrawal":
          const wdRes = await axios.get(`${API}/admin/withdrawal-requests`, { headers });
          setWithdrawals(wdRes.data.requests || []);
          break;
        case "address":
          const addrRes = await axios.get(`${API}/admin/deposit-addresses`, { headers });
          setAddresses(addrRes.data.addresses || []);
          break;
        case "rank":
          const usersRes2 = await axios.get(`${API}/admin/users`, { headers });
          setRankMembers((usersRes2.data.users || []).filter(u => u.team_rank_level > 0));
          break;
        case "tradecode":
          const tcRes = await axios.get(`${API}/admin/trade-codes`, { headers });
          setTradeCodes(tcRes.data.codes || []);
          break;
        case "kyc":
          const kycRes = await axios.get(`${API}/admin/kyc/all`, { headers });
          setKycRequests(kycRes.data.requests || []);
          break;
      }
    } catch (error) {
      console.error(`Failed to fetch ${cardType}:`, error);
    }
  };

  const handleCardClick = (cardType) => {
    setActiveCard(cardType);
    setSearchQuery("");
    if (cardType !== "dashboard") {
      fetchCardData(cardType);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    if (activeCard !== "dashboard") {
      await fetchCardData(activeCard);
    }
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_data");
    navigate("/admin");
  };

  const handleLoginAsUser = async (userId, email) => {
    setLoggingInAs(userId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.post(`${API}/admin/login-as-user`, { user_id: userId }, { headers });
      localStorage.removeItem("admin_token");
      localStorage.setItem("auth_token", res.data.access_token);
      localStorage.setItem("user_data", JSON.stringify(res.data.user));
      toast.success(`Logged in as ${email}`);
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to login as user");
    } finally {
      setLoggingInAs(null);
    }
  };

  const handleDepositAction = async (requestId, action) => {
    setProcessingId(requestId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/deposit-requests/action`, { request_id: requestId, action }, { headers });
      toast.success(`Deposit ${action}d`);
      fetchCardData("deposit");
    } catch (error) {
      toast.error(`Failed to ${action}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdrawalAction = async (requestId, action, txHash = "") => {
    if (action === "approve" && !txHash) {
      toast.error("Enter TX Hash first");
      return;
    }
    setProcessingId(requestId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/withdrawal-requests/action`, { request_id: requestId, action, tx_hash: txHash }, { headers });
      toast.success(`Withdrawal ${action}d`);
      fetchCardData("withdrawal");
    } catch (error) {
      toast.error(`Failed to ${action}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleKycAction = async (requestId, action) => {
    setProcessingId(requestId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/kyc/action`, { request_id: requestId, action }, { headers });
      toast.success(`KYC ${action}d`);
      fetchCardData("kyc");
    } catch (error) {
      toast.error(`Failed to ${action}`);
    } finally {
      setProcessingId(null);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  // Card definitions
  const cards = [
    { id: "dashboard", name: "Dashboard", icon: House, color: "from-cyan-500 to-blue-600" },
    { id: "users", name: "Users", icon: Users, color: "from-blue-500 to-indigo-600" },
    { id: "deposit", name: "Deposit", icon: Money, color: "from-green-500 to-emerald-600" },
    { id: "withdrawal", name: "Withdrawal", icon: Wallet, color: "from-red-500 to-pink-600" },
    { id: "address", name: "Address & Keys", icon: Key, color: "from-yellow-500 to-orange-600" },
    { id: "rank", name: "Rank Members", icon: Crown, color: "from-purple-500 to-pink-600" },
    { id: "tradecode", name: "Trade Codes", icon: Ticket, color: "from-teal-500 to-cyan-600" },
    { id: "kyc", name: "KYC", icon: IdentificationCard, color: "from-orange-500 to-red-600" },
  ];

  const rankNames = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion', 'Legend', 'Immortal'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#222] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <House size={20} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">TG Admin</h1>
              <p className="text-xs text-gray-500">{adminData.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" className="border-[#333] text-gray-400" disabled={refreshing}>
              <ArrowsClockwise size={16} className={refreshing ? "animate-spin" : ""} />
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-red-500/50 text-red-400">
              <SignOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 8 Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`p-4 rounded-xl border transition-all ${
                activeCard === card.id 
                  ? `bg-gradient-to-br ${card.color} border-transparent shadow-lg scale-105` 
                  : "bg-[#111] border-[#222] hover:border-[#444]"
              }`}
            >
              <card.icon size={28} className={activeCard === card.id ? "text-white" : "text-gray-400"} />
              <p className={`mt-2 font-semibold text-sm ${activeCard === card.id ? "text-white" : "text-gray-300"}`}>
                {card.name}
              </p>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          
          {/* Dashboard View */}
          {activeCard === "dashboard" && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Dashboard Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total Users" value={stats?.total_users || 0} color="cyan" />
                <StatBox label="Total Deposits" value={`$${(stats?.total_deposit_value || 0).toLocaleString()}`} color="green" />
                <StatBox label="Pending Deposits" value={stats?.pending_deposits || 0} color="orange" />
                <StatBox label="Today Signups" value={stats?.today_signups || 0} color="purple" />
              </div>
            </div>
          )}

          {/* Users View */}
          {activeCard === "users" && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <MagnifyingGlass size={18} className="text-gray-500" />
                <Input 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0a0a0a] border-[#333] text-white"
                />
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {users.filter(u => 
                  !searchQuery || 
                  u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.name?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((user, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <p className="text-xs text-green-400">S: ${(user.wallet?.balances?.usdt || 0).toFixed(2)} | F: ${(user.wallet?.futures_balance || 0).toFixed(2)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLoginAsUser(user.user_id, user.email)}
                      disabled={loggingInAs === user.user_id}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    >
                      {loggingInAs === user.user_id ? "..." : "Login"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deposit View */}
          {activeCard === "deposit" && (
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">Deposit Requests</h2>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {deposits.map((dep, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-green-400 font-bold text-lg">+${dep.amount}</p>
                        <p className="text-xs text-gray-400">{dep.user_email}</p>
                        <p className="text-xs text-gray-500">{dep.network?.toUpperCase()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        dep.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                        dep.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{dep.status}</span>
                    </div>
                    {dep.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => handleDepositAction(dep.request_id, 'approve')} disabled={processingId === dep.request_id} className="bg-green-600 text-white flex-1">
                          <CheckCircle size={16} /> Approve
                        </Button>
                        <Button size="sm" onClick={() => handleDepositAction(dep.request_id, 'reject')} disabled={processingId === dep.request_id} variant="outline" className="border-red-500 text-red-400 flex-1">
                          <XCircle size={16} /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {deposits.length === 0 && <p className="text-gray-500 text-center py-8">No deposits</p>}
              </div>
            </div>
          )}

          {/* Withdrawal View */}
          {activeCard === "withdrawal" && (
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">Withdrawal Requests</h2>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {withdrawals.map((wd, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-red-400 font-bold text-lg">-${wd.amount}</p>
                        <p className="text-xs text-gray-400">{wd.user_name} ({wd.user_email})</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">S: ${(wd.spot_balance || 0).toFixed(2)}</span>
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">F: ${(wd.futures_balance || 0).toFixed(2)}</span>
                          {wd.is_verified ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Verified</span>
                          ) : (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Unverified</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        wd.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                        wd.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{wd.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono break-all">{wd.wallet_address}</p>
                    {wd.status === 'pending' && (
                      <div className="mt-3 space-y-2">
                        <Input 
                          placeholder="TX Hash..." 
                          id={`tx-${wd.request_id}`}
                          className="bg-[#111] border-[#333] text-white text-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleWithdrawalAction(wd.request_id, 'approve', document.getElementById(`tx-${wd.request_id}`)?.value)} disabled={processingId === wd.request_id} className="bg-green-600 text-white flex-1">
                            Approve
                          </Button>
                          <Button size="sm" onClick={() => handleWithdrawalAction(wd.request_id, 'reject')} disabled={processingId === wd.request_id} variant="outline" className="border-red-500 text-red-400 flex-1">
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {withdrawals.length === 0 && <p className="text-gray-500 text-center py-8">No withdrawals</p>}
              </div>
            </div>
          )}

          {/* Address & Keys View */}
          {activeCard === "address" && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <MagnifyingGlass size={18} className="text-gray-500" />
                <Input 
                  placeholder="Search by email or address..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0a0a0a] border-[#333] text-white"
                />
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {addresses.filter(a => 
                  !searchQuery || 
                  a.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.address?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((addr, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        addr.network === 'bsc' ? 'bg-yellow-500/20 text-yellow-400' :
                        addr.network === 'eth' ? 'bg-blue-500/20 text-blue-400' :
                        addr.network === 'tron' ? 'bg-red-500/20 text-red-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>{addr.network?.toUpperCase()}</span>
                      <span className="text-xs text-gray-400">{addr.user_email}</span>
                    </div>
                    <p className="text-xs font-mono text-white break-all mb-2">{addr.address}</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs border-[#333] text-gray-400" onClick={() => copyText(addr.address)}>
                        <Copy size={12} /> Copy
                      </Button>
                      {addr.has_private_key && (
                        <>
                          <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400" onClick={() => setShowPrivateKeys({...showPrivateKeys, [idx]: !showPrivateKeys[idx]})}>
                            {showPrivateKeys[idx] ? <EyeSlash size={12} /> : <Eye size={12} />} Key
                          </Button>
                          {showPrivateKeys[idx] && (
                            <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400" onClick={() => copyText(addr.private_key)}>
                              <Copy size={12} /> Copy Key
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {showPrivateKeys[idx] && addr.private_key && (
                      <p className="text-xs font-mono text-yellow-400 break-all mt-2 bg-[#111] p-2 rounded">{addr.private_key}</p>
                    )}
                  </div>
                ))}
                {addresses.length === 0 && <p className="text-gray-500 text-center py-8">No addresses</p>}
              </div>
            </div>
          )}

          {/* Rank Members View */}
          {activeCard === "rank" && (
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">VIP Rank Members</h2>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {rankMembers.map((user, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown size={24} className="text-yellow-400" />
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">
                        {rankNames[user.team_rank_level] || 'None'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">${(user.wallet?.futures_balance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {rankMembers.length === 0 && <p className="text-gray-500 text-center py-8">No VIP members yet</p>}
              </div>
            </div>
          )}

          {/* Trade Codes View */}
          {activeCard === "tradecode" && (
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">Trade Codes</h2>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {tradeCodes.slice(0, 50).map((tc, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-cyan-400 font-mono font-bold">{tc.code}</p>
                      <p className="text-xs text-gray-400">{tc.user_email || tc.user_id?.slice(0, 10)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tc.status === 'live' ? 'bg-green-500/20 text-green-400' :
                        tc.status === 'used' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>{tc.status}</span>
                      <p className="text-xs text-gray-500 mt-1">{tc.coin} • {tc.profit_percent}%</p>
                    </div>
                  </div>
                ))}
                {tradeCodes.length === 0 && <p className="text-gray-500 text-center py-8">No trade codes</p>}
              </div>
            </div>
          )}

          {/* KYC View */}
          {activeCard === "kyc" && (
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">KYC Requests</h2>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {kycRequests.map((kyc, idx) => (
                  <div key={idx} className="bg-[#0a0a0a] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-medium">{kyc.full_name || kyc.user_name}</p>
                        <p className="text-xs text-gray-400">{kyc.user_email}</p>
                        <p className="text-xs text-gray-500">Aadhar: {kyc.aadhar_number || 'N/A'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        kyc.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                        kyc.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{kyc.status}</span>
                    </div>
                    {kyc.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => handleKycAction(kyc.request_id, 'approve')} disabled={processingId === kyc.request_id} className="bg-green-600 text-white flex-1">
                          Approve
                        </Button>
                        <Button size="sm" onClick={() => handleKycAction(kyc.request_id, 'reject')} disabled={processingId === kyc.request_id} variant="outline" className="border-red-500 text-red-400 flex-1">
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {kycRequests.length === 0 && <p className="text-gray-500 text-center py-8">No KYC requests</p>}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

// Stat Box Component
const StatBox = ({ label, value, color }) => {
  const colors = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    orange: "text-orange-400",
    purple: "text-purple-400"
  };
  return (
    <div className="bg-[#0a0a0a] rounded-xl p-4 text-center border border-[#222]">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
};

export default AdminDashboardNew;
