
import React, { useMemo, useState } from 'react';
import { User, Task, AppNotification, AuditType } from '../types.ts';
import { 
  Plus, CheckCircle, Clock, Calendar as CalendarIcon, Users, RefreshCcw, 
  List, AlignLeft, ChevronLeft, ChevronRight, Filter, SortAsc, SortDesc, 
  CheckCircle2, AlertCircle, CalendarRange, Trash2, Search, X
} from 'lucide-react';

interface TasksViewProps {
  currentUser: User;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  users: User[];
  onReassign?: (fromId: string, toId: string, filter?: string) => void;
  logAudit?: (details: string, type: AuditType, restorableData?: any, metadata?: any) => void;
  onNotificationCreated?: (notification: AppNotification) => void;
}

type SortField = 'date' | 'priority' | 'title';
type StatusFilter = 'all' | 'completed' | 'incomplete';
type TimeFilter = 'all' | 'today' | 'upcoming' | 'overdue';

const TasksView: React.FC<TasksViewProps> = ({ currentUser, tasks, setTasks, users, onReassign, logAudit, onNotificationCreated }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [showCompletePopup, setShowCompletePopup] = useState(false);
  const [reassignConfirmText, setReassignConfirmText] = useState('');
  const [teamView, setTeamView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [targetAssigneeId, setTargetAssigneeId] = useState(currentUser.id);

  const [reassignFrom, setReassignFrom] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  const isPrivileged = currentUser.role !== 'USER';

  const userFilteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!isPrivileged) {
        return t.userId === currentUser.id;
      } else {
        if (!teamView) return t.userId === currentUser.id;
        if (userFilter !== 'all') return t.userId === userFilter;
        return true;
      }
    });
  }, [tasks, currentUser, isPrivileged, teamView, userFilter]);

  const filteredTasksForList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return userFilteredTasks.filter(t => {
      if (statusFilter === 'completed' && !t.completed) return false;
      if (statusFilter === 'incomplete' && t.completed) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (timeFilter === 'today' && t.dueDate !== today) return false;
      if (timeFilter === 'overdue' && (t.dueDate >= today || t.completed)) return false;
      if (timeFilter === 'upcoming' && t.dueDate <= today) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [userFilteredTasks, statusFilter, priorityFilter, timeFilter, searchQuery]);

  const sortedTasks = useMemo(() => {
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    return [...filteredTasksForList].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      else if (sortField === 'priority') comparison = priorityWeights[b.priority] - priorityWeights[a.priority];
      else if (sortField === 'title') comparison = a.title.localeCompare(b.title);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTasksForList, sortField, sortDirection]);

  const addTask = () => {
    if (!newTitle) return;
    const assigneeId = isPrivileged ? targetAssigneeId : currentUser.id;
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      userId: assigneeId,
      agencyId: currentUser.agencyId,
      title: newTitle,
      description: newDescription,
      dueDate: dueDate,
      priority: priority,
      completed: false
    };
    setTasks([task, ...tasks]);
    if (onNotificationCreated) {
      onNotificationCreated({
        id: Math.random().toString(36).substr(2, 9),
        userId: assigneeId,
        title: 'New Task Assigned',
        message: `Objective: ${newTitle}`,
        timestamp: Date.now(),
        read: false,
        type: 'task',
        targetTab: 'Tasks'
      });
    }
    if (logAudit) {
      const targetUser = users.find(u => u.id === assigneeId);
      logAudit(`Tasks assigned (${newTitle}) to ${targetUser?.name} by ${currentUser.name}`, 'TASK_ACTION');
    }
    setNewTitle('');
    setNewDescription('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setPriority('low');
    setTargetAssigneeId(currentUser.id);
    setShowAdd(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Permanently delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (logAudit) logAudit(`Task ${id} deleted by ${currentUser.name}`, 'TASK_ACTION');
    }
  };

  const handleReassignSubmit = () => {
    if (reassignConfirmText === 'REASSIGN' && reassignFrom && reassignTo && onReassign) {
      onReassign(reassignFrom, reassignTo, 'all');
      setShowReassign(false);
      setReassignFrom('');
      setReassignTo('');
      setReassignConfirmText('');
      setShowCompletePopup(true);
      setTimeout(() => setShowCompletePopup(false), 2000);
    }
  };

  const priorityStyles = {
    low: 'text-zinc-500 bg-zinc-900 border-zinc-800',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    high: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    const dCount = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    for (let i = 1; i <= dCount; i++) days.push(i);
    return days;
  }, [currentDate, firstDay]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(next);
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    timeFilter !== 'all',
    teamView && userFilter !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight">Tasks</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Follow-ups & Reminders</p>
        </div>
        <div className="flex wrap gap-2 w-full md:w-auto">
          <div className="flex p-1 bg-zinc-900/50 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'purple-solid text-white shadow-lg' : 'text-zinc-600'}`}
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')} 
              className={`p-3 rounded-xl transition-all ${viewMode === 'calendar' ? 'purple-solid text-white shadow-lg' : 'text-zinc-600'}`}
            >
              <CalendarIcon size={18} />
            </button>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`p-4 bg-zinc-900 border rounded-2xl transition-all flex items-center gap-2 ${showFilters ? 'border-yellow-500 text-yellow-500' : 'border-white/5 text-zinc-400'}`}
          >
            <Filter size={20} />
            {activeFilterCount > 0 && (
              <span className="bg-yellow-500 text-black text-[9px] font-black px-1.5 rounded-full">{activeFilterCount}</span>
            )}
          </button>

          {isPrivileged && (
            <button onClick={() => setShowReassign(true)} className="p-4 bg-zinc-900 border border-white/5 text-zinc-400 rounded-2xl hover:text-white transition-all"><RefreshCcw size={20} /></button>
          )}
          <button onClick={() => setShowAdd(true)} className="p-4 purple-solid text-white rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2">
            <Plus size={20} /> <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">New Task</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-zinc-950 border border-white/10 p-8 rounded-[2.5rem] space-y-8 animate-in slide-in-from-top-4 duration-500 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4">
             <button onClick={() => {
                setStatusFilter('all'); setPriorityFilter('all'); setTimeFilter('all'); setUserFilter('all'); setSearchQuery('');
             }} className="text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Reset All</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Search size={12} className="gold-text" /> Search Directory</label>
              <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-yellow-500" placeholder="Find task by title..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><CheckCircle2 size={12} className="gold-text" /> Task Status</label>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                {(['all', 'incomplete', 'completed'] as StatusFilter[]).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${statusFilter === f ? 'purple-solid text-white border border-white/10 shadow-lg' : 'text-zinc-600'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><AlertCircle size={12} className="gold-text" /> Priority Level</label>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                {['all', 'low', 'medium', 'high'].map(f => (
                  <button key={f} onClick={() => setPriorityFilter(f)} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${priorityFilter === f ? 'purple-solid text-white border border-white/10 shadow-lg' : 'text-zinc-600'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><CalendarRange size={12} className="gold-text" /> Timing</label>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                {(['all', 'today', 'upcoming', 'overdue'] as TimeFilter[]).map(f => (
                  <button key={f} onClick={() => setTimeFilter(f)} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${timeFilter === f ? 'purple-solid text-white border border-white/10 shadow-lg' : 'text-zinc-600'}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 pt-6 border-t border-white/5">
             <div className="flex items-center gap-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Sort By:</span>
                <div className="flex gap-2">
                   {(['date', 'priority', 'title'] as SortField[]).map(f => (
                     <button key={f} onClick={() => setSortField(f)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${sortField === f ? 'border-purple-500 bg-[#6b05e8]/10 text-[#6b05e8] shadow-lg shadow-purple-500/5' : 'border-white/5 text-zinc-500'}`}>{f}</button>
                   ))}
                </div>
                <button onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-all">
                  {sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                </button>
             </div>
             <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-black px-4 py-2 rounded-xl border border-white/5">
               Displaying <span className="gold-text">{sortedTasks.length}</span> of {tasks.length} Total Tasks
             </div>
          </div>
        </div>
      )}

      {isPrivileged && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-2 bg-zinc-950 border border-white/5 rounded-[2rem]">
           <div className="flex p-1 bg-black rounded-xl border border-white/5 w-full md:w-auto">
              <button 
                onClick={() => { setTeamView(false); setUserFilter('all'); }} 
                className={`flex-1 md:px-6 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${!teamView ? 'purple-solid text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                Personal
              </button>
              <button 
                onClick={() => setTeamView(true)} 
                className={`flex-1 md:px-6 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${teamView ? 'purple-solid text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                Team Tasks
              </button>
           </div>
           {teamView && (
             <div className="flex items-center gap-2 px-2 w-full md:w-auto">
               <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Focus Agent:</label>
               <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="bg-black border border-white/10 rounded-lg p-2 text-[9px] font-black uppercase text-white outline-none flex-1 md:flex-none focus:border-purple-600">
                 <option value="all">Everyone</option>
                 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
               </select>
             </div>
           )}
        </div>
      )}
      
      {showAdd && (
        <div className="bg-zinc-950 border border-purple-500/30 p-8 rounded-[2.5rem] space-y-6 shadow-2xl animate-in zoom-in-95 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full purple-solid opacity-40" />
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-black italic uppercase tracking-widest gold-text">Initialize Task Objective</h3>
             <button onClick={() => setShowAdd(false)} className="p-2 text-zinc-600 hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Objective Name</label>
              <input className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-yellow-500 transition-all" placeholder="Quick title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            {isPrivileged && (
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Resource Assignment</label>
                <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-yellow-500" value={targetAssigneeId} onChange={e => setTargetAssigneeId(e.target.value)}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1"><AlignLeft size={10} /> Detailed Specifications</label>
              <textarea className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm font-medium text-white outline-none focus:border-yellow-500 min-h-[120px] transition-all" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Urgency Protocol</label>
               <div className="flex bg-black p-1 rounded-xl border border-white/5">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button key={p} onClick={() => setPriority(p)} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${priority === p ? 'purple-solid text-white shadow-lg' : 'text-zinc-600'}`}>{p}</button>
                  ))}
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Target Completion Date</label>
               <input type="date" className="w-full bg-black border border-white/10 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-yellow-500" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <button onClick={addTask} className="flex-1 py-4 purple-solid text-white font-black uppercase text-[10px] rounded-xl shadow-lg active:scale-95 transition-all">Launch Task</button>
            <button onClick={() => setShowAdd(false)} className="px-8 py-4 bg-zinc-900 text-zinc-500 font-black uppercase text-[10px] rounded-xl hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="space-y-4">
          {sortedTasks.length === 0 ? (
            <div className="p-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Tasks Matching Criteria</p>
            </div>
          ) : (
            sortedTasks.map(task => (
              <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-6 bg-zinc-950 border rounded-[2.5rem] flex flex-col gap-4 cursor-pointer transition-all hover:bg-zinc-900/50 group ${task.completed ? 'opacity-30 border-white/5' : 'border-white/5 shadow-xl hover:border-white/10'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className={`hidden sm:block w-1.5 h-12 rounded-full ${task.completed ? 'bg-zinc-800/30' : (task.priority === 'high' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : task.priority === 'medium' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-zinc-700')}`} />
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-[#6b05e8] border-[#6b05e8] shadow-[0_0_10px_rgba(107,5,232,0.3)]' : 'border-zinc-800'}`}>
                      {task.completed && <CheckCircle size={16} className="text-white" />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-black tracking-tight ${task.completed ? 'line-through text-zinc-600' : 'text-white'}`}>{task.title}</h4>
                      <div className="flex flex-wrap items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-500"><Clock size={10} className="gold-text" /> {task.dueDate}</div>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-700"><Users size={10} /> {users.find(u => u.id === task.userId)?.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className={`p-1.5 rounded-lg flex items-center gap-2 px-3 border transition-all ${priorityStyles[task.priority]}`}>
                      <span className="text-[8px] font-black uppercase tracking-widest">{task.priority}</span>
                    </div>
                    {isPrivileged && (
                      <button onClick={(e) => deleteTask(e, task.id)} className="p-3 bg-zinc-900 border border-white/5 text-zinc-800 hover:text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {task.description && !task.completed && (
                  <div className="px-12"><p className="text-[11px] text-zinc-500 font-medium leading-relaxed max-w-2xl">{task.description}</p></div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xl font-black italic uppercase tracking-widest text-white gold-text">
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => changeMonth(-1)} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-all"><ChevronLeft size={20} /></button>
              <button onClick={() => changeMonth(1)} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-all"><ChevronRight size={20} /></button>
            </div>
          </div>
          <div className="bg-zinc-950 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 purple-solid opacity-10" />
            <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-900/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-6 text-center text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="h-32 border-b border-r border-white/5 bg-black/20" />;
                const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTasks = userFilteredTasks.filter(t => {
                   if (t.dueDate !== dayStr) return false;
                   if (statusFilter === 'completed' && !t.completed) return false;
                   if (statusFilter === 'incomplete' && t.completed) return false;
                   return true;
                });
                const isToday = new Date().toISOString().split('T')[0] === dayStr;
                return (
                  <div key={day} className={`h-32 border-b border-r border-white/5 p-3 flex flex-col gap-2 transition-all group hover:bg-white/5 cursor-default ${isToday ? 'bg-[#6b05e8]/10' : ''}`}>
                    <span className={`text-xs font-black transition-colors ${isToday ? 'gold-text' : 'text-zinc-600'}`}>{day}</span>
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      {dayTasks.slice(0, 3).map(t => (
                        <div key={t.id} title={t.title} className={`h-1.5 rounded-full transition-all ${t.completed ? 'bg-zinc-800' : (t.priority === 'high' ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' : (t.priority === 'medium' ? 'bg-yellow-500' : 'bg-zinc-600'))}`} />
                      ))}
                      {dayTasks.length > 3 && <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest mt-1">+{dayTasks.length - 3} Units</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showCompletePopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-zinc-950 border border-emerald-500/50 rounded-[3rem] p-12 flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95">
             <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]"><CheckCircle size={40} className="text-black" /></div>
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-white italic">Success</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Workspace data synchronized</p>
             </div>
          </div>
        </div>
      )}

      {showReassign && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 max-md w-full space-y-8 shadow-2xl relative">
              <div className="space-y-2 text-center">
                 <h3 className="text-xl font-black italic gold-text uppercase tracking-widest">Bulk Reassignment</h3>
                 <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-relaxed px-6">Migrate task load between team members permanently.</p>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2">From Source Agent</label>
                    <select value={reassignFrom} onChange={e => setReassignFrom(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-yellow-500">
                       <option value="">Select Agent...</option>
                       {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-zinc-600 px-2">To Target Agent</label>
                    <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-yellow-500">
                       <option value="">Select Agent...</option>
                       {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                 </div>
                 <div className="pt-4">
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-center mb-4">Type <span className="text-white underline">REASSIGN</span> to execute</p>
                   <input type="text" className="w-full bg-black border border-white/10 rounded-2xl p-5 text-center font-black tracking-[0.5em] text-white outline-none focus:border-yellow-500" placeholder="CONFIRM" value={reassignConfirmText} onChange={e => setReassignConfirmText(e.target.value.toUpperCase())} />
                 </div>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={handleReassignSubmit} disabled={reassignConfirmText !== 'REASSIGN' || !reassignFrom || !reassignTo} className={`py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${reassignConfirmText === 'REASSIGN' ? 'purple-solid text-white shadow-xl shadow-purple-900/10' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}>Execute Migration</button>
                 <button onClick={() => { setShowReassign(false); setReassignConfirmText(''); }} className="py-4 text-zinc-500 font-black uppercase tracking-widest text-[10px]">Close Panel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TasksView;
