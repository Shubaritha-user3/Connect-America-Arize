'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Plus, ChevronDown, Menu } from 'lucide-react';
import React from 'react';
import { toast } from 'react-hot-toast';

// Define the structure for chat messages
interface Message {
  role: 'user' | 'assistant';
  content: string;
  urls?: Array<{ url: string; content: string }>;
}

// Define the structure for FAQ questions
interface Question {
  question_text: string;
  answer?: string;
}

// Define the structure for input options in the dropdown
interface InputOption {
  id: string;
  label: string;
  description: string;
}

// Add these constants at the top with other interfaces
const CHAT_SESSIONS_KEY = '_america_chat_sessions';
const MAX_SESSIONS = 10;

interface ChatSession {
  id: string;
  timestamp: number;
  messages: Message[];
  preview: string;
}

// Update the ChatStorage utility
const ChatStorage = {
  saveCurrentSession: (messages: Message[]) => {
    if (typeof window === 'undefined' || messages.length === 0) return;
    
    const currentSessionId = sessionStorage.getItem('current_session_id') || 
      new Date().getTime().toString();
    
    // Save current session ID if not exists
    if (!sessionStorage.getItem('current_session_id')) {
      sessionStorage.setItem('current_session_id', currentSessionId);
    }

    // Get existing sessions
    const sessions = ChatStorage.getAllSessions();
    
    // Update or add current session
    const currentSession: ChatSession = {
      id: currentSessionId,
      timestamp: new Date().getTime(),
      messages: messages,
      preview: messages[0]?.content || 'Empty chat'
    };

    const updatedSessions = [currentSession, ...sessions.filter(s => s.id !== currentSessionId)]
      .slice(0, MAX_SESSIONS);

    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));
  },

  getAllSessions: (): ChatSession[] => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CHAT_SESSIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  getCurrentSession: (): Message[] => {
    if (typeof window === 'undefined') return [];
    const currentSessionId = sessionStorage.getItem('current_session_id');
    if (!currentSessionId) return [];

    const sessions = ChatStorage.getAllSessions();
    return sessions.find(s => s.id === currentSessionId)?.messages || [];
  },

  clearCurrentSession: () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('current_session_id');
  },

  clearAllSessions: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CHAT_SESSIONS_KEY);
    sessionStorage.removeItem('current_session_id');
  }
};

// Loading Spinner component
const LoadingSpinner = () => (
  <svg 
    className="animate-spin h-4 w-4" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// MarkdownChat component for rendering markdown content with consistent styling
const MarkdownChat = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-slate max-w-none w-full">
      <style jsx global>{`
        /* Base Typography */
        .prose {
          @apply text-base leading-relaxed w-full;
        }

        /* List Styles */
        .prose ul {
          @apply list-none pl-0 w-full;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .prose ul > li {
          @apply relative flex items-start;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
          white-space: normal; /* Ensure proper wrapping */
        }
        
        .prose ul > li:before {
          content: "•";
          @apply absolute text-gray-600;
          left: 0;
          margin-right: 0.5rem;
          font-size: 1.25rem;
          line-height: 1.5rem;
        }

        /* Title and content alignment */
        .prose li strong {
          @apply text-gray-800 font-semibold inline-flex items-center mr-1;
        }
        
        .prose li p {
          @apply text-gray-700 mt-0 ml-0;
          display: inline;
          white-space: normal; /* Ensure proper wrapping */
        }

        /* Ensure proper wrapping and prevent orphaned punctuation */
        .prose li > div {
          @apply flex-1;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        /* Prevent orphaned punctuation */
        .prose p, .prose li {
          text-wrap: pretty;
          hanging-punctuation: last;
        }
      `}</style>

      <ReactMarkdown className="prose">
        {content}
      </ReactMarkdown>
    </div>
  );
};

// ChatMessage component for displaying individual messages
const ChatMessage = ({ 
  message, 
  index, 
  loading,
  getDocumentTitle,
  handleDownload 
}: { 
  message: Message;
  index: number;
  loading: boolean;
  getDocumentTitle: (url: string) => string;
  handleDownload: (url: string) => Promise<void>;
}) => {
  return (
    <div className="mb-2 w-full">
      <div className={`${
        message.role === 'assistant' 
          ? 'bg-white shadow-sm' 
          : 'bg-[#F5F7FF] shadow-md'
      } py-4 sm:py-5 px-4 sm:px-6 rounded-lg mx-2 sm:mx-4 w-full`}>
        <div className="text-sm font-medium text-gray-600 mb-2">
          {message.role === 'assistant' ? 'AI Assistant' : 'You'}
        </div>
        <div className="text-gray-800">
          {message.role === 'assistant' ? (
            <MarkdownChat content={message.content} />
          ) : (
            <div className="text-gray-800">
              {message.content}
            </div>
          )}
        </div>
      </div>
      {message.urls && message.urls.length > 0 && (
        <References 
          urls={message.urls} 
          getDocumentTitle={getDocumentTitle} 
          handleDownload={handleDownload} 
        />
      )}
    </div>
  );
};

