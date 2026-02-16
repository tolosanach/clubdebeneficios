// TEST PUSH - customerspage
import React, { useState, useEffect } from 'react';
import { Plus, Search, MessageCircle, QrCode, X, FileSpreadsheet } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Customer, Commerce } from '../../types';
import PhoneInput from '../../components/PhoneInput';
import { safeUUID as makeId, shortToken as makeToken } from '../../services/id';
import { supabase } from '../../services/supabase';

const refreshCustomers = async () => {
  try {
    console.log("refreshCustomers() called");
    console.log("effectiveCommerceId:", effectiveCommerceId);
    console.log("user.commerceId:", user?.commerceId);

    if (!effectiveCommerceId) {
      console.warn("No effectiveCommerceId, abort refreshCustomers");
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("commerce_id", effectiveCommerceId) // <-- CLAVE: usar effectiveCommerceId
      .order("created_at", { ascending: false });

    console.log("CUSTOMERS DATA:", data);
    console.log("CUSTOMERS ERROR:", error);

    if (error) throw error;

    setCustomers(data ?? []);
  } catch (e: any) {
    console.error("refreshCustomers crash:", e);
    // opcional: si tenés un estado uiError, setealo acá
    // setUiError(e?.message ?? "Error cargando clientes");
  }
};

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
const effectiveCommerceId =
  user?.commerceId === 'commerce-cafe-id' ? 'commerce-1' : user?.commerceId;

useEffect(() => {
  refreshCustomers();
}, [effectiveCommerceId]);

  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);

  // OJO: esto sigue leyendo de db local. Si tu commerce también está en Supabase,
  // habría que migrarlo después. Por ahora lo dejo para que no rompa.
  const commerce = db.getById<Commerce>('commerces', effectiveCommerceId || '');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    countryCode: 'AR',
    fullPhone: ''
  });

  useEffect(() => {
    refreshCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.commerceId]);

const refreshCustomers = async () => {
  if (!effectiveCommerceId) return;

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('commerce_id', effectiveCommerceId) // usar el ID efectivo
    .order('created_at', { ascending: false });

  console.log("CUSTOMERS DATA:", data);
  console.log("CUSTOMERS ERROR:", error);
  console.log("BUSCANDO commerce_id:", effectiveCommerceId);

  if (error) {
    console.error("Error cargando clientes:", error);
    return;
  }

  setCustomers(data || []);
};

    if (error) {
      console.log('Supabase refreshCustomers error:', error);
      return;
    }

    const list = (data ?? []).map((c: any) => ({
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
      summary: {
        lastVisitAt: null,
        totalVisits: 0,
        totalAmount: 0
      }
    }));

    setCustomers(list);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCommerceId || !formData.name || !formData.fullPhone || !formData.email) return;

    const newCustomer: Customer = {
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
      discountAvailable: false
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
        discount_available: newCustomer.discountAvailable
        // created_at: no lo mandes, dejá que lo ponga Supabase con default now()
      }
    ]);

    if (error) {
      alert('Error guardando en Supabase: ' + error.message);
      console.log('Supabase insert error:', error);
      return;
    }

    setFormData({ name: '', email: '', phoneNumber: '', countryCode: 'AR', fullPhone: '' });
    setIsNewModal(false);

    setSelectedCustomer({
      ...newCustomer,
      summary: { lastVisitAt: null, totalVisits: 0, totalAmount: 0 }
    });
    setShowModal(true);

    await refreshCustomers();
  };

  const exportToCSV = () => {
    if (!customers.length) return;

    const sortedList = [...customers].sort((a, b) => a.name.localeCompare(b.name));
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
        `"${totalSpent}"`
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

  const getWhatsAppLink = (customer: Customer) => {
    const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const publicUrl = `${baseUrl}/#/q/${customer.qrToken}`;

    const message =
      `Hola ${customer.name}! 🎁\n` +
      `Ya sos parte del Club.\n\n` +
      `Podés ver tus puntos y premios acá:\n` +
      `${publicUrl}`;

    return `https://wa.me/${String(customer.phone).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(c.phone).includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* ... el resto de tu JSX queda igual ... */}
    </div>
  );
};

export default CustomersPage;
