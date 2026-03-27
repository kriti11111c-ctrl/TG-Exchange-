import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  CaretLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Funnel,
  ArrowsClockwise,
  MagnifyingGlass
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const AdminDepositsPage = () => {
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const adminToken = localStorage.getItem("admin_token");

  useEffect(() => {
    if (!adminToken) {
      navigate("/admin");
      return;
    }
    fetchDeposits();
  }, [adminToken, navigate, filter]);

  const fetchDeposits = async () => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const statusParam = filter !== "all" ? `?status=${filter}` : "";
      const response = await axios.get(`${API}/admin/deposit-requests${statusParam}`, { headers });
      
      setDeposits(response.data.requests || []);
      setStats(response.data.stats || {});
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/admin");
      }
      toast.error("Failed to fetch deposits");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDeposits();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleAction = async (requestId, action) => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/deposit-requests/action`, {
        request_id: requestId,
        action: action
      }, { headers });

      toast.success(`Deposit ${action}d successfully`);
      fetchDeposits();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action}`);
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredDeposits = deposits.filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.user_email?.toLowerCase().includes(query) ||
      d.user_name?.toLowerCase().includes(query) ||
      d.tx_hash?.toLowerCase().includes(query) ||
      d.request_id?.toLowerCase().includes(query)
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
            <h1 className="text-lg font-bold text-white">Deposit Requests</h1>
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
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total || 0} />
          <StatCard label="Pending" value={stats.pending || 0} color="yellow" />
          <StatCard label="Approved" value={stats.approved || 0} color="green" />
          <StatCard label="Rejected" value={stats.rejected || 0} color="red" />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map((f) => (
              <Button
                key={f}
                onClick={() => setFilter(f)}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className={filter === f ? "bg-orange-500" : "border-[#333] text-gray-400"}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, name, or tx hash..."
              className="pl-10 bg-[#111] border-[#333] text-white"
            />
          </div>
        </div>

        {/* Deposits Table */}
        <div className="bg-[#111111] border border-[#222] rounded-2xl overflow-hidden">
          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">No deposit requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Request ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Network</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">TX Hash</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {filteredDeposits.map((deposit) => (
                    <tr key={deposit.request_id} className="hover:bg-[#1a1a1a]">
                      <td className="px-4 py-4 text-sm text-gray-400 font-mono">
                        {deposit.request_id}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-white text-sm">{deposit.user_name}</p>
                          <p className="text-gray-500 text-xs">{deposit.user_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white font-semibold">{deposit.amount} {deposit.coin}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-[#222] text-gray-400 rounded text-xs">
                          {deposit.network}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-blue-400 font-mono text-xs">
                          {deposit.tx_hash?.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {formatDate(deposit.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(deposit.status)}
                      </td>
                      <td className="px-4 py-4">
                        {deposit.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAction(deposit.request_id, "approve")}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                            >
                              <CheckCircle size={14} />
                            </Button>
                            <Button
                              onClick={() => handleAction(deposit.request_id, "reject")}
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 h-8 px-3"
                            >
                              <XCircle size={14} />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">Processed</span>
                        )}
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

const StatCard = ({ label, value, color }) => {
  const colors = {
    yellow: "text-yellow-400",
    green: "text-green-400",
    red: "text-red-400"
  };
  
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${colors[color] || "text-white"}`}>{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
};

export default AdminDepositsPage;
