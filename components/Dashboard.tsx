import React, { useState, useMemo } from 'react';
import Header from './Header';
import StandardsEditor from './StandardsEditor';
import { ReportsView, MapView, AiAnalysisView } from './ResultsDisplay';
import { Standard, AnalysisResult } from '../types';
import { PRELOADED_SAMPLES } from '../services/preloadedData';
import { calculateIndices } from '../services/calculationService';

type ActiveView = 'reports' | 'ai';

interface DashboardProps {
  analysisResults: AnalysisResult[];
  geminiAnalysis: string;
  isLoading: boolean;
  selectedStandard: Standard;
  onStandardChange: (standard: Standard) => void;
  errorMessage: string;
  onUploadClick: () => void;
  onManualClick: () => void;
  onGoHome: () => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  const [activeView, setActiveView] = useState<ActiveView>('reports');

  const preloadedAnalysisResults = useMemo(() => {
    return PRELOADED_SAMPLES.map(sample => ({
        sample,
        indices: calculateIndices(sample, props.selectedStandard),
    }));
  }, [props.selectedStandard]);
  
  const renderActiveView = () => {
    switch (activeView) {
        case 'reports':
            return <ReportsView 
                results={props.analysisResults} 
                selectedStandard={props.selectedStandard}
                isManualData={props.analysisResults.length === 1}
            />;
        case 'ai':
            return <AiAnalysisView geminiAnalysis={props.geminiAnalysis} isLoading={props.isLoading} />;
        default:
            return null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <div className="p-3">
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          onUploadClick={props.onUploadClick}
          onManualClick={props.onManualClick}
          onGoHome={props.onGoHome}
        />
      </div>
      <main className="flex-grow max-w-screen-2xl w-full mx-auto p-3 space-y-8">
        {/* Active view is rendered at the top of the main content flow */}
        {renderActiveView()}
        
        {/* Only show StandardsEditor for CSV data (multiple samples) */}
        {!(props.analysisResults.length === 1) && (
          <StandardsEditor
            selectedStandard={props.selectedStandard}
            onStandardChange={props.onStandardChange}
          />
        )}
        {props.errorMessage && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{props.errorMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;