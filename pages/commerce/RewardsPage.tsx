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
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";

import { db } from "../../services/db";
import { useAuth } from "../../services/auth";
import { Commerce } from "../../types";

/**
 * 👉 Tipos reales como están en Supabase (snake_case)
 * Ajustados a lo que se ve en tu tabla public.rewards
 */
type RewardRow = {
  id: string;
  commerce_id: string;
  name: string;
  description: string | null;
  reward_type: "POINTS" | "STARS";
  points_threshold: number | null;
  stars_threshold: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const RewardCard: React.FC<{
  reward: RewardRow;
  programMode: "POINTS" | "STARS";
  onEdit: (r: RewardRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (r: RewardRow) => void;
}> = ({ reward, programMode, onEdit, onDelete, onToggleActive }) => {
  const isWrongType = reward.reward_type !== programMode;

  const iconWrapClass =
    reward.reward_type === "STARS"
      ? "bg-yellow-50 text-yellow-600"
      : "bg-indigo-50 text-indigo-600";

  const Icon = reward.reward_type === "STARS" ? Star : Gift;

  const threshold =
    reward.reward_type === "STARS" ? reward.stars_threshold : reward.points_threshold;

  return (
    <div className="bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all group hover:border-slate-300">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl ${iconWrapClass}`}>
            <Icon size={24} />
          </div>

          <div className="flex gap-1 items-center">
            {/* Toggle activo/inactivo */}
            <button
              type="button"
              onClick={() => onToggleActive(reward)}
              disabled={isWrongType}
              title={
                isWrongType
                  ? "Este premio no corresponde al programa activo. Se desactiva automáticamente."
                  : reward.is_active
                    ? "Desactivar premio"
                    : "Activar premio"
              }
              className={`p-2 transition-colors ${
                isWrongType ? "text-slate-200 cursor-not-allowed" : "text-slate-300 hover:text-black"
              }`}
            >
              {reward.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>

            <button
              onClick={() => onEdit(reward)}
              className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(reward.id)}
              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-lg text-slate-900 leading-tight">{reward.name}</h3>
            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-100">
              {reward.reward_type === "STARS" ? "Estrellas" : "Puntos"}
            </span>

            {isWrongType && (
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1">
                <AlertTriangle size={12} /> Incompatible
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 font-medium italic">
            {reward.description || "Sin descripción"}
          </p>
        </div>

        <div className="flex items-end gap-1 pt-4 border-t border-slate-50">
          <span className="text-2xl font-black text-slate-900 leading-none">
            {threshold ?? 0}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">
            {reward.reward_type === "STARS" ? "Sellos" : "Pts"}
          </span>
        </div>

        <div className="text-[10px] text-slate-400 font-bold">
          Estado:{" "}
          <span className={reward.is_active ? "text-emerald-600" : "text-slate-400"}>
            {reward.is_active ? "ACTIVO" : "INACTIVO"}
          </span>
        </div>
      </div>
    </div>
  );
};

const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRow | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ mismo mapeo que venías usando en SettingsPage
  const effectiveCommerceId = useMemo(() => {
    const raw = user?.commerceId || "";
    return raw === "commerce-cafe-id" ? "commerce-1" : raw;
  }, [user?.commerceId]);

  // Traer comercio
  useEffect(() => {
    if (!effectiveCommerceId) return;
    const c = db.getById<Commerce>("commerces", effectiveCommerceId) || null;
    setCommerce(c);
  }, [effectiveCommerceId]);

  // Programa activo: si enable_stars => STARS, si no => POINTS
  const programMode = useMemo<"POINTS" | "STARS">(() => {
    if (!commerce) return "POINTS";
    // Ojo: acá usamos snake_case porque tu tabla commerces la tiene así
    // (enable_stars, enable_points).
    // Si tu db adapter ya lo mapea, esto igual funciona porque !!undefined = false.
    // @ts-ignore
    if (commerce.enable_stars) return "STARS";
    return "POINTS";
  }, [commerce]);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    threshold: "",
  });

  const refreshRewards = () => {
    if (!effectiveCommerceId) return;

    const all = db.getAll<RewardRow>("rewards") || [];
    const mine = all.filter((r) => r.commerce_id === effectiveCommerceId);

    setRewards(mine);
  };

  // cargar premios
  useEffect(() => {
    refreshRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCommerceId]);

  // ✅ regla clave: cuando cambia el programa activo, apagar los incompatibles
  useEffect(() => {
    if (!effectiveCommerceId) return;
    // si todavía no cargó rewards, igual no pasa nada
    const current = db.getAll<RewardRow>("rewards") || [];
    const mine = current.filter((r) => r.commerce_id === effectiveCommerceId);

    const incompatible = mine.filter((r) => r.reward_type !== programMode && r.is_active);

    if (incompatible.length === 0) return;

    // apagamos todos los incompatibles
    incompatible.forEach((r) => {
      db.update<RewardRow>("rewards", r.id, { is_active: false });
    });

    refreshRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programMode, effectiveCommerceId]);

  const handleOpenModal = (reward?: RewardRow) => {
    if (reward) {
      setEditingReward(reward);
      const thr =
        reward.reward_type === "STARS"
          ? reward.stars_threshold
          : reward.points_threshold;

      setFormData({
        name: reward.name,
        description: reward.description || "",
        threshold: (thr ?? "").toString(),
      });
    } else {
      setEditingReward(null);
      setFormData({
        name: "",
        description: "",
        threshold: "",
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!effectiveCommerceId) return;
    if (!formData.name || !formData.threshold) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));

    const thresholdNum = parseInt(formData.threshold) || 0;

    const payload: Partial<RewardRow> = {
      commerce_id: effectiveCommerceId,
      name: formData.name,
      description: formData.description?.trim() ? formData.description.trim() : null,
      reward_type: programMode,
      is_active: true, // por defecto lo creamos activo (si es compatible)
      points_threshold: programMode === "POINTS" ? thresholdNum : null,
      stars_threshold: programMode === "STARS" ? thresholdNum : null,
    };

    if (editingReward) {
      db.update<RewardRow>("rewards", editingReward.id, payload);
    } else {
      db.insert<RewardRow>("rewards", {
        id: crypto.randomUUID(),
        ...payload,
      } as RewardRow);
    }

    setLoading(false);
    setShowModal(false);
    refreshRewards();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Eliminar este premio definitivamente?")) {
      db.delete("rewards", id);
      refreshRewards();
    }
  };

  const handleToggleActive = (reward: RewardRow) => {
    // si no corresponde al programa activo, NO se puede activar
    if (reward.reward_type !== programMode) {
      // lo forzamos apagado por seguridad
      if (reward.is_active) {
        db.update<RewardRow>("rewards", reward.id, { is_active: false });
        refreshRewards();
      }
      return;
    }

    db.update<RewardRow>("rewards", reward.id, { is_active: !reward.is_active });
    refreshRewards();
  };

  if (!commerce) return null;

  const hasRewards = rewards.length > 0;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Inventario de Beneficios
          </h1>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Programa activo: {programMode === "STARS" ? "Estrellas" : "Puntos"}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/commerce/settings")}
            className="bg-white border px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:border-slate-300"
          >
            <Settings size={18} /> Configuración
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl text-[11px] uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Premio
          </button>
        </div>
      </div>

      {!hasRewards ? (
        <div className="bg-white border rounded-[32px] p-10 text-center text-slate-400">
          No tenés premios creados todavía para este comercio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              programMode={programMode}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 border">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                {editingReward ? "Editar Premio" : "Nuevo Premio"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-black"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Programa activo (solo informativo) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Programa
                </label>

                {programMode === "POINTS" ? (
                  <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-indigo-600 bg-indigo-50 text-indigo-600">
                    <Zap size={20} />
                    <span className="text-[10px] font-black uppercase">Puntos</span>
                  </div>
                ) : (
                  <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-yellow-600 bg-yellow-50 text-yellow-600">
                    <Star size={20} />
                    <span className="text-[10px] font-black uppercase">Estrellas</span>
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Requisito ({programMode === "STARS" ? "Estrellas" : "Puntos"})
                </label>
                <input
                  type="number"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-black text-xl"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, threshold: e.target.value })
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
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <button
                onClick={handleSave}
                disabled={loading || !formData.name || !formData.threshold}
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
