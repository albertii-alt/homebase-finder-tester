import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Interface from "./pages/Interface";
import MyBoardinghouse from "./pages/MyBoardinghouse";
import AddBoardinghouse from "./pages/AddBoardinghouse";
import EditBoardinghouse from "./pages/EditBoardinghouse";
import AddRoom from "./pages/AddRoom";
import EditRoom from "./pages/EditRoom";
import BoardinghouseDetails from "./pages/BoardinghouseDetails";
import Favorites from "./pages/Favorites";
import AboutPage from "./pages/AboutPage";
import AccountSettings from "./pages/AccountSettings";
import AddedRooms from "./pages/AddedRooms";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red", fontFamily: "sans-serif" }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.message}</p>
          <pre style={{ background: "#f0f0f0", padding: 10, borderRadius: 4, overflow: "auto" }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 10, padding: "8px 16px" }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="/interface" element={<Interface />} />
              <Route path="/boardinghouse/:id" element={<BoardinghouseDetails />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-boardinghouse" element={<MyBoardinghouse />} />
              <Route path="/add-boardinghouse" element={<AddBoardinghouse />} />
              <Route path="/edit-boardinghouse/:id" element={<EditBoardinghouse />} />
              <Route path="/add-room" element={<AddRoom />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/edit-room" element={<EditRoom />} />
              <Route path="/added-rooms" element={<AddedRooms />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
