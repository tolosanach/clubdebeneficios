import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CreditCard,
  Bell,
  X,
  Building2,
  Activity,
  Trash2,
  ShieldAlert,
  Loader2,
  Search,
  Plus,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';

import { supabase } from '../../services/supabase';
import { useAuth } from '../../services/auth';
import { Commerce, PlanType } from '../../types';

const INITIAL_FORM_STATE = { 
  name: '', 
  price: 0,
  planType: PlanType.FREE,
  monthlyScanLimit: 100
};

const SuperAdminDashboard: React.FC = () => {

  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCommerce, setNewCommerce] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const { data, error } = await supabase
      .from('commerces')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCommerces(data as any);
    }
  };

  const filteredCommerces = useMemo(() => {
    return commerces.filter(c => 
      c.name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [commerces, filterText]);

  const closeAndReset = useCallback(() => {
    setShowModal(false);
    setNewCommerce(INITIAL_FORM_STATE);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommerce.name) return;

    setIsCreating(true);

    try {

      const res = await fetch("/api/admin/create-commerce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newCommerce.name,
          planType: newCommerce.planType,
          monthlyScanLimit: newCommerce.monthlyScanLimit,
          price: newCommerce.price
        })
      });

      if (!res.ok) {
        throw new Error("Error creando comercio");
      }

      await refreshData();
      closeAndReset();

    } catch (err) {
      alert("Error al crear comercio");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black">Admin Panel</h1>
          <p className="text-xs text-slate-400 font-bold uppercase">Gestión Centralizada</p>
        </div>

        <button 
          onClick={() => setShowModal(true)} 
          className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2"
        >
          <Plus size={16}/> Nuevo Comercio
        </button>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input 
            type="text" 
            placeholder="Buscar negocio..." 
            className="pl-9 pr-4 py-2 bg-white border rounded-xl text-xs font-bold outline-none"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="divide-y">

          {filteredCommerces.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-6 py-4">

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs uppercase">
                  {c.name[0]}
                </div>

                <p className="font-bold text-sm">{c.name}</p>
              </div>

              <span className="text-xs text-slate-400">
                {c.planType || "FREE"}
              </span>

            </div>
          ))}

          {filteredCommerces.length === 0 && (
            <div className="py-20 text-center text-slate-300">
              Sin comercios
            </div>
          )}

        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/20">

          <form 
            onSubmit={handleCreate}
            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6"
          >

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black">Nuevo Comercio</h2>
              <button type="button" onClick={() => setShowModal(false)}>
                <X size={24}/>
              </button>
            </div>

            <input 
              required
              className="w-full h-12 px-4 bg-slate-50 border rounded-xl"
              placeholder="Nombre Comercial"
              value={newCommerce.name} 
              onChange={e => setNewCommerce({...newCommerce, name: e.target.value})}
            />

            <button 
              type="submit"
              disabled={isCreating}
              className="w-full py-4 bg-black text-white font-black rounded-2xl"
            >
              {isCreating ? "CREANDO..." : "CREAR"}
            </button>

          </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
