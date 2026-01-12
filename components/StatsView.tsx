import React, { useState, useMemo } from 'react';
import { ActivityLog, User, StatFolder, Report, DateFilter, AppSettings } from '../types';
import { Folder, Plus, Trash2, FileText, ChevronRight, Search, X, FileDown, ChevronLeft, Move, BarChart3, CheckSquare, Square, Calendar, User as UserIcon, Settings2, Edit2, FolderInput } from 'lucide-react';

interface StatsViewProps {
  logs: ActivityLog[];
  users: User[];
  folders: StatFolder[];
  setFolders: React.Dispatch<React.SetStateAction<StatFolder[]>>;
  reports: Report[];
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  currentUser: User;
  settings: AppSettings;
}

const StatsView: React.FC<StatsViewProps> = ({ logs, folders, setFolders, reports, setReports, users, currentUser, settings }) => {
  const [showNewReport, setShowNewReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [movingReportId, setMovingReportId] = useState<string | null>(null);

  const isAgent = currentUser.role === 'USER';
  const isPrivileged = currentUser.role !== 'USER';

  // Available Metrics Configuration
  const availableMetrics = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'calls', label: 'Calls' },
    { id: 'appointments', label: 'Booked' },
    { id: 'followUps', label: 'Follow Ups' },
    { id: 'noShows', label: 'No Shows' },
    { id: 'closedDeals', label: 'Closed Deals' },
  ];

  // Report Builder Form State
  const [repName, setRepName] = useState('');
  const [repUser, setRepUser] = useState<string | 'team'>(isAgent ? currentUser.id : 'team');
  const [repMetrics, setRepMetrics] = useState<string[]>(['revenue', 'closedDeals']);
  const [repRange, setRepRange] = useState<DateFilter>('month');
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const canSeeRevenue = useMemo(() => {
    const visibility = settings.revenueVisibility || 'EVERYONE';
    if (visibility === 'EVERYONE') return true;
    if (visibility === 'ADMIN') return currentUser.role === 'ADMIN' || currentUser.role === 'OWNER';
    if (visibility === 'OWNER') return currentUser.role === 'OWNER';
    return false;
  }, [settings.revenueVisibility, currentUser.role]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const accessibleReports = reports.filter(r => {
      if (isAgent) return r.userId === currentUser.id;
      return true;
    });

    if (term) {
      const matchedFolders = folders.filter(f => f.name.toLowerCase().includes(term));
      const matchedReports = accessibleReports.filter(r => r.name.toLowerCase().includes(term));
      return { folders: matchedFolders, reports: matchedReports };
    }

    const visibleFolders = activeFolderId ? [] : folders;
    const visibleReports = accessibleReports.filter(r => r.folderId === (activeFolderId || undefined));
    return { folders: visibleFolders, reports: visibleReports };
  }, [folders, reports, searchTerm, activeFolderId, isAgent, currentUser.id]);

  const calculateReportData = (report: Report) => {
    const today = new Date().toISOString().split('T')[0];
    const reportLogs = logs.filter(log => {
      // User Filtering
      if (report.userId !== 'team' && log.userId !== report.userId) return false;
      
      // Date Filtering
      const logDate = new Date(log.date);
      if (report.dateRange === 'today') return log.date === today;
      if (report.dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate >= weekAgo;
      }
      if (report.dateRange === 'month') {
        const now = new Date();
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      if (report.dateRange === 'ytd') {
        return logDate.getFullYear() === new Date().getFullYear();
      }
      if (report.dateRange === 'custom' && report.customDates) {
        return log.date >= report.customDates.start && log.date <= report.customDates.end;
      }
      return true;
    });

    const totals = reportLogs.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.revenue || 0),
      calls: acc.calls + (curr.calls || 0),
      appointments: acc.appointments + (curr.appointments || 0),
      followUps: acc.followUps + (curr.followUps || 0),
      noShows: acc.noShows + (curr.noShows || 0),
      closedDeals: acc.closedDeals + (curr.closedDeals || 0)
    }), { revenue: 0, calls: 0, appointments: 0, followUps: 0, noShows: 0, closedDeals: 0 });

    return { totals, count: reportLogs.length };
  };

  const saveReport = () => {
    if (!repName || repMetrics.length === 0) return;

    if (editingReportId) {
      setReports(prev => prev.map(r => r.id === editingReportId ? {
        ...r,
        name: repName,
        userId: isAgent ? currentUser.id : repUser,
        metrics: repMetrics,
        dateRange: repRange,
        customDates: repRange === 'custom' ? customDates : undefined
      } : r));
      setEditingReportId(null);
    } else {
      const report: Report = {
        id: Math.random().toString(36).substr(2, 9),
        name: repName,
        userId: isAgent ? currentUser.id : repUser,
        metrics: repMetrics,
        dateRange: repRange,
        customDates: repRange === 'custom' ? customDates : undefined,
        folderId: activeFolderId || undefined,
        createdAt: Date.now()
      };
      setReports([report, ...reports]);
    }
    
    setShowNewReport(false);
    resetForm();
  };

  const startEditReport = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    setEditingReportId(report.id);
    setRepName(report.name);
    setRepUser(report.userId);
    setRepMetrics(report.metrics);
    setRepRange(report.dateRange);
    if (report.customDates) setCustomDates(report.customDates);
    setShowNewReport(true);
  };

  const resetForm = () => {
    setRepName('');
    setRepUser(isAgent ? currentUser.id : 'team');
    setRepMetrics(['revenue', 'closedDeals']);
    setRepRange('month');
    setEditingReportId(null);
  };

  const toggleMetric = (metricId: string) => {
    setRepMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(m => m !== metricId) 
        : [...prev, metricId]
    );
  };

  const toggleAllMetrics = () => {
    if (repMetrics.length === availableMetrics.length) {
      setRepMetrics([]);
    } else {
      setRepMetrics(availableMetrics.map(m => m.id));
    }
  };

  const handleMoveReport = (reportId: string, folderId: string | undefined) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, folderId } : r));
    setMovingReportId(null);
  };

  const deleteReport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Permanently delete this report?')) {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  const deleteFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this folder? All contained reports will be moved to the root directory.')) {
      setFolders(prev => prev.filter(f => f.id !== id));
      setReports(prev => prev.map(r => r.folderId === id ? { ...r, folderId: undefined } : r));
      if (activeFolderId === id) setActiveFolderId(null);
    }
  };

  const downloadReportCSV = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    const { totals } = calculateReportData(report);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    report.metrics.forEach(m => {
      if (m === 'revenue' && !canSeeRevenue) return;
      const val = (totals as any)[m];
      csvContent += `${m.toUpperCase()},${val}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${report.name.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight uppercase">Stats</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Historical Pulse Data</p>
        </div>
        <div className="flex gap-2">
          {isPrivileged && (
            <button onClick={() => setShowFolderModal(true)} className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all shadow-lg active:scale-95">
              <Folder size={20} />
            </button>
          )}
          <button onClick={() => { resetForm(); setShowNewReport(true); }} className="p-4 purple-solid text-white rounded-2xl shadow-xl active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {activeFolderId && (
          <button onClick={() => setActiveFolderId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors w-fit group">
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Root Directory
          </button>
        )}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
          <input 
            placeholder="Search archives..." 
            className="w-full bg-zinc-950 border border-white/5 p-4 pl-12 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:border-purple-500 transition-all" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {showNewReport && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-purple-500/20 p-8 md:p-12 rounded-[3rem] w-full max-w-2xl space-y-8 animate-in zoom-in-95 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 purple-solid" />
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-black italic uppercase gold-text tracking-widest flex items-center gap-2">
                 <Settings2 size={16} /> {editingReportId ? 'Modify Analytics Report' : 'Build Analytics Report'}
               </h3>
               <button onClick={() => { setShowNewReport(false); resetForm(); }} className="p-2 text-zinc-600 hover:text-white transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Report Identifier</label>
                  <input 
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500 transition-all" 
                    placeholder="E.g. Monthly Performance..." 
                    value={repName} 
                    onChange={e => setRepName(e.target.value)} 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Data Source</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                    <select 
                      className="w-full bg-black border border-white/10 p-4 pl-12 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500 appearance-none" 
                      value={repUser} 
                      onChange={e => setRepUser(e.target.value)}
                    >
                       {!isAgent && <option value="team">Team</option>}
                       {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Metric Selection</label>
                <button onClick={toggleAllMetrics} className="text-[8px] font-black uppercase text-purple-500 hover:underline tracking-widest">
                  {repMetrics.length === availableMetrics.length ? 'Clear All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableMetrics.map(m => {
                  const isSelected = repMetrics.includes(m.id);
                  if (m.id === 'revenue' && !canSeeRevenue) return null;
                  return (
                    <button 
                      key={m.id}
                      onClick={() => toggleMetric(m.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left group ${isSelected ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-lg shadow-purple-500/5' : 'bg-black border-white/5 text-zinc-600 hover:text-zinc-400'}`}
                    >
                      {isSelected ? <CheckSquare size={14} className="text-purple-500" /> : <Square size={14} className="group-hover:text-zinc-500" />}
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Timeframe Strategy</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-black p-1 rounded-2xl border border-white/5">
                {(['today', 'week', 'month', 'ytd', 'custom'] as DateFilter[]).map(f => (
                  <button key={f} onClick={() => setRepRange(f)} className={`py-3 text-[8px] font-black uppercase rounded-xl transition-all ${repRange === f ? 'bg-zinc-900 text-yellow-500 border border-yellow-500/20 shadow-lg' : 'text-zinc-600 hover:text-white'}`}>
                    {f}
                  </button>
                ))}
              </div>
              {repRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-700 uppercase px-2">Start</p>
                    <input type="date" className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500" value={customDates.start} onChange={e => setCustomDates({...customDates, start: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-700 uppercase px-2">End</p>
                    <input type="date" className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500" value={customDates.end} onChange={e => setCustomDates({...customDates, end: e.target.value})} />
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={saveReport} 
              disabled={!repName || repMetrics.length === 0} 
              className="w-full py-5 purple-solid text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
            >
              {editingReportId ? 'Sync Updates' : 'Generate & Save Report'}
            </button>
          </div>
        </div>
      )}

      {movingReportId && (
        <div className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 max-md w-full space-y-8 animate-in zoom-in-95 shadow-2xl">
             <div className="text-center">
               <h3 className="text-xl font-black italic gold-text uppercase flex items-center justify-center gap-2">
                 <Move size={20} /> Relocate Report
               </h3>
               <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Select destination folder</p>
             </div>
             
             <div className="max-h-64 overflow-y-auto space-y-2 p-2">
                <button 
                  onClick={() => handleMoveReport(movingReportId, undefined)}
                  className="w-full p-4 bg-black border border-white/5 rounded-2xl flex items-center justify-between text-zinc-500 hover:text-white hover:border-white/10 transition-all group"
                >
                   <span className="text-[10px] font-black uppercase tracking-widest">/ Root Directory</span>
                   <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                </button>
                {folders.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => handleMoveReport(movingReportId, f.id)}
                    className="w-full p-4 bg-black border border-white/5 rounded-2xl flex items-center justify-between text-zinc-500 hover:text-white hover:border-white/10 transition-all group"
                  >
                     <div className="flex items-center gap-3">
                        <Folder size={14} className="text-zinc-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{f.name}</span>
                     </div>
                     <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
             </div>

             <button onClick={() => setMovingReportId(null)} className="w-full py-4 bg-zinc-900 text-zinc-500 font-black uppercase text-[10px] rounded-xl">Cancel Migration</button>
          </div>
        </div>
      )}

      {viewingReport && (() => {
        const { totals } = calculateReportData(viewingReport);
        const filteredMetrics = availableMetrics.filter(m => viewingReport.metrics.includes(m.id));
        
        return (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-2xl p-10 space-y-10 shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-widest italic gold-text">{viewingReport.name}</h3>
                    <div className="flex gap-2">
                        <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">
                          Source: {viewingReport.userId === 'team' ? 'Team' : users.find(u => u.id === viewingReport.userId)?.name}
                        </p>
                        <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest border-l border-white/10 pl-2">
                          Range: {viewingReport.dateRange}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isPrivileged && (
                      <button onClick={(e) => downloadReportCSV(e, viewingReport)} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all shadow-lg">
                        <FileDown size={20} />
                      </button>
                    )}
                    <button onClick={() => setViewingReport(null)} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-600 hover:text-white transition-all">
                      <X size={20} />
                    </button>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                {filteredMetrics.map(m => {
                   const val = (totals as any)[m.id];
                   return (
                     <div key={m.id} className="bg-black border border-white/5 p-6 rounded-3xl group hover:border-purple-500/20 transition-all">
                        <p className="text-[9px] font-black uppercase text-zinc-600 mb-1 tracking-widest">{m.label}</p>
                        <p className="text-2xl font-black italic group-hover:gold-text transition-colors">
                          {m.id === 'revenue' ? `$${val.toLocaleString()}` : val.toLocaleString()}
                        </p>
                     </div>
                   );
                })}
             </div>

             <button onClick={() => setViewingReport(null)} className="w-full py-5 purple-solid text-white font-black uppercase tracking-widest text-[9px] rounded-2xl shadow-xl active:scale-95 transition-all">
               Close Analytics Workspace
             </button>
          </div></div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.folders.map(f => (
          <div key={f.id} onClick={() => setActiveFolderId(f.id)} className="p-8 bg-zinc-950 border border-white/5 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-yellow-500/20 transition-all shadow-xl relative">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-zinc-500 group-hover:text-yellow-500 transition-colors shadow-inner">
                <Folder size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black italic group-hover:text-white uppercase tracking-widest">{f.name}</h4>
                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mt-1">Directory Folder</p>
              </div>
            </div>
            {isPrivileged && (
              <button 
                onClick={(e) => deleteFolder(e, f.id)}
                className="p-3 text-zinc-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete Folder"
              >
                <Trash2 size={16} />
              </button>
            )}
            <ChevronRight size={18} className="text-zinc-800 group-hover:text-white transition-colors" />
          </div>
        ))}

        {filteredData.reports.map(r => (
            <div key={r.id} onClick={() => setViewingReport(r)} className="p-8 bg-zinc-950 border border-white/5 rounded-[2.5rem] flex flex-col gap-6 group cursor-pointer hover:border-purple-500/20 transition-all relative shadow-xl overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-zinc-500 group-hover:text-purple-500 transition-colors shadow-inner">
                          <FileText size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black italic group-hover:gold-text tracking-tight uppercase tracking-widest">{r.name}</h4>
                            <div className="flex gap-2 mt-1">
                              <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">
                                {r.dateRange}
                              </p>
                              <p className="text-[8px] text-zinc-700 uppercase font-black tracking-widest border-l border-white/10 pl-2">
                                {r.metrics.length} metrics
                              </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="flex gap-1">
                      <button 
                        onClick={(e) => startEditReport(e, r)}
                        className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white hover:border-white/10 transition-all"
                        title="Edit Configuration"
                      >
                         <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setMovingReportId(r.id); }}
                        className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white hover:border-white/10 transition-all"
                        title="Relocate Report"
                      >
                         <FolderInput size={14} />
                      </button>
                      <button 
                        onClick={(e) => downloadReportCSV(e, r)}
                        className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                        title="Download CSV"
                      >
                         <FileDown size={14} />
                      </button>
                   </div>
                   <button 
                    onClick={(e) => deleteReport(e, r.id)}
                    className="p-3 bg-rose-950/20 border border-rose-500/10 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                   >
                      <Trash2 size={14} />
                   </button>
                </div>
                
                <ChevronRight size={18} className="absolute top-8 right-8 text-zinc-800 group-hover:text-white transition-colors" />
            </div>
        ))}

        {filteredData.folders.length === 0 && filteredData.reports.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center gap-4">
             <BarChart3 size={48} />
             <p className="text-[10px] font-black uppercase tracking-[0.5em]">Empty Directory</p>
          </div>
        )}
      </div>

      {showFolderModal && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 max-w-md w-full space-y-8 animate-in zoom-in-95 shadow-2xl">
              <div className="text-center">
                 <h3 className="text-xl font-black italic gold-text uppercase">Create Folder</h3>
                 <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Organize your analytics directory</p>
              </div>
              <input 
                className="w-full bg-black border border-white/10 p-5 rounded-2xl text-sm font-bold text-white outline-none focus:border-purple-500 transition-all" 
                placeholder="Folder Identifier..." 
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
              />
              <div className="flex gap-4">
                 <button onClick={() => {
                    if (newFolderName) {
                      setFolders([...folders, { id: Math.random().toString(36).substr(2, 9), name: newFolderName, agencyId: currentUser.agencyId, createdAt: Date.now() }]);
                      setNewFolderName('');
                      setShowFolderModal(false);
                    }
                 }} className="flex-1 py-4 purple-solid text-white font-black uppercase text-[10px] rounded-xl shadow-lg active:scale-95 transition-all">Create</button>
                 <button onClick={() => setShowFolderModal(false)} className="flex-1 py-4 bg-zinc-900 text-zinc-500 font-black uppercase text-[10px] rounded-xl hover:text-white transition-colors">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StatsView;