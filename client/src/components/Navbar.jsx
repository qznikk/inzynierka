import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../notifications/NotificationContext";

export default function Navbar() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const navigate = useNavigate();
  const notify = useNotify();

  const [showModal, setShowModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const [theme, setTheme] = useState("light");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });

  const navBtn =
    "px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-sm disabled:opacity-60";

  /* ===================== THEME ===================== */
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  }

  /* ===================== AUTH ===================== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  function open(type) {
    setShowModal(type);
    document.documentElement.style.overflow = "hidden";
  }

  function close() {
    setShowModal(null);
    document.documentElement.style.overflow = "";
  }

  function redirectByRole(role) {
    if (role === "TECHNICIAN") navigate("/technician");
    else if (role === "CLIENT") navigate("/client");
    else if (role === "ADMIN") navigate("/admin");
    else navigate("/");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      notify.success("Logged in successfully");
      close();
      redirectByRole(data.user?.role);
    } catch (err) {
      notify.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Registration failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      notify.success("Account created successfully");
      close();
      redirectByRole(data.user?.role || "CLIENT");
    } catch (err) {
      notify.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    notify.success("Logged out");
    navigate("/");
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className="w-full h-16 bg-navbar border-b border-borderSoft">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-textPrimary text-lg">
              HVACapp
            </span>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">
            {/* 🌙 THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className={`${navBtn} border border-borderMedium text-textPrimary`}
              title="Toggle dark / light mode"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            {!user ? (
              <>
                <button
                  onClick={() => open("login")}
                  className={`${navBtn} border border-borderMedium text-primary hover:bg-accent/30`}
                >
                  Login
                </button>
                <button
                  onClick={() => open("register")}
                  className={`${navBtn} bg-primary text-white hover:bg-primary-hover`}
                >
                  Register
                </button>
              </>
            ) : (
              <button
                onClick={logout}
                className={`${navBtn} bg-primary text-white hover:bg-primary-hover`}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            onClick={close}
          />

          <div className="relative w-full max-w-md mx-4">
            <div className="bg-modal rounded-2xl shadow-xl p-6 border border-borderSoft">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-textPrimary">
                  {showModal === "login" ? "Login" : "Register"}
                </h3>
                <button
                  onClick={close}
                  className="text-textSecondary hover:text-textPrimary"
                >
                  ✕
                </button>
              </div>

              {showModal === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    className="ui-input w-full"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({
                        ...loginForm,
                        password: e.target.value,
                      })
                    }
                    className="ui-input w-full"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full ui-btn-primary"
                  >
                    {loading ? "Processing..." : "Login"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <input
                    required
                    type="text"
                    placeholder="Name"
                    value={regForm.name}
                    onChange={(e) =>
                      setRegForm({ ...regForm, name: e.target.value })
                    }
                    className="ui-input w-full"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={regForm.email}
                    onChange={(e) =>
                      setRegForm({ ...regForm, email: e.target.value })
                    }
                    className="ui-input w-full"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Password"
                    value={regForm.password}
                    onChange={(e) =>
                      setRegForm({
                        ...regForm,
                        password: e.target.value,
                      })
                    }
                    className="ui-input w-full"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full ui-btn-primary"
                  >
                    {loading ? "Processing..." : "Register"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
