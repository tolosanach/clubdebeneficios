// pages/admin/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CreditCard,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabase"; // ✅ (vos ya lo tenés en services/supabase.ts)
import {
  Commerce,
  PlanType,
  PointsMode,
  Subscription,
  SubscriptionStatus,
} from "../../types";

const INITIAL_FORM_STATE = {
  name: "",
  pointsMode: PointsMode.PERCENTAGE,
  pointsValue: 10,
  price: 0,
  planType: PlanType.FREE,
  monthlyScanLimit: 100,
};

type Tab = "commerces" | "billing";

function normalizeCommerceRow(row: any): Commerce {
  // Supabase -> tu UI (defaults para que no reviente el dashboard)
  return {
    id: row.id,
    name: row.name ?? "Sin nombre",
    // campos DB snake_case -> UI camelCase (si tu tipo los usa)
    logoUrl: row.logo_url ?? row.logoUrl ?? "",
    primaryColor: row.primaryColor ?? "#2563eb",

    // flags / config (en tu tabla existen enable_points, points_mode, points_value, etc.)
    enable_points: row.enable_points ?? true,
    enable_stars: row.enable_stars ?? false,
    enable_coupon: row.enable_coupon ?? true,

    pointsMode: row.points_mode ?? row.pointsMode ?? PointsMode.PERCENTAGE,
    pointsValue: row.points_value ?? row.pointsValue ?? 10,

    discountPercent: row.discount_percent ?? row.discountPercent ?? 10,
    discountExpirationDays:
      row.discount_expiration_days ?? row.discountExpirationDays ?? 30,

    planType: row.plan_type ?? row.planType ?? PlanType.FREE,
    monthlyScanLimit: row.monthly_scan_limit ?? row.monthlyScanLimit ?? 100,
    scansCurrentMonth:
      row.scans_current_month ?? row.scansCurrentMonth ?? 0,

    // timestamps
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),

    // lo que tu UI pueda leer sin explotar
    public_listed: row.public_listed ?? false,
  } as any;
}

