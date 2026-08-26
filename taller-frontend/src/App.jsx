import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import EmployeeStats from './pages/EmployeeStats'
import Reports from './pages/Reports'
import Services from './pages/Services'
import Quotes from './pages/Quotes/index'
import QuoteDetail from './pages/Quotes/QuoteDetail'
import Suppliers from './pages/Suppliers'
import SupplierDetail from './pages/SupplierDetail'
import PurchaseOrders from './pages/PurchaseOrders/index'
import NewPurchaseOrder from './pages/PurchaseOrders/NewPurchaseOrder'
import PurchaseOrderDetail from './pages/PurchaseOrders/PurchaseOrderDetail'
import Inventory from './pages/Inventory'
import WorkOrders from './pages/WorkOrders/index'
import WorkOrderDetail from './pages/WorkOrders/WorkOrderDetail'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import Calendar from './pages/Calendar'
import Appointments from './pages/Appointments'
import Settings from './pages/Settings'
import ActivityLog from './pages/ActivityLog'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Cargando...
    </div>
  )
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="reports" element={<Reports />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/stats" element={<EmployeeStats />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="services" element={<Services />} />
              <Route path="quotes" element={<Quotes />} />
              <Route path="quotes/:id" element={<QuoteDetail />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="suppliers/:id" element={<SupplierDetail />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="purchase-orders/new" element={<NewPurchaseOrder />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="work-orders/:id" element={<WorkOrderDetail />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="settings" element={<Settings />} />
              <Route path="activity-log" element={<ActivityLog />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
