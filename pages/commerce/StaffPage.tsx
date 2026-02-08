
import React, { useState, useEffect } from 'react';
import { Plus, ShieldHalf, X, User, Mail, ShieldAlert, Edit2, Trash2, Key, Power, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '../../services/db';
import { useAuth } from '../../services/auth';
import { User as UserType, UserRole } from '../../types';

const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<UserType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<{email: string, pass: string} | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.SCANNER
  });

  useEffect(() => {
    refreshStaff();
  }, [user]);

  const refreshStaff = () => {
    if (user?.commerceId) {
      setStaff(db.getStaffByCommerce(user.commerceId));
    }
  };

  const handleOpenModal = (s?: UserType) => {
    setTempCredentials(null);
    if (s) {
      setEditingStaff(s);
      setFormData({
        name: s.name,
        email: s.email || '',
        role: s.role
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        email: '',
        role: UserRole.SCANNER
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.commerceId || !formData.name || !formData.email) return;
    
    setLoading(true);
    // Simular latencia
    await new Promise(resolve => setTimeout(resolve, 800));

    if (editingStaff) {
      db.update<UserType>('users', editingStaff.id, {
        name: formData.name,
        role: formData.role
      });
    } else {
      // Verificar si el email ya existe
      if (db.getUserByEmail(formData.email)) {
        alert("El email ya está registrado en la plataforma.");
        setLoading(false);
        return;
      }

      const tempPass = Math.random().toString(36).slice(-8);
      const newStaff: UserType = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        password: tempPass,
        role: formData.role,
        commerceId: user.commerceId,
        isActive: true,
        registrationMethod: 'email',
        createdAt: new Date().toISOString(),
        mustChangePassword: true,
        acceptedTerms: false,
        acceptedTermsDate: '',
        termsVersion: '1.0'
      };
      
      db.insert('users', newStaff);
      setTempCredentials({ email: formData.email, pass: tempPass });
    }

    setLoading(false);
    if (!tempCredentials && !editingStaff) {
      // Si no mostramos credenciales temporales, cerramos modal
    } else if (editingStaff) {
      setShowModal(false);
    }
    refreshStaff();
  };

  const toggleStatus = (s: UserType) => {
    if (s.id === user?.id) return; // No auto-desactivarse
    db.update<UserType>('users', s.id, { isActive: !s.isActive });
    refreshStaff();
  };

  const handleResetPassword = (s: UserType) => {
    const newPass = Math.random().toString(36).slice(-8);
    db.update<UserType>('users', s.id, { password: newPass, mustChangePassword: true });
    alert(`Nueva contraseña temporal para ${s.name}: ${newPass}\n\nCompártela con el empleado.`);
  };

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
      case UserRole.COMMERCE_OWNER: return 'Dueño';
      case UserRole.STAFF_MANAGER: return 'Encargado';
      case UserRole.SCANNER: return 'Cajero';
      case UserRole.VIEWER: return 'Solo Lectura';
      default: return role;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Personal</h1>
          <p className="text-slate-500 font-medium">Gestioná los accesos de tus empleados.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-black/10 hover:opacity-90 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
        >
          <Plus size={20} />
          Agregar Empleado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((s) => (
          <div key={s.id} className={`bg-white rounded-[32px] border p-6 shadow-sm flex flex-col justify-between transition-all group hover:border-blue-200 ${!s.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${s.isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <User size={24} />
                </div>
                {s.id !== user?.id && (
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenModal(s)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleResetPassword(s)} title="Resetear contraseña" className="p-2 text-slate-300 hover:text-orange-600 transition-colors"><Key size={18} /></button>
                  </div>
                )}
              </div>
              <h3 className="font-black text-lg text-slate-900 mb-1 leading-tight">{s.name}</h3>
              <p className="text-xs text-slate-500 font-medium mb-4 flex items-center gap-1.5"><Mail size={12} /> {s.email}</p>
              
              <div className="flex items-center gap-2 mb-6">
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                   s.role === UserRole.COMMERCE_OWNER ? 'bg-purple-50 text-purple-600' :
                   s.role === UserRole.STAFF_MANAGER ? 'bg-blue-50 text-blue-600' :
                   s.role === UserRole.SCANNER ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                 }`}>
                   {getRoleLabel(s.role)}
                 </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Desde {new Date(s.createdAt).toLocaleDateString()}</p>
               {s.id !== user?.id && (
                 <button
                   onClick={() => toggleStatus(s)}
                   className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                     s.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                   }`}
                 >
                   <Power size={12} />
                   {s.isActive ? 'Activo' : 'Baja'}
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
            {tempCredentials ? (
              <div className="space-y-8 py-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 mx-auto rounded-3xl flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">¡Empleado Creado!</h3>
                  <p className="text-sm font-medium text-slate-500">Copiá estas credenciales y compartilas con el empleado. Se le pedirá cambiar la clave al ingresar.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email de ingreso</p>
                    <p className="font-bold text-slate-900">{tempCredentials.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contraseña Temporal</p>
                    <p className="text-2xl font-black text-blue-600 tracking-wider">{tempCredentials.pass}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full py-5 bg-black text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl"
                >
                  Entendido, Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingStaff ? 'Editar Empleado' : 'Nuevo Empleado'}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-black transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">Nombre Completo</label>
                    <input 
                      type="text"
                      className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 focus:border-black transition-all" 
                      placeholder="Ej: Marcos Pérez"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  {!editingStaff && (
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">Email / Usuario</label>
                      <input 
                        type="email"
                        className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 focus:border-black transition-all" 
                        placeholder="empleado@negocio.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Rol y Permisos</label>
                    <div className="grid gap-2">
                      {[UserRole.STAFF_MANAGER, UserRole.SCANNER, UserRole.VIEWER].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({...formData, role: r})}
                          className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                            formData.role === r 
                              ? 'bg-blue-50 border-blue-600' 
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div>
                            <p className={`font-black text-xs uppercase tracking-widest ${formData.role === r ? 'text-blue-600' : 'text-slate-900'}`}>{getRoleLabel(r)}</p>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                              {r === UserRole.STAFF_MANAGER ? 'Control total menos configuración y personal.' : 
                               r === UserRole.SCANNER ? 'Solo escaneo y registro de ventas.' : 
                               'Solo visualización de datos.'}
                            </p>
                          </div>
                          {formData.role === r && <CheckCircle2 size={18} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-10">
                  <button 
                    onClick={handleSave}
                    disabled={loading || !formData.name || (!editingStaff && !formData.email)}
                    className="w-full py-5 bg-black text-white font-black rounded-[24px] shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-widest text-[11px] disabled:opacity-20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : editingStaff ? 'Actualizar' : 'Crear Acceso'}
                  </button>
                  <button onClick={() => setShowModal(false)} className="w-full py-3 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors">Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
