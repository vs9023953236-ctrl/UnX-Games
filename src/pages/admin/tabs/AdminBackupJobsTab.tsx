import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DatabaseBackup, HardDrive, PlayCircle, Loader2, FileDown, CheckCircle, Clock } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { api, fetchApi } from '../../../services/api';

export const AdminBackupJobsTab: React.FC = () => {
  const { showToast } = useStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/admin/backup-jobs');
      
      if (res.success) {
        setJobs(res.jobs || []);
      } else {
        setJobs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async () => {
    if (!window.confirm("Execute manual database backup now?")) return;
    setRunning(true);
    try {
      const res = await fetchApi('/api/admin/backup-jobs/execute', {
        method: 'POST',
      });
      
      if (res.success) {
        showToast('success', 'Backup Initiated', 'The backup job was started successfully.');
        fetchJobs();
      } else {
        showToast('error', 'Backup Failed', res.message || 'Cannot execute backup. Infrastructure not configured.');
      }
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = (jobId: string) => {
    window.location.href = `/api/admin/backup-jobs/${encodeURIComponent(jobId)}/download`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Data unavailable';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DatabaseBackup size={24} className="text-red-600" />
            Backup Jobs
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage scheduled database backups and trigger manual snapshots.
          </p>
        </div>
        
        <button
          onClick={runBackup}
          disabled={running}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-red-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
          <span>Run Manual Backup</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 size={32} className="animate-spin text-slate-400 mb-4" />
            <p className="font-medium text-sm">Loading backup jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
            <HardDrive size={48} className="text-slate-300 mb-4" />
            <p className="font-bold text-slate-800 text-lg">No Backups Found</p>
            <p className="font-medium text-sm text-slate-500 max-w-md mt-1">
              There are no backup jobs recorded yet. Trigger a manual backup snapshot above to safeguard database state.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
             <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium">
              {jobs.map((job, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800">{job.id}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        job.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-700'
                          : job.status === 'RUNNING'
                          ? 'bg-blue-100 text-blue-700 animate-pulse'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      <CheckCircle size={12} />
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">{job.destination || 'Cloudflare R2 + PostgreSQL'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">{formatSize(job.size_bytes)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{job.duration_ms ? `${job.duration_ms}ms` : '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {new Date(job.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(job.id)}
                      title="Download Backup Manifest & Snapshot"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <FileDown size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default AdminBackupJobsTab;
