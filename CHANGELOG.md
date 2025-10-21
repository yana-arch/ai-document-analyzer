# Changelog

All notable changes to AI Document Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2025-10-21

### ✨ Added

- **Integrated History**: Unified history for both document analyses and CV interviews, allowing users to view and reload past sessions from a single, filterable list.
- **Complete Translation Coverage**: Added comprehensive English and Vietnamese translations for all Hub, Overview, and Breadcrumb components.

### 🔄 Changed

- **Speech-to-Text UX**: Enhanced the speech-to-text experience with a live transcript preview, a clearer "listening" indicator, and better error handling.
- **History System**: Refactored the history management logic to support multiple types of history items (documents and interviews) in a type-safe manner.
- **UI Consolidation**: Removed the separate, isolated interview history page in favor of the new integrated history list.

### 🐛 Fixed

- **Interview Timer**: Corrected a bug where the interview timer could cause an infinite evaluation loop if the user did not submit their answer. The timer now correctly auto-submits the current answer when time expires.
- **Infinite Loop in PracticeStateManager**: Fixed infinite re-rendering issue in `usePracticeSettingsHandler` hook by stabilizing dependency arrays and preventing unnecessary updates.
- **JSON Parsing Errors**: Added robust error handling for corrupted localStorage data with graceful recovery and data validation.
- **Translation System**: Updated LearningHub and InterviewResults components to use proper translation keys instead of hardcoded text.

## [2.3.0] - 2025-10-15

### ✨ Added

- **Speech-to-Text Input**: Introduced speech-to-text capability, allowing users to speak their answers in interview and practice sessions.
  - Implemented a reusable `useSpeechRecognition` hook for browser Web Speech API integration.
  - Integrated microphone input and real-time transcription into `InterviewSession.tsx` and `PreparationStep.tsx`.
  - Added necessary TypeScript declarations for Web Speech API types to ensure type safety.

## [2.2.0] - 2025-10-15

### ⚡️ Performance Optimizations

- **Optimized Initial Load Time**: Refactored module loading for core features to significantly improve the initial application load time.
- **Implemented Code Splitting**:
  - Applied lazy loading to `CVUploader` and `DocumentUploader` components, deferring the loading of heavy document-processing libraries until they are needed.
  - Resolved a mixed static/dynamic import issue for the core `aiService`, allowing it to be split into a separate chunk.
- **Reduced Bundle Size**: These changes reduce the initial JavaScript payload, leading to a faster Time-to-Interactive for all users.

## [2.1.0] - 2025-10-15

### ✨ Added

- **CV Interview Practice Feature**: Allows users to upload their CV, specify a target job position, and practice for a job interview with AI-generated questions.
- **AI-Powered Exercise Grading**: Introduces an `ExerciseGrader` component to automatically grade user-submitted exercises.
- **Document Tips Refresh**: Implemented a manual refresh for document tips and enhanced settings management for tips.
- **Enhanced Conversation Threading**: (Moved from upcoming)
- **Advanced Code Execution with Syntax Highlighting**: (Moved from upcoming)
- **Custom AI Model Selection**: (Moved from upcoming)
- **Advanced File Comparison Tools**: (Moved from upcoming)
- **Collaboration Features**: (Moved from upcoming)

## [2.0.0] - 2025-10-10

### 🎉 Major Release: ChatGPT-Inspired Modern Interface

This major version introduces a complete UI/UX overhaul with professional-grade chat interface and enhanced user experience.

### ✨ Added

#### 🚀 Core Features

- **ChatGPT-Style Chat Interface**: Complete redesign with modern message bubbles, smooth animations, and professional styling
- **Progressive Loading System**: Real-time step-by-step progress indicators during document analysis
- **Interactive Onboarding**: Welcome screen with suggested questions and guided user experience
- **Inline Message Editing**: Edit and resend chat messages with immediate feedback and keyboard shortcuts
- **Code Copy Functionality**: One-click copying of code blocks with visual confirmation feedback
- **Smart Scroll Management**: Intelligent auto-scroll with "jump to bottom" controls and smooth animations

#### 💻 User Experience

- **Enhanced Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels, screen reader support, and keyboard navigation
- **Mobile-Responsive Design**: Optimized interface for all screen sizes with touch-friendly interactions
- **Progressive Web App Ready**: Modern PWA features with smooth transitions and professional interactions
- **Advanced Caching**: Intelligent memory-based caching reducing API calls by 50-80%

#### 🛠️ Technical Improvements

- **React 19 Upgrade**: Latest React features with improved performance and developer experience
- **Docker Support**: Containerized deployment with Docker Compose for easy setup
- **Enhanced Markdown Processing**: Rich text rendering with code block syntax highlighting
- **Multiple AI Providers**: Support for Gemini, OpenRouter, and future AI provider integrations
- **Comprehensive Error Handling**: Intelligent retry mechanisms with exponential backoff

