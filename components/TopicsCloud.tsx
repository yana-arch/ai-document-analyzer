import React from 'react';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface TopicsCloudProps {
  topics: string[];
}

const tagColors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
];

const TopicsCloud: React.FC<TopicsCloudProps> = ({ topics }) => {
  const { t } = useLanguage();
  return (
    <Card title={t('topics.title')}>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => (
          <span
            key={index}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${tagColors[index % tagColors.length]}`}
          >
            {topic}
          </span>
        ))}
      </div>
    </Card>
  );
};

export default TopicsCloud;
