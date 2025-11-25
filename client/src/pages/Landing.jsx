import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* NAVBAR */}
      <nav className="w-full bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">HVAC Manager</h1>

        <div className="flex gap-6">
          <a href="#" className="text-gray-700 hover:text-blue-600">
            O nas
          </a>
          <a href="#" className="text-gray-700 hover:text-blue-600">
            Funkcje
          </a>
          <a href="#" className="text-gray-700 hover:text-blue-600">
            Kontakt
          </a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex flex-1 items-center justify-center flex-col text-center p-10">
        <h2 className="text-4xl font-bold mb-6 text-gray-800">
          Zarządzaj zleceniami HVAC w jednym miejscu
        </h2>

        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          Wybierz panel użytkownika, aby przejść do odpowiedniej części systemu.
          To tylko tryb demonstracyjny (bez logowania).
        </p>

        {/* BUTTONS */}
        <div className="flex gap-6">
          <Link
            to="/client"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700"
          >
            Panel klienta
          </Link>

          <Link
            to="/technician"
            className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-700"
          >
            Panel technika
          </Link>

          <Link
            to="/admin"
            className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-red-700"
          >
            Panel admina
          </Link>
        </div>
      </div>
    </div>
  );
}
