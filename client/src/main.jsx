import "./styles/theme.css";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { NotificationProvider } from "./notifications/NotificationContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
