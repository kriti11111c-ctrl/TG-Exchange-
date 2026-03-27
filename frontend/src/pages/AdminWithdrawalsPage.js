import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../App";
import axios from "axios";
import { 
  CaretLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowsClockwise,
  MagnifyingGlass,
  Copy
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const AdminWithdrawalsPage = () => {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [txHashInput, setTxHashInput] = useState({});

  const adminToken = localStorage.getItem("admin_token");

  useEffect(() => {
    if (!adminToken) {
      navigate("/admin");
      return;
    }
    fetchWithdrawals();
  }, [adminToken, navigate, filter]);

  const fetchWithdrawals = async () => {
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const statusParam = filter !== "all" ? `?status=${filter}` : "";
      const response = await axios.get(`${API}/admin/withdrawal-requests${statusParam}`, { headers });
      
      setWithdrawals(response.data.requests || []);
      setStats(response.data.stats || {});
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/admin");
      }
      toast.error("Failed to fetch withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWithdrawals();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleAction = async (requestId, action) => {
    if (action === "approve" && (!txHashInput[requestId] || txHashInput[requestId].length < 10)) {
      toast.error("Please enter the transaction hash after sending funds");
      return;
    }

    setProcessingId(requestId);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.post(`${API}/admin/withdrawal-requests/action`, {
        request_id: requestId,
        action: action,
        tx_hash: txHashInput[requestId] || null
      }, { headers });

      toast.success(`Withdrawal ${action}d successfully`);
      fetchWithdrawals();
      setTxHashInput(prev => ({ ...prev, [requestId]: "" }));
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setProcessingId(null);
    }
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied!");
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

  const filteredWithdrawals = withdrawals.filter(w => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      w.user_email?.toLowerCase().includes(query) ||
      w.user_name?.toLowerCase().includes(query) ||
      w.wallet_address?.toLowerCase().includes(query) ||
      w.request_id?.toLowerCase().includes(query)
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
            <h1 className="text-lg font-bold text-white">Withdrawal Requests</h1>
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
            {["pending", "all", "approved", "rejected"].map((f) => (
              <Button
                key={f}
                onClick={() => setFilter(f)}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className={filter === f ? "bg-red-500" : "border-[#333] text-gray-400"}
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
              placeholder="Search by email, name, or address..."
              className="pl-10 bg-[#111] border-[#333] text-white"
            />
          </div>
        </div>

        {/* Withdrawals List */}
        <div className="space-y-4">
          {filteredWithdrawals.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
              <p className="text-gray-400">No withdrawal requests found</p>
            </div>
          ) : (
            filteredWithdrawals.map((withdrawal) => (
              <div key={withdrawal.request_id} className="bg-[#111] border border-[#222] rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left - Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-red-400">
                        -{withdrawal.amount} {withdrawal.coin}
                      </span>
                      {getStatusBadge(withdrawal.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">User:</span>
                        <span className="text-white ml-2">{withdrawal.user_name}</span>
                        <span className="text-gray-500 ml-1">({withdrawal.user_email})</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Network:</span>
                        <span className="text-white ml-2 uppercase">{withdrawal.network}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">To:</span>
                      <code className="text-blue-400 text-sm bg-[#1a1a1a] px-2 py-1 rounded font-mono break-all">
                        {withdrawal.wallet_address}
                      </code>
                      <button 
                        onClick={() => copyAddress(withdrawal.wallet_address)}
                        className="p-1 hover:bg-[#222] rounded"
                      >
                        <Copy size={16} className="text-gray-400" />
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Submitted: {formatDate(withdrawal.created_at)}
                    </div>
                  </div>

                  {/* Right - Actions */}
                  {withdrawal.status === "pending" && (
                    <div className="space-y-3 min-w-[300px]">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">
                          Enter TX Hash after sending funds:
                        </label>
                        <Input
                          type="text"
                          value={txHashInput[withdrawal.request_id] || ""}
                          onChange={(e) => setTxHashInput(prev => ({
                            ...prev,
                            [withdrawal.request_id]: e.target.value
                          }))}
                          placeholder="Transaction hash..."
                          className="bg-[#1a1a1a] border-[#333] text-white font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAction(withdrawal.request_id, "approve")}
                          disabled={processingId === withdrawal.request_id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle size={18} />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleAction(withdrawal.request_id, "reject")}
                          disabled={processingId === withdrawal.request_id}
                          variant="outline"
                          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle size={18} />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {withdrawal.status === "approved" && withdrawal.tx_hash && (
                    <div className="text-sm">
                      <span className="text-gray-500">TX Hash:</span>
                      <code className="text-green-400 ml-2 font-mono text-xs">
                        {withdrawal.tx_hash.substring(0, 20)}...
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))
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

export default AdminWithdrawalsPage;
