import React, { useState, useEffect } from 'react';
import { QuizQuestion, WrittenAnswerQuestion, MultipleChoiceQuestion, SRSItem } from '../types';
import { spacedRepetitionService } from '../services/spacedRepetitionService';
import Card from './shared/Card';

const SpacedRepetition: React.FC = () => {
  const [reviewQueue, setReviewQueue] = useState<SRSItem[]>([]);
  const [currentItem, setCurrentItem] = useState<SRSItem | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    setReviewQueue(spacedRepetitionService.getItemsForReview(20));
  }, []);

  useEffect(() => {
    if (reviewQueue.length > 0 && !currentItem) {
      setCurrentItem(reviewQueue[0]);
    }
  }, [reviewQueue, currentItem]);

  const handleAnswer = (quality: number) => {
    if (!currentItem) return;

    spacedRepetitionService.processAnswer(currentItem.id, quality);
    setIsRevealed(false);
    // Move to next item
    const newQueue = reviewQueue.slice(1);
    setReviewQueue(newQueue);
    setCurrentItem(newQueue[0] || null);
  };

  if (!currentItem) {
    return (
      <Card>
        <div className="p-8 text-center">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Review Complete!</h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">You have finished all your due items for now. Great job!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">Spaced Repetition Review</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">You have {reviewQueue.length} items to review.</p>
        
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-lg">
            <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-4">{currentItem.question}</p>
            
            {isRevealed ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                    <p className="font-semibold text-green-800 dark:text-green-300">Answer:</p>
                    <p className="text-green-700 dark:text-green-200">{currentItem.answer}</p>
                </div>
            ) : (
                <button onClick={() => setIsRevealed(true)} className="w-full py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50">Reveal Answer</button>
            )}
        </div>

        {isRevealed && (
            <div className="mt-6">
                <p className="text-center font-semibold text-zinc-600 dark:text-zinc-400 mb-3">How well did you remember?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => handleAnswer(0)} className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700">Forgot</button>
                    <button onClick={() => handleAnswer(3)} className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Hard</button>
                    <button onClick={() => handleAnswer(4)} className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Good</button>
                    <button onClick={() => handleAnswer(5)} className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700">Easy</button>
                </div>
            </div>
        )}
      </div>
    </Card>
  );
};

export default SpacedRepetition;
