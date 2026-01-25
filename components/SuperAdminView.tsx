
import React, { useMemo, useState } from 'react';
import { User, ActivityLog, AuditEntry, AppSettings, PaymentPlatform, PricingPlan, AuditType } from '../types.ts';
import { ShieldCheck, Globe, Trash2, Users, Building2, BarChart, AlertTriangle, Search, CreditCard, ToggleLeft, ToggleRight, DollarSign, Calendar, Zap, Layout as LayoutIcon, Plus, X, Check, ExternalLink } from 'lucide-react';

interface SuperAdminViewProps {
  allUsers: User[];
  allLogs: ActivityLog[];
  allAudit: AuditEntry[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  logAudit: (details: string, type: AuditType, restorableData?: any, metadata?: any) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SuperAdminView: React.FC<SuperAdminViewProps> = ({ allUsers, allLogs, allAudit, setUsers, logAudit, settings, setSettings }) => {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'integrations' | 'pricing'>('workspaces');
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<PricingPlan>>({
    name: '', price: '', interval: 'month', platform: 'STRIPE', features: [''], checkoutUrl: ''
  });

  const workspaces = useMemo(() => {
    const groups: Record<string, { id: string, name: string, userCount: number, owner: string, agencyId: string }> = {};
    allUsers.forEach(u => {
      if (!groups[u.agencyId]) {
        groups[u.agencyId] = { 
          id: u.agencyId, 
          name: u.agencyId === 'agency-001' ? 'Default Workspace' : `Workspace ${u.agencyId}`, 
          userCount: 0,
          owner: 'No Owner Found',
          agencyId: u.agencyId
        };
      }
      groups[u.agencyId].userCount++;
      if (u.role === 'admin') groups[u.agencyId].owner = u.name;
    });
    return Object.values(groups).filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.owner.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, searchTerm]);

  const stats = {
    totalUsers: allUsers.length,
    totalWorkspaces: Object.keys(workspaces).length,
    totalLogs: allLogs.length,
    projectedMonthlyRevenue: Object.keys(workspaces).length * settings.subscriptionPrice
  };

  const deleteWorkspace = (agencyId: string) => {
    if (window.confirm(`URGENT: This will delete all users in this workspace. Proceed?`)) {
      setUsers(prev => prev.filter(u => u.agencyId !== agencyId));
      logAudit(`SUPER ADMIN: Deleted entire workspace ${agencyId}`, 'USER_MANAGEMENT');
    }
  };

  const updateIntegration = (platform: PaymentPlatform, updates: any) => {
    const key = platform.toLowerCase() + 'Integration';
    setSettings(prev => ({
      ...prev,
      [key]: { ...(prev as any)[key], ...updates }
    }));
  };

  const addPricingPlan = () => {
    if (!newPlan.name || !newPlan.price || !newPlan.checkoutUrl) return;
    const plan: PricingPlan = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlan.name!,
      price: newPlan.price!,
      interval: newPlan.interval as any,
      features: (newPlan.features || []).filter(f => !!f),
      platform: newPlan.platform as any,
      checkoutUrl: newPlan.checkoutUrl!
    };
    setSettings(prev => ({
      ...prev,
      activePricingPlans: [...prev.activePricingPlans, plan]
    }));
    setShowAddPlan(false);
    setNewPlan({ name: '', price: '', interval: 'month', platform: 'STRIPE', features: [''], checkoutUrl: '' });
  };

  const removePlan = (id: string) => {
    setSettings(prev => ({
      ...prev,
      activePricingPlans: prev.activePricingPlans.filter(p => p.id !== id)
    }));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight gold-text uppercase">Global Console</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Power Agent System Core Management</p>
        </div>
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
           {(['workspaces', 'integrations', 'pricing'] as const).map(tab => (
             <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-zinc-900 text-yellow-500 border border-yellow-500/10 shadow-lg' : 'text-zinc-600 hover:text-white'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'workspaces' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <GlobalStat icon={Globe} label="Live Workspaces" value={stats.totalWorkspaces} color="text-blue-400" />
            <GlobalStat icon={Users} label="Global Users" value={stats.totalUsers} color="text-indigo-400" />
            <GlobalStat icon={BarChart} label="Total Entries" value={stats.totalLogs} color="gold-text" />
            <GlobalStat icon={DollarSign} label="Projected Monthly" value={`$${stats.projectedMonthlyRevenue.toFixed(2)}`} color="text-emerald-500" />
          </div>

          <div className="bg-zinc-950 border border-white/5 p-8 rounded-[3rem] space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-900 rounded-2xl gold-text"><CreditCard size={20}/></div>
                  <div>
                      <h4 className="text-sm font-black italic">Legacy Auto-Billing Override</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase">Force hard-lock on agencies with expired manual subscriptions</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSettings(prev => ({ ...prev, paymentsEnabled: !prev.paymentsEnabled }));
                    logAudit(`SUPER ADMIN: Global Auto-Billing ${!settings.paymentsEnabled ? 'ENABLED' : 'DISABLED'}`, 'SETTINGS_UPDATE');
                  }}
                  className="p-1 transition-all"
                >
                  {settings.paymentsEnabled ? <ToggleRight size={44} className="gold-text" /> : <ToggleLeft size={44} className="text-zinc-800" />}
                </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
                <input className="w-full bg-zinc-950 border border-white/5 p-5 pl-12 rounded-[2rem] text-sm font-bold outline-none focus:border-yellow-500" placeholder="Search Workspaces..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="px-6 py-4 bg-zinc-950 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Active Archives: <span className="text-white">{workspaces.length}</span>
              </div>
            </div>

            <div className="grid gap-4">
              {workspaces.map(w => (
                <div key={w.id} className="bg-zinc-950 border border-white/5 p-8 rounded-[3rem] flex flex-col md:flex-row items-center justify-between group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:gold-text transition-colors">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black italic">{w.name}</h4>
                      <div className="flex gap-4 mt-1">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Owner: <span className="text-white">{w.owner}</span></p>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Agency: <span className="text-zinc-700">{w.agencyId}</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 mt-6 md:mt-0">
                    <div className="flex flex-col items-center">
                        <button className="p-2 transition-all hover:scale-110">
                          <CreditCard size={18} className={settings.paymentsEnabled ? "text-emerald-500" : "text-zinc-700"} />
                        </button>
                        <p className="text-[7px] font-black uppercase text-zinc-600 mt-1">Billable</p>
                    </div>

                    <div className="text-center">
                      <p className="text-xl font-black italic">{w.userCount}</p>
                      <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Users</p>
                    </div>
                    
                    <button onClick={() => deleteWorkspace(w.id)} className="p-4 bg-rose-950/20 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-right-4">
           <IntegrationCard 
            title="Stripe" 
            platform="STRIPE" 
            active={settings.stripeIntegration?.active}
            onToggle={(v) => updateIntegration('STRIPE', { active: v })}
           >
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-zinc-600 px-2 tracking-widest">API Secret Key</label>
                    <input 
                      type="password"
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500" 
                      placeholder="sk_live_..."
                      value={settings.stripeIntegration?.apiKey}
                      onChange={e => updateIntegration('STRIPE', { apiKey: e.target.value })}
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-zinc-600 px-2 tracking-widest">Webhook Secret</label>
                    <input 
                      type="password"
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500" 
                      placeholder="whsec_..."
                      value={settings.stripeIntegration?.webhookSecret}
                      onChange={e => updateIntegration('STRIPE', { webhookSecret: e.target.value })}
                    />
                 </div>
              </div>
           </IntegrationCard>

           <IntegrationCard 
            title="PayPal" 
            platform="PAYPAL" 
            active={settings.paypalIntegration?.active}
            onToggle={(v) => updateIntegration('PAYPAL', { active: v })}
           >
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-zinc-600 px-2 tracking-widest">Client ID</label>
                    <input 
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500" 
                      placeholder="PayPal App Client ID"
                      value={settings.paypalIntegration?.clientId}
                      onChange={e => updateIntegration('PAYPAL', { clientId: e.target.value })}
                    />
                 </div>
              </div>
           </IntegrationCard>

           <IntegrationCard 
            title="Whop" 
            platform="WHOP" 
            active={settings.whopIntegration?.active}
            onToggle={(v) => updateIntegration('WHOP', { active: v })}
           >
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-zinc-600 px-2 tracking-widest">API Secret Key</label>
                    <input 
                      type="password"
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500" 
                      placeholder="whop_..."
                      value={settings.whopIntegration?.apiKey}
                      onChange={e => updateIntegration('WHOP', { apiKey: e.target.value })}
                    />
                 </div>
              </div>
           </IntegrationCard>

           <div className="bg-zinc-900/30 border border-dashed border-white/10 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <Zap size={32} className="text-zinc-700" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">More gateways arriving in V3.0</p>
           </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-10 animate-in slide-in-from-right-4">
           <div className="bg-zinc-950 border border-white/5 p-10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-zinc-900 rounded-2xl text-purple-500"><LayoutIcon size={24} /></div>
                 <div>
                    <h3 className="text-lg font-black italic uppercase">Account Creation Paywall</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-relaxed">
                      Force new organizations to select a plan before activation
                    </p>
                 </div>
              </div>
              <button 
                onClick={() => setSettings(prev => ({ ...prev, globalPricingEnabled: !prev.globalPricingEnabled }))}
                className="p-1"
              >
                {settings.globalPricingEnabled ? <ToggleRight size={44} className="gold-text" /> : <ToggleLeft size={44} className="text-zinc-800" />}
              </button>
           </div>

           <div className="flex justify-between items-center px-4">
              <h4 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Live Products ({settings.activePricingPlans.length})</h4>
              <button onClick={() => setShowAddPlan(true)} className="flex items-center gap-2 px-6 py-3 purple-solid text-white font-black uppercase text-[10px] rounded-xl shadow-xl active:scale-95 transition-all">
                <Plus size={16} /> Create Product
              </button>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {settings.activePricingPlans.map(plan => (
                <div key={plan.id} className="bg-zinc-950 border border-white/5 p-8 rounded-[3rem] flex flex-col justify-between shadow-xl relative group">
                   <div className="space-y-6">
                      <div className="flex justify-between items-start">
                         <div>
                            <h5 className="text-xl font-black italic uppercase">{plan.name}</h5>
                            <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mt-1">Platform: {plan.platform}</p>
                         </div>
                         <button onClick={() => removePlan(plan.id)} className="p-2 text-zinc-800 hover:text-rose-500 transition-colors">
                           <X size={16} />
                         </button>
                      </div>
                      <div className="flex items-end gap-1">
                         <span className="text-4xl font-black gold-text">${plan.price}</span>
                         <span className="text-[9px] font-black text-zinc-500 uppercase mb-2">/ {plan.interval}</span>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                             <Check size={12} className="text-emerald-500" /> {f}
                          </li>
                        ))}
                      </ul>
                   </div>
                   <div className="mt-8 pt-6 border-t border-white/5">
                      <a href={plan.checkoutUrl} target="_blank" className="flex items-center justify-between text-[10px] font-black uppercase gold-text hover:underline tracking-widest">
                         Checkout URL <ExternalLink size={12} />
                      </a>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {showAddPlan && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-[#0a0a0a] border border-white/10 p-10 md:p-12 rounded-[3.5rem] w-full max-w-xl space-y-8 animate-in zoom-in-95 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddPlan(false)} className="absolute top-8 right-8 text-zinc-600 hover:text-white"><X size={20}/></button>
              <div className="text-center space-y-2">
                 <h3 className="text-2xl font-black italic gold-text uppercase">New Product Specification</h3>
                 <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Define your plan architecture</p>
              </div>
              
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Product Name</label>
                       <input className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="E.g. Enterprise Tier" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Checkout URL</label>
                       <input className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="Stripe/Whop Payment Link" value={newPlan.checkoutUrl} onChange={e => setNewPlan({...newPlan, checkoutUrl: e.target.value})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Price ($)</label>
                       <input type="number" className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder="0.00" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Interval</label>
                       <select className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-purple-500 appearance-none" value={newPlan.interval} onChange={e => setNewPlan({...newPlan, interval: e.target.value as any})}>
                          <option value="month">Monthly</option>
                          <option value="year">Yearly</option>
                          <option value="one-time">One-Time</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Platform</label>
                       <select className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-purple-500 appearance-none" value={newPlan.platform} onChange={e => setNewPlan({...newPlan, platform: e.target.value as any})}>
                          <option value="STRIPE">Stripe</option>
                          <option value="PAYPAL">PayPal</option>
                          <option value="WHOP">Whop</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Features</label>
                    <div className="space-y-2">
                       {newPlan.features?.map((f, i) => (
                         <div key={i} className="flex gap-2">
                            <input className="flex-1 bg-black border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-purple-500" placeholder={`Feature ${i+1}`} value={f} onChange={e => {
                               const copy = [...(newPlan.features || [])];
                               copy[i] = e.target.value;
                               setNewPlan({...newPlan, features: copy});
                            }} />
                            <button onClick={() => setNewPlan({...newPlan, features: (newPlan.features || []).filter((_, idx) => idx !== i)})} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"><X size={14}/></button>
                         </div>
                       ))}
                       <button onClick={() => setNewPlan({...newPlan, features: [...(newPlan.features || []), '']})} className="text-[8px] font-black uppercase text-purple-500 hover:underline tracking-widest mt-2">+ Add Feature Line</button>
                    </div>
                 </div>
              </div>

              <button 
                onClick={addPricingPlan}
                className="w-full py-5 purple-solid text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all mt-4"
              >
                Launch Product
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const GlobalStat = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-zinc-950 border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl group hover:border-white/10 transition-all">
    <div className={`p-4 bg-zinc-900 rounded-2xl ${color} group-hover:scale-110 transition-transform`}><Icon size={24} /></div>
    <div>
      <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{label}</p>
      <h4 className="text-2xl font-black italic">{value}</h4>
    </div>
  </div>
);

const IntegrationCard = ({ title, active, onToggle, children, platform }: any) => (
  <div className="bg-zinc-950 border border-white/5 p-10 rounded-[3rem] space-y-8 shadow-2xl relative group overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-20" />
    <div className="flex items-center justify-between">
       <div className="flex items-center gap-4">
          <div className={`w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center font-black italic text-sm ${active ? 'gold-text' : 'text-zinc-700'}`}>
            {title[0]}
          </div>
          <h4 className="text-lg font-black italic uppercase">{title}</h4>
       </div>
       <button onClick={() => onToggle(!active)} className="p-1">
          {active ? <ToggleRight size={40} className="gold-text" /> : <ToggleLeft size={40} className="text-zinc-800" />}
       </button>
    </div>
    <div className={active ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}>
      {children}
    </div>
  </div>
);

export default SuperAdminView;
