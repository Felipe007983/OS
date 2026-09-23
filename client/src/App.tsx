import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ThirdPartiesPage } from './pages/ThirdPartiesPage';
import { ProductsPage } from './pages/ProductsPage';
import { ServiceOrdersPage } from './pages/ServiceOrdersPage';
import { ServiceOrderFormPage } from './pages/ServiceOrderFormPage';
import { ServiceOrderDetailPage } from './pages/ServiceOrderDetailPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { AuditPage } from './pages/AuditPage';
import { AcceptancePublicPage } from './pages/AcceptancePublicPage';
import { SignOrderPage } from './pages/SignOrderPage';
import { UsersPage } from './pages/UsersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/aceite/:token" element={<AcceptancePublicPage />} />
          <Route path="/assinar/:token" element={<SignOrderPage />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ordens" element={<ServiceOrdersPage />} />
            <Route path="/ordens/nova" element={<AdminRoute><ServiceOrderFormPage /></AdminRoute>} />
            <Route path="/ordens/:id" element={<ServiceOrderDetailPage />} />
            <Route path="/pagamentos" element={<PaymentsPage />} />
            <Route path="/costureiras" element={<AdminRoute><ThirdPartiesPage /></AdminRoute>} />
            <Route path="/produtos" element={<AdminRoute><ProductsPage /></AdminRoute>} />
            <Route path="/auditoria" element={<AdminRoute><AuditPage /></AdminRoute>} />
            <Route path="/usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
