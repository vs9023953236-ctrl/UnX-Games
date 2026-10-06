import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Loader2, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { api, fetchApi } from '../../../services/api';

export const AdminRefundsTab: React.FC = () => {
  const { showToast } = useStore();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/admin/refunds');
      
      if (res.success && res.refunds) {
        setRefunds(res.refunds);
      } else {
        setRefunds([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filtered = refunds.filter(r => 
    r.id?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.customer_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight size={24} className="text-red-600" />
            Refunds
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            View completed and pending refund transactions.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search refunds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Customer ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Loading refunds...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No refunds found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx, index) => (
                  <tr key={tx.id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{tx.id}</td>
                    <td className="px-6 py-4 font-mono text-xs">{tx.customer_id}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">+{tx.amount} NPR</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AdminRefundsTab;
