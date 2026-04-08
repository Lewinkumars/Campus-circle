/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import PostListing from './pages/PostListing';
import MyListings from './pages/MyListings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Inbox from './pages/Inbox';
import Impact from './pages/Impact';
import ListingDetail from './pages/ListingDetail';
import Wishlist from './pages/Wishlist';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="listing/:id" element={<ListingDetail />} />
            <Route path="wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="post" element={<ProtectedRoute><PostListing /></ProtectedRoute>} />
            <Route path="my-listings" element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="impact" element={<ProtectedRoute><Impact /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