// References component for displaying document references
const References = ({ 
  urls, 
  getDocumentTitle,
  handleDownload 
}: { 
  urls: Array<{ url: string; content: string }>;
  getDocumentTitle: (url: string) => string;
  handleDownload: (url: string) => Promise<void>;
}) => {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mx-4 mt-3 mb-4">
      <h2 className="text-xl font-semibold text-gray-800 bg-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 mb-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Referenced Documents
      </h2>
      <div className="space-y-3">
        {urls.map(({ url }, index) => (
          <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors bg-white shadow-sm hover:shadow-md">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-semibo ld">#{index + 1}</span>
                <h3 className="text-gray-900 text-lg font-medium">
                  {getDocumentTitle(url)}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {url.includes('.pdf') ? 'PDF Document' : 
                 url.includes('.doc') ? 'Word Document' : 
                 'Document'}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <a 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-1 sm:flex-initial justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </a>
              <button   
                onClick={() => handleDownload(url)}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors flex-1 sm:flex-initial justify-center"
              > 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ChatPage() {
  // Initialize with empty array
  const [messages, setMessages] = useState<Message[]>([]);
  const initialized = useRef(false);

  // Load messages and handle refresh in useEffect
  useEffect(() => {
    if (!initialized.current) {
      if (window.performance && window.performance.navigation.type === 1) {
        // On page refresh, clear current session
        ChatStorage.clearCurrentSession();
        setMessages([]);
      } else {
        // Load current session if exists
        const currentMessages = ChatStorage.getCurrentSession();
        setMessages(currentMessages);
      }
      
      // Load all sessions for sidebar
      const sessions = ChatStorage.getAllSessions();
      setRecentSessions(sessions);
      
      initialized.current = true;
    }
  }, []);

  // Update the messages save effect
  useEffect(() => {
    if (initialized.current && messages.length > 0) {
      ChatStorage.saveCurrentSession(messages);
      setRecentSessions(ChatStorage.getAllSessions());
    }
  }, [messages]);

  // State management for chat functionality
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textareaHeight, setTextareaHeight] = useState('60px');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<InputOption>({
    id: 'default',
    label: 'Default',
    description: 'Standard chat input'
  });
  
  // References for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // State for FAQ questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Available input options for the dropdown
  const inputOptions: InputOption[] = [
    {
      id: 'default',
      label: 'Default',
      description: 'Standard chat input'
    },
    {
      id: 'advice',
      label: 'Advice',
      description: 'Get advice on specific topics'
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionSelect = (option: InputOption) => {
    setSelectedOption(option);
    setIsDropdownOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Simple scrollToBottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to format document titles
  const getDocumentTitle = (url: string) => {
    const filename = url.split('/').pop() || '';
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\.[^/.]+$/, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle document downloads
  const handleDownload = async (url: string) => {
    try {
      // Show loading state if needed
      setIsDownloading(true);

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const filename = url.split('/').pop() || 'document';

      // Create and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // Show success message if needed
      toast.success('Download completed successfully');
      
    } catch (error) {
      console.error('Download failed:', error);
      // Show error message to user
      toast.error('Failed to download the file. Please try again.');
    } finally {
      // Reset loading state if needed
      setIsDownloading(false);
    }
  };
 
  // Send messages to the API
  const sendMessageToAPI = async (message: string, inputType: string = 'default') => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        input_type: inputType,
        chat_history: messages
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return await response.json();
  };

  // Update handleSubmit to properly handle scrolling for current question
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const messageId = messages.length;
    const userMessage: Message = { role: 'user', content: inputValue };
    
    // Add the user message
    setMessages(prev => [...prev, userMessage]);
    
    // Ensure scroll to the new message
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    setInputValue('');
    setError(null);
    setLoading(true);
    setLoadingMessageId(messageId);

    try {
      const aiResponse = await sendMessageToAPI(inputValue);
      
      // Add AI response and scroll only if it's for the current query
      if (messageId === messages.length - 1) {
        setMessages(prev => [...prev, aiResponse]);
        // Ensure scroll after AI response
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (err) {
      console.error('Chat Error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMessageId(null);
    }
  };

  // Update handleQuestionClick to include proper scrolling
  const handleQuestionClick = async (question: string) => {
    if (loading) return;
    
    const messageId = messages.length;
    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    
    // Ensure scroll to the new question
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    setError(null);
    setLoading(true);
    setLoadingMessageId(messageId);

    try {
      const aiResponse = await sendMessageToAPI(question);
      if (messageId === messages.length - 1) {
        setMessages(prev => [...prev, aiResponse]);
        // Ensure scroll after AI response
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (err) {
      console.error('FAQ Question Error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMessageId(null);
    }
  };

  // Add loadingMessageId to track which message is loading
  const [loadingMessageId, setLoadingMessageId] = useState<number | null>(null);

  // Handle textarea height adjustments
  const updateTextareaHeight = (element: HTMLTextAreaElement) => {
    const minHeight = 60;
    const maxHeight = 150;
    
    element.style.height = 'auto';
    
    const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
    
    element.style.height = `${newHeight}px`;
    setTextareaHeight(`${newHeight}px`);
  };

  // Initialize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      updateTextareaHeight(textareaRef.current);
    }
  }, []);

  // Fetch FAQ questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setQuestionsLoading(true);
        setQuestionError(null);
        
        const response = await fetch('/api/questions');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data.questions)) {
          throw new Error('Invalid response format');
        }
        
        setQuestions(data.questions);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestionError('Failed to load suggested questions');
        setQuestions([]); // Reset questions on error
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Add a clear chat function (optional)
  const clearChat = () => {
    setMessages([]);
    ChatStorage.clearCurrentSession();
  };
 
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);

  // Add this state for FAQ questions
  const [faqQuestions, setFaqQuestions] = useState<Array<{ question: string; answer: string }>>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add this function to fetch FAQ questions
  const loadFaqQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      setLoadError(null);
      const response = await fetch('/api/questions');
      if (!response.ok) {
        throw new Error('Failed to load FAQ questions');
      }
      const data = await response.json();
      setFaqQuestions(data.questions);
    } catch (error) {
      console.error('Error loading FAQ questions:', error);
      setLoadError('Failed to load suggested questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Add this useEffect to load questions when component mounts
  useEffect(() => {
    loadFaqQuestions();
  }, []);

  // Add with other state declarations
  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <div className="flex fixed inset-0 overflow-hidden">
      {/* Left Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:relative
        w-64 flex-none
        bg-[#0A0F5C] text-white
        transition-transform duration-300 ease-in-out
        z-40 lg:z-auto
        h-full
      `}>
        <div className="p-4 flex flex-col h-full">
          <div className="mb-8 hidden lg:block">
            <h1 className="text-xl font-bold">America</h1>
            <p className="text-sm text-gray-300 mt-2">AI Support Assistant</p>
          </div>
          
          <nav className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-teal-400">💬</span>
              <span className="text-teal-400 font-semibold">Recent Chats</span>
            </div>
            
            <div className="space-y-2">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="p-2 rounded hover:bg-blue-900 cursor-pointer truncate text-sm"
                    onClick={() => {
                      if (session.id === sessionStorage.getItem('current_session_id')) return;
                      if (window.confirm('Load this chat session? Current chat will be cleared.')) {
                        ChatStorage.clearCurrentSession();
                        sessionStorage.setItem('current_session_id', session.id);
                        setMessages(session.messages);
                      }
                    }}
                  >
                    <div className="text-gray-300 text-xs mb-1">
                      {new Date(session.timestamp).toLocaleDateString()}
                    </div>
                    {session.preview}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm">No recent chats</div>
              )}
            </div>
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer">
              <span>⚙️</span>
              <span>Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Header */}
        <div className="bg-white flex-none border-b shadow-sm">
          <div className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex items-center gap-4">
                <button 
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu size={24} className="text-gray-700" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">CA AI SuperBot</h2>
                  <p className="text-sm text-gray-500">Ask me anything to support our customers</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  onClick={() => {
                    ChatStorage.clearCurrentSession();
                    setMessages([]);
                  }}
                >
                  <Plus size={18} />
                  <span className="text-sm">New Chat</span>
                </button>
                <button 
                  className="flex items-center gap-1 px-3 py-2 bg-[#0A0F5C] text-white rounded-md hover:bg-[#1a2070] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/documents';
                  }}
                >
                  <FileText size={18} />
                  <span className="text-sm">Documents</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-gray-50 overflow-y-auto w-full">
          <div className="w-full px-4 py-4">
            {/* Welcome Screen */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-6 py-6">
                <div className="text-center mb-4">
                  <p className="text-2xl font-semibold text-gray-800">👋 Welcome to Connect America Support</p>
                  <p className="text-base text-gray-600 mt-2">How can I help you today?</p>
                </div>
                
                <div className="w-full max-w-4xl mx-auto">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3 px-4">
                    Frequently Asked Questions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 mb-6">
                    {questionsLoading ? (
                      // Loading skeleton
                      Array(3).fill(null).map((_, index) => (
                        <div
                          key={index}
                          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse h-24"
                        >
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))
                    ) : questionError ? (
                      // Error state
                      <div className="col-span-3 text-center text-red-600 py-4">
                        {questionError}
                      </div>
                    ) : questions.length === 0 ? (
                      // Empty state
                      <div className="col-span-3 text-center text-gray-500 py-4">
                        No suggested questions available
                      </div>
                    ) : (
                      // Render questions
                      questions.map((q, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuestionClick(q.question_text)}
                          disabled={loading}
                          className="bg-white px-4 py-3 rounded-lg shadow-sm hover:shadow-md
                            border border-gray-200 text-left
                            hover:border-blue-500 transition-all
                            group relative
                            disabled:cursor-not-allowed disabled:opacity-70
                            min-h-[80px] w-full"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 shrink-0 mt-1 group-hover:text-blue-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth="2" 
                                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </span>
                            <span className="text-gray-700 group-hover:text-gray-900 font-medium text-sm line-clamp-3">
                              {q.question_text}
                            </span>
                          </div>
                          {loading && (
                            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                              <div className="animate-spin text-blue-600 text-xl">⟳</div>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Chat Messages with improved spacing */}
            <div className="space-y-6 w-full">
              {messages.map((message, index) => (
                <React.Fragment key={index}>
                  <ChatMessage
                    message={message}
                    index={index}
                    loading={loading}
                    getDocumentTitle={getDocumentTitle}
                    handleDownload={handleDownload}
                  />
                  {loadingMessageId === index && (
                    <div className="bg-white py-3 px-4 rounded-lg mx-4 my-6">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <div className="animate-spin">⟳</div>
                        <div>Processing your request...</div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Error message with proper spacing */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-4 my-6">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#F0F2FF] flex-none">
          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="flex items-center gap-4 p-4"
          >
            {/* Input Type Selector */}
            <div className="relative flex-none" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center h-12 w-12 bg-white rounded-lg
                  hover:bg-gray-50 transition-colors border border-gray-200
                  text-gray-600 hover:text-gray-800"
              >
                <Plus className="w-5 h-5" />
              </button>

              {isDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-lg shadow-lg
                  border border-gray-200 py-2 z-50">
                  {inputOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50
                        ${selectedOption.id === option.id ? 'bg-gray-50' : ''}
                        flex flex-col gap-1`}
                    >
                      <span className="font-medium text-gray-800">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex-1 relative">
              <textarea 
                ref={textareaRef}
                className="w-full bg-[#F5F7FF] focus:bg-white
                  text-gray-800 text-base font-medium placeholder-gray-400
                  border-0 outline-none resize-none 
                  py-4 px-6
                  rounded-lg
                  overflow-auto transition-all duration-200
                  focus:ring-2 focus:ring-blue-500
                  cursor-text
                  leading-normal"
                style={{
                  height: textareaHeight,
                  maxHeight: '150px',
                  minHeight: '60px',
                }}
                placeholder={selectedOption.id === 'advice' 
                  ? "Ask for advice..."
                  : "Type your message here..."}
                value={inputValue}
                onChange={(e) => {
                  e.preventDefault();
                  const target = e.target;
                  setInputValue(target.value);
                  updateTextareaHeight(target);
                }}
                onFocus={(e) => {
                  updateTextareaHeight(e.target);
                }}
                onClick={(e) => {
                  e.currentTarget.focus();
                }}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim()) {
                      formRef.current?.requestSubmit();
                    }
                  }
                }}
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* Send Button */}
            <button 
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="flex-none bg-[#0A0F5C] text-white 
                p-2.5
                rounded-lg hover:bg-blue-900 
                transition-colors 
                disabled:opacity-50 
                disabled:cursor-not-allowed
                flex items-center justify-center
                h-12 w-12"
            >
              {loading ? (
                <span className="animate-spin text-xl">⟳</span>
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  className="w-5 h-5"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13.5 19l7-7-7-7M20.5 12H4" 
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
