import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Video, Layers, Users,
  BarChart2, Settings, LogOut, Camera, X, ChevronRight, Shield
} from 'lucide-react';
import { logout } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/Toast';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/events', label: 'Eventos', icon: Calendar },
  { to: '/app/operator', label: 'Modo Operador', icon: Camera },
  { to: '/app/videos', label: 'Vídeos', icon: Video },
  { to: '/app/templates', label: 'Templates', icon: Layers },
  { to: '/app/leads', label: 'Leads', icon: Users },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
    toast.success('Até logo!');
  }

  const content = (
    <div className="h-full flex flex-col bg-surface-100 border-r border-white/8 w-64">
      <div className="p-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-brand-600/30">3</div>
          <div>
            <span className="font-bold text-white text-base">Tres6Zero</span>
            <p className="text-xs text-white/40">360 Photo Booth</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-white/50 hover:text-white/90 hover:bg-white/5'}`
            }>
            <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/app/admin" onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mt-2 ${isActive ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' : 'text-white/50 hover:text-white/90 hover:bg-white/5'}`
            }>
            <Shield style={{ width: 18, height: 18 }} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">{user?.name}</p>
            <p className="text-xs text-white/40 truncate">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block shrink-0">{content}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0">
              <div className="relative h-full">
                <button onClick={onClose} className="absolute top-4 right-[-48px] p-2 rounded-xl bg-white/10 text-white z-10">
                  <X className="w-5 h-5" />
                </button>
                {content}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
