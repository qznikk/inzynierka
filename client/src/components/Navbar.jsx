// components/Navbar.jsx
// React + Tailwind navbar with Login/Register buttons that open modal dialogs
// - register only creates CLIENT (frontend doesn't send role)
// - login/register redirect based on role: /client, /technician, /admin
// - expects VITE_API_URL env (fallback to http://localhost:5050)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(null); // null | 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // auth state (kept in sync with localStorage)
  const [user, setUser] = useState(null);

  // form state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    // read user from localStorage on mount
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {
      setUser(null);
    }
  }, []);

  function open(type) {
    setError("");
    setShowModal(type);
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    setShowModal(null);
    document.documentElement.style.overflow = "";
  }

  function redirectByRole(role) {
    if (!role) return navigate("/");
    if (role === "TECHNICIAN") navigate("/technician");
    else if (role === "CLIENT") navigate("/client");
    else if (role === "ADMIN") navigate("/admin");
    else navigate("/");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      // attempt to parse json (graceful)
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Login failed (${res.status})`);

      // save token and user
      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      }

      close();

      // redirect based on role from response
      const role = data?.user?.role;
      redirectByRole(role);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: we only send name/email/password (role is enforced server-side)
        body: JSON.stringify(regForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Register failed (${res.status})`);

      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      }

      close();

      // after registration user is a CLIENT (server enforces), redirect to client panel
      const role = data?.user?.role || "CLIENT";
      redirectByRole(role);
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    // optional: clear other stored data if needed
    navigate("/");
  }

  return (
    <>
      <nav className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">
              H
            </div>
            <span className="font-semibold">HVACapp</span>
          </div>

          {/* --- Right side: show login/register when no user, otherwise navbarLogged --- */}
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <button
                  onClick={() => open("login")}
                  className="px-4 py-2 rounded-md border border-gray-200 hover:shadow-sm"
                >
                  Zaloguj
                </button>
                <button
                  onClick={() => open("register")}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Rejestracja
                </button>
              </>
            ) : (
              // navbarLogged
              <div className="flex items-center gap-3">
                <button
                  onClick={logout}
                  className="px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 text-sm"
                >
                  Wyloguj
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Modal overlay + dialogs */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* blurred background */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />

          <div className="relative w-full max-w-md mx-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {showModal === "login" ? "Logowanie" : "Rejestracja"}
                </h3>
                <button onClick={close} className="text-gray-500">
                  ✕
                </button>
              </div>

              {error && (
                <div className="text-sm text-red-600 mb-3">{error}</div>
              )}

              {showModal === "login" ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Hasło"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 rounded-md bg-indigo-600 text-white disabled:opacity-60"
                  >
                    {loading ? "Trwa..." : "Zaloguj"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <input
                    required
                    type="text"
                    placeholder="Imię"
                    value={regForm.name}
                    onChange={(e) =>
                      setRegForm({ ...regForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={regForm.email}
                    onChange={(e) =>
                      setRegForm({ ...regForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Hasło"
                    value={regForm.password}
                    onChange={(e) =>
                      setRegForm({ ...regForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />

                  {/* NOTE: role radios removed — server will enforce CLIENT role on register */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 rounded-md bg-indigo-600 text-white disabled:opacity-60"
                  >
                    {loading ? "Trwa..." : "Zarejestruj się"}
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
