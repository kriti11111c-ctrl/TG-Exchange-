import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  List,
  X,
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
  MagnifyingGlass,
  Copy,
  Eye,
  EyeSlash,
  CheckCircle,
  XCircle
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const AdminPanelPro = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
  const [txHashInputs, setTxHashInputs] = useState({});

  const adminToken = localStorage.getItem("admin_token");
  const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");

  // Menu items
  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: House, color: "bg-cyan-500" },
    { id: "users", name: "Users", icon: Users, color: "bg-blue-500" },
    { id: "deposit", name: "Deposit", icon: Money, color: "bg-green-500" },
    { id: "withdrawal", name: "Withdrawal", icon: Wallet, color: "bg-red-500" },
    { id: "address", name: "Address & Private Key", icon: Key, color: "bg-yellow-500" },
    { id: "rank", name: "Rank Members", icon: Crown, color: "bg-purple-500" },
    { id: "tradecode", name: "Trade Codes", icon: Ticket, color: "bg-teal-500" },
    { id: "kyc", name: "KYC", icon: IdentificationCard, color: "bg-orange-500" },
  ];

  const rankNames = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion', 'Legend', 'Immortal'];

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

  const fetchSectionData = async (section) => {
    const headers = { Authorization: `Bearer ${adminToken}` };
    try {
      switch(section) {
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
          const rankRes = await axios.get(`${API}/admin/users`, { headers });
          setRankMembers((rankRes.data.users || []).filter(u => u.team_rank_level > 0));
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
      console.error(`Failed to fetch ${section}:`, error);
    }
  };

  const handleMenuClick = (sectionId) => {
    setActiveSection(sectionId);
    setMenuOpen(false);
    setSearchQuery("");
    if (sectionId !== "dashboard") {
      fetchSectionData(sectionId);
    }
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
      fetchSectionData("deposit");
    } catch (error) {
      toast.error(`Failed to ${action}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdrawalAction = async (requestId, action) => {
    const txHash = txHashInputs[requestId] || "";
    if (action === "approve" && txHash.length < 10) {
      toast.error("Enter TX Hash first");
      return;
    }
    setProcessingId(requestId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/withdrawal-requests/action`, { request_id: requestId, action, tx_hash: txHash }, { headers });
      toast.success(`Withdrawal ${action}d`);
      fetchSectionData("withdrawal");
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
      fetchSectionData("kyc");
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

  const getCurrentSectionName = () => {
    const item = menuItems.find(m => m.id === activeSection);
    return item ? item.name : "Dashboard";
  };

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
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center hover:bg-[#333] transition-colors"
            >
              {menuOpen ? <X size={24} className="text-white" /> : <List size={24} className="text-white" />}
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">{getCurrentSectionName()}</h1>
              <p className="text-xs text-gray-500">{adminData.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-red-500/50 text-red-400">
            <SignOut size={16} />
          </Button>
        </div>
      </header>

      {/* Sidebar Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70" onClick={() => setMenuOpen(false)}>
          <div className="w-72 h-full bg-[#111] border-r border-[#222] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    activeSection === item.id 
                      ? `${item.color} text-white` 
                      : "bg-[#1a1a1a] text-gray-300 hover:bg-[#222]"
                  }`}
                >
                  <item.icon size={24} />
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4">
        
        {/* Top Cards - Always Visible */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Total Users" value={stats?.total_users || 0} color="cyan" />
          <StatCard label="Total Deposits" value={`$${(stats?.total_deposit_value || 0).toLocaleString()}`} color="green" />
          <StatCard label="Pending Deposits" value={stats?.pending_deposits || 0} color="orange" />
          <StatCard label="Today Signups" value={stats?.today_signups || 0} color="purple" />
        </div>

        {/* Refresh + Search Bar */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={() => { fetchStats(); if(activeSection !== 'dashboard') fetchSectionData(activeSection); }}
            className="bg-[#222] hover:bg-[#333] text-white"
          >
            <ArrowsClockwise size={18} className="mr-1" /> Refresh
          </Button>
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input 
              placeholder="Search by name, email, address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#111] border-[#333] text-white w-full"
            />
          </div>
        </div>

        {/* Dashboard */}
        {activeSection === "dashboard" && (
          <div className="text-center py-8">
            <p className="text-gray-500">Select a section from menu</p>
          </div>
        )}

        {/* Users */}
        {activeSection === "users" && (
          <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
            {users.filter(u => 
              !searchQuery || 
              u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((user, idx) => (
              <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                    <p className="text-xs text-green-400 mt-1">S: ${(user.wallet?.balances?.usdt || 0).toFixed(2)} | F: ${(user.wallet?.futures_balance || 0).toFixed(2)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLoginAsUser(user.user_id, user.email)}
                    disabled={loggingInAs === user.user_id}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {loggingInAs === user.user_id ? "..." : "Login"}
                  </Button>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 text-center py-8">No users found</p>}
          </div>
        )}

        {/* Deposit */}
        {activeSection === "deposit" && (
          <div className="space-y-4">
            {/* Pending Deposits */}
            <div>
              <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                Pending Deposits ({deposits.filter(d => d.status === 'pending').length})
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {deposits.filter(d => d.status === 'pending').filter(dep =>
                  !searchQuery || 
                  dep.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((dep, idx) => (
                  <div key={idx} className="bg-[#111] border border-orange-500/30 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-green-400 font-bold text-xl">+${dep.amount}</p>
                        <p className="text-sm text-gray-400">{dep.user_email}</p>
                        <p className="text-xs text-gray-500 uppercase">{dep.network}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400">PENDING</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleDepositAction(dep.request_id, 'approve')} disabled={processingId === dep.request_id} className="bg-green-600 text-white flex-1">
                        <CheckCircle size={16} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" onClick={() => handleDepositAction(dep.request_id, 'reject')} disabled={processingId === dep.request_id} variant="outline" className="border-red-500 text-red-400 flex-1">
                        <XCircle size={16} className="mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {deposits.filter(d => d.status === 'pending').length === 0 && <p className="text-gray-500 text-center py-4">No pending deposits</p>}
              </div>
            </div>

            {/* Completed Deposits History */}
            <div>
              <h3 className="text-green-400 font-semibold mb-2">Completed Deposits History</h3>
              <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto">
                {deposits.filter(d => d.status !== 'pending').filter(dep =>
                  !searchQuery || 
                  dep.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((dep, idx) => (
                  <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-green-400 font-bold">+${dep.amount}</p>
                        <p className="text-xs text-gray-400">{dep.user_email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        dep.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{dep.status?.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
                {deposits.filter(d => d.status !== 'pending').length === 0 && <p className="text-gray-500 text-center py-4">No deposit history</p>}
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal */}
        {activeSection === "withdrawal" && (
          <div className="space-y-4">
            {/* Pending Withdrawals */}
            <div>
              <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                Pending Withdrawals ({withdrawals.filter(w => w.status === 'pending').length})
              </h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {withdrawals.filter(w => w.status === 'pending').filter(wd =>
                  !searchQuery || 
                  wd.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  wd.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((wd, idx) => (
                  <div key={idx} className="bg-[#111] border border-orange-500/30 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-red-400 font-bold text-xl">-${wd.amount}</p>
                        <p className="text-sm text-gray-400">{wd.user_name}</p>
                        <p className="text-xs text-gray-500">{wd.user_email}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400">PENDING</span>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">S: ${(wd.spot_balance || 0).toFixed(2)}</span>
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">F: ${(wd.futures_balance || 0).toFixed(2)}</span>
                      {wd.is_verified ? (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✓ Verified</span>
                      ) : (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">✗ Unverified</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono break-all mb-3">{wd.wallet_address}</p>
                    <div className="space-y-2">
                      <Input 
                        placeholder="TX Hash..." 
                        value={txHashInputs[wd.request_id] || ""}
                        onChange={(e) => setTxHashInputs({...txHashInputs, [wd.request_id]: e.target.value})}
                        className="bg-[#0a0a0a] border-[#333] text-white text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleWithdrawalAction(wd.request_id, 'approve')} disabled={processingId === wd.request_id} className="bg-green-600 text-white flex-1">
                          Approve
                        </Button>
                        <Button size="sm" onClick={() => handleWithdrawalAction(wd.request_id, 'reject')} disabled={processingId === wd.request_id} variant="outline" className="border-red-500 text-red-400 flex-1">
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {withdrawals.filter(w => w.status === 'pending').length === 0 && <p className="text-gray-500 text-center py-4">No pending withdrawals</p>}
              </div>
            </div>

            {/* Completed Withdrawals */}
            <div>
              <h3 className="text-green-400 font-semibold mb-2">Completed Withdrawals</h3>
              <div className="space-y-2 max-h-[calc(100vh-550px)] overflow-y-auto">
                {withdrawals.filter(w => w.status !== 'pending').filter(wd =>
                  !searchQuery || 
                  wd.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  wd.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((wd, idx) => (
                  <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-red-400 font-bold">-${wd.amount}</p>
                        <p className="text-xs text-gray-400">{wd.user_name} - {wd.user_email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        wd.status === 'approved' || wd.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{wd.status?.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
                {withdrawals.filter(w => w.status !== 'pending').length === 0 && <p className="text-gray-500 text-center py-4">No completed withdrawals</p>}
              </div>
            </div>
          </div>
        )}

        {/* Address & Private Key */}
        {activeSection === "address" && (
          <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
            {addresses.filter(a => 
              !searchQuery || 
              a.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.address?.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((addr, idx) => (
                <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      addr.network === 'bsc' ? 'bg-yellow-500/20 text-yellow-400' :
                      addr.network === 'eth' ? 'bg-blue-500/20 text-blue-400' :
                      addr.network === 'tron' ? 'bg-red-500/20 text-red-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{addr.network?.toUpperCase()}</span>
                    <span className="text-xs text-gray-400">{addr.user_email}</span>
                  </div>
                  
                  <p className="text-sm font-mono text-white break-all mb-3">{addr.address}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="text-xs border-[#333] text-gray-400" onClick={() => copyText(addr.address)}>
                      <Copy size={14} className="mr-1" /> Copy Address
                    </Button>
                    {addr.has_private_key && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400" onClick={() => setShowPrivateKeys({...showPrivateKeys, [idx]: !showPrivateKeys[idx]})}>
                          {showPrivateKeys[idx] ? <EyeSlash size={14} /> : <Eye size={14} />}
                          <span className="ml-1">{showPrivateKeys[idx] ? 'Hide' : 'Show'} Key</span>
                        </Button>
                        {showPrivateKeys[idx] && (
                          <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400" onClick={() => copyText(addr.private_key)}>
                            <Copy size={14} className="mr-1" /> Copy Key
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {showPrivateKeys[idx] && addr.private_key && (
                    <div className="mt-3 p-3 bg-[#0a0a0a] rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Private Key:</p>
                      <p className="text-xs font-mono text-yellow-400 break-all">{addr.private_key}</p>
                    </div>
                  )}
                </div>
              ))}
              {addresses.length === 0 && <p className="text-gray-500 text-center py-8">No addresses found</p>}
          </div>
        )}

        {/* Rank Members */}
        {activeSection === "rank" && (
          <div className="space-y-2 max-h-[calc(100vh-150px)] overflow-y-auto">
            {rankMembers.map((user, idx) => (
              <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Crown size={20} className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">
                      {rankNames[user.team_rank_level] || 'None'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">${(user.wallet?.futures_balance || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
            {rankMembers.length === 0 && <p className="text-gray-500 text-center py-12">No VIP members yet</p>}
          </div>
        )}

        {/* Trade Codes */}
        {activeSection === "tradecode" && (
          <div className="space-y-2 max-h-[calc(100vh-150px)] overflow-y-auto">
            {tradeCodes.slice(0, 100).map((tc, idx) => (
              <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-400 font-mono font-bold text-lg">{tc.code}</p>
                    <p className="text-xs text-gray-400">{tc.user_email || tc.user_id?.slice(0, 15)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      tc.status === 'live' ? 'bg-green-500/20 text-green-400' :
                      tc.status === 'used' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>{tc.status?.toUpperCase()}</span>
                    <p className="text-xs text-gray-500 mt-1">{tc.coin} • {tc.profit_percent}%</p>
                  </div>
                </div>
              </div>
            ))}
            {tradeCodes.length === 0 && <p className="text-gray-500 text-center py-12">No trade codes</p>}
          </div>
        )}

        {/* KYC */}
        {activeSection === "kyc" && (
          <div className="space-y-2 max-h-[calc(100vh-150px)] overflow-y-auto">
            {kycRequests.map((kyc, idx) => (
              <div key={idx} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-semibold">{kyc.full_name || kyc.user_name}</p>
                    <p className="text-xs text-gray-400">{kyc.user_email}</p>
                    <p className="text-xs text-gray-500 mt-1">Aadhar: {kyc.aadhar_number || 'N/A'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    kyc.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                    kyc.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{kyc.status?.toUpperCase()}</span>
                </div>
                {kyc.status === 'pending' && (
                  <div className="flex gap-2">
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
            {kycRequests.length === 0 && <p className="text-gray-500 text-center py-12">No KYC requests</p>}
          </div>
        )}

      </main>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, color }) => {
  const colors = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
    green: "from-green-500/20 to-green-500/5 border-green-500/30 text-green-400",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400"
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${colors[color].split(' ').pop()}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
};

export default AdminPanelPro;
