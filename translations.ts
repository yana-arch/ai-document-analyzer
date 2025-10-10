const translations = {
  en: {
    header: {
      title: "AI Document Analyzer",
      analyzeAnother: "Analyze Another Document",
    },
    loader: {
      analyzing: "Analyzing document... this may take a moment.",
    },
    error: {
      title: "Analysis Failed",
      tryAgain: "Try Again",
      unknown: "An unknown error occurred during document processing. Please ensure your API key is configured correctly.",
    },
    uploader: {
      title: "Unlock Insights from Any Document",
      subtitle: "Upload a file or enter a public URL to get an AI-powered summary, key topics, and an interactive Q&A session.",
      urlPlaceholder: "Enter a public URL (e.g., https://...)",
      urlButton: "Analyze URL",
      or: "OR",
      fileUpload: "Click to upload",
      dragAndDrop: "or drag and drop",
      fileTypes: "PDF, TXT, DOCX, MD, HTML",
    },
    dashboard: {
      analysisFor: "Analysis for:",
      fullDocumentText: "Full Document Text",
    },
    summary: {
      title: "AI Summary",
    },
    topics: {
      title: "Key Topics",
    },
    entities: {
      title: "Entities & Sentiment",
      overallSentiment: "Overall Sentiment",
      namedEntities: "Named Entities",
      noEntities: "No entities found.",
    },
    chat: {
      title: "Interactive Q&A",
      restart: "Restart conversation",
      initialMessage: "Hello! Ask me anything about the document.",
      errorMessage: "Sorry, I encountered an error. Please try again.",
      placeholder: "Ask a follow-up question...",
    },
    quiz: {
      title: "Knowledge Check",
      idleTitle: "Ready to test your knowledge?",
      idleSubtitle: "Configure and generate a short quiz based on the document's content.",
      generateButton: "Generate Quiz",
      generating: "Generating your quiz...",
      grading: "Grading your answers...",
      question: "Question",
      of: "of",
      previous: "Previous",
      next: "Next",
      finish: "Finish Quiz",
      completeTitle: "Quiz Complete!",
      score: "You scored",
      totalScore: "Total Score:",
      outOf: "out of",
      explanation: "Explanation:",
      retake: "Take New Quiz",
      error: {
        api: "Failed to generate a quiz. The AI model might have been unable to create questions for this text.",
        noQuestions: "Please select at least one question to generate."
      },
      options: {
        mc: "Multiple Choice",
        written: "Written Answer"
      },
      writtenPlaceholder: "Type your answer here...",
      yourAnswer: "Your Answer:",
      aiFeedback: "AI Feedback:",
      noAnswer: "(No answer provided)"
    },
    history: {
      title: "Previously Analyzed",
      analyzedOn: "Analyzed on:",
    }
  },
  vi: {
    header: {
      title: "Trình phân tích tài liệu AI",
      analyzeAnother: "Phân tích tài liệu khác",
    },
    loader: {
      analyzing: "Đang phân tích tài liệu... việc này có thể mất một chút thời gian.",
    },
    error: {
      title: "Phân tích thất bại",
      tryAgain: "Thử lại",
      unknown: "Đã xảy ra lỗi không xác định trong quá trình xử lý tài liệu. Vui lòng đảm bảo khóa API của bạn được định cấu hình chính xác.",
    },
    uploader: {
      title: "Khám phá thông tin chi tiết từ mọi tài liệu",
      subtitle: "Tải lên một tệp hoặc nhập URL công khai để nhận bản tóm tắt, các chủ đề chính và phiên Hỏi & Đáp tương tác do AI cung cấp.",
      urlPlaceholder: "Nhập URL công khai (ví dụ: https://...)",
      urlButton: "Phân tích URL",
      or: "HOẶC",
      fileUpload: "Nhấp để tải lên",
      dragAndDrop: "hoặc kéo và thả",
      fileTypes: "PDF, TXT, DOCX, MD, HTML",
    },
    dashboard: {
      analysisFor: "Phân tích cho:",
      fullDocumentText: "Toàn văn tài liệu",
    },
    summary: {
      title: "Tóm tắt bởi AI",
    },
    topics: {
      title: "Chủ đề chính",
    },
    entities: {
      title: "Thực thể & Sắc thái",
      overallSentiment: "Sắc thái tổng thể",
      namedEntities: "Các thực thể được đặt tên",
      noEntities: "Không tìm thấy thực thể nào.",
    },
    chat: {
      title: "Hỏi & Đáp tương tác",
      restart: "Bắt đầu lại cuộc trò chuyện",
      initialMessage: "Xin chào! Hãy hỏi tôi bất cứ điều gì về tài liệu này.",
      errorMessage: "Xin lỗi, tôi đã gặp lỗi. Vui lòng thử lại.",
      placeholder: "Đặt câu hỏi tiếp theo...",
    },
    quiz: {
      title: "Kiểm tra kiến thức",
      idleTitle: "Sẵn sàng kiểm tra kiến thức của bạn?",
      idleSubtitle: "Cấu hình và tạo một bài kiểm tra ngắn dựa trên nội dung của tài liệu.",
      generateButton: "Tạo bài kiểm tra",
      generating: "Đang tạo bài kiểm tra của bạn...",
      grading: "Đang chấm điểm câu trả lời của bạn...",
      question: "Câu hỏi",
      of: "trên",
      previous: "Trước",
      next: "Tiếp theo",
      finish: "Hoàn thành",
      completeTitle: "Đã hoàn thành bài kiểm tra!",
      score: "Bạn đã đạt",
      totalScore: "Tổng điểm:",
      outOf: "trên",
      explanation: "Giải thích:",
      retake: "Làm lại bài kiểm tra",
      error: {
        api: "Không thể tạo bài kiểm tra. Mô hình AI có thể không tạo được câu hỏi cho văn bản này.",
        noQuestions: "Vui lòng chọn ít nhất một câu hỏi để tạo."
      },
      options: {
        mc: "Trắc nghiệm",
        written: "Tự luận"
      },
      writtenPlaceholder: "Nhập câu trả lời của bạn vào đây...",
      yourAnswer: "Câu trả lời của bạn:",
      aiFeedback: "Phản hồi từ AI:",
      noAnswer: "(Không có câu trả lời)"
    },
    history: {
      title: "Đã phân tích trước đây",
      analyzedOn: "Phân tích vào:",
    }
  }
};

export default translations;