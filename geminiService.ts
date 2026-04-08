import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalyzedImage {
  title: string;
  category: string;
  description: string;
  tags: string[];
  estimatedPrice?: number;
}

export async function analyzeImageForSearch(base64Image: string): Promise<AnalyzedImage> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Analyze this image of a second-hand item for a campus marketplace. Identify what it is, its category, a brief description, and relevant search tags. Also estimate a fair second-hand price in USD.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise title for the item" },
          category: { 
            type: Type.STRING, 
            enum: ["books", "lab coat", "electronics", "stationery", "bundle", "question papers", "exam notes", "other"],
            description: "The most appropriate category"
          },
          description: { type: Type.STRING, description: "A short description of the item" },
          tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Keywords for searching similar items"
          },
          estimatedPrice: { type: Type.NUMBER, description: "Estimated fair price in USD" }
        },
        required: ["title", "category", "description", "tags"]
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function getSimilarSearchQuery(listingTitle: string, listingDescription: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Given this listing title: "${listingTitle}" and description: "${listingDescription}", provide 5 search keywords that would help find similar items on a campus marketplace.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export interface MisinformationResult {
  isMisleading: boolean;
  confidence: number;
  reason?: string;
  suggestedCorrection?: string;
}

export async function detectMisinformation(title: string, description: string): Promise<MisinformationResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this marketplace listing for potential misinformation, scams, or misleading content.
    Title: "${title}"
    Description: "${description}"
    
    Check for:
    - Unrealistic promises (e.g., "iPhone 15 for ₹500")
    - Suspicious contact methods
    - Inconsistent details
    - Potential scams targeting students`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isMisleading: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER, description: "0 to 1 confidence score" },
          reason: { type: Type.STRING, description: "Why it might be misleading" },
          suggestedCorrection: { type: Type.STRING, description: "How to make it more accurate" }
        },
        required: ["isMisleading", "confidence"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
