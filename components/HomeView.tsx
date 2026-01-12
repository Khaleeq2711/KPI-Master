import React, { useMemo, useState, useEffect } from 'react';
import { User, ActivityLog, AppSettings, DateFilter } from '../types.ts';
import { Phone, Calendar, DollarSign, TrendingUp, Target, XCircle, RefreshCcw, Filter, ChevronDown, Calendar as CalendarIcon, EyeOff } from 'lucide-react';
import KPIChart from './KPIChart.tsx';
import { MOTIVATIONAL_QUOTES } from '../constants.ts';

interface HomeViewProps {
  currentUser: User;
  logs: ActivityLog[];
  users: User[];
  settings: AppSettings;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  customDateRange: {start: string, end: string};
  setCustomDateRange: (range: {start: string, end: string}) => void;
  setActiveTab?: (tab: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ 
  currentUser, 
  logs, 
  users, 
  settings, 
  dateFilter, 
  setDateFilter,
  customDateRange,
  setCustomDateRange
}) => {
  const [isolatedUser, setIsolatedUser] = useState<User | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>([]);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Initialize metrics from settings
  useEffect(() => {
    setVisibleMetrics(settings.defaultChartMetrics || ['closedDeals', 'appointments']);
  }, [settings.defaultChartMetrics]);

  const isAgent = currentUser.role === 'USER';

  const canSeeRevenue = useMemo(() => {
    const visibility = settings.revenueVisibility || 'EVERYONE';
    if (visibility === 'EVERYONE') return true;
    if (visibility === 'ADMIN') return currentUser.role === 'ADMIN' || currentUser.role === 'OWNER';
    if (visibility === 'OWNER') return currentUser.role === 'OWNER';
    return false;
  }, [settings.revenueVisibility, currentUser.role]);

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const quote = useMemo(() => {
    if (settings.quoteType === 'OFF') return null;
    if (settings.quoteType === 'CUSTOM_TEXT' && settings.customQuote) {
      return { text: settings.customQuote, author: settings.customQuoteAuthor || 'System' };
    }
    if (settings.quoteType === 'CSV' && settings.csvQuotes && settings.csvQuotes.length > 0) {
      return settings.csvQuotes[Math.floor(Math.random() * settings.csvQuotes.length)];
    }
    return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  }, [settings]);

  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (dateFilter === 'today') return now.toLocaleDateString(undefined, options);
    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return `${weekAgo.toLocaleDateString(undefined, options)} - ${now.toLocaleDateString(undefined, options)}`;
    }
    if (dateFilter === 'month') return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (dateFilter === 'ytd') {
      const jan1 = new Date(now.getFullYear(), 0, 1);
      return `${jan1.toLocaleDateString(undefined, options)} - ${now.toLocaleDateString(undefined, options)}`;
    }
    if (dateFilter === 'custom') {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}`;
    }
    return '';
  }, [dateFilter, customDateRange]);

  const filteredLogsForStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return logs.filter(l => {
      if (isAgent && l.userId !== currentUser.id) return false;
      if (!isAgent && isolatedUser && l.userId !== isolatedUser.id) return false;

      const logDate = new Date(l.date);
      if (dateFilter === 'today') return l.date === todayStr;
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return logDate >= weekAgo;
      }
      if (dateFilter === 'month') return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      if (dateFilter === 'ytd') return logDate.getFullYear() === now.getFullYear();
      if (dateFilter === 'custom') return l.date >= customDateRange.start && l.date <= customDateRange.end;
      return true;
    });
  }, [logs, dateFilter, currentUser, isolatedUser, customDateRange, isAgent]);

  const stats = useMemo(() => {
    const totals = filteredLogsForStats.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.revenue || 0),
      calls: acc.calls + (curr.calls || 0),
      appointments: acc.appointments + (curr.appointments || 0),
      followUps: acc.followUps + (curr.followUps || 0),
      noShows: acc.noShows + (curr.noShows || 0),
      closedDeals: acc.closedDeals + (curr.closedDeals || 0),
    }), { revenue: 0, calls: 0, appointments: 0, followUps: 0, noShows: 0, closedDeals: 0 });

    let goal = isAgent ? currentUser.revenueGoal : (isolatedUser ? isolatedUser.revenueGoal : users.reduce((sum, u) => sum + u.revenueGoal, 0));
    const progress = goal > 0 ? (totals.revenue / goal) * 100 : 0;
    const convRate = totals.appointments > 0 ? (totals.closedDeals / totals.appointments) * 100 : 0;

    return { ...totals, goal, progress, convRate };
  }, [filteredLogsForStats, isolatedUser, currentUser, users, isAgent]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'ytd') {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return months.slice(0, now.getMonth() + 1).map((month, idx) => {
        const monthLogs = filteredLogsForStats.filter(l => new Date(l.date).getMonth() === idx);
        return {
          name: month,
          revenue: monthLogs.reduce((s, l) => s + (l.revenue || 0), 0),
          calls: monthLogs.reduce((s, l) => s + (l.calls || 0), 0),
          appointments: monthLogs.reduce((s, l) => s + (l.appointments || 0), 0),
          followUps: monthLogs.reduce((s, l) => s + (l.followUps || 0), 0),
          noShows: monthLogs.reduce((s, l) => s + (l.noShows || 0), 0),
          closedDeals: monthLogs.reduce((s, l) => s + (l.closedDeals || 0), 0),
        };
      });
    }
    
    let lookbackDays = dateFilter === 'week' ? 7 : (dateFilter === 'month' ? 30 : (dateFilter === 'today' ? 2 : 60));
    if (dateFilter === 'custom') {
       const start = new Date(customDateRange.start);
       const end = new Date(customDateRange.end);
       lookbackDays = Math.min(60, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    const days = [...Array(lookbackDays)].map((_, i) => {
      const d = new Date();
      if (dateFilter === 'custom') d.setTime(new Date(customDateRange.end).getTime() - (i * 1000 * 60 * 60 * 24));
      else d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return days.map(date => {
      const dayLogs = filteredLogsForStats.filter(l => l.date === date);
      return {
        name: date.split('-').slice(1).join('/'),
        revenue: dayLogs.reduce((s, l) => s + (l.revenue || 0), 0),
        calls: dayLogs.reduce((s, l) => s + (l.calls || 0), 0),
        appointments: dayLogs.reduce((s, l) => s + (l.appointments || 0), 0),
        followUps: dayLogs.reduce((s, l) => s + (l.followUps || 0), 0),
        noShows: dayLogs.reduce((s, l) => s + (l.noShows || 0), 0),
        closedDeals: dayLogs.reduce((s, l) => s + (l.closedDeals || 0), 0),
      };
    });
  }, [filteredLogsForStats, dateFilter, customDateRange]);

  const toggleMetric = (m: string) => setVisibleMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const metricLabelMap: Record<string, string> = {
    closedDeals: 'CLOSED DEALS',
    appointments: 'BOOKED',
    calls: 'CALLS',
    followUps: 'FOLLOW UPS',
    noShows: 'NO SHOWS',
    revenue: 'REVENUE'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight italic">
            {greeting}, <span className="gold-text">{currentUser.name.split(' ')[0]}</span>
          </h2>
          <div className="flex flex-col gap-1">
            {quote && (
              <p className="text-[11px] text-zinc-500 font-medium italic max-w-sm">
                "{quote.text}" — <span className="text-zinc-400 not-italic font-black uppercase tracking-widest">{quote.author}</span>
              </p>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-1 flex items-center gap-2">
              <CalendarIcon size={12} className="gold-text" /> {dateRangeLabel}
            </p>
          </div>
        </div>
        
        <div className="relative flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1.5 rounded-2xl border border-white/5 shadow-xl">
            {(['today', 'week', 'month', 'ytd', 'custom'] as DateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => {
                  setDateFilter(f);
                  if (f === 'custom') setShowCustomPicker(true);
                  else setShowCustomPicker(false);
                }}
                className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${dateFilter === f ? 'bg-zinc-900 text-yellow-500 border border-yellow-500/20 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {showCustomPicker && dateFilter === 'custom' && (
             <div className="absolute top-full right-0 mt-3 p-6 bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl z-50 w-72 animate-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Start Date</label>
                    <input type="date" className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold outline-none focus:border-yellow-500 text-white" value={customDateRange.start} onChange={e => setCustomDateRange({...customDateRange, start: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">End Date</label>
                    <input type="date" className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold outline-none focus:border-yellow-500 text-white" value={customDateRange.end} onChange={e => setCustomDateRange({...customDateRange, end: e.target.value})} />
                  </div>
                  <button onClick={() => setShowCustomPicker(false)} className="w-full py-3 purple-solid text-white font-black uppercase text-[9px] rounded-xl tracking-widest">Apply Range</button>
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {canSeeRevenue ? (
          <div className="col-span-full bg-zinc-950 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
            <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-2">{isAgent ? 'My Production' : (isolatedUser ? `${isolatedUser.name}'s Revenue` : 'Team Performance')}</p>
                <h3 className="text-6xl font-black italic gold-text">${stats.revenue.toLocaleString()}</h3>
               </div>
               {!isAgent && isolatedUser && (
                 <button onClick={(e) => { e.stopPropagation(); setIsolatedUser(null); }} className="px-4 py-2 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg">Show Team</button>
               )}
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>{isAgent ? 'My Goal' : 'Target'}: ${stats.goal.toLocaleString()}</span>
                <span className="gold-text">{Math.round(stats.progress)}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div className="h-full gold-gradient shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-1000" style={{ width: `${Math.min(stats.progress, 100)}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-full bg-zinc-950 border border-white/5 p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-40">
             <EyeOff size={32} className="text-zinc-700 mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Revenue data hidden by management</p>
          </div>
        )}

        <StatTile icon={Phone} label="Calls" value={stats.calls} color="text-pink-500" />
        <StatTile icon={Calendar} label="Booked" value={stats.appointments} color="text-indigo-400" />
        <StatTile icon={RefreshCcw} label="Follow Ups" value={stats.followUps} color="text-blue-400" />
        <StatTile icon={XCircle} label="No Shows" value={stats.noShows} color="text-rose-500" />
        <StatTile icon={Target} label="Conversion" value={`${Math.round(stats.convRate)}%`} color="text-emerald-400" />
        <StatTile icon={TrendingUp} label="Closed" value={stats.closedDeals} color="gold-text" />
      </div>

      <div className="bg-zinc-950 border border-white/5 p-8 rounded-[3rem] shadow-2xl">
        <div className="mb-8">
          <h3 className="text-sm font-black uppercase tracking-[0.3em]">{isAgent ? 'My Performance Trends' : 'Team Performance Trends'}</h3>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Analyzing {dateFilter.toUpperCase()} data</p>
        </div>
        
        <KPIChart data={chartData} visibleMetrics={canSeeRevenue ? visibleMetrics : visibleMetrics.filter(m => m !== 'revenue')} />

        <div className="flex flex-wrap gap-1.5 mt-8 justify-center">
          {Object.keys(metricLabelMap).map(m => {
            if (m === 'revenue' && !canSeeRevenue) return null;
            return (
              <button 
                key={m}
                onClick={() => toggleMetric(m)}
                className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${visibleMetrics.includes(m) ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-500' : 'border-white/5 text-zinc-600 hover:text-zinc-400'}`}
              >
                {metricLabelMap[m]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StatTile = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-zinc-950 border border-white/5 p-6 rounded-[2.5rem] flex flex-col justify-between shadow-lg group hover:border-white/10 transition-all">
    <div className={`p-2.5 bg-zinc-900 border border-white/10 w-fit rounded-xl ${color} group-hover:scale-110 transition-transform`}><Icon size={18} /></div>
    <div className="mt-5">
      <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{label}</p>
      <h4 className="text-3xl font-black italic">{value}</h4>
    </div>
  </div>
);

export default HomeView;