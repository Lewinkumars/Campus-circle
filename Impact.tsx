import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'motion/react';
import { Leaf, TrendingUp, Zap, IndianRupee, BookOpen, Monitor, PenTool, Shirt, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ImpactData {
  summary: {
    total_money_saved: string;
    items_reused: number;
    estimated_energy_saved_kwh: number;
  };
  category_breakdown: {
    category: string;
    items_reused: number;
    money_saved: string;
  }[];
  weekly_trends: {
    week: string;
    money_saved: string;
    items_reused: number;
  }[];
  insights: string[];
}

export default function Impact() {
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAndAnalyzeData = async () => {
      try {
        // 1. Fetch all listings
        const querySnapshot = await getDocs(collection(db, 'listings'));
        const listings = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            title: data.title,
            category: data.category,
            price: data.price,
            originalPrice: data.originalPrice,
            status: data.status,
            createdAt: data.createdAt
          };
        });

        // 2. Prepare data for AI
        const marketplaceData = JSON.stringify(listings);

        // 3. Call Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `You are an AI assistant for a campus marketplace app focused on sustainability and cost savings.

Input data:
${marketplaceData}

Analyze the data and return ONLY valid JSON with the following fields:

{
  "summary": {
    "total_money_saved": "<amount in INR>",
    "items_reused": <number>,
    "estimated_energy_saved_kwh": <number>
  },

  "category_breakdown": [
    {
      "category": "books",
      "items_reused": <number>,
      "money_saved": "<amount in INR>"
    },
    {
      "category": "lab coat",
      "items_reused": <number>,
      "money_saved": "<amount in INR>"
    },
    {
      "category": "electronics",
      "items_reused": <number>,
      "money_saved": "<amount in INR>"
    },
    {
      "category": "stationery",
      "items_reused": <number>,
      "money_saved": "<amount in INR>"
    }
  ],

  "weekly_trends": [
    {
      "week": "Week 1",
      "money_saved": "<amount in INR>",
      "items_reused": <number>
    },
    {
      "week": "Week 2",
      "money_saved": "<amount in INR>",
      "items_reused": <number>
    }
  ],

  "insights": [
    "<short insight 1>",
    "<short insight 2>",
    "<short insight 3>"
  ]
}

Rules:
- Output only JSON (no explanation)
- Keep numbers realistic for a college campus
- Assume:
  - Each reused book saves approx 2 kWh energy
  - Each reused lab item saves approx 1.5 kWh
- Keep insights short (1 line each)
- Focus on sustainability and cost impact`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          const parsedData = JSON.parse(response.text) as ImpactData;
          setImpactData(parsedData);
        } else {
          throw new Error("No response from AI");
        }
      } catch (err) {
        console.error("Failed to generate impact data:", err);
        setError('Failed to load impact analytics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyzeData();
  }, []);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('book')) return <BookOpen className="w-5 h-5" />;
    if (cat.includes('lab') || cat.includes('coat')) return <Shirt className="w-5 h-5" />;
    if (cat.includes('electronic')) return <Monitor className="w-5 h-5" />;
    if (cat.includes('stationery')) return <PenTool className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
        <div className="h-8 bg-orange-200/50 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-orange-200/50 rounded-2xl"></div>)}
        </div>
        <div className="h-64 bg-orange-200/50 rounded-2xl mt-6"></div>
      </div>
    );
  }

  if (error || !impactData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Leaf className="w-16 h-16 text-primary/20 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text-primary">{error || "Something went wrong"}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 md:pb-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-sm">
          <Leaf className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Campus Impact</h1>
          <p className="text-text-secondary">Real-time sustainability & savings analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary p-6 rounded-2xl text-white shadow-xl relative overflow-hidden"
        >
          <IndianRupee className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          <p className="text-orange-100 font-medium mb-1">Total Money Saved</p>
          <h2 className="text-3xl font-bold">{impactData.summary.total_money_saved}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden"
        >
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          <p className="text-emerald-100 font-medium mb-1">Items Reused</p>
          <h2 className="text-3xl font-bold">{impactData.summary.items_reused}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-600 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden"
        >
          <Zap className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          <p className="text-amber-100 font-medium mb-1">Energy Saved</p>
          <h2 className="text-3xl font-bold">{impactData.summary.estimated_energy_saved_kwh} kWh</h2>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-primary-light p-6 rounded-2xl border border-border-theme shadow-md"
        >
          <h3 className="text-lg font-bold text-text-primary mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {impactData.category_breakdown.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-background-theme rounded-xl border border-border-theme shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-light rounded-lg shadow-sm flex items-center justify-center text-primary border border-border-theme">
                    {getCategoryIcon(cat.category)}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary capitalize">{cat.category}</p>
                    <p className="text-xs text-text-secondary">{cat.items_reused} items reused</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{cat.money_saved}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Weekly Trends */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-primary-light p-6 rounded-2xl border border-border-theme shadow-md"
          >
            <h3 className="text-lg font-bold text-text-primary mb-4">Weekly Trends</h3>
            
            <div className="h-48 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={impactData.weekly_trends.map(t => ({
                  name: t.week,
                  items: t.items_reused,
                  money: parseInt(t.money_saved.replace(/[^0-9]/g, ''), 10) || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fed7aa" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="items" name="Items Reused" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="money" name="Money Saved (₹)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {impactData.weekly_trends.map((trend, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border-theme last:border-0 pb-3 last:pb-0">
                  <span className="font-bold text-text-primary">{trend.week}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-secondary">{trend.items_reused} items</span>
                    <span className="font-bold text-primary">{trend.money_saved}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Insights */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-background-theme p-6 rounded-2xl border border-border-theme shadow-sm"
          >
            <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> AI Insights
            </h3>
            <ul className="space-y-2">
              {impactData.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0"></span>
                  {insight}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
