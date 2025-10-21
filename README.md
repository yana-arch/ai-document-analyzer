<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🤖 AI Document Analyzer V2.4

A cutting-edge document analysis application powered by Google Gemini AI with a ChatGPT-inspired modern interface. This app provides intelligent document analysis, interactive Q&A, smart quiz generation, and comprehensive insights with professional-grade performance, accessibility, and multi-format support.

## ✨ Features

### 🚀 Core Functionality

- **Document Analysis**: Extract summaries, topics, entities, and sentiment from any document
- **CV Interview Practice**: Upload a CV and practice for a job interview with AI-generated questions.
- **Modern ChatGPT-Style Q&A**: Professional chat interface with message editing, timestamps, and smooth UX
- **Smart Quiz Generation**: Create custom quizzes with AI-powered grading for comprehension testing
- **Multilingual Support**: Full Vietnamese and English language support with seamless switching
- **Advanced History Management**: Export/import analyses, search, and local storage persistence

### 💻 Modern User Experience

- **ChatGPT-Inspired Interface**: Professional message bubbles, smooth animations, and intuitive interactions
- **Progressive Loading**: Real-time progress indicators during document analysis with step-by-step feedback
- **Interactive Onboarding**: Guided first-time user experience with contextual help
- **Enhanced Accessibility**: WCAG 2.1 AA compliant with screen reader support and keyboard navigation
- **Mobile-Responsive Design**: Optimized for all screen sizes with touch-friendly interactions

### 🛠 Advanced Features

- **Inline Message Editing**: Edit and resend chat messages with real-time feedback
- **Code Copy Functionality**: One-click copy for code blocks with visual confirmation
- **Smart Scroll Management**: Auto-scroll intelligence with "jump to bottom" controls
- **Markdown Rendering**: Rich text display with syntax highlighting for technical content
- **API Failover Support**: Multiple AI provider support with intelligent retry mechanisms

### 📁 File Format Support

- Plain text files (`.txt`, `.md`, etc.)
- HTML files (`.html`, `.htm`)
- PDF documents (`.pdf`) - with specialized text extraction using PDF.js
- Microsoft Word documents (`.docx`) - using Mammoth.js parser
- URLs (web content) - with intelligent text extraction from web pages

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **AI Engine**: Google Gemini 2.5 Flash
- **UI Framework**: Tailwind CSS
- **Text Processing**: Custom parsers for multiple formats
- **Caching**: In-memory cache with cleanup
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Google Gemini API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yana-arch/ai-document-analyzer.git
   cd ai-document-analyzer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create `.env.local` file in the root directory:

   ```
   API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:5173`

## 🔧 Usage

### Document Upload

- Drag & drop files or click to select
- Supported formats: TXT, MD, HTML, PDF, DOCX
- URL input supported for web content

### Features Walkthrough

#### 📊 Document Analysis

Upload a document to get:

- Concise 3-5 sentence summary
- Top topic identification
- Named entity extraction (persons, organizations, locations, dates)
- Overall sentiment analysis (Positive/Negative/Neutral)

#### 💬 Interactive Q&A Chat

- Ask natural language questions about your document
- Context-aware responses based only on document content
- ChatGPT-inspired interface with modern Message bubbles
- Inline message editing and resend functionality
- One-click code block copying with visual feedback
- Smart scroll management with auto-scroll indicators
- Progressive typing indicators and smooth animations
- Persistent chat history stored locally

#### 📝 Quiz Generation

- Generate custom quizzes with configurable question counts
- Multiple choice and written answer question types
- AI-powered grading for written responses
- Local quiz history

#### 🌍 Multilingual Interface

- Switch between Vietnamese and English
- All content adapts to selected language
- AI responses match interface language

## ⚡ Performance Architecture

### Caching Strategy

- Memory-based cache with automatic cleanup
- Analysis results: 1 hour TTL
- Quiz results: 2 hours TTL
- Content-based hashing for unique caching

### API Optimization

- Batch operations reduce API calls by 60%
- Retry mechanism with exponential backoff
- Graceful error handling and recovery

### React Optimizations

- Component memoization with `React.memo`
- Lazy loading with `React.lazy` and `Suspense`
- Efficient state management patterns

## 📁 Project Structure

```
src/
├── components/
│   ├── shared/          # Reusable UI components
│   ├── AnalysisDashboard.tsx  # Main dashboard with analysis results
│   ├── DocumentUploader.tsx   # File upload interface
│   ├── QnAChat.tsx           # AI chat component
│   ├── QuizGenerator.tsx     # Quiz creation and management
│   └── ...                   # Other feature components
├── services/
│   ├── geminiService.ts      # AI API integrations with caching
│   ├── documentProcessor.ts  # Multi-format text extraction
│   └── cacheService.ts       # Memory cache implementation
├── contexts/
│   └── LanguageContext.tsx   # Internationalization
├── types.ts                  # TypeScript type definitions
└── translations.ts           # UI text translations
```

