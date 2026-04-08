import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Upload, X, Zap, AlertTriangle, ShieldCheck, Info, BadgeCheck, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectMisinformation, MisinformationResult } from '../services/geminiService';
import { cn } from '../lib/utils';

export default function PostListing() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('books');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [condition, setCondition] = useState('Good');
  const [quantity, setQuantity] = useState(1);
  const [isBundle, setIsBundle] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [usageDuration, setUsageDuration] = useState('');
  const [reasonForSelling, setReasonForSelling] = useState('');
  
  const [prompt, setPrompt] = useState('');
  const [quickImage, setQuickImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newListingId, setNewListingId] = useState<string | null>(null);
  const [misinfoResult, setMisinfoResult] = useState<MisinformationResult | null>(null);
  const [isCheckingMisinfo, setIsCheckingMisinfo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickImageRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isQuick = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isQuick) {
        setQuickImage(reader.result as string);
      } else {
        setImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAIAssist = async (quickPost = false) => {
    if (!prompt.trim() && !quickImage) return;
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents: any[] = [];
      
      let promptText = `You are generating structured data for a product detail page in a campus marketplace app similar to OLX.

Input data:
${prompt}

Return ONLY valid JSON with the following fields:

- title
- price (number in INR)
- category (one of: books, lab coat, electronics, stationery, bundle, question papers, exam notes, other)
- condition (New / Good / Fair)
- quantity (number, default 1)
- description (2-3 lines, clean and appealing)
- usage_duration (e.g., "Used for 1 semester")
- reason_for_selling (short sentence)
- seller:
    - name
    - year (e.g., 2nd year)
    - branch (e.g., CSE)
    - trust_score (0-5)
    - total_sales (number)
- demand_level (Low / Medium / High)
- interest_count (number)
- deal_tag (Great Deal / Fair Price / Overpriced)

Rules:
- Output only JSON
- No extra text
- Keep it realistic for college students
- Make description natural and convincing`;

      if (quickImage) {
        contents.push({
          inlineData: {
            data: quickImage.split(',')[1],
            mimeType: 'image/jpeg'
          }
        });
        promptText += "\n\nAlso analyze the provided image to refine the title, category, condition, and description. If the image shows a specific book, lab coat, or electronic item, use that information.";
      }
      
      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              price: { type: Type.NUMBER },
              category: { type: Type.STRING },
              condition: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              description: { type: Type.STRING },
              usage_duration: { type: Type.STRING },
              reason_for_selling: { type: Type.STRING },
              seller: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  year: { type: Type.STRING },
                  branch: { type: Type.STRING },
                  trust_score: { type: Type.NUMBER },
                  total_sales: { type: Type.NUMBER }
                }
              },
              demand_level: { type: Type.STRING },
              interest_count: { type: Type.NUMBER },
              deal_tag: { type: Type.STRING }
            },
            required: ["title", "category", "condition", "price", "description"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      if (quickPost) {
        if (!user || !dbUser) return;
        setIsSubmitting(true);
        const newDocRef = await addDoc(collection(db, 'listings'), {
          sellerId: user.uid,
          sellerName: dbUser.name,
          sellerYear: dbUser.year || 'Unknown',
          sellerBranch: dbUser.branch || 'Unknown',
          sellerTrustScore: dbUser.trustScore || 0,
          title: data.title || prompt.substring(0, 50),
          description: data.description || prompt,
          category: data.category || 'other',
          price: Number(data.price) || 0,
          originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
          condition: data.condition || 'Good',
          quantity: data.quantity ? Number(data.quantity) : 1,
          usageDuration: data.usage_duration || '',
          reasonForSelling: data.reason_for_selling || '',
          isBundle: data.isBundle || false,
          imageUrl: quickImage || '',
          status: 'available',
          interestCount: 0,
          createdAt: new Date().toISOString()
        });
        
        setNewListingId(newDocRef.id);
        setIsSuccess(true);
        return;
      }

      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category && ['books', 'lab coat', 'electronics', 'stationery', 'bundle', 'question papers', 'exam notes', 'other'].includes(data.category)) {
        setCategory(data.category);
      }
      if (data.price) setPrice(data.price.toString());
      if (data.originalPrice) setOriginalPrice(data.originalPrice.toString());
      if (data.condition && ['New', 'Good', 'Fair'].includes(data.condition)) {
        setCondition(data.condition);
      }
      if (data.quantity) setQuantity(Number(data.quantity));
      if (data.usage_duration) setUsageDuration(data.usage_duration);
      if (data.reason_for_selling) setReasonForSelling(data.reason_for_selling);
      if (data.isBundle !== undefined) setIsBundle(data.isBundle);
      if (quickImage) setImage(quickImage);
      
      setPrompt('');
      setQuickImage(null);
    } catch (error) {
      console.error("AI Assist error:", error);
      alert("Failed to generate listing details. Please try manually.");
    } finally {
      setIsGenerating(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dbUser) return;
    
    if (!title || !price) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setIsCheckingMisinfo(true);
    setMisinfoResult(null);

    try {
      // Misinformation Detection
      const check = await detectMisinformation(title, description);
      if (check.isMisleading && check.confidence > 0.7) {
        setMisinfoResult(check);
        setIsSubmitting(false);
        setIsCheckingMisinfo(false);
        return;
      }

      const newDocRef = await addDoc(collection(db, 'listings'), {
        sellerId: user.uid,
        sellerName: dbUser.name,
        sellerYear: dbUser.year || 'Unknown',
        sellerBranch: dbUser.branch || 'Unknown',
        sellerTrustScore: dbUser.trustScore || 0,
        title,
        description,
        category,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        condition,
        quantity: Number(quantity),
        usageDuration,
        reasonForSelling,
        isBundle,
        imageUrl: image || '',
        status: 'available',
        interestCount: 0,
        createdAt: new Date().toISOString()
      });
      
      setNewListingId(newDocRef.id);
      setIsSuccess(true);
      
      // Notify waitlisted users
      try {
        const waitlistSnap = await getDocs(query(collection(db, 'waitlist'), where('category', '==', category)));
        const notificationPromises: Promise<any>[] = [];
        
        waitlistSnap.forEach((docSnap) => {
          const wData = docSnap.data();
          if (wData.userId !== user.uid) {
            notificationPromises.push(
              addDoc(collection(db, 'notifications'), {
                userId: wData.userId,
                message: `A new item in ${category} is now available: ${title}`,
                listingId: newDocRef.id,
                read: false,
                createdAt: new Date().toISOString()
              })
            );
          }
        });
        
        await Promise.all(notificationPromises);
      } catch (notifyErr) {
        console.error("Failed to send notifications", notifyErr);
      }
    } catch (error) {
      console.error("Error posting listing:", error);
      alert("Failed to post listing. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsCheckingMisinfo(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 border border-green-200 shadow-sm"
        >
          <BadgeCheck className="w-12 h-12 text-green-600" />
        </motion.div>
        <h2 className="text-3xl font-bold text-text-primary mb-2">Listing Posted!</h2>
        <p className="text-text-secondary mb-8 max-w-md">
          Your item is now live and visible to everyone on the campus marketplace.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate(`/listing/${newListingId}`)}
            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-xl shadow-orange-200"
          >
            View My Listing
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-primary-light text-text-primary border border-border-theme rounded-2xl font-bold hover:bg-background-theme transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="bg-background-theme p-6 rounded-2xl border border-border-theme shadow-md transition-all hover:shadow-lg">
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          Instant "Quick Post" Mode
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Type what you're selling and post instantly, or use auto-fill to review first.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g., "DBMS book good condition ₹300"'
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary outline-none shadow-sm bg-primary-light text-text-primary transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAIAssist(true)}
              />
            </div>
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={quickImageRef} 
                onChange={(e) => handleImageUpload(e, true)} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => quickImageRef.current?.click()}
                className={cn(
                  "px-4 py-3 rounded-xl border border-border-theme font-medium transition-all flex items-center gap-2 shadow-sm",
                  quickImage ? "bg-primary text-white" : "bg-primary-light text-primary hover:bg-background-theme"
                )}
              >
                <Camera className="w-4 h-4" />
                {quickImage ? "Image Added" : "Add Image"}
              </button>
              <button
                onClick={() => handleAIAssist(false)}
                disabled={isGenerating || (!prompt.trim() && !quickImage)}
                className="bg-primary-light text-primary border border-border-theme px-4 py-3 rounded-xl font-medium hover:bg-background-theme disabled:opacity-50 transition-all whitespace-nowrap shadow-sm flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4" /> Auto-fill
              </button>
              <button
                onClick={() => handleAIAssist(true)}
                disabled={isGenerating || isSubmitting || (!prompt.trim() && !quickImage)}
                className="bg-primary text-white px-4 py-3 rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 transition-all whitespace-nowrap shadow-sm flex items-center gap-1"
              >
                <Zap className="w-4 h-4" /> Post instantly
              </button>
            </div>
          </div>
          
          {quickImage && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border-theme group shadow-sm">
              <img src={quickImage} alt="Quick preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setQuickImage(null)}
                className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-primary-light p-6 rounded-2xl border border-border-theme shadow-md space-y-6 transition-all hover:shadow-lg">
        <h2 className="text-xl font-bold text-text-primary border-b border-border-theme pb-4">Listing Details</h2>
        
        {/* Misinformation Warning */}
        <AnimatePresence>
          {misinfoResult && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Potential Misinformation Detected</p>
                  <p className="text-sm opacity-90">{misinfoResult.reason}</p>
                </div>
              </div>
              {misinfoResult.suggestedCorrection && (
                <div className="bg-white/50 p-3 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Suggested Correction
                  </p>
                  <p className="text-sm text-red-700 italic">"{misinfoResult.suggestedCorrection}"</p>
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setMisinfoResult(null)}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Edit listing to fix this
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Photo</label>
          {image ? (
            <div className="relative w-full h-48 bg-background-theme rounded-2xl overflow-hidden border border-border-theme shadow-sm">
              <img src={image} alt="Preview" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-primary-light p-1 rounded-full shadow-md text-text-secondary hover:text-red-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border-theme rounded-2xl flex flex-col items-center justify-center text-text-secondary hover:bg-background-theme hover:border-primary cursor-pointer transition-all"
            >
              <Upload className="w-6 h-6 mb-2 text-primary/40" />
              <span className="text-sm">Click to upload photo</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">Item Name *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., Fundamentals of Database Systems"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
            >
              <option value="books">Books</option>
              <option value="lab coat">Lab Coat</option>
              <option value="electronics">Electronics</option>
              <option value="stationery">Stationery</option>
              <option value="bundle">Bundle / Kit</option>
              <option value="question papers">Question Papers</option>
              <option value="exam notes">Exam Notes</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Condition *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
            >
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Quantity *</label>
            <input
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Selling Price (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., 300"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Original Price (₹) <span className="text-text-secondary/40 font-normal">(Optional)</span></label>
            <input
              type="number"
              min="0"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., 800"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isBundle"
              checked={isBundle}
              onChange={(e) => setIsBundle(e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary border-border-theme bg-background-theme"
            />
            <label htmlFor="isBundle" className="text-sm font-medium text-text-primary">
              This is a bundle (contains multiple items, e.g., "1st Year Kit")
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none transition-all text-text-primary"
              placeholder="Any additional details about the item..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Usage Duration <span className="text-text-secondary/40 font-normal">(Optional)</span></label>
            <input
              type="text"
              value={usageDuration}
              onChange={(e) => setUsageDuration(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., Used for 1 semester"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Reason for Selling <span className="text-text-secondary/40 font-normal">(Optional)</span></label>
            <input
              type="text"
              value={reasonForSelling}
              onChange={(e) => setReasonForSelling(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., Graduating soon"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border-theme">
          <button
            type="submit"
            disabled={isSubmitting || isCheckingMisinfo}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:bg-primary-hover disabled:opacity-70 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
          >
            {isCheckingMisinfo ? (
              <>
                <ShieldCheck className="w-5 h-5 animate-pulse" />
                Checking for Misinformation...
              </>
            ) : isSubmitting ? (
              'Posting...'
            ) : (
              'Post Listing'
            )}
          </button>
          <p className="text-[10px] text-text-secondary text-center mt-3 flex items-center justify-center gap-1">
            <Info className="w-3 h-3" /> All listings are AI-verified for accuracy to prevent scams.
          </p>
        </div>
      </form>
    </div>
  );
}
