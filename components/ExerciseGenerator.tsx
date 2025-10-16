import React, { useState } from 'react';
import { Exercise, UserSettings, FillableExercise } from '../types';
import { ExportService } from '../utils/exportUtils';
import { renderMarkdown } from '../utils/markdownUtils';
import Card from './shared/Card';
import Loader from './shared/Loader';
import { useLanguage } from '../contexts/LanguageContext';

interface ExerciseGeneratorProps {
  documentText: string;
  settings: UserSettings;
  defaultPracticeExercises?: number;
  defaultSimulationExercises?: number;
  defaultAnalysisExercises?: number;
  defaultApplicationExercises?: number;
  defaultFillableExercises?: number;
}

const ExerciseGenerator: React.FC<ExerciseGeneratorProps> = ({
  documentText,
  settings,
  defaultPracticeExercises = 2,
  defaultSimulationExercises = 2,
  defaultAnalysisExercises = 1,
  defaultApplicationExercises = 1,
  defaultFillableExercises = 1
}) => {
  const [exercisesState, setExercisesState] = useState<'idle' | 'generating' | 'exporting'>('idle');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportType, setExportType] = useState<string | null>(null);

  // Config
  const [practiceCount, setPracticeCount] = useState(defaultPracticeExercises);
  const [simulationCount, setSimulationCount] = useState(defaultSimulationExercises);
  const [analysisCount, setAnalysisCount] = useState(defaultAnalysisExercises);
  const [applicationCount, setApplicationCount] = useState(defaultApplicationExercises);
  const [fillableCount, setFillableCount] = useState(defaultFillableExercises || 1);

  const [score, setScore] = useState({ practice: 0, simulation: 0, analysis: 0, application: 0 });
  const { t, locale } = useLanguage();

  const handleExport = async (format: 'pdf' | 'docx' | 'excel' | 'print') => {
    if (!exercises.length) return;

    setExercisesState('exporting');
    setExportType(format);

    try {
      const filename = `skill-exercises-${new Date().toISOString().split('T')[0]}`;

      switch (format) {
        case 'pdf':
          await ExportService.exportToPDF([], { format: 'pdf' }, filename);
          break;
        case 'docx':
          // DOCX export not implemented yet, use JSON as fallback
          await ExportService.exportToJSON([], { format: 'json' }, filename.replace('.pdf', '.json'));
          break;
        case 'excel':
          // Excel export not implemented yet, use CSV as fallback
          await ExportService.exportToCSV([], { format: 'csv' }, filename.replace('.pdf', '.csv'));
          break;
        case 'print':
          // Print functionality - open print dialog
          window.print();
          break;
      }
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
      setError(`exercises.error.api`); // General error
    } finally {
      setExercisesState('idle');
      setExportType(null);
    }
  };

  const handleGenerateExercises = async () => {
    if (practiceCount + simulationCount + analysisCount + applicationCount === 0) {
      setError('exercises.error.noExercises');
      return;
    }
    setExercisesState('generating');
    setError(null);

    try {
      const { aiService } = await import('../services/aiService');
      const generatedExercises = await aiService.generateExercises(documentText, locale, settings, {
        practice: practiceCount,
        simulation: simulationCount,
        analysis: analysisCount,
        application: applicationCount,
        fillable: fillableCount
      });

      if (generatedExercises && generatedExercises.length > 0) {
        setExercises(generatedExercises);
        setExercisesState('idle'); // Show results when done
      } else {
        throw new Error("The AI didn't return any exercises.");
      }
    } catch (err) {
      setError('exercises.error.api');
      setExercisesState('idle');
    }
  };

  const renderIdle = () => (
    <div className="text-center py-8">
      <h4 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{t('exercises.idleTitle')}</h4>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t('exercises.idleSubtitle')}</p>

      <div className="mt-8 max-w-md mx-auto grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="practice-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.practice')}</label>
          <select
            id="practice-count"
            value={practiceCount}
            onChange={e => setPracticeCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>5</option>
          </select>
        </div>
        <div>
          <label htmlFor="simulation-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.simulation')}</label>
          <select
            id="simulation-count"
            value={simulationCount}
            onChange={e => setSimulationCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
        <div>
          <label htmlFor="analysis-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.analysis')}</label>
          <select
            id="analysis-count"
            value={analysisCount}
            onChange={e => setAnalysisCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
        <div>
          <label htmlFor="application-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.application')}</label>
          <select
            id="application-count"
            value={applicationCount}
            onChange={e => setApplicationCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="fillable-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.fillable')}</label>
          <select
            id="fillable-count"
            value={fillableCount}
            onChange={e => setFillableCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerateExercises}
        className="mt-8 px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
      >
        {t('exercises.generateButton')}
      </button>
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
    </div>
  );

  const renderGenerating = (message: string) => (
    <div className="flex flex-col items-center justify-center h-48">
      <Loader />
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
    }
  };

  const FillableTable = ({ element }: { element: any }) => {
    // Convert different JSON formats to table structure
    const convertToTableData = () => {
      // If data has direct rows, use them
      if (element.data?.rows && Array.isArray(element.data.rows)) {
        return element.data.rows;
      }

      // Handle form structure with fieldList and fields (like backlog)
      if (element.data?.fieldList && element.data?.fields) {
        const headers = ['Field', 'Value']; // Standard headers for key-value pairs
        const rows = element.data.fieldList.map((field: string) => [
          field,
          element.data.fields[field] || ''
        ]);
        return [headers, ...rows];
      }

      // Handle schedule format
      if (element.data?.schedule && Array.isArray(element.data.schedule)) {
        return element.data.schedule;
      }

      // Handle list format
      if (element.data?.items && Array.isArray(element.data.items)) {
        return [['Item']].concat(element.data.items.map((item: string) => [item]));
      }

      // Handle generic object - convert key-value pairs to table
      if (element.data && typeof element.data === 'object' && !Array.isArray(element.data)) {
        const entries = Object.entries(element.data);
        if (entries.length > 0) {
          const headers = Object.keys(entries[0][1] as any) || ['Key', 'Value'];
          const rows = entries.map(([key, value]: [string, any]) => {
            if (typeof value === 'object') {
              return headers.map(header => value[header] || '');
            }
            return [key, String(value)];
          });
          return [headers, ...rows];
        }
      }

      // Provide sample template if no data is available
      return [
        ['Sample Field', 'Sample Data'],
        ['Field 1', ''],
        ['Field 2', ''],
        ['Field 3', '']
      ];
    };

    const [tableData, setTableData] = useState<string[][]>(convertToTableData());

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
      const newData = [...tableData];
      newData[rowIndex] = [...(newData[rowIndex] || [])];
      newData[rowIndex][colIndex] = value;
      setTableData(newData);
    };

    const addRow = () => {
      setTableData(prev => [...prev, new Array(tableData[0]?.length || 2).fill('')]);
    };

    const addColumn = () => {
      setTableData(prev => prev.map(row => [...row, '']));
    };

    const getElementTypeDisplay = () => {
      switch (element.type) {
        case 'table': return '📊 Table';
        case 'schedule': return '📅 Schedule';
        case 'form': return '📝 Form';
        case 'list': return '📋 List';
        default: return '📊 Data Table';
      }
    };

    return (
      <div className="mb-4">
        <h6 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          {getElementTypeDisplay()}:
        </h6>
        {/* Display the JSON structure above the table for reference */}
        <details className="mb-3">
          <summary className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200">
            Show JSON Structure (for reference)
          </summary>
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto mt-1">
            {JSON.stringify({
              "type": element.type,
              "data": element.data || {}
            }, null, 2)}
          </pre>
        </details>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-zinc-300 dark:border-zinc-600">
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-zinc-300 dark:border-zinc-600 p-2">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        placeholder={`Row ${rowIndex + 1}, Col ${colIndex + 1}`}
                        className={`w-full px-2 py-1 text-sm border-none rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          rowIndex === 0 ?
                            'bg-indigo-50 dark:bg-indigo-900/20 font-medium' :
                            'bg-transparent'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={addRow}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            {t('exercises.fillable.addRow')}
          </button>
          <button
            onClick={addColumn}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('exercises.fillable.addColumn')}
          </button>
        </div>
      </div>
    );
  };

  const FillableList = ({ element }: { element: any }) => {
    const [listItems, setListItems] = useState<string[]>(element.data?.items || ['', '']);

    const handleItemChange = (index: number, value: string) => {
      const newItems = [...listItems];
      newItems[index] = value;
      setListItems(newItems);
    };

    const addItem = () => setListItems(prev => [...prev, '']);

    return (
      <div className="mb-4">
        <h6 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          📝 {t('exercises.fillable.list')}:
        </h6>
        <div className="space-y-2">
          {listItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">- </span>
              <input
                type="text"
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder={`Item ${index + 1}`}
                className="flex-1 px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          {t('exercises.fillable.addItem')}
        </button>
      </div>
    );
  };

  const FillableSchedule = ({ element }: { element: any }) => {
    // Check if we have schedule data from the element, otherwise use default
    const getScheduleData = () => {
      if (element.data?.schedule && Array.isArray(element.data.schedule) && element.data.schedule.length > 0) {
        return element.data.schedule;
      }
      // Default schedule template for daily activities
      return [
        ['Time', 'Activity'],
        ['9:00', ''],
        ['10:00', ''],
        ['11:00', '']
      ];
    };

    const [scheduleData, setScheduleData] = useState<string[][]>(getScheduleData());

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
      const newData = [...scheduleData];
      newData[rowIndex] = [...(newData[rowIndex] || [])];
      newData[rowIndex][colIndex] = value;
      setScheduleData(newData);
    };

    return (
      <div className="mb-4">
        <h6 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          📅 {t('exercises.fillable.schedule')}:
        </h6>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-zinc-300 dark:border-zinc-600">
            <tbody>
              {scheduleData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-zinc-300 dark:border-zinc-600 p-2">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        className="w-full px-2 py-1 text-sm border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const FillableForm = ({ element }: { element: any }) => {
    const [formData, setFormData] = useState<Record<string, string>>(element.data?.fields || {});

    const handleFieldChange = (fieldName: string, value: string) => {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const fields = element.data?.fieldList || ['Field 1', 'Field 2', 'Field 3'];

    return (
      <div className="mb-4">
        <h6 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          📝 {t('exercises.fillable.form')}:
        </h6>
        {/* Display form data as JSON instead of form inputs */}
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm text-zinc-700 dark:text-zinc-300 overflow-x-auto">
          {JSON.stringify(
            {
              "type": "form",
              "data": element.data || {}
            },
            null,
            2
          )}
        </pre>
      </div>
    );
  };

  const renderFillableExercise = (exercise: FillableExercise) => (
    <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
      <h5 className="text-lg font-semibold text-indigo-800 dark:text-indigo-300 mb-4">
        🎯 {t('exercises.fillable.fillInExercise')}
      </h5>
      {exercise.fillableElements && Array.isArray(exercise.fillableElements) && exercise.fillableElements.length > 0 ? (
        exercise.fillableElements.map((element, index) => (
          <div key={element.id || index}>
            {element.type === 'table' && <FillableTable element={element} />}
            {element.type === 'list' && <FillableList element={element} />}
            {element.type === 'schedule' && <FillableSchedule element={element} />}
            {element.type === 'form' && <FillableForm element={element} />}
          </div>
        ))
      ) : (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('exercises.fillable.noElementsMessage') || 'No fillable elements available for this exercise.'}
        </div>
      )}
    </div>
  );

  const renderExercises = () => (
    <div className="space-y-6">
      {exercises.map((exercise, index) => (
        <div key={exercise.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded">
                  {t(`exercises.types.${exercise.type}`)}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getDifficultyColor(exercise.difficulty)}`}>
                  {t(`exercises.difficulties.${exercise.difficulty}`)}
                </span>
              </div>
              <h4 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
                {exercise.title}
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                🎯 {exercise.objective}
              </p>
              {exercise.estimatedTime && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  ⏱️ {exercise.estimatedTime}
                </p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              📝 {t('exercises.instructions')}:
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {exercise.instructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
          </div>

          {exercise.examples.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                💡 {t('exercises.examples')}:
              </h5>
              <div className="space-y-4">
                {exercise.examples.map((example, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600 p-4">
                    {example.title && (
                      <h6 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                        {example.title}
                      </h6>
                    )}
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      {example.type === 'code' ? (
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                          <code>{example.content}</code>
                        </pre>
                      ) : example.type === 'table' ? (
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-2 prose-p:mb-2 prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(example.content) }}
                        />
                      ) : (
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-2 prose-p:mb-2 prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(example.content) }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exercise.type === 'fillable' && renderFillableExercise(exercise as FillableExercise)}

          {exercise.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.skills.map((skill, i) => (
                <span key={i} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                  #{skill}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderExportButtons = () => {
    if (!exercises.length) return null;

    const buttons = [
      { key: 'pdf', label: t('exercises.export.pdf'), icon: '📄', format: 'pdf' as const },
      { key: 'docx', label: t('exercises.export.docx'), icon: '📝', format: 'docx' as const },
      { key: 'excel', label: t('exercises.export.excel'), icon: '📊', format: 'excel' as const },
      { key: 'print', label: t('exercises.export.print'), icon: '🖨️', format: 'print' as const },
    ];

    return (
      <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <h5 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
          💾 {t('exercises.title')} - Export Options
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {buttons.map(({ key, label, icon, format }) => (
            <button
              key={key}
              onClick={() => handleExport(format)}
              disabled={exercisesState === 'exporting'}
              className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border transition-all ${
                exercisesState === 'exporting' && exportType === format
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
              {exercisesState === 'exporting' && exportType === format && <Loader />}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (exercisesState) {
      case 'generating':
        return renderGenerating(t('exercises.generating'));
      case 'exporting':
        return (
          <div className="space-y-6">
            {renderExercises()}
            {renderExportButtons()}
          </div>
        );
      default:
        return exercises.length > 0 ? (
          <div className="space-y-6">
            {renderExercises()}
            {renderExportButtons()}
          </div>
        ) : renderIdle();
    }
  };

  return (
    <Card title={t('exercises.title')}>
      {renderContent()}
    </Card>
  );
};

export default ExerciseGenerator;
