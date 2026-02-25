import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const AdminLayout = lazy(() => import("@/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));

import LiquidPlayground from "./pages/LiquidPlayground";
const DemoPage = lazy(() => import("./pages/DemoPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OfflinePage = lazy(() => import("./pages/OfflinePage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));


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
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieConsent />
        <AuthProvider>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<LiquidPlayground />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/booking" element={<BookingPage />} />
              
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/privacy-policy" element={<TermsPage />} />
              <Route path="/terms" element={<TermsPage />} />
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
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><DashboardPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/calendar"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><CalendarPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/appointments"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><AppointmentsPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><EmployeesPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/services"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><ServicesPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><CustomersPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout><SettingsPage /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/my"
                element={
                  <ProtectedRoute requireAdmin={true}>
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
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
