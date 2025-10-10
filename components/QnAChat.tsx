import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import Card from './shared/Card';
import { Chat } from '@google/genai';
import { useLanguage } from '../contexts/LanguageContext';

interface QnAChatProps {
  documentText: string;
  fileName: string;
}

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
);


const QnAChat: React.FC<QnAChatProps> = ({ documentText, fileName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { t, locale } = useLanguage();

  useEffect(() => {
    // Initialize chat and load history when the document (identified by fileName) changes.
    chatRef.current = createChat(documentText, locale);
    
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
  }, [documentText, fileName, locale, t]);

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


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = useCallback(() => {
    setMessages([{ role: 'model', text: t('chat.initialMessage') }]);
    chatRef.current = createChat(documentText, locale);
    if (fileName) {
      try {
        localStorage.removeItem(`ai-doc-analyzer-chat_${fileName}`);
      } catch (error) {
        console.error("Failed to remove chat history from storage:", error);
      }
    }
  }, [documentText, fileName, locale, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage({ message: input });
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
    >
      <div className="flex flex-col h-[40rem]">
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-zinc-100 dark:bg-zinc-800/30 rounded-t-lg">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && (
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>
              )}
              <div className={`max-w-lg px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-sm rounded-bl-none'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>
              <div className="max-w-md px-4 py-3 rounded-lg rounded-bl-none bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-sm">
                <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse-fast [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse-fast [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse-fast"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="flex-grow w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-700 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:bg-zinc-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-colors shrink-0"
            >
              <SendIcon className="w-5 h-5"/>
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
};

export default QnAChat;
