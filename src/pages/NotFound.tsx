
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute top-[-10%] right-0 w-[80%] h-[500px] rounded-3xl opacity-50 bg-purple-700/20 blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-0 w-[80%] h-[500px] rounded-3xl opacity-30 bg-blue-700/20 blur-[100px] -z-10" />
      
      <div className="glass-card p-8 max-w-md w-full text-center animate-fade-in">
        <h1 className="text-6xl font-bold gradient-text mb-6">404</h1>
        <p className="text-xl text-white/70 mb-8">This page doesn't exist.</p>
        <Button asChild>
          <a href="/" className="inline-flex items-center">
            <ArrowLeft size={16} className="mr-2" />
            Return to Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