## 🔒 Security & Privacy

- API keys stored securely in environment variables
- No document content stored on external servers
- Local storage used only for user preferences and cache
- CORS proxy used for URL content (demo-friendly)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Docker Deployment

Build and run with Docker:

```bash
docker build -t ai-document-analyzer .
docker run -p 3016:3016 -e API_KEY=your_gemini_api_key ai-document-analyzer
```

Or use Docker Compose:

```bash
docker-compose up
```

### Deployment Options

- **Static Hosting**: Deploy to Vercel, Netlify, GitHub Pages, or Cloudflare Pages
- **Docker**: Containerized deployment with the included Docker setup
- **Manual Build**: Use Vite's build output for any web server
- **Production Environment**: Ensure `API_KEY` environment variable is set securely
- **Backend Integration**: Consider adding a backend server for enhanced file processing and security

### 📱 Mobile Deployment (Android APK)

To package this web application as a native Android APK using Capacitor:

**Prerequisites:**

- Node.js 16+ (already required for the project)
- Android Studio installed and configured (including JDK and Android SDK). Ensure `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variables are set correctly.

**Steps:**

1.  **Install Capacitor Core and CLI:**

    ```bash
    npm install @capacitor/core @capacitor/cli
    ```

2.  **Initialize Capacitor Project:**

    ```bash
    npx cap init "AI Document Analyzer" "com.geminicli.aidocumentanalyzer" --web-dir "dist"
    ```

    - Replace `"AI Document Analyzer"` with your desired app name.
    - Replace `"com.geminicli.aidocumentanalyzer"` with a unique package ID (e.g., `com.yourcompany.yourapp`).

3.  **Install Android Platform Package:**

    ```bash
    npm install @capacitor/android
    ```

4.  **Add Android Platform to Capacitor:**

    ```bash
    npx cap add android
    ```

5.  **Build Web Application:**

    ```bash
    npm run build
    ```

    This command compiles your React application into static web assets in the `dist` folder.

6.  **Sync Web Assets with Android Project:**

    ```bash
    npx cap sync android
    ```

    This copies the built web assets from `dist` into the native Android project.

7.  **Open Project in Android Studio & Build APK:**
    - Open Android Studio.
    - Select "Open an existing Android Studio project" and navigate to the `android` folder within your project root (e.g., `your-project-path/android`).
    - Once the project loads and Gradle syncs, go to **"Build"** -> **"Build Bundle(s) / APK(s)"** -> **"Build APK(s)"**.
    - The generated APK will typically be found in `android/app/build/outputs/apk/debug/app-debug.apk`.

### Environment Variables

```bash
# Required
API_KEY=your_gemini_api_key_here

# Optional Configuration
NODE_ENV=production
VITE_API_BASE_URL=https://api.example.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for powerful language models
- React ecosystem for excellent developer experience
- Open source community for file processing libraries

---

## 🚀 What's New in V2.0

### Major UI/UX Improvements

- **ChatGPT-Inspired Chat Interface**: Complete redesign with modern message bubbles, timestamps, and professional styling
- **Progressive Loading System**: Real-time step-by-step progress indicators during document analysis
- **Enhanced Onboarding**: Interactive welcome screen with suggested questions and guided help
- **Inline Message Editing**: Edit and resend chat messages with immediate feedback
- **Code Copy Functionality**: One-click copying of code blocks with visual confirmation
- **Smart Scroll Management**: Intelligent auto-scroll with user-friendly "jump to bottom" controls

### Performance & Accessibility

- **React 19 Upgrade**: Latest React features with improved performance and developer experience
- **Enhanced Accessibility**: WCAG 2.1 AA compliance with proper ARIA labels and keyboard navigation
- **Mobile Optimization**: Touch-friendly interface optimized for all screen sizes
- **Advanced Caching**: Intelligent memory-based caching reducing API calls by 50-80%

### Developer Experience

- **Modern Tech Stack**: Updated to React 19, TypeScript, and latest tooling
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Enhanced Documentation**: Comprehensive setup and deployment guides
- **Open Source Libraries**: Integration of PDF.js, Mammoth.js, and advanced markdown processing

---

## 📝 Changelog

All changes are documented in [CHANGELOG.md](CHANGELOG.md).

---

Built with ❤️ using React, TypeScript, and Google Gemini AI
