import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { ClipboardList, FileText, Menu, X, UserCog, UserPlus, CalendarDays, Clock, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import NotificationBell from './components/notificaciones/NotificationBell';

const navItems = [
  { name: 'Pedidos', page: 'Pedidos', icon: ClipboardList },
  { name: 'Camareros', page: 'Camareros', icon: UserPlus },
  { name: 'Asignación', page: 'Asignacion', icon: UserCog },
  { name: 'Tiempo Real', page: 'TiempoReal', icon: Clock },
  { name: 'Coordinadores', page: 'Coordinadores', icon: Users },
  { name: 'Informes', page: 'Informes', icon: FileText }
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center shadow-lg shadow-[#1e3a5f]/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800">Staff Coordinator</h1>
                <p className="text-xs text-slate-500">Gestión de Camareros</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)}>
                  <Button
                    variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={currentPageName === item.page 
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#152a45]' 
                      : 'text-slate-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5'
                    }
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
              <div className="ml-2 border-l border-slate-200 pl-2">
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
            {navItems.map(item => (
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
        )}
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}