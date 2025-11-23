import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import "../styles/interface.css";

type Room = {
  id?: string;
  roomName?: string;
  rentPrice?: number;
  totalBeds?: number;
  availableBeds?: number;
  gender?: string;
  withCR?: boolean;
  cookingAllowed?: boolean;
  inclusions?: string[];
};

type Boardinghouse = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  photos?: string[];
  rooms?: Room[];
};

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [boardinghouses, setBoardinghouses] = useState<Boardinghouse[]>([]);

  useEffect(() => {
    try {
      const storedFav = JSON.parse(localStorage.getItem("favoriteBoardinghouses") ?? "[]");
      setFavorites(Array.isArray(storedFav) ? storedFav : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("boardinghouses");
      const parsed = raw ? JSON.parse(raw) : [];
      setBoardinghouses(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBoardinghouses([]);
    }
  }, []);

  const favoriteHouses = useMemo(
    () => boardinghouses.filter((bh) => favorites.includes(bh.id)),
    [boardinghouses, favorites]
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id];
      localStorage.setItem("favoriteBoardinghouses", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/interface" className="back-button">
            <ArrowLeft />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Favorite Boardinghouses</h1>
        </div>

        {favoriteHouses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-inner border border-dashed border-slate-300 p-10 text-center text-slate-600">
            No favorites yet. Go back to add some!
          </div>
        ) : (
          <div className="space-y-6">
            {favoriteHouses.map((property) => {
              const firstPricedRoom = property.rooms?.find(
                (room) => typeof room?.rentPrice === "number"
              );
              const formattedPrice =
                firstPricedRoom && Number.isFinite(firstPricedRoom.rentPrice)
                  ? `₱${Number(firstPricedRoom.rentPrice).toLocaleString()} / month`
                  : "Price not available";

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow property-card"
                >
                  <button
                    type="button"
                    className="favorite-toggle"
                    aria-label="Remove from favorites"
                    onClick={() => toggleFavorite(property.id)}
                  >
                    <Heart size={18} color="#f87171" fill="#f87171" />
                  </button>

                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="aspect-video md:aspect-auto">
                      <img
                        src={property.photos?.[0] ?? "/placeholder.svg"}
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-8 text-white flex flex-col justify-center">
                      <h3 className="text-3xl font-bold mb-4">{property.name}</h3>
                      <p className="text-white/90 mb-4 line-clamp-4">{property.description}</p>

                      <div className="text-sm mb-2 text-white/80">{property.address}</div>

                      <div className="text-2xl font-bold mb-4">{formattedPrice}</div>

                      <Button
                        variant="outline"
                        className="bg-white/10 border-white/50 text-white hover:bg-white/20 hover:text-white"
                        onClick={() => navigate(`/boardinghouse/${property.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;