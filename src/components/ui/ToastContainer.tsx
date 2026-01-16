import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores';

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              pointer-events-auto max-w-sm rounded-lg border backdrop-blur-md shadow-lg
              ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/30' : ''}
              ${toast.type === 'info' ? 'bg-neon-cyan/10 border-neon-cyan/30' : ''}
              ${toast.type === 'warning' ? 'bg-neon-orange/10 border-neon-orange/30' : ''}
              ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/30' : ''}
            `}
          >
            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <SuccessIcon />}
                {toast.type === 'info' && <InfoIcon />}
                {toast.type === 'warning' && <WarningIcon />}
                {toast.type === 'error' && <ErrorIcon />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-body text-sm font-medium
                  ${toast.type === 'success' ? 'text-green-300' : ''}
                  ${toast.type === 'info' ? 'text-neon-cyan' : ''}
                  ${toast.type === 'warning' ? 'text-neon-orange' : ''}
                  ${toast.type === 'error' ? 'text-red-300' : ''}
                `}>
                  {toast.message}
                </p>
                {toast.details && (
                  <p className="font-body text-xs text-gray-400 mt-1">
                    {toast.details}
                  </p>
                )}
              </div>

              {/* Dismiss button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => dismissToast(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-glass-white text-gray-500 hover:text-white transition-colors"
              >
                <CloseIcon />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5 text-neon-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
