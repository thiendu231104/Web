import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Trash2, ArrowRight } from 'lucide-react';
import { useChatbotStore, useAuthStore } from '../store';
import type { ChatMessage, Package } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import aiAvatar from '../image/AI.png';
import PackageCard from './PackageCard';
import RegisterModal from './RegisterModal';

const Markdown = ReactMarkdown as any;

const getReactNodeText = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getReactNodeText).join('');
  if (typeof node === 'object' && node.props && node.props.children) {
    return getReactNodeText(node.props.children);
  }
  return '';
};

const highlightCurrency = (text: string) => {
  if (typeof text !== 'string') return text;
  // Regex matches numbers like 40.000đ, 40.000 đ, 40k, 40.000 VND, 40.000 đồng, etc.
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
  // Chuyển đổi dấu '•' đầu dòng thành '- ' để markdown parse chuẩn thành list
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

const SUGGESTIONS = [
  'Gói cước 10k',
  'Gói cước 50k',
  'Gói data 1 ngày 10k',
  'Gói xem Youtube giá rẻ',
  'Gói lướt TikTok thả ga',
  'Tìm gói cước miễn phí 0đ',
  'Gói combo gọi thoại + data',
  'Có gói cước nào 5G không?'
];

export default function Chatbot() {
  const { messages, isOpen, setIsOpen, sendMessage, clearHistory } = useChatbotStore();
  const { currentUser } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSubscribeOpen = (pkg: Package) => {
    if (!currentUser) {
      showToast('error', 'Vui lòng đăng nhập để đăng ký gói cước.');
      return;
    }
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    useChatbotStore.getState().hydrateHistory();
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Track if bot is typing
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender === 'user') {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };



  const handleActionClick = (action: Exclude<ChatMessage['suggestedAction'], undefined>) => {
    if (action.type === 'view_details') {
      if (action.payload) {
        navigate(`/packages/${action.payload}`);
      } else {
        navigate('/packages');
      }
      setIsOpen(false);
    } else if (action.type === 'survey') {
      navigate(action.payload);
      setIsOpen(false);
    } else if (action.type === 'subscribe') {
      navigate(`/packages/${action.payload}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end text-xs font-semibold">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 50 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[92vw] sm:w-[380px] bg-white/95 backdrop-blur-md border border-slate-100 shadow-2xl rounded-2xl flex flex-col mb-4 overflow-hidden z-50 text-left"
            style={{ minHeight: '400px', maxHeight: '75vh', height: '65vh' }}
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center space-x-3">
                <img
                  src={aiAvatar}
                  alt="Viettel AI"
                  className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-sm"
                />
                <div>
                  <h4 className="text-sm font-bold leading-tight">ViettelAI</h4>
                  <p className="text-[10px] text-white/80 font-normal">
                    Trợ lý tư vấn gói cước Viettel 24/7
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={clearHistory}
                  title="Xóa lịch sử chat"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white focus:outline-none cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white focus:outline-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/50"
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
                >
                  {msg.sender === 'bot' && (
                    <img
                      src={aiAvatar}
                      alt="AI Avatar"
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100 shadow-sm"
                    />
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div
                      aria-label={msg.sender === 'bot' ? 'Tin nhắn từ trợ lý ảo Viettel AI' : undefined}
                      className={`px-4.5 py-3.5 rounded-2xl text-xs leading-relaxed shadow-sm break-words ${msg.sender === 'user'
                        ? 'bg-primary text-white rounded-tr-none whitespace-pre-wrap'
                        : 'bg-white border border-gray-100 text-slate-800 rounded-tl-none'
                        }`}
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

                    {/* 2. Render Cards nếu có dữ liệu gói cước - Tách rõ ra ngoài bong bóng chat */}
                    {msg.sender === 'bot' && (msg.matchedPackages || msg.recommendedPackages || msg.packages) && (msg.matchedPackages || msg.recommendedPackages || msg.packages)!.length > 0 && (
                      <div className="flex overflow-x-auto gap-3 pb-2 mt-2 snap-x scrollbar-hide max-w-full">
                        {(msg.matchedPackages || msg.recommendedPackages || msg.packages)!.map((pkg, index) => (
                          <div key={`${pkg.id || pkg.ma_goi || 'pkg'}-${index}`} className="min-w-[220px] max-w-[250px] snap-start text-xs font-semibold">
                            <PackageCard pkg={pkg} onSubscribe={handleSubscribeOpen} /> 
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Render Suggested Actions */}
                    {msg.suggestedAction && (
                      <button
                        onClick={() => handleActionClick(msg.suggestedAction!)}
                        className="flex items-center space-x-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-primary font-bold px-3 py-1.5 rounded-xl text-[10px] transition-colors focus:outline-none cursor-pointer"
                      >
                        <span>{msg.suggestedAction.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start items-start gap-3">
                  <img
                    src={aiAvatar}
                    alt="AI Avatar"
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100 shadow-sm"
                  />
                  <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
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
                </div>
              )}
            </div>

            {/* Suggestions Chips - Only show when there are 0 or 1 messages and not typing */}
            {messages.length <= 1 && !isTyping && (
              <div className="px-3 py-2 border-t border-slate-50 bg-slate-50/50">
                <p className="text-[10px] text-slate-400 mb-1.5 font-normal">Gợi ý câu hỏi:</p>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto no-scrollbar">
                  {SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sendMessage(sug);
                      }}
                      className="bg-white hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-slate-200/80 cursor-pointer focus:outline-none"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2">
              <input
                type="text"
                placeholder="Nhập câu hỏi của bạn..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary/50 transition-colors"
              />
              <button
                type="submit"
                className="p-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors flex-shrink-0 focus:outline-none cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Bubble Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 border border-white/10 focus:outline-none cursor-pointer"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

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
