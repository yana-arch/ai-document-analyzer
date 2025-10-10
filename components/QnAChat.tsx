import React, { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../services/aiService';
import { ChatMessage, UserSettings } from '../types';
import Card from './shared/Card';
import { Chat } from '@google/genai';
import { useLanguage } from '../contexts/LanguageContext';
import { createMarkdownHtml } from '../utils/markdownUtils';

interface MessageActions {
  isEditing: boolean;
  editContent: string;
  showActions: boolean;
}

interface QnAChatProps {
  documentText: string;
  fileName: string;
  settings: UserSettings;
}

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
);

const DeleteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const ReloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 2-2m0 0 2 2M5 10V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4M5 10h2a1 1 0 0 1 1 1l-2 2"></path></svg>
);


const QnAChat: React.FC<QnAChatProps> = ({ documentText, fileName, settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useLanguage();

  useEffect(() => {
    // Initialize chat and load history when the document (identified by fileName) changes.
    const initChat = async () => {
      try {
        chatRef.current = await aiService.createChat(documentText, locale, settings);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        chatRef.current = null;
      }
    };

    initChat();

    if (fileName) {
        try {
            const savedHistory = localStorage.getItem(`ai-doc-analyzer-chat_${fileName}`);
            if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                    setMessages(parsedHistory);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    }

    setMessages([{ role: 'model', text: t('chat.initialMessage') }]);
  }, [documentText, fileName, locale, settings, t]);

  useEffect(() => {
    // Save history to localStorage whenever messages change, if there's a conversation.
    if (fileName && messages.length > 1) { 
        try {
            localStorage.setItem(`ai-doc-analyzer-chat_${fileName}`, JSON.stringify(messages));
        } catch(error) {
            console.error("Failed to save chat history:", error);
        }
    }
}, [messages, fileName]);


  // Handle scroll behavior
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollToBottom(!isNearBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Auto-scroll only if user is at bottom
  useEffect(() => {
    if (messagesContainerRef.current && !showScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollToBottom]);

  // Handle editing messages
  const handleEditMessage = useCallback((index: number) => {
    setEditingIndex(index);
    setEditContent(messages[index].text);
  }, [messages]);

  const handleSaveEdit = useCallback(async () => {
    if (editingIndex === null || !editContent.trim()) return;

    const updatedMessages = [...messages];
    updatedMessages[editingIndex] = { ...updatedMessages[editingIndex], text: editContent.trim() };
    setMessages(updatedMessages);

    setEditingIndex(null);
    setEditContent('');
  }, [editingIndex, editContent, messages]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditContent('');
  }, []);

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isLoading || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', text: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage({ message: messageToSend });
      const modelMessage: ChatMessage = { role: 'model', text: result.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = { role: 'model', text: t('chat.errorMessage') };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = useCallback(async () => {
    setMessages([{ role: 'model', text: t('chat.initialMessage') }]);
    try {
      chatRef.current = await aiService.createChat(documentText, locale, settings);
    } catch (error) {
      console.error("Failed to reinitialize chat:", error);
      chatRef.current = null;
    }
    if (fileName) {
      try {
        localStorage.removeItem(`ai-doc-analyzer-chat_${fileName}`);
      } catch (error) {
        console.error("Failed to remove chat history from storage:", error);
      }
    }
  }, [documentText, fileName, locale, settings, t]);

  const handleDeleteMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleReload = useCallback((modelIndex: number) => {
    if (modelIndex <= 0 || messages[modelIndex].role !== 'model') return;

    // Find the user message before this model message
    let userIndex = -1;
    for (let i = modelIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userIndex = i;
        break;
      }
    }
    if (userIndex === -1) return;

    const userText = messages[userIndex].text;
    // Remove from user to end
    setMessages(prev => prev.slice(0, userIndex));
    // Then send the user text
    handleSubmit(undefined, userText);
  }, [messages, handleSubmit]);

  const handleResend = useCallback((userIndex: number) => {
    if (userIndex <= 0 || messages[userIndex].role !== 'user') return;

    const text = messages[userIndex].text;
    // Remove from user to end
    setMessages(prev => prev.slice(0, userIndex));
    // Send the text
    handleSubmit(undefined, text);
  }, [messages, handleSubmit]);

  return (
    <Card
      title={t('chat.title')}
      actions={
        <button
            onClick={handleClearChat}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500"
            aria-label={t('chat.restart')}
            title={t('chat.restart')}
        >
            <RefreshIcon className="w-5 h-5" />
        </button>
      }
      header={
        messages.length === 1 && (
          <div className="mt-4 p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Ask me anything about your document!
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                I'm here to help you understand and analyze your content
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-4 text-center">
                💡 Try asking me
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(locale === 'vi' ? [
                  t('chat.question1Vi'),
                  t('chat.question2Vi'),
                  t('chat.question3Vi'),
                  t('chat.question4Vi'),
                ] : [
                  t('chat.question1'),
                  t('chat.question2'),
                  t('chat.question3'),
                  t('chat.question4'),
                ]).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmit(undefined, question)}
                    className="text-left p-3 text-sm bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 group"
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full group-hover:scale-125 transition-transform"></div>
                      <span className="text-zinc-700 dark:text-zinc-300">{question}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }
    >
      <div className="flex flex-col h-[40rem] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm">
        <div
        className="flex-grow overflow-y-auto px-4 py-6 space-y-6 relative [&::-webkit-scrollbar]:hidden"
        ref={messagesContainerRef}
      >
        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-20 right-4 z-10 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label={t('chat.scrollToBottom')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-4 max-w-4xl ${
            msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
          }`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-md">
                AI
              </div>
            )}
            <div className="flex flex-col gap-1 max-w-2xl group">
              <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-md ml-12'
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-tl-md mr-12'
              }`}>
                {/* Message actions on hover */}
                {index > 0 && (
                  <div className={`absolute top-2 ${
                    msg.role === 'user' ? 'right-2' : 'left-2'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-black/50 rounded-full p-1`}>
                    {msg.role === 'model' ? (
                      <button
                        onClick={() => handleReload(index)}
                        className="w-6 h-6 text-zinc-400 hover:text-white rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                        title={t('chat.reloadResponse')}
                        aria-label={t('chat.reloadResponse')}
                      >
                        <ReloadIcon className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditMessage(index)}
                        className="w-6 h-6 text-white/70 hover:text-white rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                        title={t('chat.editMessage')}
                        aria-label={t('chat.editMessage')}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(index)}
                      className="w-6 h-6 text-zinc-400 hover:text-red-400 rounded-full hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      title={t('chat.deleteMessage')}
                      aria-label={t('chat.deleteMessage')}
                    >
                      <DeleteIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Message content */}
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                      ref={editInputRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="w-full p-2 text-sm bg-transparent border-0 outline-none resize-none text-inherit"
                      rows={Math.min(editContent.split('\n').length + 1, 10)}
                      autoFocus
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        {t('chat.saveEdit')}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-xs bg-zinc-600 text-white rounded hover:bg-zinc-700 transition-colors"
                      >
                        {t('chat.cancelEdit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed prose prose-sm prose-zinc dark:prose-invert max-w-none break-words [&_pre]:bg-zinc-100 [&_pre]:dark:bg-zinc-900 [&_code]:text-indigo-600 [&_code]:dark:text-indigo-400">
                    <div dangerouslySetInnerHTML={createMarkdownHtml(msg.text)} />
                  </div>
                )}
              </div>

              {/* Message timestamp */}
              <div className={`text-xs text-zinc-500 px-1 ${
                msg.role === 'user' ? 'text-right text-white/70' : ''
              }`}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0" aria-hidden="true">
              AI
            </div>
            <div className="max-w-md px-4 py-3 rounded-lg rounded-bl-none bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-sm">
              <div className="flex items-center space-x-1" aria-label={t('chat.typingIndicator')}>
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse-fast [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse-fast [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse-fast"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
        {/* Sticky input area */}
        <div className="sticky bottom-0 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-grow relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={t('chat.placeholder')}
                  className="w-full px-4 py-3 pr-12 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none min-h-[44px] max-h-32"
                  disabled={isLoading}
                  rows={1}
                  style={{ height: 'auto', minHeight: '44px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                <div className="absolute right-3 bottom-3 text-xs text-zinc-400">
                  {input.trim() && !isLoading && (
                    <span>Enter to send</span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                aria-label={t('chat.sendMessage')}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <SendIcon className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </form>
            <div id="chat-input-help" className="text-xs text-zinc-500 mt-2 text-center">
              Press Shift+Enter for new line, Enter to send
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QnAChat;
