// pages/commerce/CustomersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, MessageCircle, QrCode, X, FileSpreadsheet } from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { safeUUID as makeId, shortToken as makeToken } from '../../services/id';
import { supabase } from '../../services/supabase';
import { Commerce, Customer } from '../../types';

type UiCustomer = Customer & {
  summary: {
    lastVisitAt: string | null;
    totalVisits: number;
    totalAmount: number;
  };
};

const CustomersPage: React.FC = () => {
  const { user } = useAuth();

  // Mapeo puntual para tu demo (ajustalo cuando migres todo a Supabase “bien”)
  const effectiveCommerceId = useMemo(() => {
    if (!user?.commerceId) return '';
    return user.commerceId === 'commerce-cafe-id' ? 'commerce-1' : user.commerceId;
  }, [user?.commerceId]);

  const [customers, setCustomers] = useState<UiCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<UiCustomer | null>(null);

  const [isNewModal, setIsNewModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    countryCode: 'AR',
    fullPhone: '',
  });

  // OJO: esto es DB local (demo). Si tus comercios están en Supabase después lo migramos.
  const commerce = useMemo(() => {
    if (!effectiveCommerceId) return null;
    return db.getById<Commerce>('commerces', effectiveCommerceId);
  }, [effectiveCommerceId]);

  const refreshCustomers = async () => {
    try {
      if (!effectiveCommerceId) return;

      console.log('refreshCustomers() called');
      console.log('effectiveCommerceId:', effectiveCommerceId);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('commerce_id', effectiveCommerceId)
        .order('created_at', { ascending: false });

      console.log('CUSTOMERS DATA:', data);
      console.log('CUSTOMERS ERROR:', error);

      if (error) throw error;

      const list: UiCustomer[] = (data ?? []).map((c: any) => ({
        id: c.id,
        commerceId: c.commerce_id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        qrToken: c.qr_token,
        totalPoints: c.total_points ?? 0,
        currentStars: c.current_stars ?? 0,
        totalStars: c.total_stars ?? 0,
        createdAt: c.created_at,
        discountAvailable: c.discount_available ?? false,
        // campos opcionales del type Customer (si existen en tu types.ts no molesta)
        phoneNumber: c.phone_number ?? '',
        countryCode: c.country_code ?? 'AR',
        summary: {
          lastVisitAt: null,
          totalVisits: 0,
          totalAmount: 0,
        },
      }));

      setCustomers(list);
    } catch (e: any) {
      console.error('refreshCustomers crash:', e);
    }
  };

  useEffect(() => {
    refreshCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCommerceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveCommerceId) {
      alert('No se detectó commerceId.');
      return;
    }

    if (!formData.name || !formData.fullPhone || !formData.email) {
      alert('Completá nombre, teléfono y email.');
      return;
    }

    const newCustomer: UiCustomer = {
      id: makeId(),
      commerceId: effectiveCommerceId,
      name: formData.name,
      phone: formData.fullPhone,
      phoneNumber: formData.phoneNumber,
      countryCode: formData.countryCode,
      email: formData.email,
      qrToken: makeToken('CUST'),
      totalPoints: 0,
      currentStars: 0,
      totalStars: 0,
      createdAt: new Date().toISOString(),
      discountAvailable: false,
      summary: { lastVisitAt: null, totalVisits: 0, totalAmount: 0 },
    };

    const { error } = await supabase.from('customers').insert([
      {
        id: newCustomer.id,
        commerce_id: newCustomer.commerceId,
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        qr_token: newCustomer.qrToken,
        total_points: newCustomer.totalPoints,
        current_stars: newCustomer.currentStars,
        total_stars: newCustomer.totalStars,
        discount_available: newCustomer.discountAvailable,
        // created_at: dejalo que lo ponga Supabase (default now())
      },
    ]);

    if (error) {
      alert('Error guardando en Supabase: ' + error.message);
      console.log('Supabase insert error:', error);
      return;
    }

    setFormData({ name: '', email: '', phoneNumber: '', countryCode: 'AR', fullPhone: '' });
    setIsNewModal(false);

    setSelectedCustomer(newCustomer);
    setShowDetailModal(true);

    await refreshCustomers();
  };

  const getWhatsAppLink = (customer: UiCustomer) => {
    const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const publicUrl = `${baseUrl}/#/q/${customer.qrToken}`;

    const message =
      `Hola ${customer.name}! 🎁\n` +
      `Ya sos parte del Club.\n\n` +
      `Podés ver tus puntos y premios acá:\n` +
      `${publicUrl}`;

    return `https://wa.me/${String(customer.phone).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const exportToCSV = () => {
    if (!customers.length) return;

    const sortedList = [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const headers = ['Nombre', 'Telefono', 'Puntos', 'Ultima Visita', 'Total Visitas', 'Total Gastado'];

    const rows = sortedList.map((c) => {
      const lastVisit = c.summary.lastVisitAt ? new Date(c.summary.lastVisitAt).toLocaleDateString('es-AR') : '-';
      const totalSpent = (c.summary.totalAmount ?? 0).toFixed(2).replace('.', ',');
      return [
        `"${String(c.name).replace(/"/g, '""')}"`,
        `="${c.phone}"`,
        Math.floor(c.totalPoints ?? 0),
        lastVisit,
        c.summary.totalVisits ?? 0,
        `"${totalSpent}"`,
      ];
    });

    const CSV_SEPARATOR = ';';
    const csvContent = '\uFEFF' + [headers, ...rows].map((e) => e.join(CSV_SEPARATOR)).join('\n');

    const commerceName = (commerce?.name || 'club').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `clientes_${commerceName}_${dateStr}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => (c.name || '').toLowerCase().includes(q) || String(c.phone || '').includes(q)
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Base de Socios</h1>
          <p className="text-sm opacity-70">Gestioná tus clientes y analíticas.</p>
          <p className="text-xs opacity-60 mt-1">
            commerceId efectivo: <span className="font-mono">{effectiveCommerceId || '(vacío)'}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
            title="Exportar CSV"
          >
            <FileSpreadsheet size={16} /> Exportar
          </button>

          <button
            onClick={() => setIsNewModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white"
          >
            <Plus size={16} /> Nuevo Socio
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={16} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-9 pr-3 py-3 rounded-xl border"
        />
      </div>

      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="p-6 rounded-xl border text-sm opacity-70">
            No hay clientes para este comercio. Creá uno con <b>Nuevo Socio</b>.
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCustomer(c);
                setShowDetailModal(true);
              }}
              className="w-full text-left p-4 rounded-xl border hover:bg-black/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs opacity-70">{c.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{Math.floor(c.totalPoints ?? 0)} pts</div>
                  <div className="text-xs opacity-60">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-AR') : ''}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* MODAL NUEVO */}
      {isNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Nuevo Socio</div>
              <button onClick={() => setIsNewModal(false)} className="p-2 rounded-lg hover:bg-black/5">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs opacity-70">Nombre</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="text-xs opacity-70">Email</label>
                <input
                  value={formData.email}
                  onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  placeholder="juan@mail.com"
                />
              </div>

              <div>
                <label className="text-xs opacity-70">Teléfono</label>
                <PhoneInput
                  value={formData.phoneNumber}
                  countryCode={formData.countryCode}
                  onChange={(phoneNumber: string, countryCode: string, fullPhone: string) => {
                    setFormData((s) => ({ ...s, phoneNumber, countryCode, fullPhone }));
                  }}
                />
              </div>

              <button className="w-full px-3 py-2 rounded-lg bg-black text-white">Crear</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Cliente</div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 rounded-lg hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold">{selectedCustomer.name}</div>
              <div className="text-sm opacity-70">{selectedCustomer.phone}</div>
              <div className="text-sm opacity-70">{selectedCustomer.email}</div>
              <div className="text-xs opacity-60 font-mono">id: {selectedCustomer.id}</div>
              <div className="text-xs opacity-60 font-mono">qr: {selectedCustomer.qrToken}</div>
            </div>

            <div className="flex gap-2">
              <a
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border"
                href={getWhatsAppLink(selectedCustomer)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>

              <button
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border"
                onClick={() => alert(`QR Token: ${selectedCustomer.qrToken}`)}
              >
                <QrCode size={16} /> QR
              </button>
            </div>

            <button
              className="w-full px-3 py-2 rounded-lg bg-black text-white"
              onClick={refreshCustomers}
            >
              Refrescar lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
