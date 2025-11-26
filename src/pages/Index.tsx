import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      try {
        const current = JSON.parse(raw);
        if (current?.loggedIn) {
          navigate("/interface", { replace: true });
          return;
        }
      } catch {
        // ignore bad JSON
      }
    }
    navigate("/auth", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
      <span className="text-white/80 text-lg">Redirecting…</span>
    </div>
  );
};

export default Index;
