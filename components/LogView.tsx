
import React, { useState, useMemo } from 'react';
import { User, ActivityLog, AuditType } from '../types';
import { Save, CheckCircle, History, Search, Edit2, Trash2, X, Calendar, Clock, FileText, AlignLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface LogViewProps {
  currentUser: User;
  logs: ActivityLog[];
  setLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  logAudit?: (msg: string, type: AuditType, restorableData?: any, metadata?: any) => void;
}

const LogView: React.FC<LogViewProps> = ({ currentUser, logs, setLogs, logAudit }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    revenue: 0, 
    calls: 0, 
    appointments: 0, 
    followUps: 0, 
    noShows: 0,
    closedDeals: 0,
    notes: ''
  });

  const filteredHistory = useMemo(() => {
    const term = historySearchTerm.toLowerCase();
    return logs
      .filter(l => l.userId === currentUser.id)
      .filter(l => 
        l.date.includes(term) || 
        l.notes?.toLowerCase().includes(term)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, currentUser.id, historySearchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLogId) {
      setLogs(prev => prev.map(l => l.id === editingLogId ? { ...l, ...form } : l));
      if (logAudit) logAudit(`Performance record for ${form.date} adjusted by ${currentUser.name}`, "STAT_CHANGE");
      setEditingLogId(null);
    } else {
      const newEntry: ActivityLog = { id: Math.random().toString(36).substr(2, 9), userId: currentUser.id, agencyId: currentUser.agencyId, ...form };
      setLogs([newEntry, ...logs]);
      if (logAudit) logAudit(`New performance data initialized for ${form.date} (Revenue: $${form.revenue})`, "STAT_CHANGE");
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setForm({ date: new Date().toISOString().split('T')[0], revenue: 0, calls: 0, appointments: 0, followUps: 0, noShows: 0, closedDeals: 0, notes: '' });
  };

  const handleEdit = (log: ActivityLog) => {
    setEditingLogId(log.id);
    setForm({ date: log.date, revenue: log.revenue, calls: log.calls, appointments: log.appointments, followUps: log.followUps, noShows: log.noShows, closedDeals: log.closedDeals, notes: log.notes || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (log: ActivityLog) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      setLogs(prev => prev.filter(l => l.id !== log.id));
      if (logAudit) logAudit(`Performance record for ${log.date} purged from directory by ${currentUser.name}`, "STAT_CHANGE");
    }
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setForm({ date: new Date().toISOString().split('T')[0], revenue: 0, calls: 0, appointments: 0, followUps: 0, noShows: 0, closedDeals: 0, notes: '' });
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-32">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic gold-text">
            {editingLogId ? 'Update Production' : 'Log Daily Activity'}
          </h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">
            {editingLogId ? 'Correcting the record' : 'Fuel the machine. Track the win.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-white/5 p-8 md:p-12 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden">
          {editingLogId && <div className="absolute top-0 left-0 right-0 h-1 purple-solid" />}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="w-full space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-2 flex items-center gap-2">
                <Calendar size={12} className="gold-text" /> Production Date
              </label>
              <input type="date" className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:border-yellow-500 transition-all text-white" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            {editingLogId && <button type="button" onClick={cancelEdit} className="w-full md:w-auto px-8 py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-all flex items-center justify-center gap-2"><X size={16} /> Cancel Editing</button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <InputGroup label="Revenue Generated ($)" value={form.revenue} onChange={v => setForm({...form, revenue: +v})} />
            <InputGroup label="Calls Made" value={form.calls} onChange={v => setForm({...form, calls: +v})} />
            <InputGroup label="Booked" value={form.appointments} onChange={v => setForm({...form, appointments: +v})} />
            <InputGroup label="Closed Deals" value={form.closedDeals} onChange={v => setForm({...form, closedDeals: +v})} />
            <InputGroup label="Follow Ups" value={form.followUps} onChange={v => setForm({...form, followUps: +v})} />
            <InputGroup label="No Shows" value={form.noShows} onChange={v => setForm({...form, noShows: +v})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-2 flex items-center gap-2"><AlignLeft size={12} className="gold-text" /> Activity Notes</label>
            <textarea className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:border-yellow-500 transition-all text-white min-h-[120px]" placeholder="..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <button type="submit" className={`w-full py-6 font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all purple-solid text-white`}>
            <Save size={20} /> {editingLogId ? 'Update Log Entry' : 'Update & Save Logs'}
          </button>
          {showSuccess && <div className="flex items-center justify-center gap-2 text-emerald-400 font-black uppercase tracking-widest text-[11px] animate-in fade-in slide-in-from-top-2 duration-500"><CheckCircle size={16} /> Successfully {editingLogId ? 'Updated' : 'Logged'}</div>}
        </form>

        <div className="flex justify-center">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-3 px-10 py-4 bg-zinc-900 border border-white/5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group"
          >
            <History size={16} className={showHistory ? 'gold-text' : ''} />
            {showHistory ? 'Hide History' : 'History'}
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="space-y-8 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6 px-2">
            <div className="space-y-1">
              <h3 className="text-xl font-black italic gold-text flex items-center gap-3"><History size={20} /> Production History</h3>
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Past activity archives</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
              <input type="text" placeholder="Search..." className="w-full bg-zinc-950 border border-white/5 p-3 pl-10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-yellow-500" value={historySearchTerm} onChange={e => setHistorySearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4">
            {filteredHistory.length === 0 ? (
              <div className="p-20 text-center opacity-20 border-2 border-dashed border-white/5 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Records Found</p>
              </div>
            ) : (
              filteredHistory.map(log => (
                <div key={log.id} className="p-6 bg-zinc-950 border border-white/5 rounded-[2rem] flex flex-col gap-4 group hover:border-white/10 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-yellow-500 shadow-inner">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black italic">{new Date(log.date).toLocaleDateString()}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Revenue: <span className="text-emerald-500">${log.revenue.toLocaleString()}</span></p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Calls: <span className="text-zinc-300">{log.calls}</span></p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Closed: <span className="gold-text">{log.closedDeals}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(log)} className="p-3 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded-xl transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(log)} className="p-3 bg-zinc-900 border border-white/5 text-rose-900 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {log.notes && (
                    <div className="px-4 py-3 bg-black/50 border border-white/5 rounded-xl">
                      <p className="text-[9px] font-black uppercase text-zinc-600 mb-1 flex items-center gap-1"><FileText size={10} /> Internal Notes</p>
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">{log.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, value, onChange }: any) => (<div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-2">{label}</label><input type="number" placeholder="0" className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:border-yellow-500 transition-all text-white placeholder:text-zinc-800" value={value || ''} onChange={e => onChange(e.target.value)} /></div>);

export default LogView;
