
import React, { useState } from 'react';
import { User, Role, AppSettings, AuditType } from '../types';
import { UserPlus, Shield, Mail, Trash2, X, MoreVertical, Edit2, UserCheck, UserCircle, UserMinus, ShieldAlert, AlertCircle, KeyRound, CheckCircle2, Save, Share2, Copy } from 'lucide-react';

interface TeamViewProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  defaultGoal: number;
  logAudit?: (msg: string, type: AuditType, restorableData?: any, metadata?: any) => void;
  settings: AppSettings;
  onDeleteUser?: (userId: string) => void;
}

const TeamView: React.FC<TeamViewProps> = ({ users, setUsers, currentUser, defaultGoal, logAudit, settings, onDeleteUser }) => {
  const [showInvite, setShowInvite] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const [statusTargetId, setStatusTargetId] = useState<string | null>(null);
  const [statusConfirmText, setStatusConfirmText] = useState('');
  
  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('USER');

  // Edit Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('USER');

  // Password Reset State
  const [resetPassId, setResetPassId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const isPrivileged = currentUser.role === 'admin';

  const handleShareAccess = (user: User) => {
    const appUrl = window.location.origin;
    const message = `
🚀 Welcome to ${settings.accountName}!

Your performance dashboard is ready. Access it here:
URL: ${appUrl}

LOGIN DETAILS:
Company: ${settings.accountName}
Email: ${user.email}
Temporary Password: ${user.password || 'Contact Admin'}

Please log in and update your security settings.
    `.trim();

    navigator.clipboard.writeText(message).then(() => {
      setCopySuccess(user.id);
      setTimeout(() => setCopySuccess(null), 3000);
    });
  };

  const handleDelete = () => {
    if (deleteText === 'DELETE' && deleteId) {
      const target = users.find(u => u.id === deleteId);
      if (!target) return;

      if (currentUser.role !== 'admin' && target.role === 'admin') {
        alert("Permission Denied: Only admins can manage admin accounts.");
        setDeleteId(null);
        return;
      }

      if (onDeleteUser) {
        onDeleteUser(deleteId);
      } else {
        setUsers(users.filter(u => u.id !== deleteId));
        if (logAudit) logAudit(`User ${target.name} terminated by ${currentUser.name}`, "USER_MANAGEMENT", { type: 'USER', data: target });
      }
      setDeleteId(null);
      setDeleteText('');
    }
  };

  const handleStatusToggle = () => {
    if (statusConfirmText === 'STATUS' && statusTargetId) {
      const target = users.find(u => u.id === statusTargetId);
      const newStatus = target?.status === 'active' ? 'inactive' : 'active';
      setUsers(users.map(u => u.id === statusTargetId ? { ...u, status: newStatus } : u));
      if (logAudit && target) logAudit(`${target.name} access status updated to ${newStatus.toUpperCase()} by ${currentUser.name}`, "USER_MANAGEMENT");
      setStatusTargetId(null);
      setStatusConfirmText('');
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    let finalRole = inviteRole;
    if (inviteRole === 'admin' && !isAdmin) {
      finalRole = 'USER';
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: inviteName,
      email: inviteEmail,
      role: finalRole,
      status: 'active',
      revenueGoal: defaultGoal,
      agencyId: currentUser.agencyId,
      needsSetup: true,
      password: 'password123',
      taskNotificationsEnabled: true,
      notificationSoundEnabled: true,
      notificationVibrationEnabled: false,
      taskReminderOffset: { value: 1, unit: 'hours', direction: 'before' }
    };

    setUsers([...users, newUser]);
    if (logAudit) logAudit(`New personnel authorized: ${inviteName} assigned role ${finalRole}`, "USER_MANAGEMENT", undefined, { email: inviteEmail });
    
    setInviteName('');
    setInviteEmail('');
    setInviteRole('USER');
    setShowInvite(false);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const openEditModal = (u: User) => {
    if (!isPrivileged) return;
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    let finalRole = editRole;
    if (editRole === 'admin' && !isAdmin) {
      finalRole = editingUser.role === 'admin' ? 'admin' : 'USER';
    }

    setUsers(prev => prev.map(u => u.id === editingUser.id ? { 
      ...u, 
      name: editName, 
      email: editEmail, 
      role: finalRole 
    } : u));

    if (logAudit) logAudit(`Personnel record for ${editName} synchronized by ${currentUser.name}`, "USER_MANAGEMENT");
    
    setEditingUser(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleResetPassword = () => {
    if (!newPass || !resetPassId) return;
    setUsers(users.map(u => u.id === resetPassId ? { ...u, password: newPass, needsSetup: false } : u));
    if (logAudit) {
      const target = users.find(u => u.id === resetPassId);
      logAudit(`Credentials re-keyed for ${target?.name} by ${currentUser.name}`, "SECURITY");
    }
    setResetPassId(null);
    setNewPass('');
    alert('Password updated successfully.');
  };

  const updateUserGoal = (userId: string, goal: number) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const oldGoal = target.revenueGoal;
    
    setUsers(users.map(u => u.id === userId ? { ...u, revenueGoal: goal } : u));
    
    if (logAudit && oldGoal !== goal) {
      logAudit(`${target.name}'s revenue objective adjusted: $${oldGoal.toLocaleString()} to $${goal.toLocaleString()}`, "STAT_CHANGE", { userId, oldGoal });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Team</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Manage roster</p>
        </div>
        {isPrivileged && (
          <button 
            onClick={() => setShowInvite(true)} 
            className="flex items-center gap-2 px-6 py-3 purple-solid text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-indigo-500/10 active:scale-95 transition-all"
          >
            <UserPlus size={16} /> Invite User
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {users.map(u => {
          const canManage = isPrivileged && (isAdmin || u.role !== 'admin' || u.id === currentUser.id);
          const canDelete = isPrivileged && (isAdmin ? u.id !== currentUser.id : u.role !== 'admin');

          return (
            <div 
              key={u.id} 
              className={`bg-[#0a0a0a] border border-white/5 p-6 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between shadow-lg group transition-all ${canManage ? 'hover:border-yellow-500/20' : ''}`}
            >
              <div className="flex items-center gap-6 cursor-pointer" onClick={() => canManage && openEditModal(u)}>
                <div className="w-16 h-16 rounded-[1.2rem] border-2 border-zinc-900 overflow-hidden bg-zinc-950 shadow-2xl">
                  <img 
                    src={u.avatar || settings.logoUrl || `https://ui-avatars.com/api/?name=${u.name}&background=111&color=D4AF37`} 
                    className="w-full h-full object-cover" 
                    alt={u.name} 
                  />
                </div>
                <div>
                  <h4 className="text-lg font-black italic">{u.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[8px] gold-text font-black uppercase tracking-widest">{u.role}</p>
                    <p className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${u.status === 'active' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-zinc-500 border-white/5 bg-white/5'}`}>
                      {u.status}
                    </p>
                  </div>
                  <p className="text-[9px] text-zinc-600 font-bold mt-1">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className="text-right flex flex-col justify-center">
                  <input 
                    type="number" 
                    className="bg-black border border-white/10 rounded-lg p-1 text-xs font-black text-right w-24 text-white focus:border-yellow-500 outline-none transition-all" 
                    value={u.revenueGoal} 
                    onChange={(e) => updateUserGoal(u.id, parseInt(e.target.value) || 0)} 
                  />
                  <p className="text-[9px] text-zinc-600 font-black uppercase mt-1">Goal ($)</p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                     <button 
                      onClick={() => handleShareAccess(u)} 
                      className={`p-3 transition-all relative ${copySuccess === u.id ? 'text-emerald-500' : 'text-zinc-700 hover:text-white'}`}
                      title="Share Access Details"
                     >
                       {copySuccess === u.id ? <CheckCircle2 size={20} /> : <Share2 size={20} />}
                       {copySuccess === u.id && (
                         <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[7px] font-black uppercase py-1 px-2 rounded-md animate-in fade-in slide-in-from-bottom-1">Copied</span>
                       )}
                     </button>
                     <button 
                      onClick={() => openEditModal(u)} 
                      className="p-3 text-zinc-700 hover:text-white transition-colors"
                      title="Edit User"
                     >
                       <Edit2 size={20} />
                     </button>
                     <button 
                      onClick={() => setResetPassId(u.id)} 
                      className="p-3 text-zinc-700 hover:text-white transition-colors"
                      title="Reset Password"
                     >
                       <KeyRound size={20} />
                     </button>
                     <button 
                      onClick={() => setStatusTargetId(u.id)} 
                      className={`p-3 transition-colors ${u.status === 'active' ? 'text-emerald-900 hover:text-emerald-500' : 'text-rose-900 hover:text-rose-500'}`}
                      title="Toggle Status"
                     >
                      {u.status === 'active' ? <UserCheck size={20} /> : <UserMinus size={20} />}
                     </button>
                     <button 
                      onClick={() => setDeleteId(u.id)} 
                      disabled={!canDelete}
                      className={`p-3 transition-colors ${canDelete ? 'text-zinc-800 hover:text-rose-500' : 'text-zinc-900 cursor-not-allowed opacity-20'}`}
                      title={canDelete ? "Delete User" : "Restricted Action"}
                     >
                       <Trash2 size={20} />
                     </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-[#0a0a0a] border border-purple-500/20 rounded-[3rem] p-10 max-w-md w-full space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 purple-solid" />
            <button onClick={() => setShowInvite(false)} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors"><X size={20} /></button>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black italic gold-text uppercase tracking-widest">Invite Personnel</h3>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Expand the workspace directory</p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Legal Name</label>
                <input 
                  className="w-full bg-black border border-white/10 p-5 rounded-2xl text-sm font-bold text-white outline-none focus:border-purple-500" 
                  placeholder="E.g. Alexander Pierce" 
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    type="email"
                    className="w-full bg-black border border-white/10 p-5 pl-12 rounded-2xl text-sm font-bold text-white outline-none focus:border-purple-500" 
                    placeholder="name@agency.com" 
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Permission Level</label>
                <div className="grid grid-cols-3 gap-2 bg-black p-1 rounded-2xl border border-white/5">
                   {(['USER', 'admin', 'closer', 'setter', 'bookkeeper'] as Role[]).map(role => {
                     if (role === 'admin' && !isAdmin) return null;
                     return (
                       <button 
                        key={role} 
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`py-3 text-[8px] font-black uppercase rounded-xl transition-all ${inviteRole === role ? 'bg-zinc-900 text-yellow-500 border border-yellow-500/20 shadow-lg' : 'text-zinc-600 hover:text-white'}`}
                       >
                         {role}
                       </button>
                     );
                   })}
                </div>
              </div>

              <button type="submit" className="w-full py-5 purple-solid text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-500/10 active:scale-95 transition-all mt-4">
                Initialize Invitation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-[3rem] p-10 max-w-md w-full space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 gold-gradient" />
            <button onClick={() => setEditingUser(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors"><X size={20} /></button>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black italic gold-text uppercase tracking-widest">Modify Personnel</h3>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Editing {editingUser.name}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Legal Name</label>
                <input 
                  className="w-full bg-black border border-white/10 p-5 rounded-2xl text-sm font-bold text-white outline-none focus:border-yellow-500" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    type="email"
                    className="w-full bg-black border border-white/10 p-5 pl-12 rounded-2xl text-sm font-bold text-white outline-none focus:border-yellow-500" 
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">Permission Level</label>
                <div className="grid grid-cols-3 gap-2 bg-black p-1 rounded-2xl border border-white/5">
                   {(['USER', 'admin', 'closer', 'setter', 'bookkeeper'] as Role[]).map(role => {
                     if (role === 'admin' && !isAdmin) return null;
                     return (
                       <button 
                        key={role} 
                        type="button"
                        onClick={() => setEditRole(role)}
                        className={`py-3 text-[8px] font-black uppercase rounded-xl transition-all ${editRole === role ? 'bg-zinc-900 text-yellow-500 border border-yellow-500/20 shadow-lg' : 'text-zinc-600 hover:text-white'}`}
                       >
                         {role}
                       </button>
                     );
                   })}
                </div>
              </div>

              <button type="submit" className="w-full py-5 gold-gradient text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-yellow-500/10 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                <Save size={16} /> Apply Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPassId && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 max-sm w-full space-y-8 shadow-2xl relative">
            <button onClick={() => setResetPassId(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors"><X size={20} /></button>
            <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-yellow-500 mx-auto border border-white/5 shadow-xl"><KeyRound size={28} /></div>
               <h3 className="text-xl font-black italic gold-text uppercase mt-4">Reset Credentials</h3>
               <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Assign new access key for {users.find(u => u.id === resetPassId)?.name}</p>
            </div>
            <div className="space-y-4">
              <input 
                type="text"
                className="w-full bg-black border border-white/10 p-5 rounded-2xl text-center font-black tracking-widest text-white outline-none focus:border-yellow-500" 
                placeholder="NEW PASSWORD" 
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
              <button 
                onClick={handleResetPassword}
                disabled={!newPass}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${newPass ? 'purple-solid text-white shadow-xl shadow-indigo-500/10' : 'bg-zinc-900 text-zinc-700'}`}
              >
                Apply New Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 pointer-events-none z-[120] flex items-center justify-center p-6">
          <div className="bg-emerald-500 text-black px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-4 shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-in zoom-in-90 fade-in duration-500">
            <CheckCircle2 size={24} />
            Data Synchronized Successfully
          </div>
        </div>
      )}

      {statusTargetId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-[3rem] p-10 max-sm w-full space-y-8 shadow-2xl relative">
            <button onClick={() => setStatusTargetId(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white"><X size={20} /></button>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black italic gold-text uppercase">Modify Status</h3>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Type <span className="text-white underline">STATUS</span> to confirm</p>
            </div>
            <input 
              className="w-full bg-black border border-white/10 p-5 rounded-2xl text-center font-black tracking-[0.5em] text-white outline-none focus:border-yellow-500" 
              placeholder="CONFIRM" 
              value={statusConfirmText} 
              onChange={e => setStatusConfirmText(e.target.value.toUpperCase())} 
            />
            <button onClick={handleStatusToggle} disabled={statusConfirmText !== 'STATUS'} className={`py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all w-full ${statusConfirmText === 'STATUS' ? 'purple-solid text-white shadow-xl shadow-indigo-500/10' : 'bg-zinc-900 text-zinc-700'}`}>Confirm Changes</button>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-[3rem] p-10 max-sm w-full space-y-8 shadow-2xl relative">
            <button onClick={() => setDeleteId(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white"><X size={20} /></button>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black italic text-rose-500 uppercase">Terminate Access</h3>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Type <span className="text-white underline">DELETE</span> to confirm</p>
            </div>
            <input 
              className="w-full bg-black border border-white/10 p-5 rounded-2xl text-center font-black tracking-[0.5em] text-white outline-none focus:border-rose-500" 
              placeholder="CONFIRM" 
              value={deleteText} 
              onChange={e => setDeleteText(e.target.value.toUpperCase())} 
            />
            <button onClick={handleDelete} disabled={deleteText !== 'DELETE'} className={`py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all w-full ${deleteText === 'DELETE' ? 'bg-rose-600 text-white shadow-xl shadow-rose-500/10' : 'bg-zinc-900 text-zinc-700'}`}>Permanent Deletion</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
