
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import CustomerDashboard from './pages/CustomerDashboard';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import AdminDashboard from './pages/AdminDashboard';
import OrderSuccess from './pages/OrderSuccess';
import MyOrders from './pages/MyOrders';
import { AppProvider, useApp } from './context/AppContext';
import { APP_THEMES } from './constants';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ThemeInjector: React.FC = () => {
  const { settings } = useApp();
  
  useEffect(() => {
    if (!settings) return;
    const theme = APP_THEMES.find(t => t.id === settings.general.themeId) || APP_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--p-orange', theme.primary[0]);
    root.style.setProperty('--p-red', theme.primary[1]);
    root.style.setProperty('--s-teal', theme.secondary[0]);
    root.style.setProperty('--s-cyan', theme.secondary[1]);
    root.style.setProperty('--a-purple', theme.accent[0]);
    root.style.setProperty('--a-pink', theme.accent[1]);
  }, [settings]);

  return null;
};

const AppRoutes: React.FC = () => {
  return (
    <div className="min-h-screen pb-20 bg-gray-50/50">
      <ThemeInjector />
      <Navbar />
      <Routes>
        <Route path="/" element={<CustomerDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/staff-portal" element={<StaffLogin />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
        <Route path="/my-orders" element={<ProtectedRoute roles={['customer']}><MyOrders /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin', 'staff']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