### 🔄 Changed

#### 🎨 Interface Redesign

- **Message Bubbles**: Modern rounded chat bubbles with proper alignment and spacing
- **Typography**: Enhanced font hierarchy and spacing throughout the application
- **Color Scheme**: Professional color palette with improved contrast and readability
- **Navigation**: Streamlined navigation with better visual hierarchy

#### ⚡ Performance Optimizations

- **Component Memoization**: Extensive use of `React.memo` and `useCallback` for optimal re-renders
- **Lazy Loading**: Components loaded on-demand for faster initial page load
- **Memory Management**: Intelligent cache cleanup and resource optimization
- **API Optimization**: Batch operations reducing unnecessary API calls

#### Mobile Experience

- **Touch Gestures**: Swipe and long-press interactions for mobile devices
- **Responsive Layouts**: Adaptive layouts that work seamlessly across all screen sizes
- **Input Optimization**: Mobile-optimized input fields with proper touch targets

### 🐛 Fixed

#### 🐛 Bug Fixes

- **Memory Leaks**: Fixed memory leaks in chat components and cache management
- **Accessibility Issues**: Resolved keyboard navigation and screen reader compatibility issues
- **Mobile Layout Issues**: Fixed responsive design problems on various devices
- **Loading States**: Improved loading indicators and prevented layout shifts

#### 🔧 Stability Improvements

- **Error Boundaries**: Added comprehensive error boundaries for better error recovery
- **API Reliability**: Enhanced API error handling and connection stability
- **Data Persistence**: Improved local storage reliability and data integrity
- **File Processing**: More robust file processing with better error messages

### 📚 Developer Experience

#### 🛠️ Development Tools

- **Updated Dependencies**: All dependencies updated to latest stable versions
- **Enhanced Tooling**: Improved development server and build processes
- **Type Safety**: Improved TypeScript coverage and type definitions
- **Code Organization**: Better project structure and component organization

#### 📚 Documentation

- **Comprehensive README**: Complete documentation with setup guides and deployment instructions
- **Code Comments**: Enhanced inline documentation and code comments
- **API Documentation**: Better service layer documentation and error messages

### 🔒 Security & Privacy

#### 🛡️ Security Enhancements

- **Environment Variables**: Secure API key management with environment variables
- **CORS Handling**: Improved CORS proxy implementation for web content
- **Local Storage**: Secure local storage for user preferences and cache
- **Data Sanitization**: Input sanitization and XSS protection

#### 🔐 Privacy Improvements

- **Data Minimization**: Reduced data collection and improved privacy controls
- **Local Processing**: Enhanced local document processing without external uploads
- **User Control**: Better user controls over data and preferences

### 📋 Migration Guide

#### For Existing Users

1. **Backup Settings**: Export your current settings and configurations
2. **Update Dependencies**: Run `npm install` to get latest dependencies
3. **Clear Cache**: Clear browser cache for optimal performance
4. **API Keys**: Ensure API keys are properly configured in `.env.local`

#### For Developers

1. **React Upgrade**: Code may need updates for React 19 compatibility
2. **Type Definitions**: Check and update any custom type definitions
3. **Component APIs**: Review component interfaces for any breaking changes

### 🙏 Acknowledgments

Special thanks to the Google Gemini AI team for powerful language models, the React ecosystem for excellent developer experience, and our open source community for file processing libraries and continued support.

---

## [1.0.0] - Previous Version

Initial release with basic document analysis functionality including:

- Document upload and text extraction
- Basic AI-powered analysis
- Simple quiz generation
- Multilingual support
- Local storage persistence

See commit history for detailed changes prior to this release.

---

## 📋 Version History

| Version | Date       | Description                                                  |
| ------- | ---------- | ------------------------------------------------------------ |
| 2.4.0   | 2025-10-21 | Integrated History, Complete Translation Coverage, Bug Fixes |
| 2.3.0   | 2025-10-15 | Speech-to-Text Input                                         |
| 2.2.0   | 2025-10-15 | Performance Optimizations                                    |
| 2.1.0   | 2025-10-15 | CV Interview Practice, AI Grading                            |
| 2.0.0   | 2025-10-10 | Major UI/UX overhaul with ChatGPT-inspired interface         |
| 1.0.0   | 2025-01-XX | Initial release with core functionality                      |

## 🚀 Upcoming Features (v2.2.0)

- More to come!

---

**Legend:**

- 🎉 Major release
- ✨ Added feature
- 🔄 Changed functionality
- 🐛 Fixed bug
- 📚 Documentation update
- 🛠️ Development improvement
