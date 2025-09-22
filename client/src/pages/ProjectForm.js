import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2,
  FileText,
  Eye,
  Send
} from 'lucide-react';
import { projectsAPI, offersAPI } from '../services/api';
import toast from 'react-hot-toast';

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientPhone: '',
    description: '',
    mainBenefit: '',
    modules: [
      { name: '', description: '', color: 'blue' }
    ],
    timeline: {
      phase1: { name: 'Faza I: Discovery', duration: 'Tydzień 1-2' },
      phase2: { name: 'Faza II: Design & Prototyp', duration: 'Tydzień 3-4' },
      phase3: { name: 'Faza III: Development', duration: 'Tydzień 5-12' },
      phase4: { name: 'Faza IV: Testy i Wdrożenie', duration: 'Tydzień 13-14' }
    },
    pricing: {
      phase1: 8000,
      phase2: 0,
      phase3: 56000,
      phase4: 8000
    },
    offerType: 'final',
    priceRange: {
      min: null,
      max: null
    },
    projectManager: {
      name: '',
      position: 'Senior Project Manager',
      email: '',
      phone: '',
      description: 'Z ponad 8-letnim doświadczeniem w prowadzeniu złożonych projektów IT, wierzę w transparentną komunikację i partnerskie relacje. Moim zadaniem jest nie tylko nadzór nad harmonogramem, ale przede wszystkim zapewnienie, że finalny produkt w 100% odpowiada Państwa wizji i celom biznesowym. Będę Państwa głównym punktem kontaktowym na każdym etapie współpracy.'
    },
    status: 'draft',
    priority: 'normal',
    notes: [],
    customReservations: [],
    customPaymentTerms: '10% zaliczki po podpisaniu umowy.\n90% po odbiorze końcowym projektu.'
  });

  const { data: project, isLoading } = useQuery(
    ['project', id],
    () => projectsAPI.getById(id),
    { enabled: isEditing }
  );

  const createMutation = useMutation(projectsAPI.create, {
    onSuccess: () => {
      toast.success('Projekt został utworzony pomyślnie!');
      queryClient.invalidateQueries('projects');
      navigate('/projects');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Błąd podczas tworzenia projektu');
    }
  });

  const updateMutation = useMutation(
    (data) => projectsAPI.update(id, data),
    {
      onSuccess: () => {
        toast.success('Projekt został zaktualizowany pomyślnie!');
        queryClient.invalidateQueries('projects');
        queryClient.invalidateQueries(['project', id]);
        navigate('/projects');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Błąd podczas aktualizacji projektu');
      }
    }
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

  useEffect(() => {
    if (project) {
      setFormData(project);
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleModuleChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === index ? { ...module, [field]: value } : module
      )
    }));
  };

  const addModule = () => {
    setFormData(prev => ({
      ...prev,
      modules: [...prev.modules, { name: '', description: '', color: 'blue' }]
    }));
  };

  const removeModule = (index) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index)
    }));
  };

  const handlePricingChange = (phase, value) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [phase]: parseFloat(value) || 0
      }
    }));
  };

  const handleManagerChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      projectManager: {
        ...prev.projectManager,
        [field]: value
      }
    }));
  };

  const handleTimelineChange = (phase, field, value) => {
    setFormData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        [phase]: {
          ...prev.timeline[phase],
          [field]: value
        }
      }
    }));
  };

  const handleReservationChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      customReservations: prev.customReservations.map((reservation, i) => 
        i === index ? value : reservation
      )
    }));
  };

  const handlePriceRangeChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value ? parseFloat(value) : null
      }
    }));
  };

  const addReservation = () => {
    setFormData(prev => ({
      ...prev,
      customReservations: [...prev.customReservations, '']
    }));
  };

  const removeReservation = (index) => {
    setFormData(prev => ({
      ...prev,
      customReservations: prev.customReservations.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Oblicz total price
    const totalPrice = formData.pricing.phase1 + formData.pricing.phase2 + formData.pricing.phase3 + formData.pricing.phase4;
    
    // Filtruj tylko wypełnione moduły
    const validModules = formData.modules.filter(module => module.name && module.description);
    
    // Przygotuj dane z total price i poprawionymi modułami
    const submitData = {
      ...formData,
      modules: validModules.length > 0 ? validModules : [{ name: 'Moduł przykładowy', description: 'Opis przykładowego modułu', color: 'blue' }],
      pricing: {
        ...formData.pricing,
        total: totalPrice
      },
      // Obsługa widełek cenowych - jeśli są ustawione, używamy ich zamiast total
      priceRange: {
        min: formData.priceRange.min || null,
        max: formData.priceRange.max || null
      }
    };
    
    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleGenerateOffer = () => {
    generateOfferMutation.mutate(id);
  };

  const totalPrice = formData.pricing.phase1 + formData.pricing.phase2 + formData.pricing.phase3 + formData.pricing.phase4;

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edytuj projekt' : 'Nowy projekt'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing ? 'Zaktualizuj dane projektu' : 'Utwórz nowy projekt i ofertę'}
            </p>
          </div>
        </div>
        
        {isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={() => window.open(`/api/offers/preview/${id}`, '_blank')}
              className="btn-secondary flex items-center"
            >
              <Eye className="h-4 w-4 mr-2" />
              Podgląd
            </button>
            <button
              onClick={handleGenerateOffer}
              disabled={generateOfferMutation.isLoading}
              className="btn-primary flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generuj ofertę
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informacje podstawowe</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Nazwa projektu *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Nazwa projektu"
              />
            </div>
            
            <div>
              <label className="form-label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="draft">Szkic</option>
                <option value="active">Aktywny</option>
                <option value="accepted">Zaakceptowany</option>
                <option value="completed">Zakończony</option>
                <option value="cancelled">Anulowany</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priorytet</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="input-field"
              >
                <option value="low">Niski</option>
                <option value="normal">Normalny</option>
                <option value="high">Wysoki</option>
                <option value="urgent">Pilny</option>
              </select>
            </div>
            <div>
              <label className="form-label">Typ oferty</label>
              <select
                name="offerType"
                value={formData.offerType}
                onChange={handleChange}
                className="input-field"
              >
                <option value="final">Oferta finalna</option>
                <option value="preliminary">Oferta wstępna / Konsultacja</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Oferta wstępna jest dla klientów w trakcie konsultacji
              </p>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informacje o kliencie</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Nazwa firmy klienta *</label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Nazwa firmy"
              />
            </div>
            
            <div>
              <label className="form-label">Osoba kontaktowa *</label>
              <input
                type="text"
                name="clientContact"
                value={formData.clientContact}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Imię i nazwisko"
              />
            </div>
            
            <div>
              <label className="form-label">Email klienta *</label>
              <input
                type="email"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleChange}
                className="input-field"
                placeholder="email@firma.pl"
              />
            </div>
            
            <div>
              <label className="form-label">Telefon klienta</label>
              <input
                type="tel"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                className="input-field"
                placeholder="+48 123 456 789"
              />
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Opis projektu</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Główna korzyść biznesowa *</label>
              <input
                type="text"
                name="mainBenefit"
                value={formData.mainBenefit}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="np. cyfryzację kluczowych procesów sprzedażowych"
              />
            </div>
            
            <div>
              <label className="form-label">Opis projektu *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="input-field"
                placeholder="Szczegółowy opis projektu..."
              />
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Moduły projektu</h2>
            <button
              type="button"
              onClick={addModule}
              className="btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj moduł
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.modules.map((module, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900">Moduł {index + 1}</h3>
                  {formData.modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="form-label">Nazwa modułu</label>
                    <input
                      type="text"
                      value={module.name}
                      onChange={(e) => handleModuleChange(index, 'name', e.target.value)}
                      className="input-field"
                      placeholder="np. Panel administracyjny"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="form-label">Opis</label>
                    <input
                      type="text"
                      value={module.description}
                      onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                      className="input-field"
                      placeholder="Szczegółowy opis modułu..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Harmonogram projektu</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Faza I: Nazwa</label>
                <input
                  type="text"
                  value={formData.timeline.phase1.name}
                  onChange={(e) => handleTimelineChange('phase1', 'name', e.target.value)}
                  className="input-field"
                  placeholder="Faza I: Discovery"
                />
              </div>
              <div>
                <label className="form-label">Faza I: Czas trwania</label>
                <input
                  type="text"
                  value={formData.timeline.phase1.duration}
                  onChange={(e) => handleTimelineChange('phase1', 'duration', e.target.value)}
                  className="input-field"
                  placeholder="Tydzień 1-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Faza II: Nazwa</label>
                <input
                  type="text"
                  value={formData.timeline.phase2.name}
                  onChange={(e) => handleTimelineChange('phase2', 'name', e.target.value)}
                  className="input-field"
                  placeholder="Faza II: Design & Prototyp"
                />
              </div>
              <div>
                <label className="form-label">Faza II: Czas trwania</label>
                <input
                  type="text"
                  value={formData.timeline.phase2.duration}
                  onChange={(e) => handleTimelineChange('phase2', 'duration', e.target.value)}
                  className="input-field"
                  placeholder="Tydzień 3-4"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Faza III: Nazwa</label>
                <input
                  type="text"
                  value={formData.timeline.phase3.name}
                  onChange={(e) => handleTimelineChange('phase3', 'name', e.target.value)}
                  className="input-field"
                  placeholder="Faza III: Development"
                />
              </div>
              <div>
                <label className="form-label">Faza III: Czas trwania</label>
                <input
                  type="text"
                  value={formData.timeline.phase3.duration}
                  onChange={(e) => handleTimelineChange('phase3', 'duration', e.target.value)}
                  className="input-field"
                  placeholder="Tydzień 5-12"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Faza IV: Nazwa</label>
                <input
                  type="text"
                  value={formData.timeline.phase4.name}
                  onChange={(e) => handleTimelineChange('phase4', 'name', e.target.value)}
                  className="input-field"
                  placeholder="Faza IV: Testy i Wdrożenie"
                />
              </div>
              <div>
                <label className="form-label">Faza IV: Czas trwania</label>
                <input
                  type="text"
                  value={formData.timeline.phase4.duration}
                  onChange={(e) => handleTimelineChange('phase4', 'duration', e.target.value)}
                  className="input-field"
                  placeholder="Tydzień 13-14"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Project Manager */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Opiekun projektu</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Imię i nazwisko *</label>
              <input
                type="text"
                value={formData.projectManager.name}
                onChange={(e) => handleManagerChange('name', e.target.value)}
                required
                className="input-field"
                placeholder="Anna Kowalska"
              />
            </div>
            
            <div>
              <label className="form-label">Stanowisko</label>
              <input
                type="text"
                value={formData.projectManager.position}
                onChange={(e) => handleManagerChange('position', e.target.value)}
                className="input-field"
                placeholder="Senior Project Manager"
              />
            </div>
            
            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                value={formData.projectManager.email}
                onChange={(e) => handleManagerChange('email', e.target.value)}
                required
                className="input-field"
                placeholder="anna.kowalska@softsynergy.pl"
              />
            </div>
            
            <div>
              <label className="form-label">Telefon *</label>
              <input
                type="tel"
                value={formData.projectManager.phone}
                onChange={(e) => handleManagerChange('phone', e.target.value)}
                required
                className="input-field"
                placeholder="+48 123 456 789"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cennik</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="form-label">Faza I</label>
                <input
                  type="number"
                  value={formData.pricing.phase1}
                  onChange={(e) => handlePricingChange('phase1', e.target.value)}
                  className="input-field"
                  min="0"
                />
              </div>
              
              <div>
                <label className="form-label">Faza II</label>
                <input
                  type="number"
                  value={formData.pricing.phase2}
                  onChange={(e) => handlePricingChange('phase2', e.target.value)}
                  className="input-field"
                  min="0"
                />
              </div>
              
              <div>
                <label className="form-label">Faza III</label>
                <input
                  type="number"
                  value={formData.pricing.phase3}
                  onChange={(e) => handlePricingChange('phase3', e.target.value)}
                  className="input-field"
                  min="0"
                />
              </div>
              
              <div>
                <label className="form-label">Faza IV</label>
                <input
                  type="number"
                  value={formData.pricing.phase4}
                  onChange={(e) => handlePricingChange('phase4', e.target.value)}
                  className="input-field"
                  min="0"
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Razem (netto)</span>
                <span className="text-2xl font-bold text-primary-600">
                  {new Intl.NumberFormat('pl-PL', {
                    style: 'currency',
                    currency: 'PLN'
                  }).format(totalPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Widełki cenowe</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Cena minimalna (PLN)</label>
                <input
                  type="number"
                  value={formData.priceRange.min || ''}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  className="input-field"
                  min="0"
                  placeholder="np. 45000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Opcjonalnie - dla ofert z widełkami cenowymi
                </p>
              </div>
              
              <div>
                <label className="form-label">Cena maksymalna (PLN)</label>
                <input
                  type="number"
                  value={formData.priceRange.max || ''}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  className="input-field"
                  min="0"
                  placeholder="np. 75000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Opcjonalnie - dla ofert z widełkami cenowymi
                </p>
              </div>
            </div>
            
            {formData.priceRange.min && formData.priceRange.max && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Widełki cenowe</span>
                  <span className="text-xl font-bold text-blue-600">
                    {new Intl.NumberFormat('pl-PL', {
                      style: 'currency',
                      currency: 'PLN'
                    }).format(formData.priceRange.min)} - {new Intl.NumberFormat('pl-PL', {
                      style: 'currency',
                      currency: 'PLN'
                    }).format(formData.priceRange.max)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Oferta będzie wyświetlać widełki cenowe zamiast konkretnej kwoty
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Terms */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Warunki płatności</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Warunki płatności</label>
              <textarea
                name="customPaymentTerms"
                value={formData.customPaymentTerms}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder="Wprowadź warunki płatności..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Możesz dostosować warunki płatności do konkretnego projektu (np. 3 transze, różne terminy, itp.)
              </p>
            </div>
          </div>
        </div>

        {/* Custom Reservations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Dodatkowe zastrzeżenia</h2>
            <button
              type="button"
              onClick={addReservation}
              className="btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj zastrzeżenie
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.customReservations.map((reservation, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={reservation}
                  onChange={(e) => handleReservationChange(index, e.target.value)}
                  className="input-field flex-1"
                  placeholder="Wprowadź dodatkowe zastrzeżenie..."
                />
                <button
                  type="button"
                  onClick={() => removeReservation(index)}
                  className="text-red-600 hover:text-red-800 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {formData.customReservations.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                Brak dodatkowych zastrzeżeń. Kliknij "Dodaj zastrzeżenie" aby dodać własne.
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        {isEditing && (
          <NotesSection projectId={id} />
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="btn-secondary"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={createMutation.isLoading || updateMutation.isLoading}
            className="btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Zaktualizuj' : 'Utwórz'} projekt
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm; 

// Notes section displayed only in edit mode
const NotesSection = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { data: project } = useQuery(['project', projectId], () => projectsAPI.getById(projectId));
  const [noteText, setNoteText] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  const addNoteMutation = useMutation(({ id, text }) => projectsAPI.addNote(id, text), {
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries(['project', projectId]);
      toast.success('Dodano notatkę');
    },
    onError: () => toast.error('Nie udało się dodać notatki')
  });

  const addFollowUpMutation = useMutation(({ id, note }) => projectsAPI.addFollowUp(id, note), {
    onSuccess: () => {
      setFollowUpNote('');
      queryClient.invalidateQueries(['project', projectId]);
      toast.success('Zapisano follow-up');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Nie udało się zapisać follow-upu')
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate({ id: projectId, text: noteText.trim() });
  };

  return (
    <div className="card">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Notatki</h2>
      <div className="space-y-3">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          className="input-field"
          placeholder="Dodaj nową notatkę..."
        />
        <div className="flex justify-end">
          <button type="button" onClick={handleAddNote} className="btn-primary" disabled={addNoteMutation.isLoading}>
            Dodaj notatkę
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Follow-up</h3>
          <div className="text-xs text-gray-500">
            {project?.followUps?.length || 0}/3 wysłane
            {project?.nextFollowUpDueAt && (
              <span className="ml-2">
                Następny termin: {new Date(project.nextFollowUpDueAt).toLocaleDateString('pl-PL')}
              </span>
            )}
          </div>
        </div>
        <textarea
          value={followUpNote}
          onChange={(e) => setFollowUpNote(e.target.value)}
          rows={3}
          className="input-field"
          placeholder="Dodaj notatkę do wysłanego follow-upu (wymagane)"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => followUpNote.trim() && addFollowUpMutation.mutate({ id: projectId, note: followUpNote.trim() })}
            className="btn-secondary flex items-center"
            disabled={addFollowUpMutation.isLoading || (project?.followUps?.length || 0) >= 3 || project?.status === 'accepted' || project?.status === 'cancelled'}
            title={(project?.followUps?.length || 0) >= 3 ? 'Wysłano już 3 follow-upy' : ''}
          >
            <Send className="h-4 w-4 mr-2" />
            Zapisz follow-up
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Historia notatek</h3>
        {project?.notes?.length ? (
          <ul className="space-y-3">
            {project.notes.map((n, idx) => (
              <li key={idx} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {new Date(n.createdAt).toLocaleString('pl-PL')}
                  </span>
                  <span className="text-xs text-gray-600">
                    {n.author?.firstName || ''} {n.author?.lastName || ''}
                  </span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Brak notatek.</p>
        )}
      </div>

      {project?.followUps?.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Historia follow-upów</h3>
          <ul className="space-y-3">
            {project.followUps.map((f, idx) => (
              <li key={idx} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    #{f.number} • {new Date(f.sentAt).toLocaleString('pl-PL')}
                  </span>
                  <span className="text-xs text-gray-600">
                    {f.author?.firstName || ''} {f.author?.lastName || ''}
                  </span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{f.note}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};