// components/NewsletterAgent.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  BookOpen, 
  MessageCircle, 
  Zap, 
  Star, 
  Loader2,
  Mail,
  ChevronRight,
  Brain,
  Heart,
  Lightbulb,
  HelpCircle,
  Send,
  ShoppingBag,
  User
} from 'lucide-react';

interface BookRecommendation {
  id: number;
  title: string;
  description: string;
  author?: string;
  image: string | null;
  content_excerpt: string;
  ai_explanation: string;
  questions: string[];
  teaser: string;
  category: string;
}

interface NewsletterMessage {
  id: number;
  subject: string;
  content: string;
  sent_at: string;
  read: boolean;
}

interface Conversation {
  question: string;
  answer: string;
  timestamp: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthMeResponse {
  user?: User;
}

interface SubscriptionResponse {
  subscribed: boolean;
}

interface DailyRecommendationResponse {
  success: boolean;
  recommendation?: BookRecommendation;
  agent_message?: string;
  error?: string;
}

interface MessagesResponse {
  success: boolean;
  messages?: NewsletterMessage[];
  error?: string;
}

interface AskBookResponse {
  success: boolean;
  answer?: string;
  error?: string;
}

export default function NewsletterAgent() {
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<BookRecommendation | null>(null);
  const [messages, setMessages] = useState<NewsletterMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'letters' | 'chat'>('daily');
  const [agentMessage, setAgentMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = (await response.json()) as AuthMeResponse;
          if (data.user) {
            setUser(data.user);
            await checkSubscription(data.user.email);
            setIsLoadingUser(false);
            return;
          }
        }

        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            await checkSubscription(parsed.email);
            setIsLoadingUser(false);
            return;
          } catch (e) {
            console.error('Erreur parsing localStorage:', e);
          }
        }

        const cookies = document.cookie.split(';');
        const userCookie = cookies.find(c => c.trim().startsWith('user='));
        if (userCookie) {
          try {
            const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
            setUser(userData);
            await checkSubscription(userData.email);
            setIsLoadingUser(false);
            return;
          } catch (e) {
            console.error('Erreur parsing cookie:', e);
          }
        }

        setIsLoadingUser(false);
      } catch (error) {
        console.error('Erreur récupération utilisateur:', error);
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  const checkSubscription = async (email: string) => {
    if (!email) return;
    try {
      const response = await fetch('/api/newsletter/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as SubscriptionResponse;
      setIsSubscribed(data.subscribed);
    } catch (error) {
      console.error('Erreur vérification abonnement:', error);
    }
  };

  const loadDailyRecommendation = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch('/api/agent/daily-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user?.email 
        }),
      });

      const data = (await response.json()) as DailyRecommendationResponse;

      if (data.success && data.recommendation) {
        setRecommendation(data.recommendation);
        setAgentMessage(data.agent_message ?? '');
        
        if (
          data.recommendation.questions &&
          data.recommendation.questions.length > 0
        ) {
          const initialConv: Conversation[] = data.recommendation.questions.map((q) => ({
            question: q,
            answer: '',
            timestamp: new Date().toISOString()
          }));
          setConversation(initialConv);
        }
      } else {
        console.error('Erreur chargement recommandation:', data.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (loadingMessages) return;
    setLoadingMessages(true);

    try {
      const response = await fetch('/api/agent/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user?.email 
        }),
      });

      const data = (await response.json()) as MessagesResponse;

      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 🔥 FONCTION ASKQUESTION MISE À JOUR AVEC LE TITRE
  const askQuestion = async (question: string) => {
    if (!question.trim() || !recommendation) return;
    
    setIsAsking(true);
    setUserQuestion('');

    try {
      const response = await fetch('/api/agent/ask-about-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: recommendation.id,
          bookTitle: recommendation.title, // 🔥 PASSER LE TITRE
          question: question,
          email: user?.email
        }),
      });

      const data = (await response.json()) as AskBookResponse;

      if (data.success) {
        setConversation(prev => [
          ...prev,
          {
            question,
            answer: data.answer ?? '',
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        // Gérer l'erreur
        setConversation(prev => [
          ...prev,
          {
            question,
            answer:
              data.answer ||
              'Je suis désolé, je n\'ai pas pu traiter votre question.',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur question:', error);
      setConversation(prev => [
        ...prev,
        {
          question: question,
          answer: '😅 Oups ! Une erreur est survenue. Veuillez réessayer.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    
    if (activeTab === 'daily' && !recommendation && !loading) {
      await loadDailyRecommendation();
    }
    
    if (activeTab === 'letters' && messages.length === 0 && !loadingMessages) {
      await loadMessages();
    }
  };

  if (isLoadingUser || !user || !isSubscribed) return null;

  return (
    <>
      {/* BOUTON ORBE LUMINEUX */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Agent Newsletter"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-spin-slow blur-xl opacity-70"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-pulse opacity-50"></div>
          
          <div className="relative w-16 h-16 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
            <Brain className="w-8 h-8 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-bounce border-2 border-white">
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-green-800">
                AI
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* POPUP DE L'AGENT */}
      {isOpen && (
        <div className="agent-popup fixed bottom-24 right-6 z-50 w-[450px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200 animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">
          {/* En-tête avec gradient - agent-header */}
          <div className="agent-header bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-4 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">🧠 Agent Bibliothécaire</h3>
                  <p className="text-xs opacity-90 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    IA alimentée par OpenRouter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets - agent-tab */}
            <div className="flex gap-1 mt-3 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => {
                  setActiveTab('daily');
                  if (!recommendation && !loading) loadDailyRecommendation();
                }}
                className={`agent-tab flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'daily' 
                    ? 'agent-tab-active bg-white text-purple-600' 
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                📚 Lecture du jour
              </button>
              <button
                onClick={() => {
                  setActiveTab('chat');
                  if (!recommendation && !loading) loadDailyRecommendation();
                }}
                className={`agent-tab flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'chat' 
                    ? 'agent-tab-active bg-white text-purple-600' 
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                💬 Discuter
              </button>
              <button
                onClick={() => {
                  setActiveTab('letters');
                  if (messages.length === 0 && !loadingMessages) loadMessages();
                }}
                className={`agent-tab flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'letters' 
                    ? 'agent-tab-active bg-white text-purple-600' 
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                📬 Lettres ({messages.length})
              </button>
            </div>
          </div>

          {/* Corps */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'daily' && (
              <DailyRecommendationTab 
                loading={loading}
                recommendation={recommendation}
                agentMessage={agentMessage}
                onRefresh={loadDailyRecommendation}
              />
            )}

            {activeTab === 'chat' && (
              <ChatTab
                loading={loading}
                recommendation={recommendation}
                conversation={conversation}
                onAskQuestion={askQuestion}
                isAsking={isAsking}
                userQuestion={userQuestion}
                setUserQuestion={setUserQuestion}
              />
            )}

            {activeTab === 'letters' && (
              <MessagesTab 
                loading={loadingMessages}
                messages={messages}
                onRefresh={loadMessages}
                onReadMessage={(id) => {
                  fetch('/api/agent/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageId: id, email: user?.email }),
                  });
                  loadMessages();
                }}
              />
            )}
          </div>

          {/* Footer - agent-footer */}
          <div className="agent-footer border-t border-gray-100 p-3 bg-gray-50/50 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span>Agent IA • OpenRouter</span>
              </div>
              <span>✨ Nouvelle lecture chaque jour</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// ONGLET RECOMMANDATION DU JOUR
// ============================================================

function DailyRecommendationTab({ 
  loading, 
  recommendation, 
  agentMessage, 
  onRefresh 
}: { 
  loading: boolean;
  recommendation: BookRecommendation | null;
  agentMessage: string;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
        <p className="text-sm text-gray-500">L'agent analyse un livre...</p>
        <p className="text-xs text-gray-400 mt-1">Il prépare une recommandation passionnante</p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">Aucune recommandation disponible</p>
        <p className="text-xs text-gray-400 mt-1">Revenez demain pour une nouvelle découverte</p>
        <button
          onClick={onRefresh}
          className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          🔄 Essayer à nouveau
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Message de l'agent - agent-message */}
      <div className="agent-message bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-medium text-purple-700">🧠 L'agent dit :</span> {agentMessage}
          </p>
        </div>
      </div>

      {/* Carte de recommandation - agent-card */}
      <div className="agent-card bg-white rounded-xl p-4 border-2 border-purple-200 shadow-lg">
        <div className="flex gap-4">
          <div className="w-24 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-purple-300">
            {recommendation.image ? (
              <img 
                src={recommendation.image} 
                alt={recommendation.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="w-10 h-10 text-purple-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                {/* agent-book-title */}
                <h4 className="agent-book-title font-bold text-gray-900">{recommendation.title}</h4>
                {recommendation.author && (
                  <p className="text-xs text-gray-500">✍️ {recommendation.author}</p>
                )}
                <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full">
                  {recommendation.category || 'Livre'}
                </span>
              </div>
              <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            </div>
            
            {recommendation.teaser && (
              <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800 italic">💡 {recommendation.teaser}</p>
              </div>
            )}

            {/* agent-book-description */}
            {recommendation.content_excerpt && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <p className="agent-book-description text-xs text-gray-600 italic line-clamp-3">
                  "{recommendation.content_excerpt}"
                </p>
              </div>
            )}

            {recommendation.ai_explanation && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">📖 L'agent explique :</span><br />
                  {recommendation.ai_explanation}
                </p>
              </div>
            )}

            {recommendation.questions && recommendation.questions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-purple-500" />
                  Questions qui donnent envie :
                </p>
                <div className="space-y-1">
                  {/* agent-question */}
                  {recommendation.questions.slice(0, 2).map((q, i) => (
                    <p key={i} className="agent-question text-xs text-purple-600 italic">"{q}"</p>
                  ))}
                </div>
              </div>
            )}

            {/* agent-button */}
            <button className="agent-button mt-3 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition flex items-center gap-2">
              <ShoppingBag className="w-3 h-3" />
              Découvrir le livre
            </button>
          </div>
        </div>
      </div>

      {/* agent-stats */}
      <div className="agent-stats text-center text-[10px] text-gray-400 flex items-center justify-center gap-2">
        <Sparkles className="w-3 h-3 text-purple-400" />
        <span>Nouvelle recommandation chaque jour</span>
        <Sparkles className="w-3 h-3 text-pink-400" />
      </div>
    </div>
  );
}

// ============================================================
// ONGLET CHAT
// ============================================================

function ChatTab({
  loading,
  recommendation,
  conversation,
  onAskQuestion,
  isAsking,
  userQuestion,
  setUserQuestion
}: {
  loading: boolean;
  recommendation: BookRecommendation | null;
  conversation: Conversation[];
  onAskQuestion: (q: string) => void;
  isAsking: boolean;
  userQuestion: string;
  setUserQuestion: (q: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
        <p className="text-sm text-gray-500">Préparation de la discussion...</p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600">Aucune discussion disponible</p>
        <p className="text-xs text-gray-400 mt-1">Revenez demain pour un nouveau livre</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Discussion sur :</span>
          <span className="text-sm text-purple-700 font-bold">{recommendation.title}</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {conversation.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Lightbulb className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p>Aucune question posée</p>
            <p className="text-xs mt-1">Commencez à discuter du livre ci-dessous</p>
          </div>
        ) : (
          conversation.map((conv, index) => (
            <div key={index} className="space-y-2">
              {/* agent-question */}
              {conv.question && !conv.answer && (
                <div className="bg-purple-100 rounded-xl p-3 max-w-[85%]">
                  <p className="agent-question text-sm text-purple-800">❓ {conv.question}</p>
                </div>
              )}
              {/* agent-answer */}
              {conv.answer && (
                <div className="agent-answer bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 max-w-[90%] ml-auto">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{conv.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isAsking && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 max-w-[90%] ml-auto">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <p className="text-sm text-gray-500">L'agent réfléchit...</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        {/* agent-chat-input */}
        <input
          type="text"
          value={userQuestion}
          onChange={(e) => setUserQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAsking) {
              onAskQuestion(userQuestion);
            }
          }}
          placeholder="Posez une question sur le livre..."
          className="agent-chat-input flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          disabled={isAsking}
        />
        {/* agent-button */}
        <button
          onClick={() => onAskQuestion(userQuestion)}
          disabled={!userQuestion.trim() || isAsking}
          className="agent-button px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Send className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Envoyer</span>
        </button>
      </div>

      {recommendation.questions && recommendation.questions.length > 0 && conversation.length < 2 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <p className="text-xs text-gray-400 w-full">💡 Suggestions :</p>
          {recommendation.questions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              onClick={() => setUserQuestion(q)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-600 transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ONGLET MESSAGES
// ============================================================

function MessagesTab({ 
  loading, 
  messages, 
  onRefresh,
  onReadMessage 
}: { 
  loading: boolean;
  messages: NewsletterMessage[];
  onRefresh: () => void;
  onReadMessage: (id: number) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
        <p className="text-sm text-gray-500">Chargement des lettres...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">Aucune lettre reçue</p>
        <p className="text-xs text-gray-400 mt-1">Les lettres de l'admin apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div 
          key={msg.id}
          className={`p-3 rounded-xl border transition cursor-pointer hover:shadow-md ${
            msg.read 
              ? 'bg-gray-50 border-gray-200' 
              : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
          }`}
          onClick={() => onReadMessage(msg.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                {!msg.read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                )}
                {msg.subject}
              </h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {msg.content.replace(/<[^>]+>/g, '').substring(0, 150)}...
              </p>
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
              {new Date(msg.sent_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}