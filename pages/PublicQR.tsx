import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { Customer, Commerce } from '../types';
import { Gift, QrCode, AlertCircle } from 'lucide-react';

const PublicQR: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Leemos customer desde Supabase por qr_token (token de la URL)
  useEffect(() => {
    (async () => {
      if (!token) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('qr_token', token)
        .single();

      if (error || !data) {
        console.log('PublicQR supabase error:', error);
        setCustomer(null);
        setLoading(false);
        return;
      }

      // Mapear columnas snake_case (DB) -> camelCase (types.ts)
      const mapped: Customer = {
        id: data.id,
        commerceId: data.commerce_id,
        name: data.name,
        phone: data.phone ?? '',
        email: data.email ?? '',
        qrToken: data.qr_token,
        totalPoints: data.total_points ?? 0,
        currentStars: data.current_stars ?? 0,
        totalStars: data.total_stars ?? 0,
        discountAvailable: data.discount_available ?? false,
        discountExpiresAt: data.discount_expires_at ?? undefined,
        createdAt: data.created_at ?? new Date().toISOString(),
      };

      setCustomer(mapped);
      setLoading(false);
    })();
  }, [token]);

  // Por ahora el comercio y recompensas siguen “local” (db.ts) para no migrar todo de golpe
  const commerce = useMemo(() => {
    return customer ? db.getById<Commerce>('commerces', customer.commerceId) : null;
  }, [customer]);

  const rewards = useMemo(() => {
    return commerce ? db.getRewardsByCommerce(commerce.id) : [];
  }, [commerce]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center space-y-3">
          <div className="text-slate-400 font-black tracking-widest uppercase text-xs">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="text-red-500 mx-auto" />
          <h1 className="text-xl font-bold">Código no válido</h1>
          <p className="text-slate-500">El link que utilizaste no es correcto o el cliente no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-12 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center pt-8 space-y-3">
          {commerce?.logoUrl ? (
            <img
              src={commerce.logoUrl}
              alt="Logo"
              className="w-20 h-20 rounded-[24px] mx-auto border shadow-sm object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-600 text-white rounded-[20px] mx-auto flex items-center justify-center font-black text-2xl shadow-lg">
              {commerce?.name?.[0] ?? 'C'}
            </div>
          )}
          <div>
            <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
              Club de Beneficios
            </h2>
            <h1 className="text-2xl font-black text-slate-900">{commerce?.name || 'Tu Comercio'}</h1>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200 text-center space-y-6 border border-slate-100">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900">{customer.name}</h2>
            <p className="text-sm font-bold text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-full">
              {customer.totalPoints} puntos acumulados
            </p>
          </div>

          <div className="flex justify-center p-6 bg-white border-4 border-slate-50 rounded-[32px]">
            <QRCodeSVG value={customer.qrToken} size={240} level="H" includeMargin={false} />
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400">
            <QrCode size={18} />
            <p className="text-xs font-bold uppercase tracking-widest">Presentá este código en el mostrador</p>
          </div>
        </div>

        {rewards.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Gift size={20} className="text-blue-600" />
              Tus Próximos Premios
            </h3>
            <div className="space-y-3">
              {rewards.map((reward) => {
                const isUnlocked = customer.totalPoints >= reward.pointsThreshold;
                const progress = Math.min(100, (customer.totalPoints / reward.pointsThreshold) * 100);

                return (
                  <div key={reward.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800">{reward.name}</h4>
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                          isUnlocked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {reward.pointsThreshold} pts
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          isUnlocked ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-blue-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-right text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-wider">
                      {isUnlocked ? '¡Ya podés canjearlo!' : `Faltan ${reward.pointsThreshold - customer.totalPoints} pts`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicQR;
