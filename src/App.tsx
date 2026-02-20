import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import BookingPage from "./pages/BookingPage";
import NotFound from "./pages/NotFound";
import OfflinePage from "./pages/OfflinePage";
import LiquidPlayground from "./pages/LiquidPlayground";

const AuthPage = lazy(() => import("./pages/Auth"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const CalendarPage = lazy(() => import("./pages/admin/CalendarPage"));
const AppointmentsPage = lazy(() => import("./pages/admin/AppointmentsPage"));
const EmployeesPage = lazy(() => import("./pages/admin/EmployeesPage"));
const ServicesPage = lazy(() => import("./pages/admin/ServicesPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const MySchedulePage = lazy(() => import("./pages/admin/MySchedulePage"));
const ReceptionPage = lazy(() => import("./pages/ReceptionPage"));

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/booking" replace />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/liquid" element={<LiquidPlayground />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route
                path="/reception"
                element={
                  <ProtectedRoute>
                    <ReceptionPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout><DashboardPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/calendar"
                element={
                  <ProtectedRoute>
                    <AdminLayout><CalendarPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/appointments"
                element={
                  <ProtectedRoute>
                    <AdminLayout><AppointmentsPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <ProtectedRoute>
                    <AdminLayout><EmployeesPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/services"
                element={
                  <ProtectedRoute>
                    <AdminLayout><ServicesPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <ProtectedRoute>
                    <AdminLayout><CustomersPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <AdminLayout><SettingsPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/my"
                element={
                  <ProtectedRoute>
                    <AdminLayout><MySchedulePage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
