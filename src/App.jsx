import React from "react";
import { Routes, Route } from "react-router-dom";
import Tech               from "./pages/Tech.jsx";
import NonTech            from "./pages/NonTech.jsx";
import Register           from "./pages/Register.jsx";
import Greeting           from "./pages/Greeting.jsx";
import Admin              from "./pages/Admin.jsx";
import PermissionLetter   from "./pages/PermissionLetter.jsx";
import GeneratePermissionLetter from "./pages/GeneratePermissionLetter.jsx";
import BugHuntersRound3   from "./pages/BugHuntersRound3.jsx";
import AdminUploadBugHunters from "./pages/AdminUploadBugHunters.jsx";
import PaymentStats       from "./pages/PaymentStats.jsx";
import RegistrationManager from "./pages/RegistrationManager.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/"                    element={<Register />} />
      <Route path="/register"            element={<Register />} />
      <Route path="/tech"                element={<Tech />} />
      <Route path="/nontech"             element={<NonTech />} />
      <Route path="/greeting"            element={<Greeting />} />
      <Route path="/permission-letter"   element={<PermissionLetter />} />
      <Route path="/generate-permission-letter" element={<GeneratePermissionLetter />} />
      <Route path="/bug" element={<BugHuntersRound3 />} />
      <Route path="/admin-upload-bug" element={<AdminUploadBugHunters />} />
      <Route path="/admin"               element={<Admin />} />
      <Route path="/payment-stats"       element={<PaymentStats />} />
      <Route path="/registration-manager" element={<RegistrationManager />} />
    </Routes>
  );
}
