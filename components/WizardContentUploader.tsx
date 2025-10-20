import React, { useState, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import AttentionGuide from './shared/AttentionGuide';
import ProgressiveDisclosure from './shared/ProgressiveDisclosure';
import Card from './shared/Card';
import MobileOptimizedContainer from './shared/MobileOptimizedContainer';

type ContentType = 'document' | 'cv';
type InterviewType = 'technical' | 'behavioral' | 'situational' | 'comprehensive';

export interface ProcessResult {
  source: File | string;
  fileName?: string;
  contentType: ContentType;
  targetPosition?: string;
  interviewType?: InterviewType;
  customPrompt?: string;
}

interface WizardContentUploaderProps {
  onProcess: (result: ProcessResult) => void;
}

const WizardContentUploader: React.FC<WizardContentUploaderProps> = ({ onProcess }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Step 1: Content Type Selection
  const [contentType, setContentType] = useState<ContentType>('document');
  
  // Step 2: File/Text Input
  const [source, setSource] = useState<File | string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [textValue, setTextValue] = useState<string>('');
  
  // Step 3: CV Configuration (only for CV type)
  const [targetPosition, setTargetPosition] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const acceptTypes = '.pdf,.docx,.doc,.txt,.rtf,.odt,.epub,.html,.htm';

  const resetState = () => {
    setSource(null);
    setFileName(null);
    setTextValue('');
    setTargetPosition('');
    setInterviewType('comprehensive');
    setCustomPrompt('');
    setShowAdvancedOptions(false);
  };

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    resetState();
    setCurrentStep(2); // Move to content input step
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
      return validationError;
    }
    setSource(file);
    setFileName(file.name);
    setTextValue(''); // Clear text area if a file is chosen
    return null;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const error = processFile(files[0]);
      if (error) {
        // Show error in UI
      }
    }
  }, [processFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const error = processFile(files[0]);
      if (error) {
        // Show error in UI
      }
    }
  }, [processFile]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value);
    setSource(e.target.value);
    setFileName(null); // Clear file if text is entered
  };

  const handleSubmit = async () => {
    if (!source) {
      // Show error
      return;
    }

    if (contentType === 'cv' && !targetPosition.trim()) {
      // Show error
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
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (source) {
        if (contentType === 'document') {
          handleSubmit();
        } else {
          setCurrentStep(3);
        }
      }
    } else if (currentStep === 3) {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );

  const renderStep1 = () => (
    <div className="text-center">
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        {t('uploader.chooseType') || 'Choose Content Type'}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        {t('uploader.typeHelp') || 'Select what type of content you want to analyze'}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <button
          onClick={() => handleContentTypeChange('document')}
          className={`flex flex-col items-center p-8 rounded-2xl border-2 transition-all ${
            contentType === 'document'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {t('uploader.typeDocument') || 'General Document'}
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center max-w-xs">
            {t('uploader.documentDesc') || 'Analyze reports, articles, papers, and any text-based content'}
          </p>
        </button>

        <button
          onClick={() => handleContentTypeChange('cv')}
          className={`flex flex-col items-center p-8 rounded-2xl border-2 transition-all ${
            contentType === 'cv'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {t('uploader.typeCV') || 'CV for Interview'}
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center max-w-xs">
            {t('uploader.cvDesc') || 'Practice interviews and get feedback for your job application'}
          </p>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        {t('uploader.provideContent') || 'Provide Content'}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        {t('uploader.contentHelp') || 'Upload your file or paste your content below'}
      </p>

      <Card className="mb-6">
        <div
          ref={uploadAreaRef}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
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
            <div className={`p-4 rounded-full transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500`}>
              <UploadIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                {fileName || t('uploader.dragDrop') || 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t('uploader.supportedFormats') || `Supports: ${acceptTypes}`}
              </p>
            </div>
          </label>
        </div>
      </Card>

      <div className="flex items-center my-6">
        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
        <span className="mx-4 text-zinc-500 dark:text-zinc-400 font-medium text-sm">
          {t('uploader.or') || 'OR'}
        </span>
        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
      </div>

      <Card>
        <label htmlFor="content-text" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('uploader.pasteContent') || 'Paste Content'}
        </label>
        <textarea
          id="content-text"
          value={textValue}
          onChange={handleTextChange}
          placeholder={contentType === 'cv' ? t('uploader.pasteCV') || 'Paste your CV content here...' : t('uploader.pasteDoc') || 'Paste document content here...'}
          className="w-full h-48 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
          disabled={isProcessing}
        />
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        {t('cv.configTitle') || 'Interview Configuration'}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        {t('cv.configHelp') || 'Customize your interview experience'}
      </p>

      <Card className="mb-6">
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
      </Card>

      <Card className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          {t('cv.interviewType') || 'Interview Type'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </Card>

      <ProgressiveDisclosure
        title={t('cv.advancedOptions') || 'Advanced Options'}
        defaultExpanded={false}
        onToggle={(expanded) => setShowAdvancedOptions(expanded)}
      >
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
      </ProgressiveDisclosure>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <MobileOptimizedContainer className="py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {step}
              </div>
              {step <= 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep
                      ? 'bg-indigo-600'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <div className="">{currentStep === 1 && t('uploader.step1Desc') || 'Step 1: Choose Content Type'}</div>
          <div className="">{currentStep === 2 && t('uploader.step2Desc') || 'Step 2: Provide Content'}</div>
          <div className="">{currentStep === 3 && t('uploader.step3Desc') || 'Step 3: Configure Interview'}</div>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1 || isProcessing}
          className={`px-6 py-3 rounded-lg font-medium ${
            currentStep === 1 || isProcessing
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          {t('uploader.previous') || 'Previous'}
        </button>

        <button
          onClick={handleNext}
          disabled={isProcessing || (currentStep === 2 && !source)}
          className={`px-6 py-3 rounded-lg font-medium ${
            isProcessing || (currentStep === 2 && !source)
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {t('uploader.processing') || 'Processing...'}
            </div>
          ) : currentStep === 3 ? (
            t('uploader.startInterview') || 'Start Interview'
          ) : (
            t('uploader.next') || 'Next'
          )}
        </button>
      </div>
    </MobileOptimizedContainer>
  );
};

export default WizardContentUploader;
