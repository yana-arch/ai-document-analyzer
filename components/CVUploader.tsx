import React, { useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { CVProcessingService } from '../services/cvProcessingService';

interface CVUploaderProps {
  onCVProcess: (cvContent: string, cvFileName?: string) => void;
  onTargetPositionChange: (position: string) => void;
  onInterviewTypeChange: (type: 'technical' | 'behavioral' | 'situational' | 'comprehensive') => void;
  onCustomPromptChange: (prompt: string) => void;
}

const CVUploader: React.FC<CVUploaderProps> = ({
  onCVProcess,
  onTargetPositionChange,
  onInterviewTypeChange,
  onCustomPromptChange
}) => {
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [targetPosition, setTargetPosition] = useState('');
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'situational' | 'comprehensive'>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useLanguage();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCvText(e.target.value);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFile(file);
      setError(null);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setCvFile(file);

      // Auto-process file if it's a text file
      if (file.type === 'text/plain') {
        try {
          setIsProcessing(true);
          const text = await CVProcessingService.extractTextFromCV(file);
          setCvText(text);
        } catch (error) {
          setError('Failed to read file. Please paste the CV content directly.');
        } finally {
          setIsProcessing(false);
        }
      }
    }
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cvText.trim() && !cvFile) {
      setError('Please provide CV content either by uploading a file or pasting text.');
      return;
    }

    if (!targetPosition.trim()) {
      setError('Please specify the target position.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      let finalCvContent = cvText;

      // If file is uploaded but no text, try to extract from file
      if (cvFile && !cvText.trim()) {
        try {
          finalCvContent = await CVProcessingService.extractTextFromCV(cvFile);
        } catch (fileError) {
          setError('Could not read CV file. Please paste the CV content directly.');
          return;
        }
      }

      // Update parent component state
      onCVProcess(finalCvContent, cvFile?.name);
      onTargetPositionChange(targetPosition);
      onInterviewTypeChange(interviewType);
      onCustomPromptChange(customPrompt);

    } catch (error) {
      setError('Failed to process CV. Please try again.');
      console.error('CV processing error:', error);
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

  const FileTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          CV Interview Assistant
        </h2>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Upload your CV and get AI-powered interview practice tailored to your target position
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* CV Input Section */}
        <div className="bg-white dark:bg-zinc-800/50 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            CV Content
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            Provide your CV content either by uploading a file or pasting the text directly
          </p>

          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group mb-6 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <input
              type="file"
              id="cv-file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".txt,.pdf,.doc,.docx"
              disabled={isProcessing}
            />
            <label htmlFor="cv-file-upload" className="flex flex-col items-center justify-center space-y-4">
              <div className={`p-4 rounded-full transition-colors ${
                isDragOver
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500'
              }`}>
                <UploadIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {cvFile ? `Selected: ${cvFile.name}` : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Supports PDF, DOC, DOCX, and TXT files
                </p>
              </div>
            </label>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
            <span className="mx-4 text-zinc-500 dark:text-zinc-400 font-medium text-sm">OR</span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
          </div>

          {/* Text Input Area */}
          <div>
            <label htmlFor="cv-text" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Paste CV Content
            </label>
            <textarea
              id="cv-text"
              value={cvText}
              onChange={handleTextChange}
              placeholder="Paste your CV content here... Include your experience, skills, education, and any other relevant information."
              className="w-full h-48 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Interview Configuration Section */}
        <div className="bg-white dark:bg-zinc-800/50 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Interview Configuration
          </h3>

          {/* Target Position */}
          <div className="mb-6">
            <label htmlFor="target-position" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Target Position *
            </label>
            <input
              type="text"
              id="target-position"
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              placeholder="e.g., Senior Software Engineer, Product Manager, Data Analyst"
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={isProcessing}
              required
            />
          </div>

          {/* Interview Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Interview Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'technical', label: 'Technical', desc: 'Focus on technical skills and knowledge' },
                { value: 'behavioral', label: 'Behavioral', desc: 'Past experiences and soft skills' },
                { value: 'situational', label: 'Situational', desc: 'Hypothetical scenarios and judgment' },
                { value: 'comprehensive', label: 'Comprehensive', desc: 'All aspects combined' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setInterviewType(type.value as any)}
                  disabled={isProcessing}
                  className={`p-4 text-left border rounded-lg transition-all ${
                    interviewType === type.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="mb-6">
            <label htmlFor="custom-prompt" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add any specific requirements or focus areas for the interview questions..."
              className="w-full h-24 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={isProcessing || (!cvText.trim() && !cvFile)}
            className={`px-8 py-4 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              isProcessing ? 'animate-pulse' : ''
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing CV...
              </div>
            ) : (
              'Start Interview Practice'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CVUploader;
