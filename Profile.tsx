import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, User as UserIcon, LogOut, PiggyBank, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { user, dbUser, logout } = useAuth();
  
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name || '');
      setYear(dbUser.year || '1st Year');
      setBranch(dbUser.branch || '');
      setPhoneNumber(dbUser.phoneNumber || '');
    }
  }, [dbUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        year,
        branch,
        phoneNumber
      });
      // Success feedback is handled by real-time sync, but we can show a brief message
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!dbUser) return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="bg-primary-light p-6 rounded-2xl border border-border-theme h-32"></div>
      <div className="bg-primary-light p-6 rounded-2xl border border-border-theme h-96"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-light p-6 rounded-2xl border border-border-theme shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left relative overflow-hidden transition-all"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-background-theme rounded-bl-full -z-10"></div>
        <div className="w-24 h-24 bg-background-theme rounded-full flex items-center justify-center text-primary shrink-0 border-4 border-primary-light shadow-sm">
          <UserIcon className="w-12 h-12" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{dbUser.name}</h1>
          <p className="text-text-secondary">{dbUser.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <div className="flex items-center gap-1.5 text-primary font-semibold bg-background-theme px-3 py-1.5 rounded-xl border border-border-theme">
              <ShieldCheck className="w-4 h-4" />
              {dbUser.trustScore || 0} successful deals
            </div>
            <div className="flex items-center gap-1.5 text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
              <PiggyBank className="w-4 h-4" />
              Saved ₹{dbUser.totalSavings || 0}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSave} 
        className="bg-primary-light p-6 rounded-2xl border border-border-theme shadow-md space-y-6 transition-all"
      >
        <h2 className="text-xl font-bold text-text-primary border-b border-border-theme pb-4">Edit Profile</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Year of Study</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="Alumni">Alumni</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Branch / Department</label>
            <input
              type="text"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-theme border border-border-theme rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-text-primary"
              placeholder="e.g., 9876543210"
            />
            <p className="text-xs text-text-secondary mt-1">Only visible to buyers who express interest in your items.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-border-theme flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-primary-hover disabled:opacity-70 transition-all shadow-md"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-all border border-red-100"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </motion.form>
    </div>
  );
}
