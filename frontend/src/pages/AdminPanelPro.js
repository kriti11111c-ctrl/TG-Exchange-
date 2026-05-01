import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Menu, X, Home, Users, Eye, CreditCard, Key, Award, Code, FileText, Search, RefreshCw, Copy, Check, ChevronDown, ChevronUp, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

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
        const res = await axios.get(`${API}/api/admin/users`, { headers });
        setUsers(res.data?.users || res.data || []);
      } else if (activeTab === 'deposit') {
        const [manualRes, autoRes] = await Promise.all([
          axios.get(`${API}/api/admin/deposit-requests`, { headers }),
          axios.get(`${API}/api/admin/auto-deposits`, { headers })
        ]);
        setDeposits(manualRes.data?.requests || []);
        setAutoDeposits(autoRes.data?.deposits || []);
      } else if (activeTab === 'withdrawal') {
        const res = await axios.get(`${API}/api/admin/withdrawals`, { headers });
        setWithdrawals(res.data?.withdrawals || res.data || []);
      } else if (activeTab === 'addresses') {
        const res = await axios.get(`${API}/api/admin/deposit-addresses`, { headers });
        setAddresses(res.data?.addresses || []);
      } else if (activeTab === 'rank') {
        const res = await axios.get(`${API}/api/admin/users`, { headers });
        const usersData = res.data?.users || res.data || [];
        const ranked = usersData.filter(u => u.team_rank_level > 0 || u.vip_level > 0);
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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
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

            {/* USERS */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">Total: {filteredUsers.length} users</p>
                {filteredUsers.map(user => (
                  <div key={user.user_id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div 
                      className="p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => setExpandedItem(expandedItem === user.user_id ? null : user.user_id)}
                    >
                      <div>
                        <p className="font-medium">{user.name || 'No Name'}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold">${(user.futures_balance || 0).toFixed(2)}</span>
                        {expandedItem === user.user_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    {expandedItem === user.user_id && (
                      <div className="px-4 pb-4 border-t border-[#222] pt-3 bg-[#0a0a0a]">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><p className="text-gray-500">Spot</p><p className="font-medium">${(user.spot_balance || 0).toFixed(2)}</p></div>
                          <div><p className="text-gray-500">Futures</p><p className="font-medium">${(user.futures_balance || 0).toFixed(2)}</p></div>
                          <div><p className="text-gray-500">Welcome Bonus</p><p className="font-medium">${(user.welcome_bonus || 0).toFixed(2)}</p></div>
                          <div><p className="text-gray-500">Rank</p><p className="font-medium">{user.team_rank_level || 0}</p></div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#222]">
                          <p className="text-gray-500 text-xs">User ID</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-[#1a1a1a] px-2 py-1 rounded">{user.user_id}</code>
                            <button onClick={() => copyToClipboard(user.user_id, user.user_id)}>
                              {copied === user.user_id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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

            {/* WITHDRAWALS */}
            {activeTab === 'withdrawal' && (
              <div className="space-y-3">
                {withdrawals.length > 0 ? withdrawals.map((w, idx) => (
                  <div key={idx} className="bg-[#111] border border-[#222] p-4 rounded-xl">
                    <div className="flex justify-between mb-2">
                      <span className="text-xl font-bold text-red-400">-${w.amount}</span>
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        w.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                        w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                      }`}>{w.status?.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-gray-400">To: {w.wallet_address?.slice(0, 25)}...</p>
                    <p className="text-xs text-gray-500">{w.created_at?.slice(0, 19)}</p>
                  </div>
                )) : (
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
    </div>
  );
};

export default AdminPanelPro;
