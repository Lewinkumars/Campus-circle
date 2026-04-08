import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { Groq } from 'groq-sdk';

// WARNING: Exposing API keys in client-side code is insecure. 
// This is for demonstration purposes only.
const groq = new Groq({ 
  apiKey: (import.meta as any).env.VITE_GROQ_API_KEY, 
  dangerouslyAllowBrowser: true 
});

export default function ProductChatbot({ product }: { product: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      if (!(import.meta as any).env.VITE_GROQ_API_KEY) {
        throw new Error("VITE_GROQ_API_KEY is not defined");
      }
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: `You are a helpful assistant for this product: ${JSON.stringify(product)}. Answer questions based on the product details.` },
          ...newMessages.map(m => ({ role: m.role as any, content: m.content }))
        ],
        model: 'llama-3.3-70b-versatile',
      });

      setMessages([...newMessages, { role: 'assistant', content: chatCompletion.choices[0]?.message?.content || '' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, I couldn't answer that." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-hover transition-all">
          <MessageSquare />
        </button>
      ) : (
        <div className="bg-primary-light w-[90vw] max-w-80 h-[70vh] max-h-96 rounded-2xl shadow-2xl border border-border-theme flex flex-col">
          <div className="p-4 bg-primary text-white rounded-t-2xl flex justify-between items-center">
            <span className="font-bold">Ask about this item</span>
            <button onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-primary text-white ml-auto max-w-[80%]' : 'bg-background-theme text-text-primary max-w-[80%]'}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="text-sm text-text-secondary">Thinking...</div>}
          </div>
          <div className="p-2 border-t border-border-theme flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              className="flex-1 p-2 rounded-xl bg-background-theme text-sm border border-border-theme focus:ring-2 focus:ring-primary outline-none" 
              placeholder="Ask a question..."
            />
            <button onClick={sendMessage} className="bg-primary text-white p-2 rounded-xl hover:bg-primary-hover"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
