// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/theme.css";
import "./styles/utilities.css";
import "./styles/core/tokens.css";
import "./styles/core/layout.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter><App/></BrowserRouter>
);
