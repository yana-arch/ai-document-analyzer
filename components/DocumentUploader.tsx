
import React, { useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentUploaderProps {
  onProcess: (source: File | string) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onProcess }) => {
  const [url, setUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onProcess(url.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onProcess(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onProcess(e.dataTransfer.files[0]);
    }
  }, [onProcess]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto py-16 sm:py-24 text-center">
      <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">{t('uploader.title')}</h2>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        {t('uploader.subtitle')}
      </p>

      <div className="mt-12 bg-white dark:bg-zinc-800/50 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50">
        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('uploader.urlPlaceholder')}
            className="flex-grow w-full px-5 py-3 bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-colors"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md shrink-0"
          >
            {t('uploader.urlButton')}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
          <span className="mx-4 text-zinc-500 dark:text-zinc-400 font-medium text-sm">{t('uploader.or')}</span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
        </div>
        
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors group ${
                isDragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'
            }`}
        >
            <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept=".txt,.md,.html"
            />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-2">
                <UploadIcon className="w-10 h-10 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 transition-colors"/>
                <p className="text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{t('uploader.fileUpload')}</span> {t('uploader.dragAndDrop')}
                </p>
                <p className="text-sm text-zinc-500">{t('uploader.fileTypes')}</p>
            </label>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploader;
