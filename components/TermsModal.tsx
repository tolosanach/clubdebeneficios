
import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, ChevronDown } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // 20px de margen para detectar el final
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Términos y Condiciones</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-black transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-6 text-sm text-slate-600 leading-relaxed no-scrollbar"
        >
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">1. Uso de la plataforma</h3>
            <p>Esta plataforma brinda herramientas para que los comercios gestionen programas de fidelización, beneficios y registro de clientes.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">2. Responsabilidad del comercio</h3>
            <p>Cada comercio es responsable de los beneficios, promociones o premios que ofrece a sus clientes. La plataforma no interviene en la relación comercial entre el negocio y sus clientes.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">3. Datos y uso de la información</h3>
            <p>El comercio es responsable de los datos que registra en el sistema y de su correcto uso conforme a la normativa vigente.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">4. Disponibilidad del servicio</h3>
            <p>El servicio puede presentar interrupciones por mantenimiento o mejoras. No se garantiza disponibilidad continua ni libre de errores.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">5. Limitación de responsabilidad</h3>
            <p>La plataforma no será responsable por pérdidas económicas, daños indirectos, lucro cesante o problemas derivados del uso del sistema por parte de los usuarios o comercios.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">6. Modificaciones</h3>
            <p>La plataforma podrá modificar funcionalidades, planes o condiciones en cualquier momento para mejorar el servicio.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">7. Aceptación</h3>
            <p>El uso de la plataforma implica la aceptación de estos términos.</p>
          </div>

          {!hasScrolledToBottom && (
            <div className="flex justify-center py-4 animate-bounce text-slate-300">
              <ChevronDown size={24} />
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            onClick={onAccept}
            disabled={!hasScrolledToBottom}
            className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
              hasScrolledToBottom 
                ? 'bg-black text-white shadow-xl hover:opacity-90 active:scale-[0.98]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {hasScrolledToBottom ? 'Aceptar Términos' : 'Lea hasta el final para aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
