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
  TrendUp
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const adminToken = localStorage.getItem("admin_token");
  const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");

  useEffect(() => {
    if (!adminToken) {
      navigate("/admin");
      return;
    }
    fetchData();
  }, [adminToken, navigate]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      
      const [statsRes, depositsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/deposit-requests?status=pending`, { headers })
      ]);

      setStats(statsRes.data);
      setPendingDeposits(depositsRes.data.requests || []);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_data");
        navigate("/admin");
      }
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <ShieldCheck size={24} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">TG Xchange Admin</h1>
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

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

export default AdminDashboard;
