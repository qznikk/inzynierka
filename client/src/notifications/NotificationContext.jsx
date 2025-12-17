import React, { createContext, useContext, useState, useCallback } from "react";
import ToastContainer from "./ToastContainer";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  };

  const notify = useCallback((message, type = "info", timeout = 4000) => {
    const id = crypto.randomUUID();

    setToasts((t) => [...t, { id, message, type }]);

    setTimeout(() => removeToast(id), timeout);
  }, []);

  const api = {
    notify,
    success: (msg) => notify(msg, "success"),
    error: (msg) => notify(msg, "error"),
    info: (msg) => notify(msg, "info"),
  };

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotify must be used inside NotificationProvider");
  return ctx;
}
