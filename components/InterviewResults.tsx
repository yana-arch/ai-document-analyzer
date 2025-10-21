import React from 'react';
import { CVInterview } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface InterviewResultsProps {
  interview: CVInterview;
  onNewInterview: () => void;
  onViewHistory: () => void;
}

const InterviewResults: React.FC<InterviewResultsProps> = ({
  interview,
  onNewInterview,
  onViewHistory
}) => {
  const { t, locale } = useLanguage();

  if (!interview.feedback) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {t('interview.generatingResults')}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            {t('interview.generatingResultsDesc')}
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPositionFitColor = (fit: string): string => {
    switch (fit) {
      case 'excellent': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'good': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'fair': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'poor': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      default: return 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800';
    }
  };

  const TrophyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55.47.98.97 1.21L12 19c.55.23 1.03-.05 1.03-.62v-2.34c0-.57-.48-1.85-1.03-2.07L10 13c-.55-.22-.97.66-.97 1.66z" />
    </svg>
  );

  const TargetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  const TrendingUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4">
          <TrophyIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {t('interview.completeTitle')}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t('interview.completeSubtitle').replace('{targetPosition}', interview.targetPosition)}
        </p>
      </div>

      {/* Overall Score Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Score */}
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${getScoreColor(interview.feedback.overallScore)}`}>
              {interview.feedback.overallScore}%
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">{t('interview.overallScore')}</div>
          </div>

          {/* Position Fit */}
          <div className="text-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border mb-2 ${getPositionFitColor(interview.feedback.positionFit)}`}>
              <TargetIcon className="w-4 h-4 mr-2" />
              {interview.feedback.positionFit.charAt(0).toUpperCase() + interview.feedback.positionFit.slice(1)} Fit
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">{t('interview.positionMatch')}</div>
          </div>

          {/* Questions Completed */}
          <div className="text-center">
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {interview.answers.length}/{interview.questions.length}
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">{t('interview.questionsAnswered')}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 mb-8">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">{t('interview.summary')}</h3>
        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {interview.feedback.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Strengths */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
              <TrendingUpIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('interview.strengths')}</h3>
          </div>

          <ul className="space-y-3">
            {interview.feedback.strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-zinc-700 dark:text-zinc-300">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('interview.areasForImprovement')}</h3>
          </div>

          <ul className="space-y-3">
            {interview.feedback.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-zinc-700 dark:text-zinc-300">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8 mb-8">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">{t('interview.recommendations')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interview.feedback.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span className="text-zinc-700 dark:text-zinc-300">{recommendation}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Analysis */}
      {interview.feedback.detailedAnalysis && (
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8 mb-8">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">{t('interview.detailedAnalysis')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(interview.feedback.detailedAnalysis).map(([skill, score]) => (
              <div key={skill} className="text-center">
                <div className="mb-2">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 capitalize">
                    {skill.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(score as number)}`}>
                  {score}%
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      (score as number) >= 80 ? 'bg-green-500' :
                      (score as number) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-by-Question Breakdown */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8 mb-8">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
          {t('interview.questionBreakdown')}
        </h3>

        <div className="space-y-4">
          {interview.questions.map((question, index) => {
            const answer = interview.answers[index];
            if (!answer) return null;

            return (
              <div key={question.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 mr-2">
                        {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
                      </span>
                      {question.category && (
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          • {question.category}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {question.question}
                    </h4>
                  </div>
                  <div className={`text-lg font-bold ${getScoreColor(answer.score)}`}>
                    {answer.score}%
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 mb-3">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <strong>{t('interview.yourAnswer')}</strong> {answer.answer.length > 200
                      ? `${answer.answer.substring(0, 200)}...`
                      : answer.answer}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {answer.strengths && answer.strengths.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">{t('interview.strengths')}</h5>
                      <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        {answer.strengths.map((strength, i) => (
                          <li key={i}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {answer.improvements && answer.improvements.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">{t('interview.improvements')}</h5>
                      <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        {answer.improvements.map((improvement, i) => (
                          <li key={i}>• {improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="text-center space-x-4">
        <button
          onClick={onNewInterview}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
        >
          {t('interview.practiceAnother')}
        </button>

        <button
          onClick={onViewHistory}
          className="px-6 py-3 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-all"
        >
          {t('interview.viewHistory')}
        </button>
      </div>

      {/* Interview Info */}
      <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <p>
          {t('interview.completedInfo')
            .replace('{date}', new Date(interview.completedAt || interview.createdAt).toLocaleDateString())
            .replace('{interviewType}', interview.interviewType.charAt(0).toUpperCase() + interview.interviewType.slice(1))}
        </p>
      </div>
    </div>
  );
};

export default InterviewResults;
