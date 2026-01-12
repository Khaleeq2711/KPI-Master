import React, { useState, useMemo } from 'react';
import { User, AppSettings, AppNotification } from '../types';
import { Home, CheckSquare, BarChart2, Users, FileText, Settings, Bell, X, ShieldAlert, ArrowRight, LogOut, Layout as LayoutIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  settings: AppSettings;
  notifications: AppNotification[];
  markRead: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, settings, notifications, markRead, onNotificationClick, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  
  const isSuperAdmin = currentUser.email.toLowerCase() === 'poweragentsystem@gmail.com';
  const isAgent = currentUser.role === 'USER';

  const tabs = [
    { name: 'Home', icon: Home },
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Stats', icon: BarChart2 },
    ...(!isAgent ? [{ name: 'Team', icon: Users, privileged: true }] : []),
    { name: 'Log', icon: FileText },
    { name: 'Settings', icon: Settings },
    ...(isSuperAdmin ? [{ name: 'Super', icon: ShieldAlert }] : [])
  ];

  const myNotifications = useMemo(() => {
    return notifications
      .filter(n => n.userId === currentUser.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications, currentUser.id]);

  const unreadCount = myNotifications.filter(n => !n.read).length;
  const GOLD_COLOR = '#D4AF37';
  const BRAND_LOGO = "https://files.oaiusercontent.com/file-pD65iXWlqXidK7708l7XG0";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-purple-500/30">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-zinc-900 border border-white/10 relative">
            {(settings.logoUrl || BRAND_LOGO) ? (
              <img 
                src={settings.logoUrl || BRAND_LOGO} 
                alt="Logo" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-header-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className="fallback-header-icon hidden flex flex-col items-center justify-center">
              <LayoutIcon size={16} className="text-purple-600" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase italic leading-none">{settings.accountName}</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-80" style={{ color: GOLD_COLOR }}>
              {activeTab} View
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markRead(); }}
              className="p-3 text-zinc-500 hover:text-white transition-colors relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full shadow-lg" style={{ background: GOLD_COLOR }} />
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-4 w-80 bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Alerts</h3>
                  <button onClick={() => setShowNotifications(false)}><X size={14} className="text-zinc-600" /></button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                  {myNotifications.length === 0 ? (
                    <div className="p-10 text-center opacity-30 text-[10px] font-black uppercase">No New Alerts</div>
                  ) : (
                    myNotifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          if (onNotificationClick) onNotificationClick(n);
                          setShowNotifications(false);
                        }}
                        className={`p-5 space-y-1 cursor-pointer transition-colors group hover:bg-white/5 ${!n.read ? 'border-l-2' : ''}`}
                        style={!n.read ? { borderLeftColor: GOLD_COLOR } : {}}
                      >
                        <p className="text-[10px] font-black uppercase" style={{ color: GOLD_COLOR }}>{n.title}</p>
                        <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="p-3 text-zinc-500 hover:text-white transition-all"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden md:flex w-24 bg-black border-r border-white/5 flex-col items-center py-10 gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`p-4 rounded-2xl transition-all group relative ${isActive ? 'bg-zinc-900 border' : 'text-zinc-600 hover:text-zinc-400'}`}
                style={isActive ? { color: GOLD_COLOR, borderColor: `${GOLD_COLOR}44` } : {}}
              >
                <Icon size={22} />
              </button>
            );
          })}
        </nav>
        <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 md:pb-12 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/5 px-4 pb-8 pt-4 flex justify-around md:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className="flex flex-col items-center gap-1"
              style={isActive ? { color: GOLD_COLOR } : { color: '#71717a' }}
            >
              <Icon size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;