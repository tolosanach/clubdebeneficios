// pages/commerce/RewardsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Gift,
  X,
  Star,
  Zap,
  Loader2,
  Settings,
} from "lucide-react";
import { db } from "../../services/db";
import { useAuth } from "../../services/auth";
import { Commerce } from "../../types";

/**
 * ✅ Tipos reales según tu tabla public.rewards (Supabase)
 * columnas snake_case:
 * id, commerce_id, name, description, reward_type, points_threshold, stars_threshold, is_active, created_at, updated_at
 */
type RewardType = "POINTS" | "STARS";

type RewardRow = {
  id: string;
  commerce_id: string;
  name: string;
  description: string | null;
  reward_type: RewardType;
  points_threshold: number | null;
  stars_threshold: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

function getRowRewardType(row: any): RewardType {
  // por si db te devuelve camelCase en algún entorno viejo: fallback
  return (row.reward_type ?? row.rewardType ?? "POINTS") as RewardType;
}
function getRowCommerceId(row: any): string {
  return (row.commerce_id ?? row.commerceId ?? "") as string;
}
function getRowIsActive(row: any): boolean {
  const v = row.is_active ?? row.isActive ?? row.active;
  return Boolean(v);
}
function getPointsThreshold(row: any): number | null {
  const v = row.points_threshold ?? row.pointsThreshold;
  return v === undefined || v === null ? null : Number(v);
}
function getStarsThreshold(row: any): number | null {
  const v = row.stars_threshold ?? row.starsThreshold;
  return v === undefined || v === null ? null : Number(v);
}

const Toggle: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}> = ({ checked, disabled, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`w-12 h-7 rounded-full px-1 flex items-center transition-all ${
        disabled
          ? "bg-slate-100 cursor-not-allowed opacity-60"
          : checked
          ? "bg-black justify-end"
          : "bg-slate-300 justify-start"
      }`}
      aria-label="Activar / desactivar"
    >
      <div className="w-5 h-5 bg-white rounded-full" />
    </button>
  );
};

