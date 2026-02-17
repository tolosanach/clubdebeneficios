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
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "../../services/auth";
import { supabase } from "../../services/supabase";

type RewardType = "POINTS" | "STARS";

type CommerceRow = {
  id: string;
  name: string | null;
  enable_points: boolean | null;
  enable_stars: boolean | null;
  enable_coupon: boolean | null;
  discount_percent: number | null;
  discount_expiration_days: number | null;
};

type RewardRow = {
  id: string;
  commerce_id: string;
  name: string | null;
  description: string | null;
  reward_type: RewardType;
  points_threshold: number | null;
  stars_threshold: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const Toggle: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, disabled, onChange }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "w-12 h-7 rounded-full px-1 flex items-center transition-all",
        checked ? "bg-black justify-end" : "bg-slate-300 justify-start",
        disabled ? "opacity-40 cursor-not-allowed" : "active:scale-95",
      ].join(" ")}
      aria-pressed={checked}
    >
      <div className="w-5 h-5 bg-white rounded-full shadow" />
    </button>
  );
};

const RewardCard: React.FC<{
  reward: RewardRow;
  activeProgram: RewardType;
  onEdit: (r: RewardRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (r: RewardRow, next: boolean) => void;
}> = ({ reward, activeProgram, onEdit, onDelete, onToggleActive }) => {
  const wrongProgram = reward.reward_type !== activeProgram;

  const iconWrap =
    reward.reward_type === "STARS"
      ? "bg-yellow-50 text-yellow-600"
      : "bg-indigo-50 text-indigo-600";

  const Icon = reward.reward_type === "STARS" ? Star : Gift;

  const threshold =
    reward.reward_type === "STARS"
      ? reward.stars_threshold ?? 0
      : reward.points_threshold ?? 0;

  const label = reward.reward_type === "STARS" ? "Estrellas" : "Puntos";
  const unit = reward.reward_type === "STARS" ? "Sellos" : "Pts";

  const effectiveActive = reward.is_active && !wrongProgram;

  return (
    <div className="bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all hover:border-slate-300">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl ${iconWrap}`}>
            <Icon size={24} />
          </div>

          <div className="flex gap-1 items-center">
            {/* Toggle */}
            <Toggle
              checked={effectiveActive}
              disabled={wrongProgram}
              onChange={(v) => onToggleActive(reward, v)}
            />

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
            <h3 className="font-black text-lg text-slate-900 leading-tight">
              {reward.name || "Sin nombre"}
            </h3>
            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-100">
              {label}
            </span>

            {wrongProgram && (
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1">
                <AlertTriangle size={10} />
                Bloqueado por config
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium italic">
            {reward.description || "Sin descripción"}
          </p>
        </div>

        <div className="flex items-end gap-1 pt-4 border-t border-slate-50">
          <span className="text-2xl font-black text-slate-900 leading-none">
            {threshold}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
};

const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [commerce, setCommerce] = useState<CommerceRow | null>(null);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    threshold: "",
  });

  const commerceId = user?.commerceId || "";

  // Programa activo según configuración
  const activeProgram: RewardType = useMemo(() => {
    if (!commerce) return "POINTS";
    if (commerce.enable_stars) return "STARS";
    return "POINTS";
  }, [commerce]);

  const fetchCommerce = async () => {
    if (!commerceId) return;
    const { data, error } = await supabase
      .from("commerces")
      .select(
        "id,name,enable_points,enable_stars,enable_coupon,discount_percent,discount_expiration_days"
      )
      .eq("id", commerceId)
      .maybeSingle();

    if (error) throw error;
    setCommerce((data as CommerceRow) || null);
  };

  const fetchRewards = async () => {
    if (!commerceId) return;
    const { data, error } = await supabase
      .from("rewards")
      .select(
        "id,commerce_id,name,description,reward_type,points_threshold,stars_threshold,is_active,created_at,updated_at"
      )
      .eq("commerce_id", commerceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setRewards((data as RewardRow[]) || []);
  };

  // Auto-apagar en DB los premios que no corresponden al programa activo
  const syncRewardsWithConfig = async (program: RewardType) => {
    if (!commerceId) return;

    // apaga los que están activos pero son de otro tipo
    await supabase
      .from("rewards")
      .update({ is_active: false })
      .eq("commerce_id", commerceId)
      .eq("is_active", true)
      .neq("reward_type", program);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await fetchCommerce();
      } catch (e) {
        console.error("Commerce load error:", e);
      } finally {
        setLoading(false);
      }
    };
    if (commerceId) run();
  }, [commerceId]);

  // Cuando ya tenemos commerce -> sincronizamos y traemos rewards
  useEffect(() => {
    const run = async () => {
      if (!commerceId || !commerce) return;
      try {
        setLoading(true);
        await syncRewardsWithConfig(activeProgram);
        await fetchRewards();
      } catch (e) {
        console.error("Rewards load error:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerce?.id, commerce?.enable_stars, commerce?.enable_points]);

  const handleOpenModal = (reward?: RewardRow) => {
    if (reward) {
      setEditingReward(reward);

      const threshold =
        reward.reward_type === "STARS"
          ? reward.stars_threshold ?? ""
          : reward.points_threshold ?? "";

      setFormData({
        name: reward.name || "",
        description: reward.description || "",
        threshold: String(threshold),
      });
    } else {
      setEditingReward(null);
      setFormData({ name: "", description: "", threshold: "" });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!commerceId) return;
    if (!formData.name.trim() || !formData.threshold) return;

    const thresholdNum = parseInt(formData.threshold, 10);
    if (Number.isNaN(thresholdNum) || thresholdNum <= 0) return;

    setSaving(true);
    try {
      if (editingReward) {
        // Mantener el tipo original del reward (no lo “pises” con programMode)
        const payload: Partial<RewardRow> =
          editingReward.reward_type === "STARS"
            ? {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                stars_threshold: thresholdNum,
                points_threshold: null,
              }
            : {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                points_threshold: thresholdNum,
                stars_threshold: null,
              };

        const { error } = await supabase
          .from("rewards")
          .update(payload)
          .eq("id", editingReward.id)
          .eq("commerce_id", commerceId);

        if (error) throw error;
      } else {
        // Crear siempre del programa activo actual
        const insertPayload: Partial<RewardRow> =
          activeProgram === "STARS"
            ? {
                id: crypto.randomUUID(),
                commerce_id: commerceId,
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                reward_type: "STARS",
                stars_threshold: thresholdNum,
                points_threshold: null,
                is_active: true,
              }
            : {
                id: crypto.randomUUID(),
                commerce_id: commerceId,
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                reward_type: "POINTS",
                points_threshold: thresholdNum,
                stars_threshold: null,
                is_active: true,
              };

        const { error } = await supabase.from("rewards").insert(insertPayload);
        if (error) throw error;
      }

      await syncRewardsWithConfig(activeProgram);
      await fetchRewards();
      setShowModal(false);
    } catch (e) {
      console.error("Save reward error:", e);
      alert("No se pudo guardar el premio. Mirá la consola para el detalle.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!commerceId) return;
    if (!window.confirm("¿Eliminar este premio definitivamente?")) return;

    try {
      const { error } = await supabase
        .from("rewards")
        .delete()
        .eq("id", id)
        .eq("commerce_id", commerceId);

      if (error) throw error;
      await fetchRewards();
    } catch (e) {
      console.error("Delete reward error:", e);
      alert("No se pudo eliminar. Mirá la consola.");
    }
  };

  const handleToggleActive = async (reward: RewardRow, next: boolean) => {
    if (!commerceId) return;

    // Bloqueo si no coincide con el programa activo
    if (reward.reward_type !== activeProgram) {
      alert(
        `Este premio es de ${reward.reward_type} pero tu configuración activa es ${activeProgram}. Cambiá la configuración o creá premios del programa correcto.`
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("rewards")
        .update({ is_active: next })
        .eq("id", reward.id)
        .eq("commerce_id", commerceId);

      if (error) throw error;
      await fetchRewards();
    } catch (e) {
      console.error("Toggle active error:", e);
      alert("No se pudo actualizar el estado. Mirá la consola.");
    }
  };

  if (!commerceId) {
    return (
      <div className="p-6 text-slate-500">
        No hay commerceId. Iniciá sesión como comercio.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Inventario de Beneficios
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            Programa activo:{" "}
            <span className="text-slate-700">
              {activeProgram === "STARS" ? "Estrellas" : "Puntos"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/commerce/settings")}
            className="bg-white border text-slate-700 px-4 py-4 rounded-2xl font-black shadow-sm text-[11px] uppercase tracking-widest flex items-center gap-2"
            title="Ir a configuración"
          >
            <Settings size={18} />
            Configuración
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl text-[11px] uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Premio
          </button>
        </div>
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            activeProgram={activeProgram}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {/* Modal */}
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

            {/* Aviso si editás uno de otro programa */}
            {editingReward && editingReward.reward_type !== activeProgram && (
              <div className="mb-6 p-4 rounded-2xl border bg-amber-50 border-amber-100 text-amber-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                Este premio es {editingReward.reward_type} pero tu programa activo es{" "}
                {activeProgram}. Podés editarlo, pero no lo vas a poder activar mientras
                la configuración siga así.
              </div>
            )}

            <div className="space-y-6">
              {/* Programa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Programa
                </label>

                {!editingReward ? (
                  activeProgram === "POINTS" ? (
                    <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-indigo-600 bg-indigo-50 text-indigo-600">
                      <Zap size={20} />
                      <span className="text-[10px] font-black uppercase">Puntos</span>
                    </div>
                  ) : (
                    <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-yellow-600 bg-yellow-50 text-yellow-600">
                      <Star size={20} />
                      <span className="text-[10px] font-black uppercase">
                        Estrellas
                      </span>
                    </div>
                  )
                ) : (
                  editingReward.reward_type === "POINTS" ? (
                    <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-indigo-600 bg-indigo-50 text-indigo-600">
                      <Zap size={20} />
                      <span className="text-[10px] font-black uppercase">Puntos</span>
                    </div>
                  ) : (
                    <div className="py-4 rounded-2xl border-2 flex flex-col items-center gap-2 border-yellow-600 bg-yellow-50 text-yellow-600">
                      <Star size={20} />
                      <span className="text-[10px] font-black uppercase">
                        Estrellas
                      </span>
                    </div>
                  )
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Requisito (
                  {(editingReward?.reward_type || activeProgram) === "STARS"
                    ? "Estrellas"
                    : "Puntos"}
                  )
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
                  className="w-full h-12 px-5 bg-slate-50 border rounded-2xl font-medium"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.threshold}
                className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-20"
              >
                {saving ? (
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
