import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, Shield, Users } from "lucide-react";
import logoImg from "/HomebaseFinderOfficialLogo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center py-20">
          <img src={logoImg} alt="Homebase Finder" className="w-32 h-32 mx-auto mb-6 rounded-2xl shadow-lg" />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Find Your Perfect
            <br />
            Boarding House
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Connect with quality boarding houses or list your property to reach potential tenants
          </p>
          <div className="flex justify-center">
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white hover:bg-white/20" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 mb-20">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-white">
            <Search className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Easy Search</h3>
            <p className="text-white/80">Find boarding houses that match your needs with our powerful search filters</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-white">
            <Shield className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Verified Listings</h3>
            <p className="text-white/80">All properties are verified to ensure quality and safety for our users</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-white">
            <Users className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">For Owners & Tenants</h3>
            <p className="text-white/80">Whether you're looking for a place or listing one, we've got you covered</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/90 mb-6">Join our community today</p>
          <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
            Sign Up Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
