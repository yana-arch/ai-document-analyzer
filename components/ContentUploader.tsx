
import React, { useState, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import AttentionGuide from './shared/AttentionGuide';

type ContentType = 'document' | 'cv';
type InterviewType = 'technical' | 'behavioral' | 'situational' | 'comprehensive';

export interface ProcessResult {
  source: File | string;
  fileName?: string;
  contentType: ContentType;
  // Optional CV-specific fields
  targetPosition?: string;
  interviewType?: InterviewType;
  customPrompt?: string;
}

interface ContentUploaderProps {
  onProcess: (result: ProcessResult) => void;
}

const ContentUploader: React.FC<ContentUploaderProps> = ({ onProcess }) => {
  const { t } = useLanguage();

  // General state
  const [contentType, setContentType] = useState<ContentType>('document');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // File/Text/URL state
  const [source, setSource] = useState<File | string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [textValue, setTextValue] = useState<string>('');
  const [urlValue, setUrlValue] = useState<string>('');

  // CV-specific state
  const [targetPosition, setTargetPosition] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const acceptTypes = '.pdf,.docx,.doc,.txt,.rtf,.odt,.epub,.html,.htm';

  const resetState = () => {
    setSource(null);
    setFileName(null);
    setTextValue('');
    setUrlValue('');
    setError(null);
    setIsProcessing(false);
  };

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    resetState();
  };

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
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSource(file);
    setFileName(file.name);
    setTextValue(''); // Clear text area if a file is chosen
    setUrlValue(''); // Clear URL if a file is chosen
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value);
    setSource(e.target.value);
    setFileName(null); // Clear file if text is entered
    setUrlValue(''); // Clear URL if text is entered
    if (e.target.value.trim()) setError(null);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlValue(e.target.value);
    setSource(e.target.value);
    setFileName(null); // Clear file if URL is entered
    setTextValue(''); // Clear text if URL is entered
    if (e.target.value.trim()) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!source) {
      setError('Please upload a file, enter a URL, or paste content.');
      return;
    }

    if (contentType === 'cv' && !targetPosition.trim()) {
      setError('Please specify the target position for the interview.');
      return;
    }

    setIsProcessing(true);
    try {
      const result: ProcessResult = {
        source,
        fileName: source instanceof File ? source.name : undefined,
        contentType,
        ...(contentType === 'cv' && {
          targetPosition,
          interviewType,
          customPrompt,
        }),
      };
      onProcess(result);
    } catch (err) {
      setError('Failed to process content. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );

  const renderFileUploadArea = () => (
    <div
      ref={uploadAreaRef}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
      onClick={() => fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group mb-6 ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
          : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        id="file-upload"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInputChange}
        accept={acceptTypes}
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500`}>
          <UploadIcon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-zinc-700 dark:text-zinc-300 font-medium">
            {fileName || 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('uploader.supportedFormatsHint') || `Supports: ${acceptTypes}`}
          </p>
        </div>
      </label>
    </div>
  );

  const renderUrlInput = () => (
    <div>
      <label htmlFor="content-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        {t('uploader.urlInput') || 'Enter URL'}
      </label>
      <input
        type="url"
        id="content-url"
        value={urlValue}
        onChange={handleUrlChange}
        placeholder={t('uploader.urlPlaceholder') || 'https://example.com/article'}
        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        disabled={isProcessing}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        Supports web pages, articles, and online documents
      </p>
    </div>
  );

  const renderTextArea = () => (
    <div>
      <label htmlFor="content-text" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        {t('uploader.pasteContent') || 'Paste Content'}
      </label>
      <textarea
        id="content-text"
        value={textValue}
        onChange={handleTextChange}
        placeholder={contentType === 'cv' ? 'Paste your CV content here...' : 'Paste document content here...'}
        className="w-full h-48 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
        disabled={isProcessing}
      />
    </div>
  );

  const renderCVConfig = () => (
    <div className="bg-white dark:bg-zinc-800/50 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50 mt-8">
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        {t('cv.configTitle') || 'Interview Configuration'}
      </h3>
      <div className="space-y-6">
        <div>
          <label htmlFor="target-position" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('cv.targetPosition') || 'Target Position'} *
          </label>
          <input
            type="text"
            id="target-position"
            value={targetPosition}
            onChange={(e) => setTargetPosition(e.target.value)}
            placeholder={t('cv.targetPositionPlaceholder') || "e.g., Senior Software Engineer"}
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isProcessing}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            {t('cv.interviewType') || 'Interview Type'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'technical', label: t('cv.typeTechnical') || 'Technical' },
              { value: 'behavioral', label: t('cv.typeBehavioral') || 'Behavioral' },
              { value: 'situational', label: t('cv.typeSituational') || 'Situational' },
              { value: 'comprehensive', label: t('cv.typeComprehensive') || 'Comprehensive' }
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setInterviewType(type.value as InterviewType)}
                disabled={isProcessing}
                className={`p-4 text-left border rounded-lg transition-all ${
                  interviewType === type.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
                }`}
              >
                <div className="font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="custom-prompt" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('cv.customPrompt') || 'Custom Instructions (Optional)'}
          </label>
          <textarea
            id="custom-prompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={t('cv.customPromptPlaceholder') || "Focus on specific skills..."}
            className="w-full h-24 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          {t('uploader.mainTitle') || 'AI Document Analyzer'}
        </h2>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          {t('uploader.mainSubtitle') || 'Upload content to get AI-powered analysis, insights, and practice.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1">
            <button
              type="button"
              onClick={() => handleContentTypeChange('document')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                contentType === 'document'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              📄 {t('uploader.typeDocument') || 'General Document'}
            </button>
            <button
              type="button"
              onClick={() => handleContentTypeChange('cv')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                contentType === 'cv'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              👨‍💼 {t('uploader.typeCV') || 'CV for Interview'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800/50 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t('uploader.contentTitle') || 'Provide Content'}
          </h3>
          
          {renderFileUploadArea()}

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
            <span className="mx-4 text-zinc-500 dark:text-zinc-400 font-medium text-sm">OR</span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
          </div>

          {renderUrlInput()}

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
            <span className="mx-4 text-zinc-500 dark:text-zinc-400 font-medium text-sm">OR</span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
          </div>

          {renderTextArea()}
        </div>

        {contentType === 'cv' && renderCVConfig()}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={isProcessing || !source}
            className={`px-8 py-4 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              isProcessing ? 'animate-pulse' : ''
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('uploader.processing') || 'Processing...'}
              </div>
            ) : (
              t('uploader.submitButton') || 'Analyze Content'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContentUploader;
