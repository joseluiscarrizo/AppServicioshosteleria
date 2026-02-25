import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from './utils';
import { ClipboardList, FileText, Menu, X, UserCog, UserPlus, CalendarDays, Clock, Users, LayoutDashboard, Bell, MessageCircle, ChevronDown, Smartphone, CalendarRange, ShieldCheck, Settings } from 'lucide-react';

// ── Bottom Tabs para móvil ────────────────────────────────
const BOTTOM_TABS = [
  { label: 'Dashboard', page: 'DashboardCoordinador', icon: LayoutDashboard },
  { label: 'Pedidos',   page: 'Pedidos',              icon: ClipboardList },
  { label: 'Personal',  page: 'Camareros',            icon: Users },
  { label: 'Chat',      page: 'Comunicacion',         icon: MessageCircle },
  { label: 'Ajustes',   page: 'ConfiguracionCuenta',  icon: Settings },
];

function BottomNav({ currentPageName }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-slate-200 bottom-nav flex items-stretch">
      {BOTTOM_TABS.map(tab => {
        const Icon = tab.icon;
        const active = currentPageName === tab.page;
        return (
          <Link
            key={tab.page}
            to={createPageUrl(tab.page)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
              active ? 'text-[#1e3a5f]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className={`text-[10px] font-medium ${active ? 'text-[#1e3a5f]' : 'text-slate-400'}`}>
              {tab.label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1e3a5f] rounded-b-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationBell from './components/notificaciones/NotificationBell';
import { useWebPushNotifications } from './components/notificaciones/WebPushService';
import RateLimitHandler from './components/notificaciones/RateLimitHandler';
import { useBackgroundServices } from './hooks/useBackgroundServices';

const clientesSubmenu = [
  { name: 'Alta Cliente', page: 'Clientes', icon: Users },
  { name: 'Pedidos', page: 'Pedidos', icon: ClipboardList },
  { name: 'Asignación', page: 'Asignacion', icon: UserCog },
];

const herramientasSubmenu = [
  { name: 'Tiempo Real', page: 'TiempoReal', icon: Clock },
  { name: 'Tablero Eventos', page: 'TableroEventos', icon: CalendarRange },
  { name: 'Vista Móvil', page: 'VistaMovil', icon: Smartphone },
  { name: 'Informes', page: 'Informes', icon: FileText },
];

const comunicacionSubmenu = [
  { name: 'Comunicación', page: 'Comunicacion', icon: MessageCircle },
  { name: 'WhatsApp', page: 'HistorialMensajes', icon: MessageCircle }
];

const adminSubmenu = [
  { name: 'Coordinadores', page: 'Coordinadores', icon: UserCog },
  { name: 'Altas', page: 'Altas', icon: ClipboardList },
];

// Dark mode: apply 'dark' class based on system preference
function useDarkMode() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}

// Bottom-tab pages that get slide transitions
const TRANSITION_PAGES = ['DashboardCoordinador', 'Pedidos', 'Camareros', 'Comunicacion', 'TiempoReal'];
const TAB_ORDER = BOTTOM_TABS.map(t => t.page);

function PageTransitionWrapper({ children, currentPageName }) {
  const location = useLocation();
  const idx = TAB_ORDER.indexOf(currentPageName);
  const isTabPage = idx !== -1;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname + location.search}
        initial={isTabPage ? { x: 20, opacity: 0 } : { opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={isTabPage ? { x: -20, opacity: 0 } : { opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showNotification, isAllowed, requestPermission } = useWebPushNotifications();
  useDarkMode();

  // Servicios background unificados (reemplaza NotificacionesAutomaticas + ServicioRecordatorios + RecordatoriosProactivos)
  useBackgroundServices({ showPushNotifications: isAllowed ? showNotification : null });
  
  // Solicitar permisos al cargar la app
  React.useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Esperar 3 segundos y luego solicitar permisos
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [requestPermission]);

  return (
    <div className="min-h-screen bg-amber-50/60">
      <style>{`
        :root {
          --background: 33 30% 98%;
          --foreground: 20 20% 14%;
          --card: 0 0% 100%;
          --card-foreground: 20 20% 14%;
          --popover: 0 0% 100%;
          --popover-foreground: 20 20% 14%;
          --primary: 22 80% 38%;
          --primary-foreground: 30 100% 98%;
          --secondary: 34 35% 93%;
          --secondary-foreground: 20 15% 20%;
          --muted: 34 25% 94%;
          --muted-foreground: 25 15% 46%;
          --accent: 34 35% 92%;
          --accent-foreground: 20 15% 20%;
          --border: 30 20% 87%;
          --input: 30 20% 87%;
          --ring: 22 80% 38%;
          --radius: 0.6rem;
        }
        body { background-color: hsl(33, 30%, 98%) !important; }
      `}</style>
      {/* Manejador global de errores de rate limit */}
      <RateLimitHandler />
      
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-50 safe-area-top">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-700 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-700/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800">Staff Coordinator</h1>
                <p className="text-xs text-slate-500">Gestión de Camareros</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Dashboard */}
              <Link to={createPageUrl('DashboardCoordinador')}>
                <Button
                  variant={currentPageName === 'DashboardCoordinador' ? 'default' : 'ghost'}
                  className={currentPageName === 'DashboardCoordinador'
                    ? 'bg-orange-700 text-white hover:bg-orange-800' 
                    : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'
                  }
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>

              {/* Dropdown de Clientes */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['Clientes', 'Pedidos', 'Asignacion'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['Clientes', 'Pedidos', 'Asignacion'].includes(currentPageName)
                      ? 'bg-orange-700 text-white hover:bg-orange-800' 
                      : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'
                    }
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Clientes
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {clientesSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Camareros */}
              <Link to={createPageUrl('Camareros')}>
                <Button
                  variant={currentPageName === 'Camareros' ? 'default' : 'ghost'}
                  className={currentPageName === 'Camareros'
                    ? 'bg-orange-700 text-white hover:bg-orange-800' 
                    : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'
                  }
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Personal
                </Button>
              </Link>

              {/* Dropdown Admin */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['Coordinadores', 'Altas'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['Coordinadores', 'Altas'].includes(currentPageName)
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#152a45]' 
                      : 'text-slate-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5'
                    }
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Admin
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {adminSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dropdown de Herramientas */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['TiempoReal', 'TableroEventos', 'VistaMovil', 'Informes'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['TiempoReal', 'TableroEventos', 'VistaMovil', 'Informes'].includes(currentPageName)
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#152a45]' 
                      : 'text-slate-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5'
                    }
                  >
                    <CalendarRange className="w-4 h-4 mr-2" />
                    Herramientas
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {herramientasSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dropdown de Comunicación */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['Comunicacion', 'Chat', 'HistorialMensajes'].includes(currentPageName) ? 'default' : 'ghost'}
                                  className={['Comunicacion', 'Chat', 'HistorialMensajes'].includes(currentPageName)
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#152a45]' 
                      : 'text-slate-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5'
                    }
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comunicación
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {comunicacionSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="ml-2 border-l border-slate-200 pl-2 flex items-center gap-2">
                {!isAllowed && typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <Button
                    size="sm"
                    onClick={requestPermission}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                  >
                    🔔 Activar Notificaciones
                  </Button>
                )}
                <NotificationBell />
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3">
            {/* Dashboard */}
            <Link to={createPageUrl('DashboardCoordinador')} onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={currentPageName === 'DashboardCoordinador' ? 'default' : 'ghost'}
                className={`w-full justify-start mb-1 ${currentPageName === 'DashboardCoordinador'
                  ? 'bg-[#1e3a5f] text-white' 
                  : 'text-slate-600'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>

            {/* Submenu de Clientes en Mobile */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">CLIENTES</div>
              {clientesSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page 
                      ? 'bg-[#1e3a5f] text-white' 
                      : 'text-slate-600'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Camareros en Mobile */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <Link to={createPageUrl('Camareros')} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={currentPageName === 'Camareros' ? 'default' : 'ghost'}
                  className={`w-full justify-start mb-1 ${currentPageName === 'Camareros' 
                    ? 'bg-[#1e3a5f] text-white' 
                    : 'text-slate-600'
                  }`}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Personal
                </Button>
              </Link>
            </div>

            {/* Admin en Mobile */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">ADMIN</div>
              {adminSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page 
                      ? 'bg-[#1e3a5f] text-white' 
                      : 'text-slate-600'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Submenu de Herramientas en Mobile */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">HERRAMIENTAS</div>
              {herramientasSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page 
                      ? 'bg-[#1e3a5f] text-white' 
                      : 'text-slate-600'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Submenu de Comunicación en Mobile */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">COMUNICACIÓN</div>
              {comunicacionSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page 
                      ? 'bg-[#1e3a5f] text-white' 
                      : 'text-slate-600'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>
            </div>
            )}
      </header>

      {/* Main Content — pb-16 evita que el bottom nav tape contenido en móvil */}
      <main className="pb-16 md:pb-0">
        <PageTransitionWrapper currentPageName={currentPageName}>
          {children}
        </PageTransitionWrapper>
      </main>

      {/* Bottom Navigation — solo visible en móvil */}
      <BottomNav currentPageName={currentPageName} />
    </div>
  );
}