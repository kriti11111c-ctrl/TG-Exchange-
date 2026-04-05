import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  CaretLeft, 
  MagnifyingGlass,
  ArrowsClockwise,
  User,
  Wallet,
  Eye,
  EyeSlash,
  UserSwitch,
  Copy,
  Key,
  X
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [loggingInAs, setLoggingInAs] = useState(null);
  
  // Password change modal state
  const [passwordModal, setPasswordModal] = useState({ open: false, user: null });
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const adminToken = localStorage.getItem("admin_token");

  useEffect(() => {
    if (!adminToken) {
      navigate("/admin");
      return;
    }
    fetchUsers();
  }, [adminToken, navigate]);

  const fetchUsers = async () => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const response = await axios.get(`${API}/admin/users`, { headers });
      setUsers(response.data.users || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_data");
        toast.error("Session expired. Please login again.");
        navigate("/admin");
        return;
      }
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  // Login as User function
  const handleLoginAsUser = async (userId, userEmail) => {
    setLoggingInAs(userId);
    try {
      const res = await axios.post(
        `${API}/admin/login-as-user`, 
        { user_id: userId }, 
        { 
          headers: { Authorization: `Bearer ${adminToken}` },
          withCredentials: true  // Important: Allow cookie to be set
        }
      );
      
      // Clear admin session
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_data");
      
      toast.success(`Logged in as ${userEmail}`);
      
      // Redirect to user dashboard - cookie will authenticate
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

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Change user password
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return;
    }
    
    setChangingPassword(true);
    try {
      await axios.post(
        `${API}/admin/change-user-password`,
        { user_id: passwordModal.user.user_id, new_password: newPassword },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      toast.success(`${passwordModal.user.email} ka password change ho gaya!`);
      setPasswordModal({ open: false, user: null });
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Password change nahi hua");
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTotalBalance = (wallet) => {
    if (!wallet?.balances) return 0;
    return wallet.balances.usdt || 0;
  };

  const getFuturesBalance = (wallet) => {
    return wallet?.futures_balance || 0;
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(query) ||
      u.name?.toLowerCase().includes(query) ||
      u.user_id?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00E5FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#111111] border-b border-[#222] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="p-2 hover:bg-[#222] rounded-lg">
              <CaretLeft size={24} className="text-white" />
            </Link>
            <h1 className="text-lg font-bold text-white">All Users</h1>
            <span className="px-2 py-1 bg-[#00E5FF]/20 text-[#00E5FF] rounded-full text-sm">
              {users.length} total
            </span>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="border-[#333] text-gray-300"
            disabled={refreshing}
          >
            <ArrowsClockwise size={18} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, name, or user ID..."
            className="pl-10 bg-[#111] border-[#333] text-white"
            data-testid="user-search-input"
          />
        </div>

        {/* Users Table */}
        <div className="bg-[#111111] border border-[#222] rounded-2xl overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Password</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {filteredUsers.map((user, index) => (
                    <tr key={user.user_id} className="hover:bg-[#1a1a1a]">
                      {/* Serial Number */}
                      <td className="px-4 py-4 text-[#00E5FF] font-bold">
                        {index + 1}
                      </td>
                      
                      {/* User Name */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#0ECB81] flex items-center justify-center">
                            <User size={20} className="text-white" />
                          </div>
                          <div>
                            <span className="text-white font-medium block">{user.name || 'No Name'}</span>
                            {user.role === 'admin' && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">{user.email}</span>
                          <button 
                            onClick={() => copyToClipboard(user.email, "Email")}
                            className="text-gray-500 hover:text-[#00E5FF]"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                      
                      {/* Password */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {user.password_hash || user.password ? (
                            <>
                              <code className="text-xs text-gray-400 bg-[#222] px-2 py-1 rounded max-w-[80px] truncate">
                                {showPasswords[user.user_id] 
                                  ? (user.password_hash || user.password || '').slice(0, 10) + '...' 
                                  : '••••••••'}
                              </code>
                              <button 
                                onClick={() => togglePasswordVisibility(user.user_id)}
                                className="text-gray-500 hover:text-[#00E5FF]"
                              >
                                {showPasswords[user.user_id] ? <EyeSlash size={14} /> : <Eye size={14} />}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded">
                              Google
                            </span>
                          )}
                          <button 
                            onClick={() => setPasswordModal({ open: true, user })}
                            className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded flex items-center gap-1"
                            data-testid={`change-password-${user.user_id}`}
                          >
                            <Key size={12} />
                            Change
                          </button>
                        </div>
                      </td>
                      
                      {/* User ID */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-gray-500 max-w-[100px] truncate">
                            {user.user_id}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(user.user_id, "User ID")}
                            className="text-gray-500 hover:text-[#00E5FF]"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                      
                      {/* Balance */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Wallet size={14} className="text-green-400" />
                            <span className="text-green-400 font-semibold text-sm">
                              ${getTotalBalance(user.wallet).toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-xs">Spot</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#00E5FF] font-semibold text-sm">
                              ${getFuturesBalance(user.wallet).toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-xs">Futures</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Joined */}
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      
                      {/* Login as User Button */}
                      <td className="px-4 py-4">
                        <Button
                          onClick={() => handleLoginAsUser(user.user_id, user.email)}
                          disabled={loggingInAs === user.user_id}
                          size="sm"
                          className="bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-semibold"
                          data-testid={`login-as-${user.user_id}`}
                        >
                          {loggingInAs === user.user_id ? (
                            <ArrowsClockwise size={16} className="animate-spin" />
                          ) : (
                            <UserSwitch size={16} />
                          )}
                          Login
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Password Change Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key size={20} className="text-yellow-400" />
                Password Change
              </h3>
              <button 
                onClick={() => {
                  setPasswordModal({ open: false, user: null });
                  setNewPassword("");
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg">
              <p className="text-gray-400 text-sm">User:</p>
              <p className="text-white font-medium">{passwordModal.user?.email}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Naya Password</label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Naya password daalo (min 6 characters)"
                  className="bg-[#0A0A0A] border-[#333] text-white"
                  data-testid="new-password-input"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setPasswordModal({ open: false, user: null });
                    setNewPassword("");
                  }}
                  variant="outline"
                  className="flex-1 border-[#333] text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || newPassword.length < 6}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  data-testid="confirm-password-change"
                >
                  {changingPassword ? (
                    <ArrowsClockwise size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Key size={16} />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
