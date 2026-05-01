import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Menu, X, Home, Users, Eye, CreditCard, Key, Award, Code, FileText, Search, RefreshCw, Copy, Check, ChevronDown, ChevronUp, LogOut, Plus, UserCheck, ShieldCheck, ShieldX, DollarSign, Wallet } from 'lucide-react';

// Use relative API path - empty for production/preview, env var for local dev
const getApiUrl = () => {
  // If running on preview.emergentagent.com, use relative path
  if (typeof window !== 'undefined' && window.location.hostname.includes('preview.emergentagent.com')) {
    return '';
  }
  return process.env.REACT_APP_BACKEND_URL || '';
};
const API = getApiUrl();

const AdminPanelPro = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(null);
  
  // Data states
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [autoDeposits, setAutoDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [rankMembers, setRankMembers] = useState([]);
  const [tradeCodes, setTradeCodes] = useState([]);
  const [stats, setStats] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);
  
  // Modal states
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('deposit');
  const [txWallet, setTxWallet] = useState('futures');
  
  // Withdrawal transaction hash states
  const [txHashes, setTxHashes] = useState({});

  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${adminToken}` };
    
    try {
      if (activeTab === 'dashboard') {
        const [usersRes, depsRes] = await Promise.all([
          axios.get(`${API}/api/admin/users`, { headers }),
          axios.get(`${API}/api/admin/deposit-requests`, { headers })
        ]);
        setStats({
          totalUsers: usersRes.data?.length || 0,
          pendingDeposits: depsRes.data?.stats?.pending || 0,
          approvedDeposits: depsRes.data?.stats?.approved || 0
        });
      } else if (activeTab === 'users') {
        // Fetch users and addresses together for user panel
        const [usersRes, addrRes] = await Promise.all([
          axios.get(`${API}/api/admin/users`, { headers }),
          axios.get(`${API}/api/admin/deposit-addresses`, { headers })
        ]);
        setUsers(usersRes.data?.users || usersRes.data || []);
        setAddresses(addrRes.data?.addresses || []);
      } else if (activeTab === 'deposit') {
        const [manualRes, autoRes] = await Promise.all([
          axios.get(`${API}/api/admin/deposit-requests`, { headers }),
          axios.get(`${API}/api/admin/auto-deposits`, { headers })
        ]);
        setDeposits(manualRes.data?.requests || []);
        setAutoDeposits(autoRes.data?.deposits || []);
      } else if (activeTab === 'withdrawal') {
        // Fetch withdrawals and users together for verified check
        const [withdrawRes, usersRes] = await Promise.all([
          axios.get(`${API}/api/admin/withdrawal-requests`, { headers }),
          axios.get(`${API}/api/admin/users`, { headers })
        ]);
        setWithdrawals(withdrawRes.data?.requests || withdrawRes.data?.withdrawals || withdrawRes.data || []);
        setUsers(usersRes.data?.users || usersRes.data || []);
      } else if (activeTab === 'addresses') {
        const res = await axios.get(`${API}/api/admin/deposit-addresses`, { headers });
        setAddresses(res.data?.addresses || []);
      } else if (activeTab === 'rank') {
        const res = await axios.get(`${API}/api/admin/users`, { headers });
        const allUsers = res.data?.users || res.data || [];
        const ranked = allUsers.filter(u => u.team_rank_level > 0 || u.vip_level > 0);
        setRankMembers(ranked);
      } else if (activeTab === 'tradecodes') {
        const res = await axios.get(`${API}/api/admin/trade-codes`, { headers }).catch(() => ({ data: [] }));
        setTradeCodes(res.data || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
      }
    }
    setLoading(false);
  };

  const handleApprove = async (requestId) => {
    try {
      await axios.post(`${API}/api/admin/deposit-requests/action`, 
        { request_id: requestId, action: 'approve' }, 
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.post(`${API}/api/admin/deposit-requests/action`, 
        { request_id: requestId, action: 'reject' }, 
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Withdrawal approve with transaction hash
  const handleWithdrawalApprove = async (requestId) => {
    const txHash = txHashes[requestId];
    if (!txHash || txHash.trim() === '') {
      alert('Please enter Transaction Hash before approving!');
      return;
    }
    try {
      await axios.post(`${API}/api/admin/withdrawal-requests/action`, 
        { request_id: requestId, action: 'approve', tx_hash: txHash }, 
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      setTxHashes(prev => ({ ...prev, [requestId]: '' }));
      fetchData();
      alert('Withdrawal approved successfully!');
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Withdrawal reject
  const handleWithdrawalReject = async (requestId) => {
    try {
      await axios.post(`${API}/api/admin/withdrawal-requests/action`, 
        { request_id: requestId, action: 'reject' }, 
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    // Show toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg z-50 animate-pulse';
    toast.textContent = '✓ Copied!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  // Login as User function
  const loginAsUser = async (user) => {
    try {
      const res = await axios.post(`${API}/api/admin/login-as-user`, 
        { user_id: user.user_id },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      if (res.data?.token) {
        localStorage.setItem('auth_token', res.data.token);
        window.open('/', '_blank');
      }
    } catch (error) {
      alert('Login as user failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Add Transaction function
  const handleAddTransaction = async () => {
    if (!selectedUser || !txAmount) return;
    try {
      await axios.post(`${API}/api/admin/add-balance`, 
        { 
          user_id: selectedUser.user_id, 
          amount: parseFloat(txAmount),
          wallet_type: txWallet,
          transaction_type: txType
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      alert(`${txType === 'deposit' ? '+' : '-'}$${txAmount} ${txType} added to ${selectedUser.email}`);
      setShowAddTransaction(false);
      setTxAmount('');
      fetchData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Get user's deposit address
  const getUserAddress = (userId) => {
    return addresses.find(a => a.user_id === userId);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'deposit', label: 'Deposit', icon: Eye },
    { id: 'withdrawal', label: 'Withdrawal', icon: CreditCard },
    { id: 'addresses', label: 'Address & Private Key', icon: Key },
    { id: 'rank', label: 'Rank Members', icon: Award },
    { id: 'tradecodes', label: 'Trade Codes', icon: Code },
    { id: 'kyc', label: 'KYC', icon: FileText },
  ];

  // Filter functions
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAddresses = addresses.filter(a =>
    a.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.network?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#222] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#222] rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg">{menuItems.find(m => m.id === activeTab)?.label || 'Admin'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-[#222] rounded-lg">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-[#222] rounded-lg">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#111] shadow-xl">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[#222] flex items-center justify-between">
              <div>
                <p className="font-bold text-[#F0B90B]">Users</p>
                <p className="text-xs text-gray-400">luckyman143@gmail.com</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-[#222] rounded">
                <X size={20} />
              </button>
            </div>
            
            {/* Menu Items */}
            <nav className="p-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); setSearchTerm(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition ${
                    activeTab === item.id 
                      ? 'bg-[#1a3a2a] text-[#4ade80]' 
                      : 'hover:bg-[#1a1a1a] text-gray-300'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'text-[#4ade80]' : 'text-[#F0B90B]'} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {['users', 'addresses', 'deposit', 'withdrawal'].includes(activeTab) && (
        <div className="p-4 border-b border-[#222]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="animate-spin text-[#F0B90B]" size={40} />
          </div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-[#F0B90B]">{stats.totalUsers || 0}</p>
                  </div>
                  <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
                    <p className="text-gray-400 text-sm">Pending Deposits</p>
                    <p className="text-3xl font-bold text-yellow-400">{stats.pendingDeposits || 0}</p>
                  </div>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
                  <p className="text-gray-400 text-sm">Approved Deposits</p>
                  <p className="text-3xl font-bold text-green-400">{stats.approvedDeposits || 0}</p>
                </div>
              </div>
            )}

            {/* USERS - Enhanced */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">Total: {filteredUsers.length} users</p>
                {filteredUsers.map(user => {
                  const userAddress = getUserAddress(user.user_id);
                  const totalDeposited = user.total_deposited || user.wallet?.total_deposited || 0;
                  const isVerified = totalDeposited >= 50;
                  
                  return (
                    <div key={user.user_id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer"
                        onClick={() => setExpandedItem(expandedItem === user.user_id ? null : user.user_id)}
                      >
                        <div className="flex items-center gap-3">
                          {isVerified ? (
                            <ShieldCheck size={20} className="text-green-400" />
                          ) : (
                            <ShieldX size={20} className="text-red-400" />
                          )}
                          <div>
                            <p className="font-medium">{user.name || 'No Name'}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${isVerified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isVerified ? 'Verified' : 'Unverified'}
                          </span>
                          <span className="text-green-400 font-bold">${(user.futures_balance || 0).toFixed(2)}</span>
                          {expandedItem === user.user_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                      {expandedItem === user.user_id && (
                        <div className="px-4 pb-4 border-t border-[#222] pt-3 bg-[#0a0a0a] space-y-4">
                          {/* Balances */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-[#1a1a1a] p-3 rounded-lg">
                              <p className="text-gray-500 text-xs flex items-center gap-1"><Wallet size={12}/> Spot Balance</p>
                              <p className="font-bold text-lg text-blue-400">${(user.spot_balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-[#1a1a1a] p-3 rounded-lg">
                              <p className="text-gray-500 text-xs flex items-center gap-1"><DollarSign size={12}/> Futures Balance</p>
                              <p className="font-bold text-lg text-green-400">${(user.futures_balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-[#1a1a1a] p-3 rounded-lg">
                              <p className="text-gray-500 text-xs">Welcome Bonus</p>
                              <p className="font-bold text-yellow-400">${(user.welcome_bonus || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-[#1a1a1a] p-3 rounded-lg">
                              <p className="text-gray-500 text-xs">Total Deposited</p>
                              <p className="font-bold text-purple-400">${totalDeposited.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {/* User ID */}
                          <div className="bg-[#1a1a1a] p-3 rounded-lg">
                            <p className="text-gray-500 text-xs mb-1">User ID</p>
                            <div className="flex items-center justify-between">
                              <code className="text-xs text-cyan-400">{user.user_id}</code>
                              <button 
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(user.user_id, `uid-${user.user_id}`); }}
                                className="bg-[#333] hover:bg-[#444] px-3 py-1 rounded text-xs flex items-center gap-1"
                              >
                                {copied === `uid-${user.user_id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                Copy
                              </button>
                            </div>
                          </div>
                          
                          {/* Deposit Address */}
                          {userAddress && (
                            <div className="bg-[#1a1a1a] p-3 rounded-lg">
                              <p className="text-gray-500 text-xs mb-1">Deposit Address ({userAddress.network?.toUpperCase()})</p>
                              <div className="flex items-center justify-between gap-2">
                                <code className="text-xs text-green-400 break-all">{userAddress.address}</code>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(userAddress.address, `addr-${user.user_id}`); }}
                                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs flex items-center gap-1 shrink-0"
                                >
                                  {copied === `addr-${user.user_id}` ? <Check size={12} /> : <Copy size={12} />}
                                  Copy
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); loginAsUser(user); }}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <UserCheck size={16} /> Login as User
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowAddTransaction(true); }}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <Plus size={16} /> Add Transaction
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* DEPOSITS */}
            {activeTab === 'deposit' && (
              <div className="space-y-6">
                {/* Manual Deposits */}
                <div>
                  <h3 className="text-lg font-bold mb-3 text-[#F0B90B]">Manual Deposits (Pending)</h3>
                  <div className="space-y-3">
                    {deposits.filter(d => d.status === 'pending').map(dep => (
                      <div key={dep.request_id} className="bg-[#111] border border-[#222] p-4 rounded-xl">
                        <div className="flex justify-between mb-2">
                          <span className="text-2xl font-bold text-green-400">${dep.amount}</span>
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">PENDING</span>
                        </div>
                        <p className="text-sm text-gray-400">Network: {dep.network?.toUpperCase()}</p>
                        <p className="text-xs text-gray-500 mt-1">TX: {dep.tx_hash?.slice(0, 30)}...</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleApprove(dep.request_id)} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium">Approve</button>
                          <button onClick={() => handleReject(dep.request_id)} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-medium">Reject</button>
                        </div>
                      </div>
                    ))}
                    {deposits.filter(d => d.status === 'pending').length === 0 && (
                      <p className="text-gray-500 text-center py-8">No pending deposits</p>
                    )}
                  </div>
                </div>

                {/* Auto Blockchain Deposits */}
                <div>
                  <h3 className="text-lg font-bold mb-3 text-blue-400">Auto Blockchain Deposits</h3>
                  <div className="space-y-3">
                    {autoDeposits.slice(0, 30).map((dep, idx) => (
                      <div key={idx} className="bg-[#111] border border-[#222] p-4 rounded-xl">
                        <div className="flex justify-between mb-2">
                          <span className="text-xl font-bold text-green-400">${dep.amount}</span>
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            dep.status === 'credited' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>{dep.status?.toUpperCase()}</span>
                        </div>
                        <p className="text-sm text-gray-400">Network: {dep.network?.toUpperCase()}</p>
                        <p className="text-xs text-gray-500">User: {dep.user_name || dep.user_email || dep.user_id?.slice(0, 15)}</p>
                        <p className="text-xs text-gray-500">Address: {dep.deposit_address?.slice(0, 25)}...</p>
                        <p className="text-xs text-gray-500 mt-1">{dep.detected_at?.slice(0, 19)}</p>
                      </div>
                    ))}
                    {autoDeposits.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No auto deposits</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* WITHDRAWALS - Professional with App Balance & TX Hash */}
            {activeTab === 'withdrawal' && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">Total: {withdrawals.length} withdrawal requests</p>
                {withdrawals.length > 0 ? withdrawals.map((w, idx) => {
                  // Find user to get futures balance
                  const withdrawUser = users.find(u => u.user_id === w.user_id);
                  const futuresBalance = withdrawUser?.futures_balance || withdrawUser?.wallet?.futures_balance || 0;
                  const totalDeposited = withdrawUser?.total_deposited || withdrawUser?.wallet?.total_deposited || 0;
                  const isVerified = totalDeposited >= 50;
                  
                  return (
                    <div key={idx} className={`bg-[#111] border rounded-xl p-4 ${isVerified ? 'border-green-900/50' : 'border-red-900/50'}`}>
                      {/* Header with Amount and Status */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-2xl font-bold text-red-400">-${w.amount}</span>
                          <p className="text-sm text-gray-400 mt-1">{w.user_email || w.user_name || 'Unknown User'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            w.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                            w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                          }`}>{w.status?.toUpperCase()}</span>
                          <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                            isVerified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isVerified ? <ShieldCheck size={12}/> : <ShieldX size={12}/>}
                            {isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                          </span>
                        </div>
                      </div>
                      
                      {/* App Balance (Futures) */}
                      <div className="bg-[#0a0a0a] p-3 rounded-lg mb-3">
                        <p className="text-gray-500 text-xs mb-1">App Balance (Futures)</p>
                        <p className="text-xl font-bold text-green-400">${futuresBalance.toFixed(2)}</p>
                      </div>
                      
                      {/* Wallet Address */}
                      <div className="bg-[#0a0a0a] p-3 rounded-lg mb-3">
                        <p className="text-gray-500 text-xs mb-1">Withdrawal Address</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs text-cyan-400 break-all">{w.wallet_address}</code>
                          <button 
                            onClick={() => copyToClipboard(w.wallet_address, `w-addr-${idx}`)}
                            className="bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded text-xs flex items-center gap-1 shrink-0"
                          >
                            {copied === `w-addr-${idx}` ? <Check size={12}/> : <Copy size={12}/>}
                            Copy
                          </button>
                        </div>
                      </div>
                      
                      {/* Transaction Hash Input for Pending */}
                      {w.status === 'pending' && (
                        <div className="bg-[#0a0a0a] p-3 rounded-lg mb-3 border border-[#333]">
                          <p className="text-gray-500 text-xs mb-2">Transaction Hash (Paste after sending)</p>
                          <input
                            type="text"
                            value={txHashes[w.request_id] || ''}
                            onChange={(e) => setTxHashes(prev => ({ ...prev, [w.request_id]: e.target.value }))}
                            placeholder="Paste transaction hash here..."
                            className="w-full bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                          />
                        </div>
                      )}
                      
                      {/* Network & Time */}
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>Network: {w.network?.toUpperCase() || 'TRC20'}</span>
                        <span>{w.created_at?.slice(0, 19)}</span>
                      </div>
                      
                      {/* Action Buttons for Pending */}
                      {w.status === 'pending' && (
                        <div className="flex gap-2 pt-3 border-t border-[#222]">
                          <button 
                            onClick={() => handleWithdrawalApprove(w.request_id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 py-2.5 rounded-lg text-sm font-medium"
                          >
                            ✓ Approve
                          </button>
                          <button 
                            onClick={() => handleWithdrawalReject(w.request_id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 py-2.5 rounded-lg text-sm font-medium"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                      
                      {/* Show TX Hash if approved */}
                      {w.status === 'approved' && w.tx_hash && (
                        <div className="bg-green-900/20 p-3 rounded-lg border border-green-900/50">
                          <p className="text-green-400 text-xs mb-1">Transaction Hash</p>
                          <code className="text-xs text-green-300 break-all">{w.tx_hash}</code>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-gray-500 text-center py-8">No withdrawals</p>
                )}
              </div>
            )}

            {/* ADDRESS & PRIVATE KEY */}
            {activeTab === 'addresses' && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">Total: {filteredAddresses.length} addresses</p>
                {filteredAddresses.map((addr, idx) => (
                  <div key={idx} className="bg-[#111] border border-[#222] p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[#F0B90B] font-bold">{addr.network?.toUpperCase()}</span>
                        <p className="text-sm text-gray-400">{addr.user_email || addr.user_name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${addr.gas_funded ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {addr.gas_funded ? 'GAS ✓' : 'NO GAS'}
                      </span>
                    </div>
                    
                    {/* Address */}
                    <div className="bg-[#0a0a0a] p-3 rounded-lg mb-2">
                      <p className="text-xs text-gray-500 mb-1">Deposit Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-green-400 break-all flex-1">{addr.address}</code>
                        <button onClick={() => copyToClipboard(addr.address, `addr-${idx}`)} className="shrink-0">
                          {copied === `addr-${idx}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Private Key */}
                    {addr.private_key && (
                      <div className="bg-[#1a0a0a] p-3 rounded-lg border border-red-900/30">
                        <p className="text-xs text-red-400 mb-1">Private Key</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-red-300 break-all flex-1">{addr.private_key}</code>
                          <button onClick={() => copyToClipboard(addr.private_key, `pk-${idx}`)} className="shrink-0">
                            {copied === `pk-${idx}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xs text-gray-500 mt-3">
                      <span>Deposited: ${addr.total_deposited || 0}</span>
                      <span>{addr.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
                {filteredAddresses.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No addresses found</p>
                )}
              </div>
            )}

            {/* RANK MEMBERS */}
            {activeTab === 'rank' && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">Total Ranked: {rankMembers.length}</p>
                {rankMembers.map(user => (
                  <div key={user.user_id} className="bg-[#111] border border-[#222] p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-medium">{user.name || 'No Name'}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#F0B90B] font-bold">Rank {user.team_rank_level || user.vip_level || 0}</p>
                      <p className="text-green-400 text-sm">${(user.futures_balance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {rankMembers.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No ranked members</p>
                )}
              </div>
            )}

            {/* TRADE CODES */}
            {activeTab === 'tradecodes' && (
              <div className="space-y-3">
                {tradeCodes.length > 0 ? tradeCodes.slice(0, 50).map((code, idx) => (
                  <div key={idx} className="bg-[#111] border border-[#222] p-4 rounded-xl">
                    <div className="flex justify-between mb-2">
                      <code className="text-lg font-bold text-[#F0B90B]">{code.code}</code>
                      <span className={`px-2 py-1 text-xs rounded ${
                        code.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>{code.status}</span>
                    </div>
                    <p className="text-sm text-gray-400">Coin: {code.coin?.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Profit: {code.profit_percent}%</p>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-8">No trade codes</p>
                )}
              </div>
            )}

            {/* KYC */}
            {activeTab === 'kyc' && (
              <div className="text-center py-20 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>KYC verification coming soon</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Transaction Modal */}
      {showAddTransaction && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddTransaction(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-md">
            <button 
              onClick={() => setShowAddTransaction(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold mb-1">Add Transaction</h3>
            <p className="text-gray-400 text-sm mb-4">{selectedUser.email}</p>
            
            {/* Transaction Type */}
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Transaction Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTxType('deposit')}
                  className={`py-2 rounded-lg font-medium ${txType === 'deposit' ? 'bg-green-600' : 'bg-[#222]'}`}
                >
                  + Deposit
                </button>
                <button 
                  onClick={() => setTxType('withdraw')}
                  className={`py-2 rounded-lg font-medium ${txType === 'withdraw' ? 'bg-red-600' : 'bg-[#222]'}`}
                >
                  - Withdraw
                </button>
              </div>
            </div>
            
            {/* Wallet Type */}
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Wallet</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTxWallet('futures')}
                  className={`py-2 rounded-lg font-medium ${txWallet === 'futures' ? 'bg-blue-600' : 'bg-[#222]'}`}
                >
                  Futures
                </button>
                <button 
                  onClick={() => setTxWallet('spot')}
                  className={`py-2 rounded-lg font-medium ${txWallet === 'spot' ? 'bg-purple-600' : 'bg-[#222]'}`}
                >
                  Spot
                </button>
              </div>
            </div>
            
            {/* Amount */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm mb-2 block">Amount (USD)</label>
              <input
                type="number"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white text-lg"
              />
            </div>
            
            {/* Submit */}
            <button 
              onClick={handleAddTransaction}
              disabled={!txAmount}
              className={`w-full py-3 rounded-lg font-bold text-lg ${
                txType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {txType === 'deposit' ? '+' : '-'} ${txAmount || '0'} {txType === 'deposit' ? 'Add' : 'Deduct'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelPro;
