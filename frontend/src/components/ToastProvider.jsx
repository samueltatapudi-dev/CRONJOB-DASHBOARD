import { createContext, useContext, useState } from "react";
import { CircleAlert, CircleCheckBig, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const toneMap = {
  success: {
    icon: CircleCheckBig,
    classes:
      "border-mist-200 bg-mist-50 text-mist-900 dark:border-mist-500/30 dark:bg-mist-500/10 dark:text-mist-100",
  },
  error: {
    icon: CircleAlert,
    classes:
      "border-ember-200 bg-ember-50 text-ember-900 dark:border-ember-500/30 dark:bg-ember-500/10 dark:text-ember-100",
  },
  info: {
    icon: Info,
    classes:
      "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const value = {
    pushToast({ title, description, tone = "info" }) {
      const id = crypto.randomUUID();

      setToasts((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3600);
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-3">
        {toasts.map((toast) => {
          const config = toneMap[toast.tone] ?? toneMap.info;
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-3xl border px-4 py-3 shadow-glow ${config.classes}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 flex-none" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm opacity-85">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 opacity-70 transition hover:opacity-100"
                  onClick={() =>
                    setToasts((current) =>
                      current.filter((item) => item.id !== toast.id),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }

  return context;
}
