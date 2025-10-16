import React, { useState, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import AttentionGuide from './shared/AttentionGuide';

interface DocumentUploaderProps {
  onProcess: (source: File | string) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onProcess }) => {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [urlValue, setUrlValue] = useState<string>('');
  const [isUrlMode, setIsUrlMode] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [urlMetadata, setUrlMetadata] = React.useState<{
    title?: string;
    size?: string;
    type?: string;
    canDownload?: boolean;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const acceptTypes = '.pdf,.docx,.doc,.txt,.rtf,.odt,.epub,.html';
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  // Check if URL points to a downloadable document
  const checkUrlDownloadable = useCallback(async (url: string) => {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebBrowser/1.0)'
        }
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      const downloadableTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/html',
        'application/rtf',
        'application/vnd.oasis.opendocument.text',
        'application/epub+zip'
      ];

      const canDownload = downloadableTypes.some(type => contentType?.includes(type));

      let size = '';
      if (contentLength) {
        const bytes = parseInt(contentLength);
        if (bytes < 1024 * 1024) {
          size = `${(bytes / 1024).toFixed(1)} KB`;
        } else {
          size = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
      }

      setUrlMetadata({
        title: contentType ? contentType.split('/')[1].toUpperCase() : 'UNKNOWN',
        size: size || 'Unknown size',
        type: contentType || 'Unknown type',
        canDownload: canDownload && !!contentLength
      });

    } catch (error) {
      console.warn('Failed to check URL:', error);
      setUrlMetadata({
        canDownload: false,
        title: 'Web Page'
      });
    }
  }, []);

  // Download document from URL
  const downloadFromUrl = useCallback(async (url: string) => {
    if (!urlMetadata.canDownload || isDownloading) return;

    setIsDownloading(true);
    try {
      // Create AbortController for download
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebBrowser/1.0)'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalSize = contentLength ? parseInt(contentLength) : 0;

      if (totalSize > maxFileSize) {
        throw new Error(t('uploader.maxSizeExceeded') || 'File too large');
      }

      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let receivedSize = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedSize += value.length;

          if (totalSize > 0) {
            setDownloadProgress((receivedSize / totalSize) * 100);
          }
        }

        // Combine chunks into single Uint8Array
        const combined = new Uint8Array(receivedSize);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        // Create blob and convert to file
        const blob = new Blob([combined]);
        const contentType = response.headers.get('content-type') || urlMetadata.type || 'application/octet-stream';
        const fileName = url.split('/').pop()?.split('?')[0] || 'downloaded-document';
        const extension = fileName.includes('.') ? fileName.split('.').pop() : contentType.split('/')[1];
        const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${extension}`;

        const file = new File([blob], fullFileName, { type: contentType });
        onProcess(file);
      }

    } catch (error) {
      console.error('Download failed:', error);
      alert(t('uploader.downloadFailed') || 'Failed to download document from URL');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [urlMetadata, isDownloading, maxFileSize, t, onProcess]);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return t('uploader.maxSizeExceeded') || `File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`;
    }

    const allowedExtensions = acceptTypes.split(',').map(ext => ext.trim().replace('.', ''));
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return t('uploader.invalidFormat') || `File format not supported. Supported: ${acceptTypes}`;
    }

    return null;
  };

  const processFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    onProcess(file);
  }, [onProcess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    if (!isUrlMode) {
      fileInputRef.current?.click();
    }
  }, [isUrlMode]);

  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (urlValue.trim()) {
      onProcess(urlValue.trim());
      setUrlValue('');
    }
  }, [urlValue, onProcess]);

  const handleUrlInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlValue(value);

    // Check if URL is downloadable when user types
    if (value.trim() && value.includes('http')) {
      // Debounce the check
      const timeoutId = setTimeout(() => {
        checkUrlDownloadable(value.trim());
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    } else {
      setUrlMetadata({});
    }
  }, []);

  const handleModeToggle = useCallback(() => {
    setIsUrlMode(!isUrlMode);
  }, [isUrlMode]);

  const FileIcon: React.FC = () => (
    <svg className="w-16 h-16 text-indigo-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const renderUploadArea = () => (
    <AttentionGuide
      targetRef={uploadAreaRef}
      animation="highlight"
      delay={2000}
      duration={3000}
      repeat={2}
    >
      <div
        ref={uploadAreaRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative cursor-pointer transition-all duration-300 ease-in-out p-8 rounded-2xl border-2 border-dashed
          ${isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-105'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20'
          }
          text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
        `}
      >
        <FileIcon />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('uploader.title') || 'Upload Document'}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('uploader.description') || 'Drag & drop a document or click to select'}
          </p>
        </div>

        {/* Format hints */}
        <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
            <p className="font-medium">{t('uploader.supportedFormats') || 'Supported formats:'}</p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {acceptTypes.split(',').map((type, index) => (
                <span key={index} className="px-2 py-1 bg-white dark:bg-zinc-700 rounded">
                  {type.trim().toUpperCase()}
                </span>
              ))}
            </div>
            <p className="text-center">Max: {maxFileSize / (1024 * 1024)}MB</p>
          </div>
        </div>

        {/* Quick action suggestions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center justify-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>AI Analysis</span>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Q&A Chat</span>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Smart Tips</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={acceptTypes}
          className="hidden"
        />
      </div>
    </AttentionGuide>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {t('uploader.welcomeTitle') || 'Document Intelligence Analyzer'}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          {t('uploader.welcomeDesc') ||
            'Upload any document to get instant AI-powered analysis, key insights, topics extraction, entity recognition, and much more.'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1">
          <button
            onClick={() => setIsUrlMode(false)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              !isUrlMode
                ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            📄 {t('uploader.fileUpload') || 'Upload File'}
          </button>
          <button
            onClick={() => setIsUrlMode(true)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              isUrlMode
                ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            🔗 {t('uploader.urlPlaceholder') ? t('uploader.urlButton')?.replace('URL', '') : 'Analyze URL'}
          </button>
        </div>
      </div>

      {isUrlMode ? (
        <div className="space-y-4">
          {/* URL Input Form */}
          <form onSubmit={handleUrlSubmit}>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={urlValue}
                    onChange={handleUrlInputChange}
                    placeholder={t('uploader.urlPlaceholder') || 'Enter a public URL (https://...)'}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!urlValue.trim() || isDownloading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all font-medium flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-8.0 0 7 7 0 018 0z" />
                    </svg>
                    {t('uploader.urlButton') || 'Analyze URL'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* URL Metadata Display */}
          {urlValue.trim() && Object.keys(urlMetadata).length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Document Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Type:</span>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{urlMetadata.title || 'Checking...'}</div>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Size:</span>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{urlMetadata.size || 'Checking...'}</div>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Content-Type:</span>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{urlMetadata.type || 'Checking...'}</div>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                  <div className="font-medium">
                    {urlMetadata.canDownload === true ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Downloadable
                      </span>
                    ) : urlMetadata.canDownload === false ? (
                      <span className="text-orange-600 dark:text-orange-400">
                        Web Page
                      </span>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar during download */}
              {isDownloading && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Downloading...</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {renderUploadArea()}
        </>
      )}

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => setIsUrlMode(!isUrlMode)}
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm underline focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 rounded px-1"
        >
          {isUrlMode ? t('uploader.fileUpload') : t('uploader.or') || 'or'} {isUrlMode ? t('uploader.fileUpload') : t('uploader.urlButton')}
        </button>
        <button
          onClick={() => onProcess('sample')}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 rounded px-1"
        >
          {t('uploader.trySample') || 'Try with sample document →'}
        </button>
      </div>
    </div>
  );
};

export default DocumentUploader;
