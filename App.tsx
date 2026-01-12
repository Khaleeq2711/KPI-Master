import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_USERS, INITIAL_LOGS, INITIAL_TASKS, INITIAL_SETTINGS, INITIAL_REPORTS, INITIAL_NOTIFICATIONS } from './constants.ts';
import { User, ActivityLog, Task, AppSettings, DateFilter, StatFolder, AppNotification, DeletedItem, Report, AuditEntry, AuditType } from './types.ts';
import HomeView from './components/HomeView.tsx';
import TasksView from './components/TasksView.tsx';
import StatsView from './components/StatsView.tsx';
import TeamView from './components/TeamView.tsx';
import LogView from './components/LogView.tsx';
import SettingsView from './components/SettingsView.tsx';
import SuperAdminView from './components/SuperAdminView.tsx';
import Layout from './components/Layout.tsx';
import AuthView from './components/AuthView.tsx';
import { CreditCard, ShieldAlert, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('kpimaster_auth_token') === 'true');

  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    try { return JSON.parse(saved); } catch (e) { return defaultValue; }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => loadFromStorage('kpimaster_current_user', null));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage('kpimaster_users', INITIAL_USERS));
  const [logs, setLogs] = useState<ActivityLog[]>(() => loadFromStorage('kpimaster_logs', INITIAL_LOGS));
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage('kpimaster_tasks', INITIAL_TASKS));
  const [settings, setSettings] = useState<AppSettings>(() => loadFromStorage('kpimaster_settings', INITIAL_SETTINGS));
  const [folders, setFolders] = useState<StatFolder[]>(() => loadFromStorage('kpimaster_folders', []));
  const [reports, setReports] = useState<Report[]>(() => loadFromStorage('kpimaster_reports', INITIAL_REPORTS));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadFromStorage('kpimaster_notifications', INITIAL_NOTIFICATIONS));
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>(() => loadFromStorage('kpimaster_audit_history', []));
  const [deletedHistory, setDeletedHistory] = useState<DeletedItem[]>(() => loadFromStorage('kpimaster_deleted_history', []));
  
  const [activeTab, setActiveTab] = useState('Home');
  const [dateFilter, setDateFilter] = useState<DateFilter>(settings.defaultFilter || 'today');
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const prevNotificationsCount = useRef(notifications.length);

  useEffect(() => {
    if (currentUser) localStorage.setItem('kpimaster_current_user', JSON.stringify(currentUser));
    localStorage.setItem('kpimaster_users', JSON.stringify(users));
    localStorage.setItem('kpimaster_logs', JSON.stringify(logs));
    localStorage.setItem('kpimaster_tasks', JSON.stringify(tasks));
    localStorage.setItem('kpimaster_settings', JSON.stringify(settings));
    localStorage.setItem('kpimaster_folders', JSON.stringify(folders));
    localStorage.setItem('kpimaster_reports', JSON.stringify(reports));
    localStorage.setItem('kpimaster_notifications', JSON.stringify(notifications));
    localStorage.setItem('kpimaster_audit_history', JSON.stringify(auditHistory));
    localStorage.setItem('kpimaster_deleted_history', JSON.stringify(deletedHistory));
    localStorage.setItem('kpimaster_auth_token', isAuthenticated.toString());
  }, [currentUser, users, logs, tasks, settings, folders, reports, notifications, auditHistory, deletedHistory, isAuthenticated]);

  useEffect(() => {
    const now = Date.now();
    const GRACE_PERIOD_DURATION = 7 * 24 * 60 * 60 * 1000;
    
    if (settings.factoryResetDate && now > settings.factoryResetDate) {
      logAudit("SYSTEM: 7-Day countdown complete. Executing scheduled Factory Reset.", "SYSTEM");
      setUsers([]);
      setLogs([]);
      setTasks([]);
      setFolders([]);
      setReports([]);
      setAuditHistory([]);
      setDeletedHistory([]);
      setSettings(prev => ({
        ...prev,
        accountName: 'KPI Master (PURGED)',
        logoUrl: undefined,
        factoryResetDate: null,
        subscriptionCancelled: false
      }));
      setCurrentUser(null);
      setIsAuthenticated(false);
      alert("Factory Reset Complete. All company directory data has been purged.");
    }

    if (!settings.paymentsEnabled) return;

    if (settings.subscriptionCancelled && now > settings.nextPaymentDue) {
      if (settings.billingStatus !== 'LOCKED') {
        setSettings(prev => ({ ...prev, billingStatus: 'LOCKED' }));
      }
      return;
    }

    if (now > settings.nextPaymentDue + GRACE_PERIOD_DURATION) {
      if (settings.billingStatus !== 'LOCKED') {
        setSettings(prev => ({ ...prev, billingStatus: 'LOCKED' }));
      }
    } else if (now > settings.nextPaymentDue) {
      if (settings.billingStatus !== 'GRACE_PERIOD') {
        setSettings(prev => ({ ...prev, billingStatus: 'GRACE_PERIOD' }));
        const owner = users.find(u => u.role === 'OWNER');
        if (owner) {
          const notification: AppNotification = {
            id: Math.random().toString(36).substr(2, 9),
            userId: owner.id,
            title: 'Payment Overdue',
            message: 'Your payment is overdue. You have 7 days to settle your balance before account lockout.',
            timestamp: now,
            read: false,
            type: 'system',
            targetTab: 'Settings'
          };
          setNotifications(prev => [notification, ...prev]);
        }
      }
    }
  }, [settings.nextPaymentDue, settings.paymentsEnabled, settings.factoryResetDate, users]);

  const logAudit = (details: string, type: AuditType, restorableData?: any, metadata?: any) => {
    const entry: AuditEntry = {
      id: Math.random().toString(36).substr(2, 9),
      action: type.replace('_', ' '),
      performerName: currentUser?.name || 'System',
      performerId: currentUser?.id || 'system',
      timestamp: Date.now(),
      details,
      type,
      restorableData,
      metadata
    };
    setAuditHistory(prev => [entry, ...prev]);
  };

  const handleReassign = (fromUserId: string, toUserId: string, filter?: string) => {
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);
    if (!fromUser || !toUser) return;

    setTasks(prev => prev.map(t => t.userId === fromUserId ? { ...t, userId: toUserId } : t));
    logAudit(`Bulk action: ${fromUser.name} tasks assigned to ${toUser.name}`, "TASK_ACTION");
    const notification: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      userId: toUserId,
      title: 'Tasks Assigned',
      message: `Admin reassigned tasks from ${fromUser.name} to you.`,
      timestamp: Date.now(),
      read: false,
      type: 'task',
      targetTab: 'Tasks'
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const handleLogin = (user: User) => {
    if (settings.factoryResetDate && user.role !== 'OWNER') {
      alert("This account is currently scheduled for deletion and is restricted. Please contact the account owner.");
      return;
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    logAudit(`${user.name} established a secure session.`, "SECURITY");
  };

  const handleSignUp = (name: string, email: string, companyName: string, password?: string, securityQuestion?: string, securityAnswer?: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name, 
      email, 
      password: password || '',
      securityQuestion: securityQuestion || '',
      securityAnswer: securityAnswer || '',
      role: 'OWNER',
      revenueGoal: settings.defaultUserGoal,
      status: 'active',
      agencyId: `agency-${Math.floor(Math.random() * 900) + 100}`,
      needsSetup: false,
      taskNotificationsEnabled: true,
      notificationSoundEnabled: true,
      notificationVibrationEnabled: false,
      taskReminderOffset: { value: 1, unit: 'hours', direction: 'before' }
    };
    
    setSettings(prev => ({
      ...prev,
      accountName: companyName || prev.accountName
    }));

    setUsers([newUser]);
    setLogs([]);
    setTasks([]);
    setReports([]);
    setNotifications([]);
    setAuditHistory([]);
    setDeletedHistory([]);
    setFolders([]);
    
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    logAudit(`${name} registered real workspace owner account for "${companyName}". Demo data purged.`, "USER_MANAGEMENT");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('kpimaster_auth_token');
    localStorage.removeItem('kpimaster_current_user');
  };

  const handleNotificationAction = (notification: AppNotification) => {
    if (notification.targetTab) {
      setActiveTab(notification.targetTab);
    }
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
  };

  const handleUpdateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    
    const deletedItem: DeletedItem = {
      id: target.id,
      type: 'USER',
      data: target,
      deletedAt: Date.now()
    };
    
    setDeletedHistory(prev => [deletedItem, ...prev]);
    setUsers(prev => prev.filter(u => u.id !== userId));
    logAudit(`Personnel directory entry for ${target.name} (${target.role}) removed by ${currentUser?.name}`, "USER_MANAGEMENT", { type: 'USER', data: target });
  };

  const handleRestoreItem = (deletedItemId: string) => {
    const item = deletedHistory.find(d => d.id === deletedItemId);
    if (!item) return;

    if (item.type === 'USER') {
      const restoredUser = item.data as User;
      setUsers(prev => [...prev, restoredUser]);
      logAudit(`Personnel record for ${restoredUser.name} restored by ${currentUser?.name}`, "USER_MANAGEMENT");
    }
    setDeletedHistory(prev => prev.filter(d => d.id !== deletedItemId));
  };

  const handleRevertAudit = (auditId: string) => {
    const entry = auditHistory.find(a => a.id === auditId);
    if (!entry || !entry.restorableData) return;

    if (entry.type === 'STAT_CHANGE' && entry.restorableData.userId) {
      setUsers(prev => prev.map(u => u.id === entry.restorableData.userId ? { ...u, revenueGoal: entry.restorableData.oldGoal } : u));
      logAudit(`Reverted stat change for user ${entry.restorableData.userId} (Restored goal: $${entry.restorableData.oldGoal})`, "STAT_CHANGE");
    } else if (entry.type === 'USER_MANAGEMENT' && entry.restorableData.type === 'USER') {
      setUsers(prev => [...prev, entry.restorableData.data]);
      logAudit(`Restored deleted user ${entry.restorableData.data.name} via audit log.`, "USER_MANAGEMENT");
    }
    
    alert("System state successfully reverted.");
  };

  if (!isAuthenticated || !currentUser) {
    return <AuthView onLogin={handleLogin} onSignUp={handleSignUp} onUpdateUser={handleUpdateUser} existingUsers={users} settings={settings} />;
  }

  const isLocked = settings.paymentsEnabled && settings.billingStatus === 'LOCKED';
  const isSuperAdmin = currentUser.email.toLowerCase() === 'poweragentsystem@gmail.com';
  const isResetPending = !!settings.factoryResetDate;

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      currentUser={currentUser} 
      settings={settings} 
      notifications={notifications}
      markRead={() => setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n))}
      onNotificationClick={handleNotificationAction}
      onLogout={handleLogout}
    >
      {isLocked && !isSuperAdmin ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in zoom-in-95 duration-500">
           <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <ShieldAlert size={48} />
           </div>
           <div className="space-y-3">
              <h2 className="text-3xl font-black italic tracking-tight uppercase">Workspace Restricted</h2>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">
                Access to the KPI Master engine has been suspended due to an outstanding subscription balance or cancellation.
              </p>
           </div>
           {currentUser.role === 'OWNER' ? (
             <button 
               onClick={() => setActiveTab('Settings')}
               className="px-10 py-5 purple-solid text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-indigo-500/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
             >
                <CreditCard size={18} /> Manage Subscription
             </button>
           ) : (
             <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-zinc-900 px-6 py-4 rounded-xl border border-white/5">
                Please contact your Account Owner to restore workspace access.
             </p>
           )}
        </div>
      ) : (
        <>
          {isResetPending && (
             <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500 text-black rounded-xl shadow-lg"><RotateCcw size={20} className="animate-spin-slow" /></div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white italic">Termination Sequence Initialized</h3>
                    <p className="text-[10px] text-rose-500/80 font-black uppercase tracking-widest">
                      Your account will delete in {Math.ceil((settings.factoryResetDate! - Date.now()) / (1000 * 60 * 60 * 24))} days. if you decide to change your mind please click on restore.
                    </p>
                  </div>
                </div>
                {currentUser.role === 'OWNER' && (
                  <button 
                    onClick={() => setActiveTab('Settings')}
                    className="px-6 py-3 bg-white text-black font-black uppercase text-[9px] rounded-xl tracking-widest hover:scale-105 transition-all"
                  >
                    Restore Workspace
                  </button>
                )}
             </div>
          )}
          {activeTab === 'Home' && <HomeView currentUser={currentUser} logs={logs} users={users} settings={settings} dateFilter={dateFilter} setDateFilter={setDateFilter} customDateRange={customDateRange} setCustomDateRange={setCustomDateRange} setActiveTab={setActiveTab} />}
          {activeTab === 'Tasks' && <TasksView currentUser={currentUser} tasks={tasks} setTasks={setTasks} users={users} onReassign={handleReassign} logAudit={logAudit} onNotificationCreated={(n) => setNotifications(prev => [n, ...prev])} />}
          {activeTab === 'Stats' && <StatsView logs={logs} users={users} folders={folders} setFolders={setFolders} reports={reports} setReports={setReports} currentUser={currentUser} settings={settings} />}
          {activeTab === 'Team' && <TeamView users={users} setUsers={setUsers} currentUser={currentUser} defaultGoal={settings.defaultUserGoal} logAudit={logAudit} settings={settings} onDeleteUser={handleDeleteUser} />}
          {activeTab === 'Log' && <LogView currentUser={currentUser} logs={logs} setLogs={setLogs} logAudit={logAudit} />}
          {activeTab === 'Settings' && <SettingsView currentUser={currentUser} setCurrentUser={setCurrentUser} settings={settings} setSettings={setSettings} users={users} setUsers={setUsers} auditHistory={auditHistory} deletedHistory={deletedHistory} onRestoreItem={handleRestoreItem} onLogout={handleLogout} logAudit={logAudit} onRevertAudit={handleRevertAudit} />}
          {activeTab === 'Super' && isSuperAdmin && <SuperAdminView allUsers={users} allLogs={logs} allAudit={auditHistory} setUsers={setUsers} logAudit={logAudit} settings={settings} setSettings={setSettings} />}
        </>
      )}
    </Layout>
  );
};

export default App;