
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  ChevronRight, 
  MessageCircle, 
  Smartphone,
  Loader2,
  AlertCircle,
  QrCode,
  UserCheck
} from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { GlobalCustomer, Customer, Commerce } from '../../types';
import PhoneInput from '../../components/PhoneInput';

const SearchCustomerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create Form State
  const [newName, setNewName] = useState('');
  const [newPhoneData, setNewPhoneData] = useState({ phoneNumber: '', countryCode: 'AR', fullPhone: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [successData, setSuccessData] = useState<{customer: Customer, isNewGlobal: boolean} | null>(null);

  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');

  // Predictive search with debounce
  useEffect(() => {
    if (!user?.commerceId) return;
    
    if (query.length < 2) {
      setResults([]);
      setShowCreateForm(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      const searchResults = db.searchGlobalAndLocal(user.commerceId!, query);
      setResults(searchResults);
      setIsSearching(false);
      
      // If no results and query looks like a phone, suggest creating
      if (searchResults.length === 0 && query.replace(/\D/g, '').length > 6) {
        setShowCreateForm(true);
      } else {
        setShowCreateForm(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user?.commerceId]);

  const handleUse = (res: any) => {
    if (!user?.commerceId) return;

    if (res.inThisCommerce) {
      // Directo a registrar venta
      navigate('/commerce/scan', { state: { selectedCustomer: res.membership } });
    } else {
      // Vincular cliente global existente
      const membership = db.lookupOrCreateMembership(
        user.commerceId, 
        res.global.id, 
        res.global.name, 
        res.global.phone
      );
      setSuccessData({ customer: membership, isNewGlobal: false });
    }
  };

  const handleCreateAndUse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.commerceId || !newName || !newPhoneData.fullPhone) return;

    setIsCreating(true);
    await new Promise(r => setTimeout(r, 800));

    const membership = db.createGlobalAndMembership(
      user.commerceId, 
      newName, 
      newPhoneData.fullPhone
    );

    setIsCreating(false);
    setSuccessData({ customer: membership, isNewGlobal: true });
  };

  const getWhatsAppLink = (cust: Customer) => {
    const publicUrl = `${window.location.origin}/#/q/${cust.qrToken}`;
    const message = `Hola ${cust.name.split(' ')[0]} 👋 Te escribe ${commerce?.name || 'tu negocio'}. ¡Ya sos parte del club! Sumá puntos y premios mostrándome este código: ${publicUrl}`;
    return `https://wa.me/${cust.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-center space-y-10 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 mx-auto rounded-[32px] flex items-center justify-center border border-emerald-100 shadow-sm">
          <CheckCircle2 size={40} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {successData.isNewGlobal ? '¡Socio Registrado!' : '¡Cliente Vinculado!'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {successData.customer.name} ya puede sumar beneficios en tu comercio.
          </p>
        </div>

        <div className="grid gap-3 pt-4">
          <button 
            onClick={() => navigate('/commerce/scan', { state: { selectedCustomer: successData.customer } })}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3"
          >
            <QrCode size={18} /> Registrar Venta
          </button>
          
          <a 
            href={getWhatsAppLink(successData.customer)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3"
          >
            <MessageCircle size={18} /> Enviar QR por WhatsApp
          </a>

          <button 
            onClick={() => {
              setSuccessData(null);
              setQuery('');
              setShowCreateForm(false);
            }}
            className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors"
          >
            Cargar otro socio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-black transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">Buscar Socio</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Red Global de Fidelización</p>
        </div>
      </div>

      {/* Main Search Input */}
      <div className="relative group px-2">
        <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-blue-500' : 'text-slate-300 group-focus-within:text-black'}`}>
          {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
        </div>
        <input 
          type="text"
          autoFocus
          placeholder="Nombre o teléfono..."
          className="w-full pl-14 pr-4 py-5 bg-white border border-slate-100 rounded-[28px] shadow-sm text-lg font-bold outline-none focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-200"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results List */}
      <div className="space-y-3 px-2">
        {results.map((res) => (
          <button
            key={res.global.id}
            onClick={() => handleUse(res)}
            className="w-full p-5 bg-white border border-slate-50 rounded-[32px] shadow-sm hover:border-blue-200 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border ${res.inThisCommerce ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                {res.global.name[0]}
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold text-slate-900 leading-tight">{res.global.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] font-medium text-slate-400">{res.global.phone}</p>
                  <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${res.inThisCommerce ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {res.inThisCommerce ? 'En tu comercio' : 'En el sistema'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-2 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest">{res.inThisCommerce ? 'Usar' : 'Vincular'}</span>
              <ChevronRight size={14} />
            </div>
          </button>
        ))}

        {/* Empty State / Create Suggestion */}
        {showCreateForm && !isSearching && (
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto border border-blue-100">
                <UserPlus size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Cliente no encontrado</h3>
                <p className="text-xs text-slate-400 font-medium">No existe en la red. Crealo ahora en un paso.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAndUse} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:border-black transition-all"
                  placeholder="Ej: Juan Pérez"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <PhoneInput 
                label="Confirmar Teléfono"
                value={query.replace(/\D/g, '')}
                countryCode="AR"
                onChange={(data) => setNewPhoneData(data)}
                required
              />

              <button 
                type="submit"
                disabled={isCreating || !newName}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                {isCreating ? 'CREANDO...' : 'REGISTRAR Y USAR'}
              </button>
            </form>
          </div>
        )}

        {query.length > 0 && query.length < 2 && (
          <div className="py-20 text-center text-slate-300 animate-in fade-in">
             <Smartphone size={32} className="mx-auto mb-4 opacity-20" />
             <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed italic">Seguí escribiendo para buscar...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchCustomerPage;
