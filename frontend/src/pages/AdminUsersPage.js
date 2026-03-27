import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  CaretLeft, 
  MagnifyingGlass,
  ArrowsClockwise,
  User,
  Wallet
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
      if (error.response?.status === 401) {
        navigate("/admin");
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
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
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">USDT Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Referral Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-[#1a1a1a]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <User size={20} className="text-white" />
                          </div>
                          <span className="text-white font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 text-gray-500 font-mono text-xs">
                        {user.user_id}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Wallet size={16} className="text-green-400" />
                          <span className="text-green-400 font-semibold">
                            ${getTotalBalance(user.wallet).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-[#222] text-gray-400 rounded text-xs font-mono">
                          {user.referral_code || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminUsersPage;
