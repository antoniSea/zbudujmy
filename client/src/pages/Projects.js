import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  FileText,
  Calendar,
  User,
  FolderOpen,
  Download
} from 'lucide-react';
import { projectsAPI, offersAPI } from '../services/api';
import toast from 'react-hot-toast';

const Projects = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
  });

  const { data, isLoading, refetch } = useQuery(
    ['projects', filters],
    () => projectsAPI.getAll(filters),
    { keepPreviousData: true }
  );

  const handleDelete = async (projectId) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten projekt?')) {
      try {
        await projectsAPI.delete(projectId);
        toast.success('Projekt został usunięty');
        refetch();
      } catch (error) {
        toast.error('Błąd podczas usuwania projektu');
      }
    }
  };

  const generateOffer = async (projectId) => {
    try {
      await offersAPI.generate(projectId);
      toast.success('Oferta została wygenerowana pomyślnie!');
      refetch();
    } catch (error) {
      toast.error('Błąd podczas generowania oferty');
    }
  };

  const generateContract = async (projectId) => {
    try {
      await offersAPI.generateContract(projectId);
      toast.success('Umowa została wygenerowana, status ustawiono na zaakceptowany!');
      refetch();
    } catch (error) {
      toast.error('Błąd podczas generowania umowy');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Szkic', color: 'bg-gray-100 text-gray-800' },
      active: { label: 'Aktywny', color: 'bg-green-100 text-green-800' },
      accepted: { label: 'Zaakceptowany', color: 'bg-emerald-100 text-emerald-800' },
      completed: { label: 'Zakończony', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Anulowany', color: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
          <p className="mt-1 text-sm text-gray-500">
            Zarządzaj projektami i ofertami
          </p>
        </div>
        <Link
          to="/projects/new"
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nowy projekt
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="form-label">Wyszukaj</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nazwa projektu, klient..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="form-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="input-field"
            >
              <option value="">Wszystkie</option>
              <option value="draft">Szkic</option>
              <option value="active">Aktywny</option>
              <option value="accepted">Zaakceptowany</option>
              <option value="completed">Zakończony</option>
              <option value="cancelled">Anulowany</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: '', status: '', page: 1 })}
              className="btn-secondary w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Wyczyść filtry
            </button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {data?.projects?.map((project) => {
          const hasPendingFollowUp = project.nextFollowUpDueAt && project.status !== 'accepted' && project.status !== 'cancelled' && (!project.followUps || project.followUps.length < 3);
          const isOverdue = hasPendingFollowUp && new Date(project.nextFollowUpDueAt) <= new Date();
          return (
          <div key={project._id} className={`card hover:shadow-md transition-shadow duration-200 ${isOverdue ? 'ring-2 ring-red-500' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Klient: {project.clientName}
                    </p>
                    {hasPendingFollowUp && (
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {isOverdue ? 'Termin follow-up minął' : 'Zaplanowany follow-up'}: {new Date(project.nextFollowUpDueAt).toLocaleDateString('pl-PL')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(project.status)}
                    {project.priority && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        project.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                        'bg-sky-100 text-sky-800'
                      }`}>
                        {project.priority === 'urgent' ? 'Pilny' :
                         project.priority === 'high' ? 'Wysoki' :
                         project.priority === 'low' ? 'Niski' : 'Normalny'}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(project.pricing?.total || 0)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {project.createdBy?.fullName}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(project.createdAt).toLocaleDateString('pl-PL')}
                  </div>
                  {project.offerNumber && (
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {project.offerNumber}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {project.generatedOfferUrl ? (
                  <a
                    href={`https:///oferty.soft-synergy.com${project.generatedOfferUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-green-600"
                    title="Pobierz ofertę"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    onClick={() => generateOffer(project._id)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Generuj ofertę"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}
                {project.contractPdfUrl ? (
                  <a
                    href={`https:///oferty.soft-synergy.com${project.contractPdfUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-emerald-600"
                    title="Pobierz umowę"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    onClick={() => generateContract(project._id)}
                    className="p-2 text-gray-400 hover:text-emerald-600"
                    title="Wygeneruj umowę"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}
                <Link
                  to={`/projects/${project._id}`}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Zobacz szczegóły"
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <Link
                  to={`/projects/${project._id}/edit`}
                  className="p-2 text-gray-400 hover:text-blue-600"
                  title="Edytuj"
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(project._id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Usuń"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );})}
        
        {data?.projects?.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak projektów</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status 
                ? 'Spróbuj zmienić filtry wyszukiwania.'
                : 'Rozpocznij od utworzenia pierwszego projektu.'
              }
            </p>
            {!filters.search && !filters.status && (
              <div className="mt-6">
                <Link to="/projects/new" className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Utwórz projekt
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Pokazano {((data.currentPage - 1) * 10) + 1} do {Math.min(data.currentPage * 10, data.total)} z {data.total} wyników
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilters({ ...filters, page: data.currentPage - 1 })}
              disabled={data.currentPage === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Poprzednia
            </button>
            <button
              onClick={() => setFilters({ ...filters, page: data.currentPage + 1 })}
              disabled={data.currentPage === data.totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następna
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects; 