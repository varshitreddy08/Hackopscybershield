import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Dashboard from "./components/Dashboard";
import ReportPage from "./components/ReportPage";
import AnalysisPage from "./components/AnalysisPage";
import EndpointsPage from "./components/EndpointsPage";
import LoginPage from "./components/LoginPage";
import "./App.css";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/endpoints" element={<EndpointsPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;