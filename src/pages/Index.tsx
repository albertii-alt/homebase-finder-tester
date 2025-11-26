import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      setUser(JSON.parse(currentUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
        <div className="text-center">
          <h1 className="mb-6 text-5xl font-bold text-white">Welcome to Homebase Finder</h1>
          <p className="mb-8 text-xl text-white/90">Where home seekers meet and owners meet</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-3 bg-white text-blue-600 rounded-full font-semibold text-lg hover:bg-blue-50 transition-all"
          >
            Login / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 to-blue-600 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome back!</h1>
            <p className="text-xl text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-all"
          >
            Logout
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Your Profile</h2>
          <div className="space-y-2">
            <p className="text-lg"><span className="font-semibold">Email:</span> {user.email}</p>
            <p className="text-lg"><span className="font-semibold">Role:</span> {user.role}</p>
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">You're successfully logged in! 🎉</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
