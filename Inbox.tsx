import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get('chat');

  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { dbUser } = useAuth();

  // Mark notifications as read when chat is active
  useEffect(() => {
    if (!user || !activeChatId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('chatId', '==', activeChatId),
      where('read', '==', false)
    );

    const markAsRead = async () => {
      const snap = await getDocs(q);
      const promises = snap.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }));
      await Promise.all(promises);
    };

    markAsRead();
  }, [user, activeChatId]);

  // Fetch all chats for the current user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatList);
      setLoadingChats(false);
    });

    return unsubscribe;
  }, [user]);

  // Fetch messages for the active chat
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chats/${activeChatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return unsubscribe;
  }, [user, activeChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const now = new Date().toISOString();
      
      // Add message
      await addDoc(collection(db, `chats/${activeChatId}/messages`), {
        senderId: user.uid,
        text: messageText,
        createdAt: now
      });

      // Update chat's last message
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: messageText,
        lastMessageTime: now
      });

      // Notify recipient
      const recipientId = activeChat.buyerId === user.uid ? activeChat.sellerId : activeChat.buyerId;
      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        message: `${dbUser?.name || 'Someone'} sent you a message: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
        listingId: activeChat.listingId,
        chatId: activeChatId,
        read: false,
        type: 'message',
        createdAt: now
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  if (!user) return null;

  return (
    <div className="bg-primary-light rounded-2xl border border-border-theme shadow-md overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex transition-all">
      
      {/* Chat List (Sidebar) */}
      <div className={`w-full md:w-1/3 border-r border-border-theme flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border-theme bg-background-theme">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Messages
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-12 h-12 bg-orange-200/50 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-orange-200/50 rounded w-1/2"></div>
                    <div className="h-3 bg-orange-200/50 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-text-secondary flex flex-col items-center">
              <MessageSquare className="w-12 h-12 text-primary/20 mb-3" />
              <p>No messages yet.</p>
              <p className="text-sm mt-1">Start a chat from a listing!</p>
            </div>
          ) : (
            chats.map(chat => {
              const isBuyer = chat.buyerId === user.uid;
              const otherPersonName = isBuyer ? chat.sellerName : chat.buyerName;
              
              return (
                <button
                  key={chat.id}
                  onClick={() => setSearchParams({ chat: chat.id })}
                  className={`w-full text-left p-4 border-b border-border-theme hover:bg-background-theme transition-all flex gap-3 items-center ${activeChatId === chat.id ? 'bg-primary/10' : ''}`}
                >
                  <div className="w-12 h-12 bg-background-theme text-primary rounded-full flex items-center justify-center shrink-0 border border-border-theme">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-semibold text-text-primary truncate">{otherPersonName}</h3>
                      {chat.lastMessageTime && (
                        <span className="text-[10px] text-text-secondary shrink-0 ml-2">
                          {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-primary truncate mb-1">{chat.listingTitle}</p>
                    <p className="text-sm text-text-secondary truncate">{chat.lastMessage || 'No messages yet'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className={`w-full md:w-2/3 flex flex-col bg-background-theme/30 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-primary-light border-b border-border-theme flex items-center gap-3">
              <button 
                onClick={() => navigate('/inbox')}
                className="md:hidden p-2 -ml-2 text-text-secondary hover:bg-background-theme rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-background-theme text-primary rounded-full flex items-center justify-center shrink-0 border border-border-theme">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">
                  {activeChat.buyerId === user.uid ? activeChat.sellerName : activeChat.buyerName}
                </h3>
                <p className="text-xs text-text-secondary">Regarding: <span className="font-medium text-text-primary">{activeChat.listingTitle}</span></p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-2">
                  <MessageSquare className="w-12 h-12 opacity-20 text-primary" />
                  <p>Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === user.uid;
                  const showTime = index === 0 || new Date(msg.createdAt).getTime() - new Date(messages[index-1].createdAt).getTime() > 5 * 60 * 1000;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showTime && (
                        <span className="text-[10px] text-text-secondary mb-2 mt-2">
                          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                        </span>
                      )}
                      <div 
                        className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                          isMe 
                            ? 'bg-primary text-white rounded-br-sm' 
                            : 'bg-primary-light border border-border-theme text-text-primary rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-primary-light border-t border-border-theme">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-background-theme border-border-theme focus:bg-primary-light border focus:border-primary rounded-full outline-none transition-all text-text-primary"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-all shrink-0 shadow-md"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-3">
            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center border border-border-theme shadow-sm">
              <MessageSquare className="w-10 h-10 text-primary/20" />
            </div>
            <p className="font-medium text-text-primary">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
