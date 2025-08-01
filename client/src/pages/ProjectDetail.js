import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Download, 
  Eye,
  Mail,
  Phone,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { projectsAPI, offersAPI } from '../services/api';
import toast from 'react-hot-toast';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery(
    ['project', id],
    () => projectsAPI.getById(id)
  );

  const generateOfferMutation = useMutation(offersAPI.generate, {
    onSuccess: (data) => {
      toast.success('Oferta została wygenerowana pomyślnie!');
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      toast.error('Błąd podczas generowania oferty');
    }
  });

  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        label: 'Szkic', 
        color: 'bg-gray-100 text-gray-800',
        icon: Clock
      },
      active: { 
        label: 'Aktywny', 
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      },
      completed: { 
        label: 'Zakończony', 
        color: 'bg-blue-100 text-blue-800',
        icon: CheckCircle
      },
      cancelled: { 
        label: 'Anulowany', 
        color: 'bg-red-100 text-red-800',
        icon: AlertCircle
      },
    };
    return configs[status] || configs.draft;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Projekt nie został znaleziony</h3>
        <p className="mt-1 text-sm text-gray-500">Sprawdź czy link jest poprawny.</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Klient: {project.clientName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
            <StatusIcon className="h-4 w-4 mr-1" />
            {statusConfig.label}
          </span>
          
          <Link
            to={`/projects/${id}/edit`}
            className="btn-secondary flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edytuj
          </Link>
          
          <button
            onClick={() => window.open(`/api/offers/preview/${id}`, '_blank')}
            className="btn-secondary flex items-center"
          >
            <Eye className="h-4 w-4 mr-2" />
            Podgląd
          </button>
          
          <button
            onClick={() => generateOfferMutation.mutate(id)}
            disabled={generateOfferMutation.isLoading}
            className="btn-primary flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generuj ofertę
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Overview */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Przegląd projektu</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Opis</h3>
                <p className="mt-1 text-sm text-gray-900">{project.description}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Główna korzyść biznesowa</h3>
                <p className="mt-1 text-sm text-gray-900">{project.mainBenefit}</p>
              </div>
              
              {project.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notatki</h3>
                  <p className="mt-1 text-sm text-gray-900">{project.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Modules */}
          {project.modules && project.modules.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Moduły projektu</h2>
              <div className="space-y-4">
                {project.modules.map((module, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{module.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{module.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Harmonogram</h2>
            <div className="space-y-4">
              {Object.entries(project.timeline).map(([phase, data]) => (
                <div key={phase} className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{data.name}</h3>
                    <p className="text-sm text-gray-500">{data.duration}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(project.pricing[phase] || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informacje o kliencie</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{project.clientContact}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{project.clientEmail}</span>
              </div>
              {project.clientPhone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{project.clientPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Project Manager */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Opiekun projektu</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-gray-900">{project.projectManager.name}</h3>
                <p className="text-sm text-gray-500">{project.projectManager.position}</p>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{project.projectManager.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{project.projectManager.phone}</span>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Podsumowanie finansowe</h2>
            <div className="space-y-3">
              {Object.entries(project.pricing).map(([phase, amount]) => {
                if (phase === 'total') return null;
                const phaseName = project.timeline[phase]?.name || phase;
                return (
                  <div key={phase} className="flex justify-between">
                    <span className="text-sm text-gray-600">{phaseName}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">Razem (netto)</span>
                  <span className="font-bold text-lg text-primary-600">
                    {formatCurrency(project.pricing.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Szczegóły projektu</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  Utworzono: {new Date(project.createdAt).toLocaleDateString('pl-PL')}
                </span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  Utworzył: {project.createdBy?.fullName}
                </span>
              </div>
              {project.offerNumber && (
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    Numer oferty: {project.offerNumber}
                  </span>
                </div>
              )}
              {project.generatedOfferUrl && (
                <div className="pt-3">
                  <a
                    href={`http://localhost:5001${project.generatedOfferUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Pobierz ofertę
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail; 