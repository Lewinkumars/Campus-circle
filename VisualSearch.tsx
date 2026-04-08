import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Search, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeImageForSearch } from '../services/geminiService';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';

interface VisualSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (listingId: string) => void;
}

export default function VisualSearch({ isOpen, onClose, onSelectListing }: VisualSearchProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        performVisualSearch(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const performVisualSearch = async (base64: string) => {
    setIsAnalyzing(true);
    setResults([]);
    try {
      // 1. Analyze image with Gemini
      const data = await analyzeImageForSearch(base64);
      setAnalysis(data);

      // 2. Search Firestore for similar items
      // We'll search by category and then filter by title/tags in memory for better results
      const listingsRef = collection(db, 'listings');
      const q = query(
        listingsRef,
        where('category', '==', data.category),
        where('status', '==', 'available'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Simple relevance sorting based on title match
      const sortedResults = items.sort((a: any, b: any) => {
        const aMatch = data.tags.some((tag: string) => a.title.toLowerCase().includes(tag.toLowerCase()));
        const bMatch = data.tags.some((tag: string) => b.title.toLowerCase().includes(tag.toLowerCase()));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      }).slice(0, 6);

      setResults(sortedResults);
    } catch (error) {
      console.error("Visual search failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResults([]);
    setAnalysis(null);
    setIsAnalyzing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-xl">
                  <Camera className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Visual Search</h2>
                  <p className="text-sm text-gray-500">Find items by uploading a photo</p>
                </div>
              </div>
              <button 
                onClick={() => { reset(); onClose(); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!image ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer group"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-gray-300 group-hover:text-orange-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700">Click to upload or drag a photo</p>
                    <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG (Max 5MB)</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Image Preview & Analysis Status */}
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden shadow-md border-4 border-white shrink-0 relative">
                      <img src={image} alt="Search source" className="w-full h-full object-cover" />
                      <button 
                        onClick={reset}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {isAnalyzing ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 text-orange-600 font-semibold">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Gemini is analyzing your image...</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="h-full bg-orange-500"
                            />
                          </div>
                          <p className="text-sm text-gray-500 italic">Identifying category, condition, and similar items on campus...</p>
                        </div>
                      ) : analysis && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-3"
                        >
                          <div className="flex flex-wrap gap-2">
                            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                              {analysis.category}
                            </span>
                            {analysis.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 leading-tight">{analysis.title}</h3>
                          <p className="text-gray-600 text-sm leading-relaxed">{analysis.description}</p>
                          {analysis.estimatedPrice && (
                            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100">
                              <span className="text-xs font-bold uppercase tracking-widest">Est. Value:</span>
                              <span className="text-lg font-extrabold">₹{(analysis.estimatedPrice * 83).toFixed(0)}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Search className="w-4 h-4" /> Similar Listings on Campus
                    </h4>
                    
                    {isAnalyzing ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="aspect-square bg-gray-50 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : results.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {results.map(listing => (
                          <motion.div
                            key={listing.id}
                            whileHover={{ y: -4 }}
                            onClick={() => onSelectListing(listing.id)}
                            className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="aspect-square bg-gray-100 relative">
                              {listing.imageUrl ? (
                                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 right-2">
                                <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                                  <p className="text-[10px] font-bold text-orange-600">₹{listing.price}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-orange-600 transition-colors">{listing.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{listing.sellerBranch}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : !isAnalyzing && (
                      <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
                        <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No exact matches found yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different photo or check back later!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => { reset(); onClose(); }}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
              >
                {image ? 'Try Another Photo' : 'Select Photo'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
