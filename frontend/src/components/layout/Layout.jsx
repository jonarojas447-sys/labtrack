import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowLeftRight, Wrench,
  ClipboardList, Users, FileText, LogOut, Menu, X,
  Bell, ChevronDown, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard, roles: ['admin','encargado','usuario'] },
  { to: '/activos',         label: 'Activos',          icon: Package,         roles: ['admin','encargado','usuario'] },
  { to: '/prestamos',       label: 'Préstamos',        icon: ArrowLeftRight,  roles: ['admin','encargado','usuario'] },
  { to: '/mantenimientos',  label: 'Mantenimientos',   icon: Wrench,          roles: ['admin','encargado'] },
  { to: '/auditoria',       label: 'Auditoría',        icon: ClipboardList,   roles: ['admin'] },
  { to: '/usuarios',        label: 'Usuarios',         icon: Users,           roles: ['admin'] },
  { to: '/logs',            label: 'Logs del Sistema', icon: Activity,        roles: ['admin'] },
  { to: '/reportes',        label: 'Reportes',         icon: FileText,        roles: ['admin','encargado'] },
];

const roleLabel = { admin: 'Administrador', encargado: 'Encargado', usuario: 'Usuario' };
const roleColor = { admin: 'bg-purple-100 text-purple-700', encargado: 'bg-blue-100 text-blue-700', usuario: 'bg-gray-100 text-gray-700' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => item.roles.includes(user?.rol));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
          <Package size={16} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-gray-900 text-lg">LabTrack</span>
          <p className="text-[10px] text-gray-500 -mt-1">Laboratorio de Innovación</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-primary-50 text-primary-700 border border-primary-100'
                 : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
               }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-white font-semibold text-sm">
            {user?.nombre?.[0]}{user?.apellido?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre} {user?.apellido}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColor[user?.rol]}`}>
              {roleLabel[user?.rol]}
            </span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <Bell size={18} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
