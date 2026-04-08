import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { BookOpen, Sparkles, Plus } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { user, signIn, isSigningIn } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  const showcaseImages = [
    "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop", // Keys
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", // Headphones
    "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop", // Wallet
    "https://images.unsplash.com/photo-1602143393494-721d002d3405?w=400&h=400&fit=crop", // Bottle
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop", // Backpack
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop", // Book
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop", // Phone
    "https://images.unsplash.com/photo-1534149043227-d4677bc04748?w=400&h=400&fit=crop", // Umbrella
  ];

  return (
    <div className="min-h-screen bg-background-theme relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="w-full px-8 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-text-primary text-xl tracking-tight">Campus Circle</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-text-secondary">
          <button className="hover:text-primary transition-colors">Remix</button>
          <button className="hover:text-primary transition-colors">Device</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-8 lg:px-24 gap-16 lg:gap-24 z-10">
        {/* Left Column: Showcase */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 max-w-[600px] hidden lg:block"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-light rounded-full mb-8 border border-border-theme">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-bold text-primary">Lost & Found Hub</span>
          </div>
          
          <h1 className="text-6xl font-black text-text-primary mb-6 leading-[1.1] tracking-tight">
            Never Lose Track of Your Belongings
          </h1>
          
          <p className="text-xl text-text-secondary mb-12 leading-relaxed max-w-[500px]">
            Connect with your campus community to find lost items or help return found ones
          </p>

          {/* Image Grid */}
          <div className="grid grid-cols-4 gap-4 mb-12">
            {showcaseImages.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="aspect-square rounded-2xl overflow-hidden shadow-md border-2 border-white"
              >
                <img src={src} alt="Showcase" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </motion.div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-primary/60 flex items-center justify-center text-white text-xs font-bold ring-2 ring-primary-light">
                  {i === 4 ? <Plus className="w-4 h-4" /> : null}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-text-secondary">
              <span className="font-bold text-text-primary">500+ items</span> reunited with their owners
            </p>
          </div>
        </motion.div>

        {/* Right Column: Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px] flex flex-col items-center"
        >
          {/* Logo & Slogan */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-primary rounded-[28px] flex items-center justify-center shadow-2xl shadow-orange-200/50 mb-8">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-black text-text-primary mb-3 tracking-tight">Campus Circle</h2>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4 fill-primary" />
              <p className="text-sm font-bold uppercase tracking-widest">The second-hand marketplace for your campus</p>
              <Sparkles className="w-4 h-4 fill-primary" />
            </div>
          </div>

          {/* Login Card */}
          <div className="w-full bg-primary-light rounded-[40px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white">
            {/* Google Sign In */}
            <button
              onClick={signIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 py-5 px-4 rounded-2xl text-white font-bold bg-gradient-to-r from-primary to-orange-600 hover:opacity-95 transition-all shadow-xl shadow-orange-200/50 mb-4 disabled:opacity-70"
            >
              {isSigningIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            </button>

            <p className="mt-6 text-[12px] text-center text-text-secondary leading-relaxed font-medium">
              Join your campus community and start trading with fellow students.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-10 text-sm font-medium text-text-secondary">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </main>

      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-200/10 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
