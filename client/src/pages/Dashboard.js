import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  FolderOpen, 
  Users, 
  TrendingUp, 
  Plus,
  Eye,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react';
import { projectsAPI } from '../services/api';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery('projectStats', projectsAPI.getStats);

  const cards = [
    {
      name: 'Wszystkie projekty',
      value: stats?.totalProjects || 0,
      icon: FolderOpen,
      color: 'bg-blue-500',
    },
    {
      name: 'Aktywne projekty',
      value: stats?.stats?.find(s => s._id === 'active')?.count || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'Wartość projektów',
      value: `${((stats?.totalValue || 0) / 1000).toFixed(0)}k PLN`,
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      name: 'Oferty wygenerowane',
      value: stats?.stats?.find(s => s._id === 'completed')?.count || 0,
      icon: FileText,
      color: 'bg-orange-500',
    },
  ];

  const quickActions = [
    {
      name: 'Nowy projekt',
      description: 'Utwórz nowy projekt i ofertę',
      href: '/projects/new',
      icon: Plus,
      color: 'bg-primary-600',
    },
    {
      name: 'Przeglądaj projekty',
      description: 'Zobacz wszystkie projekty',
      href: '/projects',
      icon: Eye,
      color: 'bg-blue-600',
    },
    {
      name: 'Zarządzaj portfolio',
      description: 'Edytuj portfolio projektów',
      href: '/portfolio',
      icon: FolderOpen,
      color: 'bg-green-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Przegląd projektów i statystyk
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="card">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Szybkie akcje</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                to={action.href}
                className="card hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-md ${action.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {action.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ostatnia aktywność</h2>
        <div className="card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    Witamy w Ofertowniku!
                  </p>
                  <p className="text-sm text-gray-500">
                    Rozpocznij pracę z systemem zarządzania ofertami
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Teraz
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 