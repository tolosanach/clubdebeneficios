
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, QrCode, Settings, Gift, Users, BarChart3, Menu, X, CreditCard, AlertTriangle, Plus, UserPlus, ShieldHalf, Search, Store, MessageSquare } from 'lucide-react';
import { useAuth } from '../services/auth';
import { db } from '../services/db';
import { UserRole, Commerce, SubscriptionStatus } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);

  const commerce = user?.commerceId ? db.getById<Commerce>('commerces', user.commerceId) : null;
  const subscription = user?.commerceId ? db.getSubscriptionByCommerce(user.commerceId) : null;

  if (!user) return <>{children}</>;

  const menuItems = {
    [UserRole.SUPER_ADMIN]: [
      { label: 'Dashboard', icon: BarChart3, path: '/admin' },
    ],
    [UserRole.COMMERCE_OWNER]: [
      { label: 'Inicio', icon: Home, path: '/commerce' },
      { label: 'Escanear', icon: QrCode, path: '/commerce/scan' },
      { label: 'Recordatorios', icon: MessageSquare, path: '/commerce/reminders' },
      { label: 'Clientes', icon: Users, path: '/commerce/customers' },
      { label: 'Personal', icon: ShieldHalf, path: '/commerce/staff' },
      { label: 'Premios', icon: Gift, path: '/commerce/rewards' },
      { label: 'Facturación', icon: CreditCard, path: '/commerce/billing' },
      { label: 'Ajustes', icon: Settings, path: '/commerce/settings' },
    ],
    [UserRole.STAFF_MANAGER]: [
      { label: 'Inicio', icon: Home, path: '/commerce' },
      { label: 'Escanear', icon: QrCode, path: '/commerce/scan' },
      { label: 'Recordatorios', icon: MessageSquare, path: '/commerce/reminders' },
      { label: 'Clientes', icon: Users, path: '/commerce/customers' },
      { label: 'Premios', icon: Gift, path: '/commerce/rewards' },
    ],
    [UserRole.SCANNER]: [
      { label: 'Escanear', icon: QrCode, path: '/commerce/scan' },
    ],
    [UserRole.VIEWER]: [
      { label: 'Inicio', icon: Home, path: '/commerce' },
      { label: 'Clientes', icon: Users, path: '/commerce/customers' },
    ],
    [UserRole.CUSTOMER]: [
      { label: 'Mis Beneficios', icon: Gift, path: '/customer' },
      { label: 'Descubrir Locales', icon: Store, path: '/customer' }, 
    ],
  };

  const currentItems = menuItems[user.role] || [];
  const isOverdue = subscription?.status === SubscriptionStatus.OVERDUE || subscription?.status === SubscriptionStatus.SUSPENDED;
  const canUseQuickActions = [UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER, UserRole.SCANNER].includes(user.role) && 
                             location.pathname !== '/commerce/settings';

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-[#eaeaea] sticky top-0 z-50 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-500 lg:hidden">
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            {commerce?.logoUrl ? (
              <img src={commerce.logoUrl} className="w-6 h-6 rounded object-cover border border-[#eee]" />
            ) : (
              <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center font-bold text-[10px]">
                {commerce?.name?.[0] || 'C'}
              </div>
            )}
            <h1 className="text-sm font-semibold tracking-tight text-black">{title || commerce?.name || 'Club'}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isOverdue && user.role === UserRole.COMMERCE_OWNER && (
            <button onClick={() => navigate('/commerce/billing')} className="hidden sm:flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold border border-red-100">
               <AlertTriangle size={12} /> Cuenta en Mora
            </button>
          )}
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-xs font-medium text-black">{user.name}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 text-slate-400 hover:text-black transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className={`fixed inset-0 z-40 lg:relative lg:z-0 lg:block ${isMenuOpen ? 'block' : 'hidden'} bg-white border-r border-[#eaeaea] w-64`}>
          <div className="p-4 space-y-1">
            {currentItems.map((item) => (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${location.pathname === item.path ? 'bg-slate-50 text-black font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-black'}`}
              >
                <item.icon size={16} />
                <span className="text-[13px]">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        {isMenuOpen && <div className="fixed inset-0 bg-black/5 z-30 lg:hidden" onClick={() => setIsMenuOpen(false)} />}
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar bg-[#fafafa]">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {canUseQuickActions && subscription?.status !== SubscriptionStatus.SUSPENDED && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {isSpeedDialOpen && (
            <div className="flex flex-col items-end gap-3 mb-3 animate-in slide-in-from-bottom-4 duration-200">
              {[UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER].includes(user.role) && (
                <button
                  onClick={() => { navigate('/commerce/search-customer'); setIsSpeedDialOpen(false); }}
                  className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xl active:scale-[0.95] transition-all group"
                >
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Buscar / Crear Socio</span>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Search size={20} />
                  </div>
                </button>
              )}
              <button
                onClick={() => { navigate('/commerce/scan'); setIsSpeedDialOpen(false); }}
                className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xl active:scale-[0.95] transition-all group"
              >
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Registrar Venta</span>
                <div className="w-10 h-10 bg-slate-50 text-black rounded-xl flex items-center justify-center">
                  <QrCode size={20} />
                </div>
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)} 
            className={`w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 active:scale-[0.90] transition-all z-50 ${isSpeedDialOpen ? 'rotate-45' : ''}`}
          >
            <Plus size={28} />
          </button>
          
          {isSpeedDialOpen && (
            <div 
              className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-40 transition-all" 
              onClick={() => setIsSpeedDialOpen(false)} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Layout;
