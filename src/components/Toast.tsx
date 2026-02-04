import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: { bg: '#dcfce7', border: '#22c55e', text: '#15803d', icon: '✅' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '❌' },
    info: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1', icon: 'ℹ️' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309', icon: '⚠️' }
  };

  const color = colors[type];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: `0 8px 24px ${color.border}40`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        zIndex: 9999,
        animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in ' + (duration - 300) + 'ms forwards',
        fontFamily: 'Assistant, Heebo, Arial, sans-serif'
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
      
      <span style={{ fontSize: '24px', flexShrink: 0 }}>{color.icon}</span>
      
      <span style={{ 
        fontSize: '15px', 
        fontWeight: '600', 
        color: color.text,
        flex: 1,
        lineHeight: '1.4'
      }}>
        {message}
      </span>
      
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: color.text,
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px',
          opacity: 0.7,
          transition: 'opacity 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        ✕
      </button>
    </div>
  );
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export function ToastContainer({ toasts, removeToast }: { 
  toasts: ToastMessage[], 
  removeToast: (id: number) => void 
}) {
  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            bottom: `${24 + index * 80}px`,
            right: '24px',
            zIndex: 9999
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
}
