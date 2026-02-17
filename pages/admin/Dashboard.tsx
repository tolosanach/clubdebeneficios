import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Activity,
  Trash2,
  Loader2,
  Search,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import { Commerce, PlanType, PointsMode } from "../../types";

/** ====== FORM ====== */
const INITIAL_FORM_STATE = {
  name: "",
  ownerEmail: "",
  ownerPhone: "",
  tempPassword: "",
  planType: PlanType.FREE as PlanType,
  monthlyScanLimit: 100,
  price: 0,
  pointsMode: PointsMode.PERCENTAGE as PointsMode,
  pointsValue: 10,
};

const SuperAdminDashboard: React.FC = () => {
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [transactionsCount, setTransactionsCount] = useState(0);

  const [activeTab, setActiveTab] = useState<"commerces" | "billing">("commerces");
  const [filterText, setFilterText] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [newCommerce, setNewCommerce] = useState(INITIAL_FORM_STATE);
  const [isCreating, setIsCreating] = useState(false);

  const [deleteCommerce, setDeleteCommerce] = useState<Commerce | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /** ========= CARGA DESDE SUPABASE ========= */
  const refreshData = useCallback(async () => {
    // 1) Comercios
    const { data: commercesData, error: commercesErr } = await supabase
      .from("commerces")
      .select("*")
      .order("created_at", { ascending: false });

    if (commercesErr) {
      console.error("Error loading commerces:", commercesErr);
      alert("No se pudieron cargar los comercios desde Supabase.");
      return;
    }

    setCommerces((commercesData || []) as any);

    // 2) Cantidad de transacciones (solo para el KPI)
    const { count, error: txErr } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true });

    if (!txErr) setTransactionsCount(count || 0);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filteredCommerces = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return commerces;
    return commerces.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [commerces, filterText]);

  const closeAndReset = useCallback(() => {
    setShowModal(false);
    setNewCommerce(INITIAL_FORM_STATE);
  }, []);

  /** ========= CREAR COMERCIO (API SERVERLESS) ========= */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCommerce.name.trim()) return;
    if (!newCommerce.ownerEmail.trim()) return alert("Falta el email del dueño.");
    if (!newCommerce.ownerPhone.trim()) return alert("Falta el celular del dueño.");

    setIsCreating(true);

    try {
      const res = await fetch("/api/admin/create-commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCommerce.name.trim(),
          owner_email: newCommerce.ownerEmail.trim().toLowerCase(),
          owner_phone: newCommerce.ownerPhone.trim(),
          temp_password: newCommerce.tempPassword?.trim() || null,
          plan_type: newCommerce.planType,
          monthly_scan_limit:
            newCommerce.planType === PlanType.PRO ? 0 : Number(newCommerce.monthlyScanLimit || 0),
          price: Number(newCommerce.price || 0),
          points_mode: newCommerce.pointsMode,
          points_value: Number(newCommerce.pointsValue || 0),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Create commerce failed:", json);
        alert(`Error al crear: ${json?.error || "desconocido"}`);
        return;
      }

      // listo
      alert(
        `✅ Comercio creado.\n\nEmail: ${json.owner_email}\nCelular: ${json.owner_phone}\nContraseña temporal: ${json.temp_password || "(se generó)"}`
      );

      closeAndReset();
      await refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Error al crear el comercio. Revisá la consola.");
    } finally {
      setIsCreating(false);
    }
  };

  /** ========= BORRADO REAL (API SERVERLESS) =========
   *  Nota: esto requiere que tengas /api/admin/delete-commerce creado.
   *  Si todavía no lo tenés, dejalo comentado y te lo paso en el próximo paso.
   */
  const handleDeleteCommerce = async () => {
    if (!deleteCommerce) return;

    if (!confirm(`¿Eliminar "${deleteCommerce.name}" y TODOS sus datos?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commerce_id: deleteCommerce.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Delete failed:", json);
        alert(`No se pudo borrar: ${json?.error || "desconocido"}`);
        return;
      }

      alert("✅ Comercio eliminado correctamente.");
      setDeleteCommerce(null);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert("Error borrando. Mirá consola.");
    } finally {
      setIsDeleting(false);
    }
  };

  /** ========= KPIs (simples) ========= */
  const ingresosEstimados = useMemo(() => {
    // Si querés, después lo hacemos bien con tabla subscriptions.
    const proCount = commerces.filter((c: any) => c.planType === PlanType.PRO || c.plan_type === PlanType.PRO).length;
    return proCount * 2500;
  }, [commerces]);

  const enMora = 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-black">Admin Panel</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Gestión Centralizada
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-black/10"
        >
          <Plus size={16} /> Nuevo Comercio
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <Building2 size={12} className="text-slate-900" /> Negocios
          </p>
          <p className="text-xl font-black text-black leading-none">{commerces.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <Activity size={12} className="text-slate-400" /> Movimientos
          </p>
          <p className="text-xl font-black text-black leading-none">{transactionsCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="text-emerald-500 font-black">$</span> Ingresos Est.
          </p>
          <p className="text-xl font-black text-black leading-none">${ingresosEstimados.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <AlertTriangle size={12} className="text-red-500" /> En Mora
          </p>
          <p className="text-xl font-black text-black leading-none">{enMora}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("commerces")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "commerces" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Negocios
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "billing" ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Facturación
          </button>
        </div>

        {activeTab === "commerces" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input
              type="text"
              placeholder="Buscar negocio..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-black transition-all w-full sm:w-64"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === "commerces" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="divide-y divide-slate-50">
            {filteredCommerces.map((c: any) => (
              <div
                key={c.id}
                className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 uppercase">
                    {(c.name || "C")[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                      ID: {c.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <button
                    onClick={() => setDeleteCommerce(c)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {filteredCommerces.length === 0 && (
              <div className="py-20 text-center text-slate-300 space-y-4">
                <Building2 size={32} className="mx-auto opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm text-slate-600 font-semibold">
            Facturación: lo dejamos simple por ahora. Si querés lo armamos bien con una tabla
            <b> subscriptions</b> en Supabase.
          </p>
        </div>
      )}

      {/* MODAL CREAR */}
      {showModal && activeTab === "commerces" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-black tracking-tight">Nuevo Comercio</h2>
              <button type="button" onClick={closeAndReset} className="text-slate-300 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nombre del negocio
                </label>
                <input
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Ej: Gimnasio Central"
                  value={newCommerce.name}
                  onChange={(e) => setNewCommerce({ ...newCommerce, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Email del dueño
                </label>
                <input
                  required
                  type="email"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="dueño@negocio.com"
                  value={newCommerce.ownerEmail}
                  onChange={(e) => setNewCommerce({ ...newCommerce, ownerEmail: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Celular del dueño
                </label>
                <input
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Ej: 54923..."
                  value={newCommerce.ownerPhone}
                  onChange={(e) => setNewCommerce({ ...newCommerce, ownerPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Contraseña temporal (opcional)
                </label>
                <input
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Si lo dejás vacío, se genera sola"
                  value={newCommerce.tempPassword}
                  onChange={(e) => setNewCommerce({ ...newCommerce, tempPassword: e.target.value })}
                />
                <p className="text-[11px] text-slate-400 font-semibold">
                  Es para el primer ingreso. Después el dueño la cambia.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan</label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold"
                    value={newCommerce.planType}
                    onChange={(e) => {
                      const pt = e.target.value as PlanType;
                      setNewCommerce({ ...newCommerce, planType: pt, price: pt === PlanType.PRO ? 2500 : 0 });
                    }}
                  >
                    <option value={PlanType.FREE}>FREE</option>
                    <option value={PlanType.PRO}>PRO</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Límite mensual
                  </label>
                  <input
                    type="number"
                    disabled={newCommerce.planType === PlanType.PRO}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold disabled:opacity-20"
                    value={newCommerce.planType === PlanType.PRO ? "" : newCommerce.monthlyScanLimit}
                    onChange={(e) => setNewCommerce({ ...newCommerce, monthlyScanLimit: parseInt(e.target.value) || 0 })}
                    placeholder={newCommerce.planType === PlanType.PRO ? "Ilimitado" : "Ej: 100"}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
                <input
                  type="number"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-black transition-all"
                  value={newCommerce.price}
                  onChange={(e) => setNewCommerce({ ...newCommerce, price: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl text-xs hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isCreating ? "CREANDO..." : "CREAR"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL BORRAR */}
      {deleteCommerce && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 border border-slate-100">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900">¿Eliminar negocio?</h3>
              <p className="text-sm text-slate-600">
                Vas a borrar <b>{deleteCommerce.name}</b> y sus datos.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteCommerce}
                disabled={isDeleting}
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? "BORRANDO..." : "SÍ, ELIMINAR"}
              </button>
              <button
                onClick={() => setDeleteCommerce(null)}
                disabled={isDeleting}
                className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors"
              >
                Cancelar
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Nota: para que el borrado sea real, necesitás la API <b>/api/admin/delete-commerce</b>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
