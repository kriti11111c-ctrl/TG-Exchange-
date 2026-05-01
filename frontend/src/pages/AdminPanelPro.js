import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Menu, X, Users, DollarSign, Award, Wallet, Key, RefreshCw, Search, ChevronDown, ChevronUp, Copy, Check, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const AdminPanelPro = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('deposits');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(null);
  
  // Data states
  const [depositRequests, setDepositRequests] = useState([]);
  const [autoDeposits, setAutoDeposits] = useState([]);
  const [depositAddresses, setDepositAddresses] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);

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
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      
      if (activeTab === 'deposits') {
        const [reqRes, autoRes] = await Promise.all([
          axios.get(`${API}/api/admin/deposit-requests`, { headers }),
          axios.get(`${API}/api/admin/auto-deposits`, { headers })
        ]);
        setDepositRequests(reqRes.data.requests || []);
        setAutoDeposits(autoRes.data.deposits || []);
        setStats({ ...reqRes.data.stats, auto: autoRes.data.stats });
      } else if (activeTab === 'users') {
        const res = await axios.get(`${API}/api/admin/users`, { headers });
        setUsers(res.data || []);
      } else if (activeTab === 'addresses') {
        const res = await axios.get(`${API}/api/admin/deposit-addresses`, { headers });
        setDepositAddresses(res.data.addresses || []);
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
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/api/admin/deposit-requests/action`, 
        { request_id: requestId, action: 'approve' }, 
        { headers }
      );
      fetchData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleReject = async (requestId) => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/api/admin/deposit-requests/action`, 
        { request_id: requestId, action: 'reject' }, 
        { headers }
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

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAddresses = depositAddresses.filter(a =>
    a.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.network?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const menuItems = [
    { id: 'deposits', label: 'Deposits', icon: DollarSign },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'addresses', label: 'Deposit Addresses', icon: Key },
    { id: 'vip', label: 'VIP Ranks', icon: Award },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      {/* Header */}
      <div className="bg-[#1E2329] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#2B3139] rounded-lg">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-xl font-bold text-[#F0B90B]">Admin Pro</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-[#2B3139] rounded-lg" disabled={loading}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-[#2B3139] rounded-lg text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#1E2329] pt-16 shadow-xl" onClick={e => e.stopPropagation()}>
            <nav className="p-4 space-y-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === item.id ? 'bg-[#F0B90B] text-black' : 'hover:bg-[#2B3139]'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#2B3139] border border-[#3C4043] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="animate-spin text-[#F0B90B]" size={40} />
          </div>
        ) : (
          <>
            {/* DEPOSITS TAB */}
            {activeTab === 'deposits' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#1E2329] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending || 0}</p>
                  </div>
                  <div className="bg-[#1E2329] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Approved</p>
                    <p className="text-2xl font-bold text-green-400">{stats.approved || 0}</p>
                  </div>
                  <div className="bg-[#1E2329] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Auto Credited</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.auto?.credited || 0}</p>
                  </div>
                  <div className="bg-[#1E2329] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total</p>
                    <p className="text-2xl font-bold">{stats.total || 0}</p>
                  </div>
                </div>

                {/* Manual Deposits */}
                <div>
                  <h2 className="text-lg font-bold mb-3 text-[#F0B90B]">Manual Deposit Requests</h2>
                  <div className="space-y-3">
                    {depositRequests.filter(d => d.status === 'pending').map(dep => (
                      <div key={dep.request_id} className="bg-[#1E2329] p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-green-400">${dep.amount}</p>
                            <p className="text-sm text-gray-400">{dep.network?.toUpperCase()}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">PENDING</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">TX: {dep.tx_hash?.slice(0, 20)}...</p>
                        <p className="text-xs text-gray-400 mb-3">User: {dep.user_id?.slice(0, 15)}...</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(dep.request_id)} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded font-medium">
                            Approve
                          </button>
                          <button onClick={() => handleReject(dep.request_id)} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded font-medium">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                    {depositRequests.filter(d => d.status === 'pending').length === 0 && (
                      <p className="text-center text-gray-400 py-8">No pending deposits</p>
                    )}
                  </div>
                </div>

                {/* Auto Deposits */}
                <div>
                  <h2 className="text-lg font-bold mb-3 text-blue-400">Auto Blockchain Deposits</h2>
                  <div className="space-y-3">
                    {autoDeposits.slice(0, 20).map((dep, idx) => (
                      <div key={idx} className="bg-[#1E2329] p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-green-400">${dep.amount}</p>
                            <p className="text-sm text-gray-400">{dep.network?.toUpperCase()}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            dep.status === 'credited' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>{dep.status?.toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-gray-400">User: {dep.user_name || dep.user_id?.slice(0, 15)}</p>
                        <p className="text-xs text-gray-400">Address: {dep.deposit_address?.slice(0, 20)}...</p>
                        <p className="text-xs text-gray-400">{dep.detected_at?.slice(0, 19)}</p>
                      </div>
                    ))}
                    {autoDeposits.length === 0 && (
                      <p className="text-center text-gray-400 py-8">No auto deposits</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                <p className="text-gray-400 mb-4">Total Users: {filteredUsers.length}</p>
                {filteredUsers.slice(0, 50).map(user => (
                  <div key={user.user_id} className="bg-[#1E2329] rounded-lg overflow-hidden">
                    <div 
                      className="p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => setExpandedUser(expandedUser === user.user_id ? null : user.user_id)}
                    >
                      <div>
                        <p className="font-medium">{user.name || 'No Name'}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold">${(user.futures_balance || 0).toFixed(2)}</span>
                        {expandedUser === user.user_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    {expandedUser === user.user_id && (
                      <div className="px-4 pb-4 border-t border-[#2B3139] pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400">Spot Balance</p>
                            <p className="font-medium">${(user.spot_balance || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Futures Balance</p>
                            <p className="font-medium">${(user.futures_balance || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Welcome Bonus</p>
                            <p className="font-medium">${(user.welcome_bonus || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">VIP Level</p>
                            <p className="font-medium">{user.vip_level || 0}</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <p className="text-gray-400 text-xs">User ID</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono">{user.user_id}</p>
                            <button onClick={() => copyToClipboard(user.user_id, user.user_id)}>
                              {copied === user.user_id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">Joined: {user.created_at?.slice(0, 10)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* DEPOSIT ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-3">
                <p className="text-gray-400 mb-4">Total Addresses: {filteredAddresses.length}</p>
                {filteredAddresses.slice(0, 50).map((addr, idx) => (
                  <div key={idx} className="bg-[#1E2329] p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-[#F0B90B]">{addr.network?.toUpperCase()}</p>
                        <p className="text-xs text-gray-400">{addr.user_email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${addr.gas_funded ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {addr.gas_funded ? 'GAS OK' : 'NO GAS'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <div>
                        <p className="text-xs text-gray-400">Address</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono break-all">{addr.address}</p>
                          <button onClick={() => copyToClipboard(addr.address, `addr-${idx}`)}>
                            {copied === `addr-${idx}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      
                      {addr.private_key && (
                        <div>
                          <p className="text-xs text-red-400">Private Key</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono break-all text-red-300">{addr.private_key}</p>
                            <button onClick={() => copyToClipboard(addr.private_key, `pk-${idx}`)}>
                              {copied === `pk-${idx}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-xs text-gray-400 pt-2">
                        <span>Deposited: ${addr.total_deposited || 0}</span>
                        <span>{addr.created_at}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIP RANKS TAB */}
            {activeTab === 'vip' && (
              <div className="space-y-3">
                <p className="text-gray-400 mb-4">VIP Rank Users</p>
                {users.filter(u => u.vip_level > 0).map(user => (
                  <div key={user.user_id} className="bg-[#1E2329] p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">{user.name || 'No Name'}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#F0B90B] font-bold">VIP {user.vip_level}</p>
                      <p className="text-green-400">${(user.futures_balance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {users.filter(u => u.vip_level > 0).length === 0 && (
                  <p className="text-center text-gray-400 py-8">No VIP users yet</p>
                )}
              </div>
            )}

            {/* WALLETS TAB */}
            {activeTab === 'wallets' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#1E2329] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Futures</p>
                    <p className="text-xl font-bold text-green-400">
                      ${users.reduce((sum, u) => sum + (u.futures_balance || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[#1E2329] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Spot</p>
                    <p className="text-xl font-bold text-blue-400">
                      ${users.reduce((sum, u) => sum + (u.spot_balance || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-400 mb-2">Top Wallets by Balance</p>
                {users
                  .sort((a, b) => (b.futures_balance || 0) - (a.futures_balance || 0))
                  .slice(0, 30)
                  .map(user => (
                    <div key={user.user_id} className="bg-[#1E2329] p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{user.name || 'No Name'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">${(user.futures_balance || 0).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Spot: ${(user.spot_balance || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanelPro;
