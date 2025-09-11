import React, { useState } from 'react';
import { MapView } from './ResultsDisplay';
import { AnalysisResult, Metal, ConcentrationValue } from '../types';

interface MapsPageProps {
  analysisResults: AnalysisResult[];
  onGoHome: () => void;
  onUploadClick: () => void;
  onManualClick: () => void;
}

// Helper function to format concentration display with original units
const formatConcentrationDisplay = (metal: string, sample: { concentrations: Record<string, number | undefined>, originalConcentrations?: Record<string, ConcentrationValue | undefined> }): string => {
    const originalConc = sample.originalConcentrations?.[metal];
    if (originalConc) {
        return `${originalConc.value.toFixed(originalConc.unit === 'ppb' || originalConc.unit === 'μg/L' ? 1 : 3)} ${originalConc.unit}`;
    }
    // Fallback to mg/L display if no original concentration data
    const value = sample.concentrations[metal];
    return value !== undefined ? `${value.toFixed(3)} mg/L` : 'N/A';
};

const MapsPage: React.FC<MapsPageProps> = ({ analysisResults, onGoHome, onUploadClick, onManualClick }) => {
  const [selectedPoint, setSelectedPoint] = useState<AnalysisResult | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const [showColorLegend, setShowColorLegend] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('hpi');

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      <div className="p-3 flex-shrink-0">
        <header className="bg-slate-100/70 backdrop-blur-lg p-3 border border-slate-200/60 rounded-xl shadow-lg shadow-slate-900/5 max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between">
            <button onClick={onGoHome} className="flex items-center space-x-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/40 group-hover:scale-105">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </div>
              <span className="text-sm text-slate-600 font-medium">
                ← Back to Dashboard
              </span>
            </button>

            <div className="flex items-center space-x-3">
              <button onClick={onUploadClick} className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-semibold text-slate-700 bg-white/70 border border-slate-300 hover:bg-white hover:text-slate-900 hover:border-slate-400 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button onClick={onManualClick} className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Add Sample</span>
              </button>
            </div>
          </div>
        </header>
      </div>
      <main className="flex-1 w-full flex overflow-hidden">
        {/* Map Container - Takes up most of the space */}
        <div className="flex-1 relative">
          <style>
            {`
              .leaflet-control-zoom {
                border: none !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
                overflow: hidden;
              }
              .leaflet-control-zoom a {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(8px) !important;
                border: none !important;
                color: #475569 !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                width: 36px !important;
                height: 36px !important;
                line-height: 34px !important;
                transition: all 0.2s ease !important;
                border-radius: 0 !important;
              }
              .leaflet-control-zoom a:hover {
                background: rgba(147, 51, 234, 0.1) !important;
                color: #7c3aed !important;
                transform: scale(1.05);
              }
              .leaflet-control-zoom a:first-child {
                border-top-left-radius: 12px !important;
                border-top-right-radius: 12px !important;
                border-bottom: 1px solid #e2e8f0 !important;
              }
              .leaflet-control-zoom a:last-child {
                border-bottom-left-radius: 12px !important;
                border-bottom-right-radius: 12px !important;
              }
            `}
          </style>
          <MapView 
            results={analysisResults} 
            onPointClick={setSelectedPoint}
            showPoints={showPoints}
            showColorLegend={showColorLegend}
            selectedMetric={selectedMetric}
          />
        </div>
        
        {/* Fixed Sidebar */}
        <div className="w-80 bg-white border-l border-slate-200 flex-shrink-0 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Visualization Controls</h3>
            
            <div className="space-y-6">
              {/* Sample Count */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Sample Data</h4>
                <div className="text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Samples:</span>
                    <span className="font-medium text-purple-600">{analysisResults.length}</span>
                  </div>
                </div>
              </div>

              {/* Color Metric Selector */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Color Coding</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color points by:</label>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-sm text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <optgroup label="Pollution Indices">
                        <option value="hpi">HPI (Heavy Metal Pollution Index)</option>
                        <option value="hei">HEI (Heavy Metal Evaluation Index)</option>
                        <option value="cd">HCI (Contamination Degree)</option>
                      </optgroup>
                      <optgroup label="Individual Metals">
                        <option value="Pb">Lead (Pb)</option>
                        <option value="As">Arsenic (As)</option>
                        <option value="Hg">Mercury (Hg)</option>
                        <option value="Cd">Cadmium (Cd)</option>
                        <option value="Cr">Chromium (Cr)</option>
                        <option value="Ni">Nickel (Ni)</option>
                        <option value="Zn">Zinc (Zn)</option>
                        <option value="Fe">Iron (Fe)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Display Options */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Display Options</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPoints}
                      onChange={(e) => setShowPoints(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-700">Show Sample Points</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showColorLegend}
                      onChange={(e) => setShowColorLegend(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-700">Show Color Legend</span>
                  </label>
                </div>
              </div>

              {/* Selected Point Details */}
              {selectedPoint && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Sample Details</h4>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium text-slate-800 mb-2">
                        Sample {(() => {
                          const index = analysisResults.findIndex(r => r.sample.id === selectedPoint.sample.id);
                          // Use CSV sample ID if it looks like a simple number/ID, otherwise use sequential numbering
                          return selectedPoint.sample.id.match(/^\d+$/) ? selectedPoint.sample.id : (index + 1).toString();
                        })()}
                      </div>
                      {(selectedPoint.sample.latitude !== 0 || selectedPoint.sample.longitude !== 0) && (
                        <div className="text-slate-600 text-xs font-mono mb-3">
                          {selectedPoint.sample.latitude.toFixed(4)}, {selectedPoint.sample.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>

                    {/* Pollution Indices */}
                    <div>
                      <h5 className="text-xs font-semibold text-slate-600 mb-2 uppercase">Pollution Indices</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">HPI:</span>
                          <span className="font-medium">{selectedPoint.indices.hpi.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">HEI:</span>
                          <span className="font-medium">{selectedPoint.indices.hei.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">HCI:</span>
                          <span className="font-medium">{selectedPoint.indices.cd.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Heavy Metal Concentrations */}
                    <div>
                      <h5 className="text-xs font-semibold text-slate-600 mb-2 uppercase">Metal Concentrations</h5>
                      <div className="space-y-1">
                        {Object.entries(selectedPoint.sample.concentrations).map(([metal, concentration]: [string, number | undefined]) => (
                          concentration !== undefined && (
                            <div key={metal} className="flex justify-between text-sm">
                              <span className="text-slate-600">{metal}:</span>
                              <span className="font-medium">{formatConcentrationDisplay(metal, selectedPoint.sample)}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPoint(null)}
                      className="w-full mt-3 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-md transition-colors"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MapsPage;