const SuperAdminDashboard: React.FC = () => {
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("commerces");
  const [filterText, setFilterText] = useState("");

  // modal crear
  const [showModal, setShowModal] = useState(false);
  const [newCommerce, setNewCommerce] = useState(INITIAL_FORM_STATE);
  const [isCreating, setIsCreating] = useState(false);

  // notifs (por ahora sólo UI, si querés lo conectamos después)
  const [notifCommerce, setNotifCommerce] = useState<Commerce | null>(null);
  const [notifData, setNotifData] = useState({ title: "", message: "" });
  const [sendingNotif, setSendingNotif] = useState(false);

  // delete (si no tenés endpoint de delete, te lo dejo preparado)
  const [deleteCommerce, setDeleteCommerce] = useState<Commerce | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshData = useCallback(async () => {
    // ✅ Comercios desde Supabase (sin fallback)
    const { data: cData, error: cErr } = await supabase
      .from("commerces")
      .select("*")
      .order("created_at", { ascending: false });

    if (cErr) {
      console.error("Error loading commerces:", cErr);
      setCommerces([]);
    } else {
      setCommerces((cData || []).map(normalizeCommerceRow));
    }

    // ✅ Subscriptions desde Supabase (si tu tabla existe y está accesible)
    const { data: sData, error: sErr } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (sErr) {
      // si no existe / RLS / etc, no rompemos nada
      console.warn("Subscriptions not available:", sErr);
      setSubscriptions([]);
    } else {
      setSubscriptions((sData || []) as any);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshData();
    })();
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

  // ✅ Crear comercio: llamamos a la API privada en Vercel (serverless)
  // Esta API es la que usa SERVICE ROLE y mete filas en Supabase.
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommerce.name.trim()) return;

    setIsCreating(true);
    try {
      const resp = await fetch("/api/admin/create-commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCommerce.name.trim(),
          planType: newCommerce.planType,
          price: Number(newCommerce.price || 0),
          monthlyScanLimit: Number(newCommerce.monthlyScanLimit || 0),
          pointsMode: newCommerce.pointsMode,
          pointsValue: Number(newCommerce.pointsValue || 0),
        }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error("Create commerce failed:", json);
        alert(
          json?.error
            ? `${json.error}${json.details ? `\n${json.details}` : ""}`
            : "Error al crear el comercio"
        );
        return;
      }

      await refreshData();
      alert("Comercio creado correctamente");
      closeAndReset();
    } catch (err: any) {
      console.error(err);
      alert("Error al crear el comercio. Intente nuevamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifCommerce || !notifData.title || !notifData.message) return;

    // Por ahora lo dejo como “simulación” para no mezclar con db.ts.
    setSendingNotif(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      alert("Notificación enviada (demo). Si querés lo conectamos a Supabase).");
      setNotifCommerce(null);
      setNotifData({ title: "", message: "" });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleDeleteCommerce = async () => {
    if (!deleteCommerce) return;

    // ✅ Si querés borrado real, lo correcto es crear /api/admin/delete-commerce
    // y borrar en cascada con SERVICE ROLE.
    setIsDeleting(true);
    try {
      alert(
        "Borrado pendiente: si querés, te paso el endpoint /api/admin/delete-commerce para borrar en cascada."
      );
      setDeleteCommerce(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const ingresosEstimados = useMemo(() => {
    // si no tenés subscriptions accesibles, esto queda en 0 y no rompe nada
    return subscriptions
      .filter((s: any) => (s.status || "") !== "suspended")
      .reduce((acc: number, s: any) => acc + Number(s.amount || 0), 0);
  }, [subscriptions]);

  const enMora = useMemo(() => {
    return subscriptions.filter((s: any) => (s.status || "") !== "active").length;
  }, [subscriptions]);

  const stats = [
    { label: "Negocios", value: commerces.length, icon: Building2, color: "text-slate-900" },
    { label: "Movimientos", value: "-", icon: Activity, color: "text-slate-400" },
    {
      label: "Ingresos Est.",
      value: `$${ingresosEstimados.toLocaleString()}`,
      icon: CreditCard,
      color: "text-emerald-500",
    },
    { label: "En Mora", value: enMora, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-black">Admin Panel</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Gestión Centralizada (Supabase)
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
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <stat.icon size={12} className={stat.color} /> {stat.label}
            </p>
            <p className="text-xl font-black text-black leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("commerces")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "commerces"
                ? "bg-white text-black shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Negocios
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "billing"
                ? "bg-white text-black shadow-sm"
                : "text-slate-400 hover:text-slate-600"
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
            {filteredCommerces.map((c) => (
              <div
                key={c.id}
                className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 group-hover:bg-black group-hover:text-white transition-colors uppercase">
                    {(c.name || "C")[0]}
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      ID: {c.id}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-8 px-4 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                      c.planType === PlanType.PRO
                        ? "bg-blue-50 text-blue-600 border-blue-100"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    {c.planType}
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <button
                    onClick={() => setNotifCommerce(c)}
                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Notificar"
                  >
                    <Bell size={16} />
                  </button>
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
        <div className="grid gap-2 animate-in fade-in">
          {subscriptions.length === 0 ? (
            <div className="bg-white px-6 py-8 rounded-xl border border-slate-100 text-slate-400 text-xs font-bold">
              No hay datos de facturación (o la tabla subscriptions no está accesible).
            </div>
          ) : (
            subscriptions.map((sub: any) => {
              const commerce = commerces.find((c) => c.id === sub.commerceId);
              return (
                <div
                  key={sub.id}
                  className="bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                        (sub.status || "") === "active"
                          ? "bg-green-50 text-green-500 border-green-100"
                          : "bg-red-50 text-red-500 border-red-100"
                      }`}
                    >
                      <CreditCard size={14} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate leading-none">
                        {commerce?.name || sub.commerceId}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                        Vence{" "}
                        {sub.nextBillingDate
                          ? new Date(sub.nextBillingDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => alert("Cobro pendiente: lo conectamos a MercadoPago después")}
                      className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                      Cobrar
                    </button>
                    <button
                      onClick={() => commerce && setNotifCommerce(commerce)}
                      className="p-2 text-slate-300 hover:text-slate-600"
                      title="Mensaje"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL CREAR */}
      {showModal && activeTab === "commerces" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-black tracking-tight">Nuevo Comercio</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-black"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nombre Comercial
                </label>
                <input
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-black transition-all"
                  placeholder="Ej: Café Central"
                  value={newCommerce.name}
                  onChange={(e) => setNewCommerce({ ...newCommerce, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Plan Inicial
                  </label>
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
                    Límite Mensual
                  </label>
                  <input
                    type="number"
                    disabled={newCommerce.planType === PlanType.PRO}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold disabled:opacity-20"
                    value={newCommerce.planType === PlanType.PRO ? "" : newCommerce.monthlyScanLimit}
                    onChange={(e) =>
                      setNewCommerce({ ...newCommerce, monthlyScanLimit: parseInt(e.target.value) || 0 })
                    }
                    placeholder={newCommerce.planType === PlanType.PRO ? "Ilimitado" : "Ej: 100"}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Precio inicial ($)
                </label>
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
              disabled={isCreating || !newCommerce.name}
              className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl text-xs hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isCreating ? "CREANDO..." : "CREAR REGISTRO"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteCommerce && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-rose-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-sm rounded-[32px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 border border-rose-100">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <ShieldAlert size={28} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 leading-tight">¿Eliminar negocio?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Borrarías a <b>{deleteCommerce.name}</b>. (Para borrado real te creo el endpoint serverless)
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteCommerce}
                disabled={isDeleting}
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{" "}
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
          </div>
        </div>
      )}

      {/* MODAL NOTIF */}
      {notifCommerce && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Bell size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Mensaje Directo</h3>
              </div>
              <button onClick={() => setNotifCommerce(null)} className="text-slate-300 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Asunto
                </label>
                <input
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-blue-600 transition-all"
                  placeholder="Ej: Renovación necesaria"
                  value={notifData.title}
                  onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Mensaje
                </label>
                <textarea
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium text-slate-600 h-32 resize-none focus:border-blue-600 transition-all"
                  placeholder="Escribe el aviso..."
                  value={notifData.message}
                  onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                />
              </div>
            </div>

            <button
              onClick={handleSendNotification}
              disabled={sendingNotif || !notifData.title || !notifData.message}
              className="w-full py-4 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
            >
              {sendingNotif ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}{" "}
              {sendingNotif ? "ENVIANDO..." : "ENVIAR AHORA"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
