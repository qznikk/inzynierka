function toastColor(type) {
  switch (type) {
    case "success":
      return "bg-emerald-600";
    case "error":
      return "bg-red-600";
    case "info":
    default:
      return "bg-slate-800";
  }
}

export default function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
              ${toastColor(t.type)}
              text-white px-4 py-3 rounded shadow-lg
              min-w-[260px] max-w-sm
              animate-slide-up
            `}
        >
          <div className="flex justify-between gap-3">
            <div className="text-sm">{t.message}</div>
            <button
              onClick={() => onClose(t.id)}
              className="text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
