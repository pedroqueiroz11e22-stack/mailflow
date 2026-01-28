import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Users, Send, BarChart3, Inbox, Settings } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Dashboard', icon: Home, path: 'Dashboard' },
    { name: 'Contatos', icon: Users, path: 'Contacts' },
    { name: 'Campanhas', icon: Send, path: 'Campaigns' },
    { name: 'Analytics', icon: BarChart3, path: 'Analytics' },
    { name: 'Inbox', icon: Inbox, path: 'Inbox' },
    { name: 'Configurações', icon: Settings, path: 'Settings' },
  ];

  const isActive = (pagePath) => {
    return currentPageName === pagePath;
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white fixed h-screen overflow-y-auto">
        <div className="p-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Email Marketing</h1>
        </div>
        
        <nav className="px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={createPageUrl(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}