const RewardCard: React.FC<{
  row: RewardRow;
  programMode: RewardType;
  onEdit: (r: RewardRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, next: boolean) => void;
}> = ({ row, programMode, onEdit, onDelete, onToggleActive }) => {
  const navigate = useNavigate();

  const type = row.reward_type;
  const isCompatible = type === programMode;
  const iconWrap =
    type === "STARS"
      ? "bg-yellow-50 text-yellow-600"
      : "bg-indigo-50 text-indigo-600";

  const icon = type === "STARS" ? <Star size={24} /> : <Gift size={24} />;

  const value =
    type === "STARS" ? row.stars_threshold ?? 0 : row.points_threshold ?? 0;

  return (
    <div className="bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all group hover:border-slate-300">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl ${iconWrap}`}>{icon}</div>

          <div className="flex items-center gap-2">
            {/* ✅ Toggle activo/inactivo */}
            <Toggle
              checked={row.is_active}
              disabled={!isCompatible}
              onChange={(next) => onToggleActive(row.id, next)}
            />

            <button
              onClick={() => onEdit(row)}
              className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(row.id)}
              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-lg text-slate-900 leading-tight">
              {row.name}
            </h3>

            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-100">
              {type === "STARS" ? "Estrellas" : "Puntos"}
            </span>

            {!isCompatible && (
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-rose-50 text-rose-600 border-rose-100">
                Bloqueado por config
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 font-medium italic">
            {row.description || "Sin descripción"}
          </p>
        </div>

        <div className="flex items-end gap-1 pt-4 border-t border-slate-50">
          <span className="text-2xl font-black text-slate-900 leading-none">
            {value}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">
            {type === "STARS" ? "Sellos" : "Pts"}
          </span>
        </div>

        {!isCompatible && (
          <button
            onClick={() => navigate("/commerce/settings")}
            className="w-full py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <Settings size={14} />
            Ver configuración
          </button>
        )}
      </div>
    </div>
  );
};

const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RewardRow | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    threshold: "",
  });

  // ✅ Programa activo según commerce (tu SettingsPage maneja enable_points / enable_stars / enable_coupon)
  const programMode: RewardType = useMemo(() => {
    if (!commerce) return "POINTS";
    if ((commerce as any).enable_stars) return "STARS";
    return "POINTS";
  }, [commerce]);

  const effectiveCommerceId = useMemo(() => {
    // por tu mapeo histórico
    const raw = (user as any)?.commerceId || "";
    return raw === "commerce-cafe-id" ? "commerce-1" : raw;
  }, [user]);

  const loadAll = () => {
    if (!effectiveCommerceId) return;

    // comercio
    const c = db.getById<Commerce>("commerces", effectiveCommerceId) || null;
    setCommerce(c);

    // rewards
    const all = db.getAll<any>("rewards") || [];
    const normalized: RewardRow[] = all
      .map((r: any) => {
        const reward_type = getRowRewardType(r);
        const commerce_id = getRowCommerceId(r);
        return {
          id: String(r.id),
          commerce_id,
          name: String(r.name ?? ""),
          description: r.description ?? null,
          reward_type,
          points_threshold: getPointsThreshold(r),
          stars_threshold: getStarsThreshold(r),
          is_active: getRowIsActive(r),
          created_at: r.created_at,
          updated_at: r.updated_at,
        } as RewardRow;
      })
      .filter((r: RewardRow) => r.commerce_id === effectiveCommerceId);

    setRows(normalized);
  };

  useEffect(() => {
    if (!effectiveCommerceId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCommerceId]);

  // ✅ Cuando cambia el modo (por configuración), apagamos automáticamente los premios incompatibles
  useEffect(() => {
    if (!effectiveCommerceId) return;
    if (rows.length === 0) return;

    const toDisable = rows.filter(
      (r) => r.reward_type !== programMode && r.is_active
    );
    if (toDisable.length === 0) return;

    toDisable.forEach((r) => {
      // importante: usamos RewardRow para que TS permita is_active
      db.update<RewardRow>("rewards", r.id, { is_active: false });
    });

    // reflejar en UI
    setRows((prev) =>
      prev.map((r) =>
        r.reward_type !== programMode ? { ...r, is_active: false } : r
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programMode]);

  const openModal = (reward?: RewardRow) => {
    if (reward) {
      setEditing(reward);
      const threshold =
        reward.reward_type === "STARS"
          ? reward.stars_threshold ?? ""
          : reward.points_threshold ?? "";
      setForm({
        name: reward.name || "",
        description: reward.description || "",
        threshold: String(threshold),
      });
    } else {
      setEditing(null);
      setForm({ name: "", description: "", threshold: "" });
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!effectiveCommerceId) return;
    if (!form.name || !form.threshold) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 250));

    const thresholdNum = Number(form.threshold);

    const payload: Partial<RewardRow> = {
      commerce_id: effectiveCommerceId,
      name: form.name,
      description: form.description || null,
      reward_type: programMode,
      is_active: true, // por defecto activo si coincide el modo
      points_threshold: programMode === "POINTS" ? thresholdNum : null,
      stars_threshold: programMode === "STARS" ? thresholdNum : null,
    };

    if (editing) {
      db.update<RewardRow>("rewards", editing.id, payload);
    } else {
      db.insert<RewardRow>("rewards", {
        id: crypto.randomUUID(),
        ...(payload as RewardRow),
      });
    }

    setLoading(false);
    setShowModal(false);
    loadAll();
  };

  const remove = (id: string) => {
    if (window.confirm("¿Eliminar este premio definitivamente?")) {
      db.delete("rewards", id);
      loadAll();
    }
  };

  const toggleActive = (id: string, next: boolean) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;

    // bloqueo duro si no coincide con programMode
    if (r.reward_type !== programMode) return;

    db.update<RewardRow>("rewards", id, { is_active: next });
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, is_active: next } : x)));
  };

  if (!commerce) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white border rounded-[32px] p-8 text-slate-400">
          No se encontró el comercio (commerceId vacío o inexistente).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Inventario de Beneficios
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">
            Programa activo: {programMode === "STARS" ? "Estrellas" : "Puntos"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/commerce/settings")}
            className="bg-white border px-6 py-4 rounded-2xl font-black shadow-sm text-[11px] uppercase tracking-widest flex items-center gap-2"
          >
            <Settings size={18} /> Configuración
          </button>

          <button
            onClick={() => openModal()}
            className="bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl text-[11px] uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Premio
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border rounded-[32px] p-10 text-center text-slate-400">
          Todavía no tenés premios cargados para este comercio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((r) => (
            <RewardCard
              key={r.id}
              row={r}
              programMode={programMode}
              onEdit={openModal}
              onDelete={remove}
              onToggleActive={toggleActive}
            />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 border">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                {editing ? "Editar Premio" : "Nuevo Premio"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-black"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Programa activo (bloqueado) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Programa
                </label>

                {programMode === "POINTS" ? (
                  <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-indigo-600 bg-indigo-50 text-indigo-600">
                    <Zap size={20} />
                    <span className="text-[10px] font-black uppercase">
                      Puntos
                    </span>
                  </div>
                ) : (
                  <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-yellow-600 bg-yellow-50 text-yellow-600">
                    <Star size={20} />
                    <span className="text-[10px] font-black uppercase">
                      Estrellas
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nombre del Premio
                </label>
                <input
                  type="text"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-bold"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Requisito ({programMode === "STARS" ? "Estrellas" : "Puntos"})
                </label>
                <input
                  type="number"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-black text-xl"
                  value={form.threshold}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, threshold: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-bold"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>

              <button
                onClick={save}
                disabled={loading || !form.name || !form.threshold}
                className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-20"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                Guardar Premio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardsPage;
