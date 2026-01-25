import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../types.ts';
import { Building2, X, Mail, UserCircle, Lock, ArrowRight, ShieldCheck, Zap, Check, Layout as LayoutIcon, Info, Loader2 } from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: User) => void;
  onSignUp: (name: string, email: string, company: string, password?: string, q?: string, a?: string) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  existingUsers: User[];
  settings: AppSettings;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onSignUp, onUpdateUser, existingUsers, settings }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('kpimaster_last_company') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('kpimaster_last_company', companyName);
  }, [companyName]);

  // Check for saved credentials on mount and auto-login
  useEffect(() => {
    const savedRole = localStorage.getItem('kpimaster_user_role');
    const savedName = localStorage.getItem('kpimaster_user_name');
    const savedEmail = localStorage.getItem('kpimaster_user_email');
    const savedCompanyId = localStorage.getItem('kpimaster_user_company_id');

    if (savedRole && savedName && savedEmail && savedCompanyId) {
      // Normalize role - use valid roles or default to 'USER'
      const validRoles: ('admin' | 'closer' | 'setter' | 'bookkeeper')[] = ['admin', 'closer', 'setter', 'bookkeeper'];
      const normalizedRole = savedRole && validRoles.includes(savedRole.toLowerCase() as any)
        ? savedRole.toLowerCase() as 'admin' | 'closer' | 'setter' | 'bookkeeper'
        : 'USER';
      
      // Create a user object from saved credentials
      const savedUser: User = {
        id: localStorage.getItem('kpimaster_user_id') || Math.random().toString(36).substr(2, 9),
        name: savedName,
        email: savedEmail,
        role: normalizedRole,
        revenueGoal: settings.defaultUserGoal,
        status: 'active',
        agencyId: `agency-${Math.floor(Math.random() * 900) + 100}`,
        needsSetup: false,
        taskNotificationsEnabled: true,
        notificationSoundEnabled: true,
        notificationVibrationEnabled: false,
        taskReminderOffset: { value: 1, unit: 'hours', direction: 'before' }
      };
      
      // Auto-login with saved credentials
      onLogin(savedUser);
    }
  }, [onLogin, settings.defaultUserGoal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3002/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          email,
          password
        })
      });

      const data = await response.json();
      console.log('Login API Response:', data);

      if (data.success && data.data) {
        const userData = data.data;
        
        // Normalize role - use valid roles or default to 'USER'
        const validRoles: ('admin' | 'closer' | 'setter' | 'bookkeeper')[] = ['admin', 'closer', 'setter', 'bookkeeper'];
        const normalizedRole = userData.role && validRoles.includes(userData.role.toLowerCase() as any) 
          ? userData.role.toLowerCase() as 'admin' | 'closer' | 'setter' | 'bookkeeper'
          : 'USER';
        
        // Save credentials to localStorage
        localStorage.setItem('kpimaster_user_role', normalizedRole);
        localStorage.setItem('kpimaster_user_name', userData.name);
        localStorage.setItem('kpimaster_user_email', userData.email);
        localStorage.setItem('kpimaster_user_company_id', userData.companyName);
        
        // Create User object for onLogin
        const user: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: userData.name,
          email: userData.email,
          role: normalizedRole,
          revenueGoal: settings.defaultUserGoal,
          status: 'active',
          agencyId: `agency-${Math.floor(Math.random() * 900) + 100}`,
          needsSetup: false,
          taskNotificationsEnabled: true,
          notificationSoundEnabled: true,
          notificationVibrationEnabled: false,
          taskReminderOffset: { value: 1, unit: 'hours', direction: 'before' }
        };
        
        // Save user ID for future auto-login
        localStorage.setItem('kpimaster_user_id', user.id);
        
        // Call onLogin to redirect to dashboard
        onLogin(user);
      } else {
        alert(data.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert('Please accept the Terms & Conditions to proceed.');
      return;
    }
    if (!name || !email || !companyName || !password) return;

    try {
      const response = await fetch('http://localhost:3002/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          companyName,
          password
        })
      });

      const data = await response.json();
      console.log('Signup API Response:', data);

      if (data.success) {
        alert('Account created successfully!');
        // You might want to automatically log them in or redirect to login
        // For now, we'll just show success message
      } else {
        alert(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('Signup failed. Please try again.');
    }
  };

  const handleDemoMode = (role: 'admin' | 'USER') => {
    const demoUser = existingUsers.find(u => u.role === role);
    if (demoUser) {
        setCompanyName(settings.accountName);
        onLogin(demoUser);
    }
  };

  const BRAND_LOGO = "https://files.oaiusercontent.com/file-pD65iXWlqXidK7708l7XG0";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-sm space-y-10">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-zinc-900 shadow-2xl border border-white/10 ring-4 ring-purple-600/10 relative">
            {(settings.logoUrl || BRAND_LOGO) ? (
              <img 
                src={settings.logoUrl || BRAND_LOGO} 
                alt="Logo" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className="fallback-icon hidden flex flex-col items-center justify-center">
              <LayoutIcon size={32} className="text-purple-600" />
              <span className="text-[10px] font-black gold-text">P</span>
            </div>
          </div>
          <h1 className="text-xl font-black tracking-[0.2em] uppercase text-white italic">
            {settings.accountName}
          </h1>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative">
          <div className="flex p-1 bg-black rounded-2xl border border-white/10 mb-2">
            <button 
              onClick={() => setMode('LOGIN')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'LOGIN' ? 'purple-solid text-white shadow-lg shadow-purple-900/20' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setMode('SIGNUP')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'SIGNUP' ? 'purple-solid text-white shadow-lg shadow-purple-900/20' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-left-4 duration-300">
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input type="text" placeholder="Company ID" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input type="email" placeholder="Email Address" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input type="password" placeholder="Password" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 purple-solid text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Logging In...
                  </>
                ) : (
                  <>
                    Log In <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="relative">
                  <UserCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type="text" placeholder="Full Name" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="relative">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type="text" placeholder="Company Name" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type="email" placeholder="Email Address" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type="password" placeholder="Secure Password" className="w-full bg-black border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#6b05e8] transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                <div className="flex items-center gap-3 px-2 py-1 select-none">
                  <div 
                    onClick={() => setTermsAccepted(!termsAccepted)}
                    className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all ${termsAccepted ? 'bg-[#6b05e8] border-[#6b05e8]' : 'bg-black border-white/20 hover:border-white/40'}`}
                  >
                    {termsAccepted && <Check size={12} className="text-white" />}
                  </div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                    I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-white underline hover:text-purple-400 transition-colors">Terms & Conditions</button>
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={!termsAccepted}
                  className={`w-full py-4 font-black uppercase text-xs tracking-widest rounded-xl shadow-xl transition-all active:scale-95 ${termsAccepted ? 'purple-solid text-white' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}
                >
                  Create Workspace
                </button>
              </form>

              <div className="pt-6 border-t border-white/5 space-y-3">
                <p className="text-[8px] font-black uppercase text-zinc-700 tracking-[0.3em] text-center">Fast-Track Demo Access</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleDemoMode('admin')} 
                    className="flex flex-col items-center gap-2 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl hover:border-yellow-500/50 transition-all group"
                  >
                    <ShieldCheck size={18} className="text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Admin Demo</span>
                  </button>
                  <button 
                    onClick={() => handleDemoMode('USER')} 
                    className="flex flex-col items-center gap-2 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl hover:border-[#6b05e8]/50 transition-all group"
                  >
                    <Zap size={18} className="text-zinc-600 group-hover:text-purple-400 transition-colors" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Agent Demo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center space-y-2 pt-4">
          <a href="https://poweragentsystem.ca" target="_blank" rel="noopener noreferrer" className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
            By Power Agent System
          </a>
          <button onClick={() => setShowTermsModal(true)} className="text-[9px] font-black uppercase tracking-widest text-zinc-800 hover:text-zinc-600 transition-colors">Terms & Conditions</button>
        </div>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 max-w-lg w-full space-y-8 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowTermsModal(false)} className="absolute top-8 right-8 text-zinc-600 hover:text-white transition-colors"><X size={24} /></button>
            <div className="flex flex-col items-center gap-4 text-center">
               <Info size={32} className="text-purple-500" />
               <h2 className="text-2xl font-black italic gold-text uppercase tracking-widest">Platform Agreement</h2>
            </div>
            <div className="space-y-6 text-zinc-400 text-[11px] leading-relaxed uppercase font-black tracking-wider">
               <div className="space-y-2">
                 <h4 className="text-[9px] text-zinc-200">1. Nature of Service</h4>
                 <p>KPI Master is an elite performance tracking platform provided by Power Agent System (PAS). This software is intended for professional use to visualize sales production and management objectives.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="text-[9px] text-zinc-200">2. Data & Privacy Responsibilities</h4>
                 <p>Users are responsible for the ethical collection and accuracy of data entered into the platform. PAS does not share or sell user production data to third parties. Data loss resulting from browser cache clearance or account deletion is the sole responsibility of the user.</p>
               </div>
               <div className="space-y-2">
                 <h4 className="text-[9px] text-zinc-200">3. Account & Subscription</h4>
                 <p>Subscribing to a paid plan ensures uninterrupted access to analytics archives. PAS reserves the right to restrict access to accounts with outstanding balances or those that violate professional conduct standards.</p>
               </div>
            </div>
            <button onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }} className="w-full py-4 purple-solid text-white font-black uppercase text-[10px] rounded-xl shadow-lg active:scale-95 transition-all">Accept & Continue</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthView;