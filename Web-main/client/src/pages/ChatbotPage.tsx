import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, ArrowRight } from 'lucide-react';
import { useChatbotStore, useAuthStore } from '../store';
import type { ChatMessage, Package } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import aiAvatar from '../image/AI.png';
import PackageCard from '../components/PackageCard';
import RegisterModal from '../components/RegisterModal';

const Markdown = ReactMarkdown as any;

const highlightCurrency = (text: string) => {
  if (typeof text !== 'string') return text;
  const regex = /(\b\d{1,3}(?:\.\d{3})*(?:\s*|)(?:đ|VND|VNĐ|đồng|k\b))/gi;
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (regex.test(part)) {
      return <span key={i} className="font-semibold text-red-600 bg-red-50/50 px-1 rounded">{part}</span>;
    }
    return part;
  });
};

const processNodeWithCurrency = (node: any): any => {
  if (!node) return null;
  if (typeof node === 'string') {
    return highlightCurrency(node);
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => <span key={i}>{processNodeWithCurrency(child)}</span>);
  }
  if (typeof node === 'object' && node.props) {
    const children = node.props.children;
    if (children) {
      return {
        ...node,
        props: {
          ...node.props,
          children: processNodeWithCurrency(children)
        }
      };
    }
  }
  return node;
};

const preprocessBotText = (text: string) => {
  if (!text) return '';
  let cleanText = text.replace(/^[ \t]*•[ \t]*/gm, '- ');
  cleanText = cleanText.replace(/\n\s*\n/g, '\n\n');
  return cleanText;
};

const typingBubbleVariants = {
  start: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const typingDotVariants = {
  start: {
    y: '0%',
  },
  animate: {
    y: ['0%', '-60%', '0%'],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut' as any,
    },
  },
};

/**
 * Component Memoized danh sách tin nhắn cho Chatbot Page
 */
interface ChatPageMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onActionClick: (action: Exclude<ChatMessage['suggestedAction'], undefined>) => void;
  onSubscribeOpen: (pkg: Package) => void;
}

const ChatPageMessageList = React.memo(function ChatPageMessageList({
  messages,
  isTyping,
  onActionClick,
  onSubscribeOpen
}: ChatPageMessageListProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-start gap-4`}
        >
          {msg.sender === 'bot' && (
            <img 
              src={aiAvatar} 
              alt="AI Avatar" 
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-100 shadow-sm"
            />
          )}
          <div className="max-w-[80%] space-y-2">
            <div
              className={msg.sender === 'user' ? 'user-message whitespace-pre-wrap break-words text-xs leading-7 shadow-sm' : 'ai-message break-words text-xs leading-7 shadow-sm'}
              style={msg.sender === 'user'
                ? { padding: '10px 15px', borderRadius: '12px 12px 0 12px', backgroundColor: '#E61B2E', color: 'white' }
                : { padding: '10px 15px', borderRadius: '12px 12px 12px 0', backgroundColor: '#f4f4f4', color: '#333' }
              }
            >
              {msg.sender === 'user' ? (
                msg.text.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="font-bold text-white">
                      {part}
                    </strong>
                  ) : part
                )
              ) : (
                <div className="bot-msg-markdown space-y-2 text-xs leading-relaxed text-slate-800">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      li: ({ children, ...props }: any) => (
                        <li className="ml-5 list-disc mt-1 mb-1 text-slate-700 leading-relaxed text-xs sm:text-[13px]" {...props}>
                          {processNodeWithCurrency(children)}
                        </li>
                      ),
                      ul: ({ children }: any) => <ul className="list-disc ml-5 space-y-1 text-slate-700 leading-relaxed mt-1 mb-2">{children}</ul>,
                      p: ({ children }: any) => <p className="mb-3 last:mb-0 text-slate-800 leading-relaxed text-xs sm:text-[13px]">{processNodeWithCurrency(children)}</p>,
                      strong: ({ children }: any) => <strong className="font-bold text-slate-900">{children}</strong>,
                      table: ({ children }: any) => <table className="w-full border-collapse border border-slate-200 my-2">{children}</table>,
                      th: ({ children }: any) => <th className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-semibold">{children}</th>,
                      td: ({ children }: any) => <td className="border border-slate-200 px-3 py-1.5">{children}</td>,
                      h1: ({ children }: any) => <h1 className="text-xs font-bold mt-2 mb-1">{children}</h1>,
                      h2: ({ children }: any) => <h2 className="text-[11px] font-bold mt-2 mb-1">{children}</h2>,
                      h3: ({ children }: any) => <h3 className="text-[10px] font-bold mt-1.5 mb-1">{children}</h3>,
                    }}
                  >
                    {preprocessBotText(msg.text)}
                  </Markdown>
                </div>
              )}
            </div>

            {/* Render Cards bên ngoài bong bóng chat */}
            {msg.sender === 'bot' && (msg.matchedPackages || msg.recommendedPackages || msg.packages) && (msg.matchedPackages || msg.recommendedPackages || msg.packages)!.length > 0 && (
              <div className="flex overflow-x-auto gap-3 pb-2 mt-2 snap-x scrollbar-hide max-w-full">
                {(msg.matchedPackages || msg.recommendedPackages || msg.packages)!.map((pkg, index) => (
                  <div key={`${pkg.id || pkg.ma_goi || 'pkg'}-${index}`} className="min-w-[220px] max-w-[250px] snap-start text-xs font-semibold">
                    <PackageCard pkg={pkg} onSubscribe={onSubscribeOpen} /> 
                  </div>
                ))}
              </div>
            )}

            {/* Render Suggested Actions */}
            {msg.suggestedAction && (
              <button
                onClick={() => onActionClick(msg.suggestedAction!)}
                className="flex items-center space-x-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-primary font-bold px-3.5 py-2 rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
              >
                <span>{msg.suggestedAction.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start items-start gap-4">
          <img 
            src={aiAvatar} 
            alt="AI Avatar" 
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-100 shadow-sm"
          />
          <div className="flex flex-col space-y-1">
            <div 
              className="ai-message flex items-center shadow-sm border border-slate-100"
              style={{ padding: '10px 15px', borderRadius: '12px 12px 12px 0', backgroundColor: '#ffffff', color: '#333' }}
            >
              <motion.div
                variants={typingBubbleVariants}
                initial="start"
                animate="animate"
                className="flex space-x-1.5 py-1"
              >
                <motion.div variants={typingDotVariants} className="w-1.5 h-1.5 bg-primary rounded-full" />
                <motion.div variants={typingDotVariants} className="w-1.5 h-1.5 bg-primary/70 rounded-full" />
                <motion.div variants={typingDotVariants} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
              </motion.div>
            </div>
            <span className="text-[9px] text-slate-400 font-bold animate-pulse ml-1">AI đang suy nghĩ...</span>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Component Input Form riêng biệt với local state cho Chatbot Page
 */
const ChatPageInputForm = React.memo(function ChatPageInputForm({
  onSend
}: {
  onSend: (text: string) => void;
}) {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSend(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-slate-200/50 bg-slate-50/80 p-4 z-10 rounded-b-2xl">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Nhập câu hỏi của bạn (Nhấn Enter để gửi, Shift + Enter để xuống dòng)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-primary/30 focus:shadow-[0_0_0_4px_rgba(230,27,46,0.1)] transition-all resize-none max-h-32 min-h-[38px] leading-relaxed no-scrollbar"
          />
          <button
            type="submit"
            className="p-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors flex-shrink-0 focus:outline-none cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
});

export default function ChatbotPage() {
  const { messages, sendMessage, clearHistory } = useChatbotStore();
  const { currentUser } = useAuthStore();
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleSubscribeOpen = useCallback((pkg: Package) => {
    if (!currentUser) {
      showToast('error', 'Vui lòng đăng nhập để đăng ký gói cước.');
      return;
    }
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  }, [currentUser, showToast]);

  const handleActionClick = useCallback((action: Exclude<ChatMessage['suggestedAction'], undefined>) => {
    if (action.type === 'view_details') {
      if (action.payload) {
        navigate(`/packages/${action.payload}`);
      } else {
        navigate('/packages');
      }
    } else if (action.type === 'survey') {
      navigate(action.payload);
    } else if (action.type === 'subscribe') {
      navigate(`/packages/${action.payload}`);
    }
  }, [navigate]);

  const handleSend = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  useEffect(() => {
    useChatbotStore.getState().hydrateHistory();
  }, [currentUser]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Track if bot is typing
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender === 'user') {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [messages]);

  return (
    <div className="max-w-5xl w-full mx-auto flex flex-col h-[calc(100vh-180px)] min-h-[500px] text-xs font-semibold bg-transparent">
      {/* Flat Header */}
      <div className="border-b border-slate-200/60 p-4 flex items-center justify-between z-10 bg-white rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <img 
            src={aiAvatar} 
            alt="Viettel AI" 
            className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
          />
          <div>
            <h4 className="text-base font-bold leading-tight text-slate-800">ViettelAI</h4>
            <p className="text-xs text-slate-500 font-normal">
              Trợ lý tư vấn gói cước Viettel 24/7
            </p>
          </div>
        </div>
        <button
          onClick={clearHistory}
          title="Xóa lịch sử chat"
          className="p-2 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-colors text-slate-500 hover:text-slate-800 focus:outline-none cursor-pointer flex items-center space-x-1 bg-white"
        >
          <Trash2 className="w-4 h-4 text-slate-550" />
          <span className="text-[10px] font-bold">Xóa lịch sử</span>
        </button>
      </div>

      {/* Main Chat Area - Flat Style */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 bg-slate-50/50 no-scrollbar"
      >
        <ChatPageMessageList
          messages={messages}
          isTyping={isTyping}
          onActionClick={handleActionClick}
          onSubscribeOpen={handleSubscribeOpen}
        />
      </div>

      {/* Input Form Footer với isolated state */}
      <ChatPageInputForm onSend={handleSend} />
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ zIndex: 99999 }} className={`fixed top-20 right-6 px-4 py-3 rounded-lg shadow-lg border-l-4 text-xs font-semibold bg-white text-slate-800 ${toastMsg.type === 'success' ? 'border-emerald-500' : 'border-red-500'
          }`}>
          {toastMsg.text}
        </div>
      )}

      {/* Subscription Modal overlay */}
      {selectedPkg && (
        <RegisterModal
          isOpen={isModalOpen}
          onClose={() => {
            setSelectedPkg(null);
            setIsModalOpen(false);
          }}
          pkg={selectedPkg}
          onSuccess={(msg) => showToast('success', msg)}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </div>
  );
}
