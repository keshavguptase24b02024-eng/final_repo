
import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import MapsPage from './components/MapsPage';
import DataUploader from './components/DataUploader';
import SampleInputForm from './components/SampleInputForm';
import { SampleData, Standard, AnalysisResult } from './types';
import { STANDARDS } from './constants';
import { calculateIndices } from './services/calculationService';
import { getAnalysisFromGemini } from './services/geminiService';
import { PRELOADED_SAMPLES } from './services/preloadedData';

type View = 'home' | 'dashboard' | 'maps';

const App: React.FC = () => {
  const [sampleData, setSampleData] = useState<SampleData[]>([]);
  const [currentView, setCurrentView] = useState<View>('home');

  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<Standard>(STANDARDS.CGWB);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  
  const handleUseSampleData = () => {
    setSampleData(PRELOADED_SAMPLES);
    setCurrentView('dashboard');
  };
  
  const handleViewMaps = () => {
    if (sampleData.length === 0) {
      setSampleData(PRELOADED_SAMPLES);
    }
    setCurrentView('maps');
  };
  
  const handleGoHome = () => {
      setCurrentView('home');
      // Optional: clear data when going home
      // setSampleData([]); 
      // setAnalysisResults([]);
  }

  const handleUploadClick = () => setShowUploadModal(true);
  const handleManualClick = () => setShowManualModal(true);
  const closeModal = () => {
      setShowUploadModal(false);
      setShowManualModal(false);
  };

  const processData = useCallback((data: SampleData[], standard: Standard) => {
    if (data.length === 0) {
        setAnalysisResults([]);
        setGeminiAnalysis('');
        return;
    }

    setIsLoading(true);
    setGeminiAnalysis('');
    
    const results: AnalysisResult[] = data.map(sample => ({
      sample,
      indices: calculateIndices(sample, standard),
    }));
    
    setAnalysisResults(results);
    
    getAnalysisFromGemini(results).then(analysis => {
      setGeminiAnalysis(analysis);
      setIsLoading(false);
    }).catch(err => {
        console.error("Gemini analysis failed", err);
        setGeminiAnalysis("Failed to load AI analysis.");
        setIsLoading(false);
    });

  }, []);

  useEffect(() => {
    processData(sampleData, selectedStandard);
  }, [sampleData, selectedStandard, processData]);

  const handleDataLoaded = (data: SampleData[]) => {
    setSampleData(data);
    setCurrentView('dashboard');
    closeModal();
  };
  
  const handleAddSample = (sample: SampleData) => {
      setSampleData(() => [sample]); // Force complete state replacement
      setCurrentView('dashboard');
      closeModal();
  };
  
  const handleStandardChange = (standard: Standard) => {
      setSelectedStandard(standard);
  };

  return (
    <div className="min-h-screen bg-white">
        {currentView === 'home' ? (
             <HomePage 
                onUploadClick={handleUploadClick} 
                onManualClick={handleManualClick} 
                onUseSampleData={handleUseSampleData}
                onViewMaps={handleViewMaps}
            />
        ) : currentView === 'maps' ? (
            <MapsPage 
                analysisResults={analysisResults}
                onGoHome={handleGoHome}
                onUploadClick={handleUploadClick}
                onManualClick={handleManualClick}
            />
        ) : (
            <Dashboard 
                analysisResults={analysisResults}
                geminiAnalysis={geminiAnalysis}
                isLoading={isLoading}
                selectedStandard={selectedStandard}
                onStandardChange={handleStandardChange}
                errorMessage={errorMessage}
                onUploadClick={handleUploadClick}
                onManualClick={handleManualClick}
                onGoHome={handleGoHome}
            />
        )}

        {/* Modals */}
        {(showUploadModal || showManualModal) && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in" onClick={closeModal}>
                <div className="bg-white rounded-xl shadow-2xl relative w-full max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
                    <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 bg-transparent rounded-full h-8 w-8 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors z-10" aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    {showUploadModal && <DataUploader onDataLoaded={handleDataLoaded} setErrorMessage={setErrorMessage} />}
                    {showManualModal && <SampleInputForm onAddSample={handleAddSample} />}
                </div>
                 <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes fadeInScale {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .animate-fade-in { animation: fadeIn 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
                    .animate-fade-in-scale { animation: fadeInScale 0.3s 0.1s forwards cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
            </div>
        )}
    </div>
  );
};

export default App;
