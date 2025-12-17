export default function Footer() {
  return (
    <footer className="mt-auto border-t border-borderSoft bg-section">
      <div className="relative mx-auto max-w-7xl px-6 py-6">
        <span className="absolute left-1/2 -translate-x-1/2 text-sm text-textSecondary">
          © {new Date().getFullYear()} HVACapp
        </span>
      </div>
    </footer>
  );
}
