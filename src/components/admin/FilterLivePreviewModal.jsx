import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import LiveBeautyPreview from './LiveBeautyPreview';

const FilterLivePreviewModal = ({ open, onClose, product, filterConfig }) => {
  if (!open) return null;

  const filters = filterConfig?.filters || {};

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {/* Panel flotante que no bloquea la interacción con el fondo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="fixed bottom-4 right-4 z-50 w-full max-w-xl"
      >
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Preview en vivo de filtros</h3>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            {/* Vista previa en vivo basada en CSS filters sobre la cámara */}
            <LiveBeautyPreview filters={filters} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FilterLivePreviewModal;