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

import { useAuth } from "../../services/auth";
import { supabase } from "../../services/supabase";

// ===== Tipos según tu tabla public.rewards (snake_case) =====
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

type CommerceRow = {
  id: string;
  name: string | null;
  enable_points: boolean | null;
  enable_stars: boolean | null;
  enable_coupon: boolean | null;
};

const Switch: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}> = ({ checked, disabled, onChange }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full px-1 flex items-center transition-all ${
        disabled
          ? "bg-slate-200 opacity-50 cursor-not-allowed"
          : checked
          ? "bg-black justify-end"
          : "bg-slate-300 justify-start"
      }`}
      aria-pressed={checked}
    >
      <div className="w-5 h-5 bg-white rounded-full shadow" />
    </button>
  );
};

const RewardCard: React.FC<{
  reward: RewardRow;
  allowedType: RewardType | null;
  onToggleActive: (reward: RewardRow, next: boolean) => void;
  onEdit: (r: RewardRow) => void;
  onDelete: (id: string) => void;
}> = ({ reward, allowedType, onToggleActive, onEdit, onDelete }) => {
  const isTypeAllowed = allowedType ? reward.reward_type === allowedType : false;
  const disabledByConfig = allowedType ? !isTypeAllowed : true;

  const threshold =
    reward.reward_type === "STARS" ? reward.stars_threshold : reward.points_threshold;

  return (
    <div className="bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all group hover:border-slate-300">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div
            className={`p-3 rounded-2xl ${
              reward.reward_type === "STARS"
                ? "bg-yellow-50 text-yellow-600"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            {reward.reward_type === "STARS" ? <Star size={24} /> : <Gift size={24} />}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={!!reward.is_active}
              disabled={disabledByConfig}
              onChange={(next) => onToggleActive(reward, next)}
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
              {reward.name}
            </h3>

            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-100">
              {reward.reward_type === "STARS" ? "Estrellas" : "Puntos"}
            </span>

            {!allowedType && (
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-100">
                Sin programa activo
              </span>
            )}

            {allowedType && reward.reward_type !== allowedType && (
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-100">
                Bloqueado por Config
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
      </div>
    </div>
  );
};

const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [commerce, setCommerce] = useState<CommerceRow | null>(null);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    threshold: "",
  });

  // ✅ MISMO MAPEO que usabas antes (si aún lo necesitás)
  const effectiveCommerceId = useMemo(() => {
    const raw = user?.commerceId || "";
    return raw === "commerce-cafe-id" ? "commerce-1" : raw;
  }, [user?.commerceId]);

  // Programa permitido según Configuración
  const allowedType: RewardType | null = useMemo(() => {
    if (!commerce) return null;
    if (commerce.enable_stars) return "STARS";
    if (commerce.enable_points) return "POINTS";
    return null;
  }, [commerce]);

  const loadAll = async () => {
    if (!effectiveCommerceId) return;

    setLoadingList(true);

    // 1) Comercio
    const { data: cData, error: cErr } = await supabase
      .from("commerces")
      .select("id,name,enable_points,enable_stars,enable_coupon")
      .eq("id", effectiveCommerceId)
      .maybeSingle();

    if (cErr) {
      console.error("Commerce load error:", cErr);
      setCommerce(null);
      setRewards([]);
      setLoadingList(false);
      return;
    }

    setCommerce((cData as CommerceRow) || null);

    // 2) Rewards
    const { data: rData, error: rErr } = await supabase
      .from("rewards")
      .select("id,commerce_id,name,description,reward_type,points_threshold,stars_threshold,is_active,created_at,updated_at")
      .eq("commerce_id", effectiveCommerceId)
      .order("created_at", { ascending: false });

    if (rErr) {
      console.error("Rewards load error:", rErr);
      setRewards([]);
      setLoadingList(false);
      return;
    }

    setRewards((rData as RewardRow[]) || []);
    setLoadingList(false);
  };

  useEffect(() => {
    if (!effectiveCommerceId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCommerceId]);

  // Si la config cambia y hay premios “fuera de programa”, los apagamos visualmente (y opcionalmente en DB)
  const normalizeByConfig = async (type: RewardType | null, list: RewardRow[]) => {
    if (!type) return;

    const toDisable = list.filter((r) => r.reward_type !== type && r.is_active);
    if (toDisable.length === 0) return;

    // Apaga en DB los que no corresponden al modo actual
    const ids = toDisable.map((r) => r.id);

    const { error } = await supabase
      .from("rewards")
      .update({ is_active: false })
      .in("id", ids);

    if (error) {
      console.error("Normalize rewards error:", error);
      return;
    }

    setRewards((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, is_active: false } : r))
    );
  };

  useEffect(() => {
    // Cuando ya cargó todo y cambia allowedType, normalizamos
    if (!allowedType) return;
    if (rewards.length === 0) return;
    normalizeByConfig(allowedType, rewards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedType]);

  const handleOpenModal = (reward?: RewardRow) => {
    if (!allowedType) {
      alert("Primero activá Puntos o Estrellas en Configuración.");
      return;
    }

    if (reward) {
      setEditingReward(reward);
      const t =
        reward.reward_type === "STARS"
          ? reward.stars_threshold
          : reward.points_threshold;

      setFormData({
        name: reward.name,
        description: reward.description || "",
        threshold: (t ?? "").toString(),
      });
    } else {
      setEditingReward(null);
      setFormData({ name: "", description: "", threshold: "" });
    }

    setShowModal(true);
  };

  const handleSave = async () => {
    if (!effectiveCommerceId) return;
    if (!allowedType) {
      alert("Primero activá Puntos o Estrellas en Configuración.");
      return;
    }
    if (!formData.name.trim() || !formData.threshold.trim()) return;

    const thresholdNumber = parseInt(formData.threshold, 10);
    if (Number.isNaN(thresholdNumber) || thresholdNumber <= 0) {
      alert("El requisito debe ser un número mayor a 0.");
      return;
    }

    setSaving(true);

    const payload: Partial<RewardRow> = {
      commerce_id: effectiveCommerceId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      reward_type: allowedType,
      is_active: true, // por defecto lo dejamos activo al guardar
      points_threshold: allowedType === "POINTS" ? thresholdNumber : null,
      stars_threshold: allowedType === "STARS" ? thresholdNumber : null,
    };

    if (editingReward) {
      // Si el reward era de otro tipo (no debería, pero por las dudas), lo reescribimos al tipo permitido
      const { error } = await supabase
        .from("rewards")
        .update(payload)
        .eq("id", editingReward.id);

      if (error) {
        console.error("Update reward error:", error);
        alert("No se pudo guardar el premio.");
        setSaving(false);
        return;
      }
    } else {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`;

      const { error } = await supabase
        .from("rewards")
        .insert([{ id, ...(payload as RewardRow) }]);

      if (error) {
        console.error("Insert reward error:", error);
        alert("No se pudo crear el premio.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    await loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este premio definitivamente?")) return;

    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) {
      console.error("Delete reward error:", error);
      alert("No se pudo eliminar.");
      return;
    }

    setRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleActive = async (reward: RewardRow, next: boolean) => {
    if (!allowedType) return;

    // Bloqueo por tipo
    if (reward.reward_type !== allowedType) return;

    // Optimista
    setRewards((prev) =>
      prev.map((r) => (r.id === reward.id ? { ...r, is_active: next } : r))
    );

    const { error } = await supabase
      .from("rewards")
      .update({ is_active: next })
      .eq("id", reward.id);

    if (error) {
      console.error("Toggle active error:", error);
      // rollback
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, is_active: !next } : r))
      );
      alert("No se pudo cambiar el estado.");
    }
  };

  if (!effectiveCommerceId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center text-slate-400">
          No se encontró el commerceId del usuario.
        </div>
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

          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest">
            <span>
              Programa activo:{" "}
              <b className="text-slate-700">
                {allowedType ? (allowedType === "STARS" ? "Estrellas" : "Puntos") : "Ninguno"}
              </b>
            </span>
            <span className="text-slate-200">•</span>
            <button
              onClick={() => navigate("/commerce/settings")}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-black transition-colors"
              title="Ir a Configuración"
            >
              <Settings size={14} />
              Configuración
            </button>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl text-[11px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-30"
          disabled={!allowedType}
        >
          <Plus size={18} /> Nuevo Premio
        </button>
      </div>

      {loadingList ? (
        <div className="flex items-center justify-center py-14 text-slate-400 gap-2">
          <Loader2 className="animate-spin" size={18} />
          Cargando premios…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              allowedType={allowedType}
              onToggleActive={handleToggleActive}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
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
              {/* Programa activo */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Programa activo (según Configuración)
                </label>

                {allowedType === "POINTS" ? (
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
                  Requisito ({allowedType === "STARS" ? "Estrellas" : "Puntos"})
                </label>
                <input
                  type="number"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-black text-xl"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  className="w-full h-14 px-5 bg-slate-50 border rounded-2xl font-medium"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.threshold.trim()}
                className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-20"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
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
