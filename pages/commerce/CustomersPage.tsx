import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageCircle, QrCode, X, FileSpreadsheet } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { Customer, Commerce } from '../../types';
import PhoneInput from '../../components/PhoneInput';
import { safeUUID as makeId, shortToken as makeToken } from '../../services/id';

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);

  const commerce = db.getById<Commerce>('commerces', user?.commerceId || '');

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

  const refreshCustomers = () => {
    if (!user?.commerceId) return;

    const list = db.getCustomersByCommerce(user.commerceId).map((c) => ({
      ...c,
      summary: db.getCustomerSummary(c.id)
    }));
    setCustomers(list);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.commerceId || !formData.name || !formData.fullPhone || !formData.email) return;

    const qrToken = makeToken('CUST');

    const newCustomer: Customer = {
      id: makeId(),
      commerceId: user.commerceId,
      name: formData.name,
      phone: formData.fullPhone,
      phoneNumber: formData.phoneNumber,
      countryCode: formData.countryCode,
      email: formData.email,
      qrToken,
      totalPoints: 0,
      currentStars: 0,
      totalStars: 0,
      createdAt: new Date().toISOString(),
      discountAvailable: false
    };

    db.insert('customers', newCustomer);

    setFormData({ name: '', email: '', phoneNumber: '', countryCode: 'AR', fullPhone: '' });
    setIsNewModal(false);

    setSelectedCustomer({ ...newCustomer, summary: db.getCustomerSummary(newCustomer.id) });
    setShowModal(true);

    refreshCustomers();
  };

  const exportToCSV = () => {
    if (!customers.length) return;

    const sortedList = [...customers].sort((a, b) => a.name.localeCompare(b.name));
    const headers = ['Nombre', 'Telefono', 'Puntos', 'Ultima Visita', 'Total Visitas', 'Total Gastado'];

    const rows = sortedList.map((c) => {
      const lastVisit = c.summary.lastVisitAt ? new Date(c.summary.lastVisitAt).toLocaleDateString('es-AR') : '-';
      const totalSpent = c.summary.totalAmount.toFixed(2).replace('.', ',');
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `="${c.phone}"`,
        Math.floor(c.totalPoints),
        lastVisit,
        c.summary.totalVisits,
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
    const publicUrl = `${window.location.origin}/#/q/${customer.qrToken}`;
    const message = `Hola ${customer.name}! 🎁 Ya eres parte de nuestro Club. Mira tus puntos y premios acá: ${publicUrl}`;
    return `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(c.phone).includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Base de Socios</h1>
          <p className="text-slate-500 font-medium">Gestioná tus clientes y analíticas.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            title="Exportar a Excel"
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-green-600 transition-all flex items-center gap-2 group"
          >
            <FileSpreadsheet size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={() => {
              setIsNewModal(true);
              setShowModal(true);
              setSelectedCustomer(null);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]"
          >
            <Plus size={18} />
            Nuevo Socio
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => {
              setSelectedCustomer(customer);
              setIsNewModal(false);
              setShowModal(true);
            }}
            className="bg-white p-5 rounded-3xl border shadow-sm hover:border-blue-200 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-blue-50 transition-all">
                  {customer.name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{customer.name}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Última:{' '}
                    {customer.summary.lastVisitAt ? new Date(customer.summary.lastVisitAt).toLocaleDateString() : 'Nunca'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-600 font-black text-xl leading-none">{customer.totalPoints}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">puntos</p>
              </div>
            </div>

            <div className="flex gap-2 border-t pt-4">
              <div className="flex-1">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">VISITAS</p>
                <p className="font-bold text-xs text-slate-600">{customer.summary.totalVisits}</p>
              </div>
              <div className="flex-1">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">TOTAL ($)</p>
                <p className="font-bold text-xs text-slate-600">${customer.summary.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-2">
              <h2 className="text-2xl font-black text-slate-900">{isNewModal ? 'Alta de Socio' : 'Perfil del Socio'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            {isNewModal ? (
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none font-bold"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none font-bold"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <PhoneInput
                  label="Teléfono"
                  value={formData.phoneNumber}
                  countryCode={formData.countryCode}
                  onChange={(data) => {
                    setFormData({
                      ...formData,
                      phoneNumber: data.phoneNumber,
                      countryCode: data.countryCode,
                      fullPhone: data.fullPhone
                    });
                  }}
                  required
                />

                <button
                  type="submit"
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs"
                >
                  Crear Socio
                </button>
              </form>
            ) : (
              selectedCustomer && (
                <div className="space-y-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center font-black text-3xl text-slate-300 mb-4 border">
                      {selectedCustomer.name?.[0] || '?'}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h3>
                    <p className="text-sm font-bold text-slate-400">{selectedCustomer.phone}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-4 rounded-3xl text-center">
                      <p className="text-blue-600 font-black text-xl leading-none">{selectedCustomer.totalPoints}</p>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1">Puntos</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl text-center">
                      <p className="text-slate-700 font-black text-xl leading-none">{selectedCustomer.summary.totalVisits}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Visitas</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl text-center">
                      <p className="text-slate-700 font-black text-xl leading-none">
                        ${selectedCustomer.summary.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Total</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sticky bottom-0 bg-white pt-4">
                    <a
                      href={getWhatsAppLink(selectedCustomer)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                    >
                      <MessageCircle size={18} /> Enviar QR
                    </a>
                    <button className="px-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all">
                      <QrCode size={20} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
