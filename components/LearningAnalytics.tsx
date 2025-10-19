import React, { useState, useEffect } from 'react';
import { spacedRepetitionService } from '../services/spacedRepetitionService';
import Card from './shared/Card';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{title}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
      </div>
    </div>
  );

const LearningAnalytics: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    setStats(spacedRepetitionService.getStudyStats());
    setUpcoming(spacedRepetitionService.getUpcomingReviews(7));
  }, []);

  if (!stats) {
    return <div>Loading analytics...</div>;
  }

  const ICONS = {
      total: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      due: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      mastered: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
      accuracy: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Items" value={stats.totalItems} icon={ICONS.total} />
        <StatCard title="Items Due" value={stats.dueForReview} icon={ICONS.due} />
        <StatCard title="Mastered" value={stats.masteredItems} icon={ICONS.mastered} />
        <StatCard title="Avg. Accuracy" value={`${stats.averageAccuracy}%`} icon={ICONS.accuracy} />
      </div>

      <Card>
        <div className="p-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Upcoming Reviews (Next 7 Days)</h3>
            {upcoming.length > 0 ? (
                <div className="space-y-4">
                    {upcoming.map(day => (
                        <div key={day.date} className="flex items-center justify-between">
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-indigo-600 dark:text-indigo-400">{day.count} items</p>
                                <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (day.count / 10) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-zinc-500 dark:text-zinc-400">No upcoming reviews in the next 7 days.</p>
            )}
        </div>
      </Card>
    </div>
  );
};

export default LearningAnalytics;