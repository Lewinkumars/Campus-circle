import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, List, Bell, User as UserIcon, LogOut, MessageSquare, Leaf, Heart, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { user, dbUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{ id: string; message: string; title?: string } | null>(null);

  // Listen for unread notifications and show toast
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show toast if it's recent (within last 10 seconds)
          const createdAt = new Date(data.createdAt).getTime();
          const now = new Date().getTime();
          if (now - createdAt < 10000) {
            setToast({
              id: change.doc.id,
              message: data.message,
              title: data.type === 'message' ? 'New Message' : 'New Interest'
            });
            
            // Auto-hide toast after 5 seconds
            setTimeout(() => {
              setToast(null);
            }, 5000);
          }
        }
      });
    });

    return unsubscribe;
  }, [user]);

  const navItems = [
    { name: 'Feed', path: '/', icon: Home, public: true },
    { name: 'Wishlist', path: '/wishlist', icon: Heart, public: false },
    { name: 'Post', path: '/post', icon: PlusCircle, public: false },
    { name: 'My Listings', path: '/my-listings', icon: List, public: false },
    { name: 'Inbox', path: '/inbox', icon: MessageSquare, public: false, badge: unreadCount },
    { name: 'Impact', path: '/impact', icon: Leaf, public: false },
    { name: 'Profile', path: '/profile', icon: UserIcon, public: false },
  ];

  const visibleNavItems = navItems.filter(item => item.public || user);

  return (
    <div className="min-h-screen bg-background-theme flex flex-col">
      {/* Push Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] w-[90%] max-w-md bg-primary-light rounded-2xl shadow-2xl border border-border-theme p-4 flex items-start gap-4 cursor-pointer"
            onClick={() => {
              navigate('/inbox');
              setToast(null);
            }}
          >
            <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-text-primary text-sm">{toast.title || 'Notification'}</h4>
              <p className="text-sm text-text-secondary line-clamp-2">{toast.message}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setToast(null);
              }}
              className="p-1 hover:bg-orange-200 rounded-full text-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-primary-light/80 backdrop-blur-md border-b border-border-theme sticky top-0 z-50 shadow-sm transition-all">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2 transition-transform hover:scale-105">
            <span className="bg-gradient-to-r from-primary to-primary-hover text-white p-1.5 rounded-lg shadow-md uppercase">CC</span>
            CAMPUS CIRCLE
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all hover:text-primary-hover hover:scale-105 relative py-1",
                  location.pathname === item.path ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-text-secondary"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            {user ? (
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 ml-4 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary-hover transition-all shadow-md hover:shadow-lg"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-primary-light/90 backdrop-blur-md border-t border-border-theme fixed bottom-0 w-full z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all">
        <div className="flex justify-around items-center h-16">
          {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-all relative",
                  location.pathname === item.path ? "text-primary" : "text-text-secondary hover:text-primary-hover hover:bg-orange-50/50"
                )}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] h-3.5 flex items-center justify-center shadow-sm border border-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
                {location.pathname === item.path && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 w-full h-0.5 bg-primary"
                  />
                )}
              </Link>
          ))}
          {!user && (
            <Link
              to="/login"
              className="flex flex-col items-center justify-center w-full h-full gap-1 text-text-secondary hover:text-primary-hover transition-all"
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-medium">Login</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
