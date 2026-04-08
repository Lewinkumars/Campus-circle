import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Trash2, Clock, Lightbulb, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'listings'),
      where('sellerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListings(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching my listings:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleMarkAsSold = async (listing: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'sold'
      });
      
      // Increment trust score and savings
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentScore = userSnap.data().trustScore || 0;
        const currentSavings = userSnap.data().totalSavings || 0;
        
        const savingsToAdd = listing.originalPrice && listing.originalPrice > listing.price 
          ? (listing.originalPrice - listing.price) 
          : 0;

        await updateDoc(userRef, {
          trustScore: currentScore + 1,
          totalSavings: currentSavings + savingsToAdd
        });
      }
      
      alert('Marked as sold! Your trust score has increased.');
    } catch (error) {
      console.error("Error marking as sold:", error);
      alert('Failed to update listing.');
    }
  };

  const handleDelete = async (listingId: string) => {
    try {
      await deleteDoc(doc(db, 'listings', listingId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert('Failed to delete listing.');
    }
  };

  const getSellFasterTip = (listing: any) => {
    if (listing.interestCount === 0) {
      if (listing.price > 1000) return "High price item. Try adding more details or lowering the price slightly.";
      if (!listing.imageUrl) return "Listings with photos sell 3x faster. Add a clear photo!";
      if (listing.condition === 'Fair') return "Be honest about the condition, but highlight the low price.";
      return "Share this listing in your class WhatsApp group!";
    }
    return "You have interested buyers! Check your alerts and respond quickly.";
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-text-primary">My Listings</h1>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-primary-light rounded-2xl border border-border-theme overflow-hidden shadow-md animate-pulse">
              <div className="h-40 bg-orange-200/50 w-full"></div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between">
                  <div className="h-5 bg-orange-200/50 rounded w-2/3"></div>
                  <div className="h-5 bg-orange-200/50 rounded w-1/4"></div>
                </div>
                <div className="h-10 bg-orange-200/50 rounded w-full mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-primary-light rounded-2xl border border-border-theme shadow-md flex flex-col items-center transition-all">
          <Package className="w-16 h-16 text-primary/20 mb-4" />
          <h3 className="text-lg font-medium text-text-primary">You haven't posted any items yet.</h3>
          <p className="text-text-secondary mt-1">Click the Post button to start selling.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(listing => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              key={listing.id} 
              className={`bg-primary-light rounded-2xl border border-border-theme overflow-hidden shadow-md flex flex-col transition-all hover:shadow-lg ${listing.status === 'sold' ? 'opacity-70 grayscale-[20%]' : ''}`}
            >
              {listing.imageUrl ? (
                <div className="h-40 w-full bg-background-theme relative">
                  <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-xs font-bold shadow-md border ${listing.status === 'sold' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                    {listing.status.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="h-40 w-full bg-background-theme flex items-center justify-center relative">
                  <Package className="w-10 h-10 text-primary/20" />
                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-xs font-bold shadow-md border ${listing.status === 'sold' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                    {listing.status.toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-lg text-text-primary line-clamp-1">{listing.title}</h3>
                  <span className="font-extrabold text-primary">₹{listing.price}</span>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-text-secondary mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Posted {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}</span>
                </div>

                {listing.status === 'available' && (
                  <div className="mb-4 bg-background-theme border border-border-theme p-3 rounded-xl flex gap-2 items-start shadow-sm">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary font-medium leading-relaxed">
                      {getSellFasterTip(listing)}
                    </p>
                  </div>
                )}
                
                <div className="mt-auto flex gap-2 pt-4 border-t border-border-theme">
                  {listing.status === 'available' && (
                    <button 
                      onClick={() => handleMarkAsSold(listing)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 font-semibold rounded-xl transition-all text-sm border border-green-100 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Sold
                    </button>
                  )}
                  {deleteConfirmId === listing.id ? (
                    <div className="flex-1 flex gap-2">
                      <button 
                        onClick={() => handleDelete(listing.id)}
                        className="flex-1 flex items-center justify-center py-2.5 bg-red-600 text-white hover:bg-red-700 font-semibold rounded-xl transition-all text-sm shadow-md"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 flex items-center justify-center py-2.5 bg-background-theme text-text-secondary hover:bg-primary-light font-semibold rounded-xl transition-all text-sm border border-border-theme"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirmId(listing.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 font-semibold rounded-xl transition-all text-sm border border-red-100 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
