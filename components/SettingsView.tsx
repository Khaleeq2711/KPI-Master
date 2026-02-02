import React, { useState, useRef, useMemo } from 'react';
import { User, AppSettings, AuditEntry, DateFilter, PerformanceMetric, DeletedItem, AuditType, NotificationConfig } from '../types';
import { UserCircle, Settings as SettingsIcon, ChevronRight, Image as ImageIcon, Palette, Lock, Target, BellRing, Quote, BarChart3, Medal, CheckCircle2, Upload, FileText, AlertCircle, History, UserCheck, ShieldAlert, UserMinus, PlusCircle, RotateCcw, Trash2, CreditCard, DollarSign as DollarIcon, X, Search, Info, Volume2, VolumeX, ToggleLeft, ToggleRight, Camera, CheckSquare, Square } from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  auditHistory: AuditEntry[];
  deletedHistory: DeletedItem[];
  onRestoreItem: (id: string) => void;
  onRevertAudit?: (id: string) => void;
  onLogout: () => void;
  logAudit?: (msg: string, type: AuditType, restorableData?: any, metadata?: any) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, setCurrentUser, settings, setSettings, users, setUsers, auditHistory, deletedHistory, onRestoreItem, onRevertAudit, onLogout, logAudit }) => {
  const isAdmin = currentUser.role === 'admin';
  const isPrivileged = currentUser.role !== 'USER';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'agency' | 'defaults' | 'activity' | 'billing' | 'users'>('profile');
  const [activityView, setActivityView] = useState<'audit' | 'restoration'>('audit');
  const [activitySearch, setActivitySearch] = useState('');

  // Users form state (admin only)
  const [newUserForm, setNewUserForm] = useState<{ name: string; email: string; role: 'closer'|'setter'|'bookkeeper'|'admin'; password: string; companyId: string }>({
    name: '',
    email: '',
    role: 'closer',
    password: '',
    companyId: ''
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Workspace Defaults State
  const [pendingDefaultGoal, setPendingDefaultGoal] = useState(settings.defaultUserGoal);
  const [pendingChartMetrics, setPendingChartMetrics] = useState<string[]>(settings.defaultChartMetrics || ['closedDeals', 'appointments']);
  const [pendingTopMetric, setPendingTopMetric] = useState<PerformanceMetric>(settings.topPerformerMetric || 'revenue');
  const [pendingDefaultFilter, setPendingDefaultFilter] = useState<DateFilter>(settings.defaultFilter || 'today');

  const saveAgencyDefaults = () => {
    if (!isPrivileged) return;
    if (pendingChartMetrics.length !== 2) {
      alert("Please select exactly 2 metrics for the performance graph axes.");
      return;
    }
    setSettings(prev => ({ 
      ...prev, 
      defaultUserGoal: pendingDefaultGoal,
      topPerformerMetric: pendingTopMetric,
      defaultFilter: pendingDefaultFilter,
      defaultChartMetrics: pendingChartMetrics,
    }));
    if (logAudit) logAudit(`Workspace global defaults adjusted by ${currentUser.name}`, "SETTINGS_UPDATE");
    alert('Workspace defaults saved.');
  };

  // Create user (admin) - posts to backend (/api/signup) which forwards to Google Apps Script
  const createUserFromSettings = async () => {
    if (!isAdmin) return;
    const { name, email, role, password, companyId } = newUserForm;
    if (!name || !email || !role || !password || !companyId) {
      alert('Please fill all fields to create a user');
      return;
    }
    setIsCreatingUser(true);
    try {
      const res = await fetch('http://localhost:3002/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, password, companyName: companyId })
      });
      const data = await res.json();
      if (data.success) {
        const createdUser: User = {
          id: Math.random().toString(36).substr(2,9),
          name,
          email,
          role: role as any,
          revenueGoal: settings.defaultUserGoal,
          status: 'active',
          agencyId: companyId,
          needsSetup: false,
          taskNotificationsEnabled: true,
          notificationSoundEnabled: true,
          notificationVibrationEnabled: false,
          taskReminderOffset: { value: 1, unit: 'hours', direction: 'before' }
        };
        setUsers(prev => [...prev, createdUser]);
        if (logAudit) logAudit(`Admin created user ${name} (${role})`, 'USER_MANAGEMENT', createdUser);
        alert('User created and added to sheet');
        setNewUserForm({ name: '', email: '', role: 'closer', password: '', companyId: '' });
      } else {
        alert(data.message || 'User creation failed');
      }
    } catch (err) {
      console.error('createUserFromSettings', err);
      alert('Error creating user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const toggleChartMetric = (mId: string) => {
    setPendingChartMetrics(prev => {
      if (prev.includes(mId)) return prev.filter(x => x !== mId);
      if (prev.length >= 2) return [prev[1], mId];
      return [...prev, mId];
    });
  }; 

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight italic uppercase">Settings</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Configure system parameters</p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-10">
        <div className="md:w-64 space-y-2">
           <SidebarButton icon={UserCircle} label="My Profile" active={activeSubTab === 'profile'} onClick={() => setActiveSubTab('profile')} />
           {isPrivileged && (
             <>
                {/* <SidebarButton icon={SettingsIcon} label="Agency Identity" active={activeSubTab === 'agency'} onClick={() => setActiveSubTab('agency')} /> */}
                {isAdmin && <SidebarButton icon={UserCheck} label="Users" active={activeSubTab === 'users'} onClick={() => setActiveSubTab('users')} />}
                {/* <SidebarButton icon={Target} label="Workspace Defaults" active={activeSubTab === 'defaults'} onClick={() => setActiveSubTab('defaults')} /> */}
                {/* <SidebarButton icon={History} label="System Activity" active={activeSubTab === 'activity'} onClick={() => setActiveSubTab('activity')} /> */}
             </>
           )}
        </div>

        <div className="flex-1">
          <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            {activeSubTab === 'defaults' && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest flex items-center gap-2"><Target size={14} /> Global Agent Goal ($)</label>
                        <div className="relative">
                          <DollarIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                          <input type="number" className="w-full bg-black border border-white/10 p-5 pl-10 rounded-2xl text-sm font-black text-white outline-none focus:border-purple-500" value={pendingDefaultGoal} onChange={e => setPendingDefaultGoal(+e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest flex items-center gap-2"><BarChart3 size={14} /> Performance Graph Axes (Select 2)</label>
                        <div className="grid grid-cols-2 gap-3">
                          {(['revenue', 'calls', 'appointments', 'followUps', 'noShows', 'closedDeals'] as PerformanceMetric[]).map(m => {
                             const isSelected = pendingChartMetrics.includes(m);
                             return (
                               <button 
                                key={m}
                                onClick={() => toggleChartMetric(m)}
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left group ${isSelected ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-lg' : 'bg-black border-white/5 text-zinc-600 hover:text-zinc-400'}`}
                               >
                                  {isSelected ? <CheckSquare size={14} className="text-purple-500" /> : <Square size={14} className="group-hover:text-zinc-500" />}
                                  <span className="text-[10px] font-black uppercase tracking-widest truncate">{m.replace(/([A-Z])/g, ' $1')}</span>
                               </button>
                             );
                          })}
                        </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest flex items-center gap-2"><Medal size={14} /> Primary Leaderboard Metric</label>
                        <div className="grid grid-cols-2 gap-2">
                           {(['revenue', 'calls', 'closedDeals', 'noShows', 'followUps'] as PerformanceMetric[]).map(m => (
                             <button key={m} onClick={() => setPendingTopMetric(m)} className={`py-3 px-2 border rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${pendingTopMetric === m ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/5 text-zinc-600 hover:text-white'}`}>{m}</button>
                           ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest flex items-center gap-2"><BarChart3 size={14} /> Default Page Filter</label>
                        <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-2xl border border-white/5">
                           {(['today', 'week', 'month', 'ytd'] as DateFilter[]).map(f => (
                             <button key={f} onClick={() => setPendingDefaultFilter(f)} className={`py-3 text-[8px] font-black uppercase rounded-xl transition-all ${pendingDefaultFilter === f ? 'bg-zinc-900 text-yellow-500 border border-yellow-500/20 shadow-lg' : 'text-zinc-600'}`}>{f}</button>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>

                <button onClick={saveAgencyDefaults} className="w-full py-5 purple-solid text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                   Save Global Defaults
                </button>
              </div>
            )}

            {activeSubTab === 'users' && isAdmin && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Full Name</label>
                    <input className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="Full Name" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} />

                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest mt-3">Email</label>
                    <input type="email" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="Email Address" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Role</label>
                    <select className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-purple-500" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as any})}>
                      <option value="closer">Closer</option>
                      <option value="setter">Setter</option>
                      <option value="bookkeeper">Bookkeeper</option>
                      <option value="admin">Admin</option>
                    </select>

                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest mt-3">Company ID</label>
                    <input className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="Company ID (matches Login setup sheet)" value={newUserForm.companyId} onChange={e => setNewUserForm({...newUserForm, companyId: e.target.value})} />

                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest mt-3">Password</label>
                    <input type="password" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="Temporary password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
                  </div>
                </div>

                <button onClick={createUserFromSettings} disabled={isCreatingUser} className={`w-full py-4 font-black uppercase text-xs tracking-widest rounded-xl shadow-xl active:scale-95 transition-all ${isCreatingUser ? 'opacity-60 cursor-not-allowed bg-zinc-900 text-zinc-500' : 'purple-solid text-white'}`}>
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>

                <div className="pt-6 border-t border-white/5">
                  <h4 className="text-sm font-black uppercase text-zinc-500">Existing Users</h4>
                  <div className="grid gap-2 mt-4">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-black border border-white/5">
                        <div className="flex-1">
                          <div className="text-sm font-black">{u.name} <span className="text-xs text-zinc-500">({u.role})</span></div>
                          <div className="text-[11px] text-zinc-600">{u.email} • {u.agencyId}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs remain unchanged... */}
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all ${active ? 'bg-zinc-950 border border-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
    <div className="flex items-center gap-4">
      <Icon size={18} className={active ? 'text-purple-500' : ''} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <ChevronRight size={14} className={active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'} />
  </button>
);

export default SettingsView;