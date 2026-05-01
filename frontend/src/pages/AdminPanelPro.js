import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  ShieldCheck, 
  Users, 
  Money, 
  Clock, 
  CheckCircle, 
  XCircle,
  SignOut,
  ArrowsClockwise,
  CaretRight,
  Wallet,
  TrendUp,
  Ticket,
  Copy,
  Eye,
  EyeSlash,
  UserSwitch,
  MagnifyingGlass,
  Prohibit,
  UserCircleCheck,
  Crown
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const AdminPanelPro = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // All Users State
  const [allUsers, setAllUsers] = useState([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState({});
  const [loggingInAs, setLoggingInAs] = useState(null);
  
  // Trade Code State
  const [tradeCodeForm, setTradeCodeForm] = useState({
    user_email: "",
    coin: "BTC",
    amount: "",
    trade_type: "buy",
    price: ""
  });
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [adminData, setAdminData] = useState({});
  const [isReady, setIsReady] = useState(false);
  
  // Deposit Addresses State
  const [showDepositAddresses, setShowDepositAddresses] = useState(false);
  const [depositAddresses, setDepositAddresses] = useState([]);
  const [addressSearch, setAddressSearch] = useState("");
  const [searchingAddresses, setSearchingAddresses] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showPrivateKeys, setShowPrivateKeys] = useState({});
  
  // VIP Users State
  const [showVipUsers, setShowVipUsers] = useState(false);
  const [selectedVipRank, setSelectedVipRank] = useState('All');

  // Load admin data on mount - FASTER
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const data = JSON.parse(localStorage.getItem("admin_data") || "{}");
    
    if (!token) {
      navigate("/admin");
      return;
    }
    
    setAdminToken(token);
    setAdminData(data);
    setIsReady(true);
  }, [navigate]);

  useEffect(() => {
    if (isReady && adminToken) {
      fetchData();
    }
  }, [isReady, adminToken]);

  const fetchData = async () => {
    // Get token directly from localStorage to avoid state race condition
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin");
      return;
    }
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch stats first for quick display, then other data
      const statsRes = await axios.get(`${API}/admin/stats`, { headers, timeout: 8000 });
      setStats(statsRes.data);
      setLoading(false); // Show stats immediately
      
      // Fetch other data in background
      const [depositsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/deposit-requests?status=pending`, { headers, timeout: 10000 }),
        axios.get(`${API}/admin/users`, { headers, timeout: 10000 })
      ]);

      setPendingDeposits(depositsRes.data.requests || []);
      setAllUsers(usersRes.data.users || []);
    } catch (error) {
      // Handle auth errors - redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_data");
        navigate("/admin");
        return;
      }
      console.error("Fetch error:", error);
      setLoading(false);
    }
  };

  // Login as User function
  const handleLoginAsUser = async (userId, userEmail) => {
    setLoggingInAs(userId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.post(`${API}/admin/login-as-user`, { user_id: userId }, { headers });
      
      // Clear admin session and set user session
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_data");
      
      // Set user token
      localStorage.setItem("auth_token", res.data.access_token);
      localStorage.setItem("user_data", JSON.stringify(res.data.user));
      
      toast.success(`Logged in as ${userEmail}`);
      
      // Redirect to user dashboard
      window.location.href = "/";
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to login as user");
    } finally {
      setLoggingInAs(null);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Filter users by search
  const filteredUsers = allUsers.filter(user => 
    user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.user_id?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Block/Unblock user
  const handleBlockUser = async (userId, userEmail, currentBlockStatus) => {
    const action = currentBlockStatus ? "unblock" : "block";
    const confirmMsg = currentBlockStatus 
      ? `Unblock user ${userEmail}?` 
      : `Block user ${userEmail}? They won't be able to login.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const response = await axios.post(`${API}/admin/block-user`, {
        user_id: userId,
        action: action,
        reason: action === "block" ? "Blocked by admin" : ""
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Update local state
        setAllUsers(prev => prev.map(u => 
          u.user_id === userId ? { ...u, is_blocked: !currentBlockStatus } : u
        ));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user status");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_data");
    navigate("/admin");
  };

  const handleGenerateTradeCode = async () => {
    if (!tradeCodeForm.user_email || !tradeCodeForm.amount || !tradeCodeForm.price) {
      toast.error("Please fill all fields");
      return;
    }
    
    setGeneratingCode(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const response = await axios.post(`${API}/admin/trade-codes/generate`, {
        user_email: tradeCodeForm.user_email,
        coin: tradeCodeForm.coin,
        amount: parseFloat(tradeCodeForm.amount),
        trade_type: tradeCodeForm.trade_type,
        price: parseFloat(tradeCodeForm.price)
      }, { headers });
      
      setGeneratedCode(response.data.code);
      toast.success("Trade code generated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied!");
  };

  const handleDepositAction = async (requestId, action) => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/deposit-requests/action`, {
        request_id: requestId,
        action: action
      }, { headers });

      toast.success(`Deposit ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} deposit`);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Deposit Addresses Functions
  const fetchDepositAddresses = async (search = "") => {
    setSearchingAddresses(true);
    try {
      // Use localStorage directly to avoid state race condition
      const token = localStorage.getItem("admin_token");
      if (!token) {
        toast.error("Admin token not found");
        setSearchingAddresses(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await axios.get(`${API}/admin/deposit-addresses${params}`, { headers, timeout: 60000 });
      setDepositAddresses(response.data.addresses || []);
    } catch (error) {
      console.error("Deposit addresses error:", error);
      if (error.code === 'ECONNABORTED') {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error("Failed to fetch deposit addresses: " + (error.response?.data?.detail || error.message));
      }
    } finally {
      setSearchingAddresses(false);
    }
  };

  const searchDepositAddress = async () => {
    if (!addressSearch.trim()) {
      fetchDepositAddresses();
      return;
    }
    await fetchDepositAddresses(addressSearch);
  };

  const copyToClipboard = (text, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const togglePrivateKey = (address) => {
    setShowPrivateKeys(prev => ({ ...prev, [address]: !prev[address] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
          <ShieldCheck size={32} weight="bold" className="text-white" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
        <p className="text-gray-400 text-sm">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#111111] border-b border-[#222] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <ShieldCheck size={24} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">TG Exchange Admin</h1>
              <p className="text-xs text-gray-400">{adminData.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-[#333] text-gray-300"
              disabled={refreshing}
            >
              <ArrowsClockwise size={18} className={refreshing ? "animate-spin" : ""} />
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <SignOut size={18} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Admin Referral Link Card */}
        <div className="bg-gradient-to-r from-[#00E5FF]/20 to-[#00E5FF]/5 border border-[#00E5FF]/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Your Referral Link</p>
              <p className="text-white font-mono text-sm break-all">
                {window.location.origin}/?ref={adminData.referral_code && adminData.referral_code.length > 5 ? adminData.referral_code : 'TGADMIN2024'}
              </p>
            </div>
            <Button
              onClick={() => {
                const refCode = adminData.referral_code && adminData.referral_code.length > 5 ? adminData.referral_code : 'TGADMIN2024';
                const link = `${window.location.origin}/?ref=${refCode}`;
                navigator.clipboard.writeText(link);
                toast.success("Referral link copied!");
              }}
              className="bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black"
              size="sm"
            >
              <Copy size={16} className="mr-1" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Referral Code: <span className="text-[#00E5FF] font-bold">{adminData.referral_code && adminData.referral_code.length > 5 ? adminData.referral_code : 'TGADMIN2024'}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={24} />}
            label="Total Users"
            value={stats?.total_users || 0}
            color="blue"
          />
          <StatCard
            icon={<Money size={24} />}
            label="Total Deposits"
            value={`$${(stats?.total_deposit_value || 0).toLocaleString()}`}
            color="green"
          />
          <StatCard
            icon={<Clock size={24} />}
            label="Pending Approvals"
            value={stats?.pending_deposits || 0}
            color="orange"
            highlight
          />
          <StatCard
            icon={<TrendUp size={24} />}
            label="Today Signups"
            value={stats?.today_signups || 0}
            color="purple"
          />
        </div>

        {/* ================ 5 MAIN CARDS ================ */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* CARD 1: DASHBOARD OVERVIEW */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">1. Dashboard</h3>
                <p className="text-sm text-gray-400">Overview & Statistics</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-cyan-400">{stats?.total_users || 0}</p>
                <p className="text-xs text-gray-500">Total Users</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">${(stats?.total_deposit_value || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Deposits</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{stats?.pending_deposits || 0}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{stats?.today_signups || 0}</p>
                <p className="text-xs text-gray-500">Today</p>
              </div>
            </div>
          </div>

          {/* CARD 2: USERS (100 shown, search for all) */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">2. Users</h3>
                  <p className="text-sm text-gray-400">Showing 100 users • Search for all</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setShowAllUsers(!showAllUsers);
                  if (!showAllUsers && allUsers.length === 0) {
                    fetchAllUsers();
                  }
                }}
                variant="outline"
                className="border-blue-500/50 text-blue-400"
              >
                {showAllUsers ? 'Hide' : 'View'}
              </Button>
            </div>
            
            {showAllUsers && (
              <div className="border-t border-[#2a2a4a] pt-4">
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by email, name, or user ID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 bg-[#0A0A0A] border-[#333] text-white"
                    />
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {allUsers
                    .filter(u => 
                      !userSearch || 
                      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.user_id?.includes(userSearch)
                    )
                    .slice(0, 100)
                    .map((u, idx) => (
                      <div key={u.user_id || idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-400">${(u.futures_balance || 0).toFixed(2)}</span>
                          <Button
                            size="sm"
                            onClick={() => loginAsUser(u.user_id)}
                            disabled={loggingInAs === u.user_id}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
                          >
                            {loggingInAs === u.user_id ? '...' : 'Login'}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* CARD 3: WITHDRAWALS */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <Wallet size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">3. Withdrawals</h3>
                  <p className="text-sm text-gray-400">Manage withdrawal requests</p>
                </div>
              </div>
              <Link to="/admin/withdrawals">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  View All
                  <CaretRight size={16} className="ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* CARD 4: GENERATE CODE */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                <Ticket size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">4. Generate Code</h3>
                <p className="text-sm text-gray-400">Create trade codes for users</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">User Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={tradeCodeForm.user_email}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, user_email: e.target.value})}
                  className="bg-[#0A0A0A] border-[#333] text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Coin</label>
                <select
                  value={tradeCodeForm.coin}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, coin: e.target.value})}
                  className="w-full h-10 px-3 bg-[#0A0A0A] border border-[#333] text-white rounded-md"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                  <option value="BNB">BNB</option>
                  <option value="XRP">XRP</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select
                  value={tradeCodeForm.trade_type}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, trade_type: e.target.value})}
                  className="w-full h-10 px-3 bg-[#0A0A0A] border border-[#333] text-white rounded-md"
                >
                  <option value="buy">BUY (CALL)</option>
                  <option value="sell">SELL (PUT)</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateTradeCode}
                disabled={generatingCode}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold flex-1"
              >
                {generatingCode ? "Generating..." : "Generate Code"}
              </Button>
              <Button
                onClick={async () => {
                  if (!tradeCodeForm.coin) return;
                  setGeneratingCode(true);
                  try {
                    const token = localStorage.getItem("admin_token");
                    const res = await axios.post(`${API}/admin/trade-code/generate-for-all`, {
                      coin: tradeCodeForm.coin,
                      trade_type: tradeCodeForm.trade_type || 'buy'
                    }, { headers: { Authorization: `Bearer ${token}` }});
                    toast.success(`Generated codes for ${res.data.users_count || 'all'} users!`);
                  } catch (err) {
                    toast.error("Failed to generate codes");
                  } finally {
                    setGeneratingCode(false);
                  }
                }}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400"
              >
                Generate For All
              </Button>
            </div>
            
            {generatedCode && (
              <div className="mt-4 p-4 bg-[#0A0A0A] border border-cyan-500/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Generated Code:</p>
                    <p className="text-2xl font-mono font-bold text-cyan-400">{generatedCode}</p>
                  </div>
                  <Button onClick={copyCode} variant="outline" className="border-cyan-500 text-cyan-400">
                    <Copy size={16} className="mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* CARD 5: USER ADDRESS & PRIVATE KEY */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                  <Wallet size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">5. User Address & Private Key</h3>
                  <p className="text-sm text-gray-400">Deposit addresses & keys</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setShowDepositAddresses(!showDepositAddresses);
                  if (!showDepositAddresses && depositAddresses.length === 0) {
                    fetchDepositAddresses();
                  }
                }}
                variant="outline"
                className="border-yellow-500/50 text-yellow-400"
              >
                {showDepositAddresses ? 'Hide' : 'View'}
              </Button>
            </div>
            
            {showDepositAddresses && (
              <div className="border-t border-[#2a2a4a] pt-4">
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by address or user ID..."
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchDepositAddress()}
                      className="pl-10 bg-[#0A0A0A] border-[#333] text-white font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={searchDepositAddress}
                    disabled={searchingAddresses}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    {searchingAddresses ? '...' : 'Search'}
                  </Button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {depositAddresses.map((addr, idx) => (
                    <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          addr.network === 'bsc' ? 'bg-yellow-500/20 text-yellow-400' :
                          addr.network === 'eth' ? 'bg-blue-500/20 text-blue-400' :
                          addr.network === 'tron' ? 'bg-red-500/20 text-red-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {addr.network?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">{addr.user_id?.slice(0,8)}...</span>
                      </div>
                      <p className="text-xs font-mono text-gray-300 break-all mb-2">{addr.address}</p>
                      {addr.has_private_key && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowPrivateKeys({...showPrivateKeys, [idx]: !showPrivateKeys[idx]})}
                            className="text-xs border-yellow-500/30 text-yellow-400"
                          >
                            {showPrivateKeys[idx] ? <EyeSlash size={14} /> : <Eye size={14} />}
                            {showPrivateKeys[idx] ? 'Hide' : 'Show'} Key
                          </Button>
                          {showPrivateKeys[idx] && (
                            <p className="text-xs font-mono text-red-400 break-all flex-1">{addr.private_key}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CARD 6: DEPOSITS */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Money size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">6. Deposits</h3>
                  <p className="text-sm text-gray-400">Manage deposit requests</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold">
                  {stats?.pending_deposits || 0} Pending
                </span>
                <Link to="/admin/deposits">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    View All
                    <CaretRight size={16} className="ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Recent Deposits Preview */}
            <div className="space-y-2">
              {pendingDeposits?.slice(0, 3).map((dep, idx) => (
                <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">${dep.amount?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{dep.user_email || dep.user_id?.slice(0,8)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      dep.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                      dep.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {dep.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {(!pendingDeposits || pendingDeposits.length === 0) && (
                <p className="text-center text-gray-500 py-4">No pending deposits</p>
              )}
            </div>
          </div>

          {/* CARD 7: VIP RANK USERS */}
          <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Crown size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">7. VIP Rank Users</h3>
                  <p className="text-sm text-gray-400">Users who achieved VIP status</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowVipUsers(!showVipUsers)}
                variant="outline"
                className="border-purple-500/50 text-purple-400"
              >
                {showVipUsers ? 'Hide' : 'View'}
              </Button>
            </div>
            
            {showVipUsers && (
              <div className="border-t border-[#2a2a4a] pt-4">
                {/* VIP Rank Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legendary', 'Immortal'].map((rank) => (
                    <button
                      key={rank}
                      onClick={() => setSelectedVipRank(rank)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        selectedVipRank === rank 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-[#0a0a0a] text-gray-400 hover:text-white'
                      }`}
                    >
                      {rank}
                    </button>
                  ))}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {allUsers
                    .filter(u => {
                      if (selectedVipRank === 'All') return u.team_rank_level > 0;
                      const rankLevels = { 'Bronze': 1, 'Silver': 2, 'Gold': 3, 'Platinum': 4, 'Diamond': 5, 'Legendary': 6, 'Immortal': 7 };
                      return u.team_rank_level === rankLevels[selectedVipRank];
                    })
                    .slice(0, 50)
                    .map((u, idx) => {
                      const rankNames = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legendary', 'Immortal'];
                      const rankColors = ['gray', 'orange', 'gray', 'yellow', 'cyan', 'blue', 'purple', 'red'];
                      const rankName = rankNames[u.team_rank_level] || 'None';
                      const rankColor = rankColors[u.team_rank_level] || 'gray';
                      
                      return (
                        <div key={u.user_id || idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-${rankColor}-500/20 flex items-center justify-center`}>
                              <Crown size={16} className={`text-${rankColor}-400`} />
                            </div>
                            <div>
                              <p className="text-white font-medium">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${rankColor}-500/20 text-${rankColor}-400`}>
                              {rankName}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">${(u.futures_balance || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  {allUsers.filter(u => u.team_rank_level > 0).length === 0 && (
                    <p className="text-center text-gray-500 py-4">No VIP users yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* ================ END 7 MAIN CARDS ================ */}

        {/* Quick Links - Hidden (replaced by cards above) */}
        <div className="hidden grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            to="/admin/deposits" 
            className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between hover:border-orange-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Wallet size={20} className="text-orange-400" />
              </div>
              <span className="text-white font-medium">All Deposits</span>
            </div>
            <CaretRight size={20} className="text-gray-500" />
          </Link>

          <Link 
            to="/admin/withdrawals" 
            className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between hover:border-red-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Wallet size={20} className="text-red-400" />
              </div>
              <span className="text-white font-medium">Withdrawals</span>
            </div>
            <CaretRight size={20} className="text-gray-500" />
          </Link>

          <Link 
            to="/admin/users" 
            className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between hover:border-blue-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users size={20} className="text-blue-400" />
              </div>
              <span className="text-white font-medium">All Users</span>
            </div>
            <CaretRight size={20} className="text-gray-500" />
          </Link>
        </div>

        {/* Trade Code Generator */}
        <div className="bg-[#111111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222] flex items-center gap-2">
            <Ticket size={20} className="text-[#00E5FF]" />
            <h2 className="text-lg font-bold text-white">Generate Trade Code</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">User Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={tradeCodeForm.user_email}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, user_email: e.target.value})}
                  className="bg-[#0A0A0A] border-[#333] text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Coin</label>
                <select
                  value={tradeCodeForm.coin}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, coin: e.target.value})}
                  className="w-full h-10 px-3 bg-[#0A0A0A] border border-[#333] text-white rounded-md"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="BNB">BNB</option>
                  <option value="SOL">SOL</option>
                  <option value="XRP">XRP</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Trade Type</label>
                <select
                  value={tradeCodeForm.trade_type}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, trade_type: e.target.value})}
                  className="w-full h-10 px-3 bg-[#0A0A0A] border border-[#333] text-white rounded-md"
                >
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount</label>
                <Input
                  type="number"
                  placeholder="0.01"
                  value={tradeCodeForm.amount}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, amount: e.target.value})}
                  className="bg-[#0A0A0A] border-[#333] text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Price (USD)</label>
                <Input
                  type="number"
                  placeholder="68000"
                  value={tradeCodeForm.price}
                  onChange={(e) => setTradeCodeForm({...tradeCodeForm, price: e.target.value})}
                  className="bg-[#0A0A0A] border-[#333] text-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleGenerateTradeCode}
                  disabled={generatingCode}
                  className="flex-1 bg-[#00E5FF] hover:bg-[#00C8E0] text-black font-medium"
                >
                  {generatingCode ? "Generating..." : "Generate Code"}
                </Button>
              </div>
            </div>
            
            {/* Generate For All Users Button */}
            <div className="mt-4 p-4 bg-gradient-to-r from-[#00E5FF]/10 to-[#00E5FF]/5 border border-[#00E5FF]/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Generate LIVE Code for All Users</p>
                  <p className="text-xs text-gray-400">Creates trade code for all users with Futures balance</p>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      setGeneratingCode(true);
                      const response = await axios.post(`${API}/admin/trade-codes/generate-all`, {}, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
                      });
                      if (response.data.success) {
                        toast.success(`Generated ${response.data.codes_created} codes for all users!`);
                      }
                    } catch (error) {
                      toast.error(error.response?.data?.detail || "Failed to generate codes");
                    } finally {
                      setGeneratingCode(false);
                    }
                  }}
                  disabled={generatingCode}
                  className="bg-[#00E5FF] hover:bg-[#00C8E0] text-black font-bold px-6"
                >
                  {generatingCode ? "..." : "Generate For All"}
                </Button>
              </div>
            </div>
            
            {generatedCode && (
              <div className="mt-4 p-4 bg-[#0A0A0A] border border-[#00E5FF]/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Generated Trade Code:</p>
                    <p className="text-2xl font-mono font-bold text-[#00E5FF]">{generatedCode}</p>
                  </div>
                  <Button onClick={copyCode} variant="outline" className="border-[#00E5FF] text-[#00E5FF]">
                    <Copy size={16} className="mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share this code with user: {tradeCodeForm.user_email} • 
                  {tradeCodeForm.trade_type.toUpperCase()} {tradeCodeForm.amount} {tradeCodeForm.coin} @ ${tradeCodeForm.price}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Deposits */}
        <div className="bg-[#111111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-orange-400" />
              Pending Deposit Requests
            </h2>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
              {pendingDeposits.length} pending
            </span>
          </div>

          {pendingDeposits.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">No pending deposit requests</p>
            </div>
          ) : (
            <div className="divide-y divide-[#222]">
              {pendingDeposits.map((deposit) => (
                <div key={deposit.request_id} className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-lg">
                          {deposit.amount} {deposit.coin}
                        </span>
                        <span className="px-2 py-0.5 bg-[#222] text-gray-400 rounded text-xs">
                          {deposit.network}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>User: <span className="text-gray-300">{deposit.user_name} ({deposit.user_email})</span></p>
                        <p>TX Hash: <span className="text-blue-400 font-mono text-xs break-all">{deposit.tx_hash}</span></p>
                        <p>Submitted: {formatDate(deposit.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleDepositAction(deposit.request_id, "approve")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`approve-${deposit.request_id}`}
                      >
                        <CheckCircle size={18} />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleDepositAction(deposit.request_id, "reject")}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        data-testid={`reject-${deposit.request_id}`}
                      >
                        <XCircle size={18} />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== ALL USERS SECTION ========== */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden" data-testid="all-users-section">
          <div 
            className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            onClick={() => setShowAllUsers(!showAllUsers)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/20 flex items-center justify-center">
                <Users size={20} className="text-[#00E5FF]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">All Users</h2>
                <p className="text-sm text-gray-400">{allUsers.length} registered users</p>
              </div>
            </div>
            <CaretRight 
              size={20} 
              className={`text-gray-400 transition-transform ${showAllUsers ? 'rotate-90' : ''}`} 
            />
          </div>

          {showAllUsers && (
            <div className="border-t border-[#222]">
              {/* Search Bar */}
              <div className="p-4 border-b border-[#222]">
                <div className="relative">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email or ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 bg-[#1a1a1a] border-[#333] text-white"
                    data-testid="user-search-input"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="max-h-[500px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    No users found
                  </div>
                ) : (
                  <div className="divide-y divide-[#222]">
                    {filteredUsers.map((user, index) => (
                      <div key={user.user_id} className="p-4 hover:bg-[#1a1a1a] transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* User Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[#00E5FF] text-sm font-mono">#{index + 1}</span>
                              <span className="text-white font-semibold">{user.name || 'No Name'}</span>
                              {user.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Admin</span>
                              )}
                              {user.is_blocked && (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1">
                                  <Prohibit size={12} /> Blocked
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {/* Email */}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16">Email:</span>
                                <span className="text-gray-300 font-mono text-xs">{user.email}</span>
                              </div>
                              
                              {/* User ID */}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16">ID:</span>
                                <span className="text-gray-400 font-mono text-xs">{user.user_id}</span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(user.user_id);
                                    toast.success("User ID copied!");
                                  }}
                                  className="text-gray-500 hover:text-[#00E5FF]"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                              
                              {/* Password */}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16">Pass:</span>
                                {user.password_hash || user.password ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 font-mono text-xs">
                                      {showPasswords[user.user_id] 
                                        ? (user.password_hash || user.password || '').slice(0, 20) + '...' 
                                        : '••••••••••'}
                                    </span>
                                    <button 
                                      onClick={() => togglePasswordVisibility(user.user_id)}
                                      className="text-gray-500 hover:text-[#00E5FF]"
                                    >
                                      {showPasswords[user.user_id] ? <EyeSlash size={14} /> : <Eye size={14} />}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-orange-400 text-xs">Google Auth</span>
                                )}
                              </div>
                              
                              {/* Balance */}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16">Balance:</span>
                                <span className="text-green-400 font-bold">
                                  ${(user.wallet?.balances?.usdt || 0).toFixed(2)}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  (F: ${(user.wallet?.futures_balance || 0).toFixed(2)})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Login as User & Block Buttons */}
                          <div className="flex-shrink-0 flex gap-2">
                            {/* Block/Unblock Button */}
                            <Button
                              onClick={() => handleBlockUser(user.user_id, user.email, user.is_blocked)}
                              className={user.is_blocked 
                                ? "bg-green-500 hover:bg-green-600 text-white font-semibold"
                                : "bg-red-500 hover:bg-red-600 text-white font-semibold"
                              }
                              data-testid={`block-${user.user_id}`}
                            >
                              {user.is_blocked ? (
                                <>
                                  <UserCircleCheck size={18} className="mr-1" />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <Prohibit size={18} className="mr-1" />
                                  Block
                                </>
                              )}
                            </Button>
                            
                            {/* Login as User Button */}
                            <Button
                              onClick={() => handleLoginAsUser(user.user_id, user.email)}
                              disabled={loggingInAs === user.user_id || user.is_blocked}
                              className="bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-semibold"
                              data-testid={`login-as-${user.user_id}`}
                            >
                              {loggingInAs === user.user_id ? (
                                <ArrowsClockwise size={18} className="animate-spin" />
                              ) : (
                                <UserSwitch size={18} />
                              )}
                              Login
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* ========== DEPOSIT ADDRESSES SECTION ========== */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden" data-testid="deposit-addresses-section">
          <div 
            className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            onClick={() => {
              setShowDepositAddresses(!showDepositAddresses);
              if (!showDepositAddresses && depositAddresses.length === 0) {
                fetchDepositAddresses();
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0B90B]/20 flex items-center justify-center">
                <Wallet size={20} className="text-[#F0B90B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Deposit Addresses</h2>
                <p className="text-sm text-gray-400">Manage user deposit addresses & private keys</p>
              </div>
            </div>
            <CaretRight 
              size={20} 
              className={`text-gray-400 transition-transform ${showDepositAddresses ? 'rotate-90' : ''}`} 
            />
          </div>

          {showDepositAddresses && (
            <div className="border-t border-[#222]">
              {/* Search Bar */}
              <div className="p-4 border-b border-[#222]">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by address or user ID..."
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchDepositAddress()}
                      className="pl-10 bg-[#1a1a1a] border-[#333] text-white font-mono text-sm"
                      data-testid="address-search-input"
                    />
                  </div>
                  <Button
                    onClick={searchDepositAddress}
                    disabled={searchingAddresses}
                    className="bg-[#F0B90B] hover:bg-[#F0B90B]/80 text-black"
                  >
                    {searchingAddresses ? <ArrowsClockwise size={18} className="animate-spin" /> : "Search"}
                  </Button>
                </div>
              </div>

              {/* Addresses List */}
              <div className="max-h-[600px] overflow-y-auto">
                {searchingAddresses ? (
                  <div className="p-6 text-center">
                    <ArrowsClockwise size={24} className="animate-spin text-[#F0B90B] mx-auto mb-2" />
                    <p className="text-gray-400">Loading addresses...</p>
                  </div>
                ) : depositAddresses.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    No deposit addresses found
                  </div>
                ) : (
                  <div className="divide-y divide-[#222]">
                    {depositAddresses.map((addr, idx) => (
                      <div key={idx} className="p-4 hover:bg-[#1a1a1a] transition-colors">
                        <div className="flex flex-col gap-3">
                          {/* Address Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  addr.network === 'bsc' ? 'bg-yellow-500/20 text-yellow-400' :
                                  addr.network === 'eth' ? 'bg-blue-500/20 text-blue-400' :
                                  addr.network === 'polygon' ? 'bg-purple-500/20 text-purple-400' :
                                  addr.network === 'tron' ? 'bg-red-500/20 text-red-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {addr.network?.toUpperCase()}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  addr.has_private_key ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {addr.has_private_key ? '✓ PK' : '✗ No PK'}
                                </span>
                              </div>
                              <p className="font-mono text-sm text-white break-all">{addr.address}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                User: {addr.user_name} ({addr.user_email || 'No email'})
                              </p>
                            </div>
                            <Button
                              onClick={() => copyToClipboard(addr.address, "Address")}
                              variant="outline"
                              size="sm"
                              className="border-[#333] text-gray-400 hover:text-white"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                          
                          {/* Private Key Row */}
                          {addr.has_private_key && (
                            <div className="flex items-center gap-2 bg-[#0a0a0a] p-3 rounded-lg">
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1">Private Key:</p>
                                <p className="font-mono text-xs text-[#F0B90B] break-all">
                                  {showPrivateKeys[addr.address] 
                                    ? addr.private_key 
                                    : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => togglePrivateKey(addr.address)}
                                  variant="outline"
                                  size="sm"
                                  className="border-[#333] text-gray-400 hover:text-white"
                                >
                                  {showPrivateKeys[addr.address] ? <EyeSlash size={14} /> : <Eye size={14} />}
                                </Button>
                                <Button
                                  onClick={() => copyToClipboard(addr.private_key, "Private Key")}
                                  variant="outline"
                                  size="sm"
                                  className="border-[#F0B90B]/50 text-[#F0B90B] hover:bg-[#F0B90B]/10"
                                >
                                  <Copy size={14} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-[#222] bg-[#0a0a0a]">
                <p className="text-xs text-gray-500 text-center">
                  Total: {depositAddresses.length} addresses • 
                  With PK: {depositAddresses.filter(a => a.has_private_key).length} • 
                  Without PK: {depositAddresses.filter(a => !a.has_private_key).length}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, highlight }) => {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400",
    green: "bg-green-500/20 text-green-400",
    orange: "bg-orange-500/20 text-orange-400",
    purple: "bg-purple-500/20 text-purple-400"
  };

  return (
    <div className={`bg-[#111] border rounded-xl p-4 ${highlight ? 'border-orange-500/50' : 'border-[#222]'}`}>
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
};

export default AdminPanelPro;
