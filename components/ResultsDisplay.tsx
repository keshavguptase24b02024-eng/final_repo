import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AnalysisResult, Metal, Standard, QualityClass, ConcentrationValue } from '../types';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import {
    HPI_CLASSIFICATION, HEI_CLASSIFICATION, CD_CLASSIFICATION, getQualityClass,
    QUALITY_INFO, AVAILABLE_METALS
} from '../constants';
import { Unit, convertUnit } from '../utils/unitConversion';


// Tell TypeScript about the global variables from the CDN scripts
declare var marked: {
    parse(markdownString: string): string;
};
declare var jspdf: {
    jsPDF: new (options?: any) => any;
};
declare var html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
declare var L: any; // Leaflet with heatmap plugin

// Helper function to format concentration display with original units
const formatConcentrationDisplay = (metal: Metal, sample: { concentrations: Record<Metal, number | undefined>, originalConcentrations?: Record<Metal, ConcentrationValue | undefined> }): string => {
    const originalConc = sample.originalConcentrations?.[metal];
    if (originalConc) {
        return `${originalConc.value.toFixed(originalConc.unit === 'ppb' || originalConc.unit === 'μg/L' ? 1 : 4)} ${originalConc.unit}`;
    }
    // Fallback to mg/L display if no original concentration data
    const value = sample.concentrations[metal];
    return value !== undefined ? `${value.toFixed(4)} mg/L` : 'N/A';
};

// Helper function to format permissible limit with user's unit
const formatPermissibleLimit = (limitInMgL: number, metal: Metal, sample: { originalConcentrations?: Record<Metal, ConcentrationValue | undefined> }): string => {
    try {
        // Defensive check for valid inputs
        if (!limitInMgL || isNaN(limitInMgL)) return 'N/A';
        
        const originalConc = sample.originalConcentrations?.[metal];
        if (!originalConc || !originalConc.unit || originalConc.unit === 'mg/L') {
            return `${limitInMgL} mg/L`;
        }
        
        // Simple conversion without complex unit mapping
        let convertedLimit: number;
        let decimals = 1;
        
        if (originalConc.unit === 'ppb' || originalConc.unit === 'μg/L') {
            convertedLimit = limitInMgL * 1000; // mg/L to ppb/μg/L
            decimals = 1;
        } else if (originalConc.unit === 'ppm') {
            convertedLimit = limitInMgL; // ppm = mg/L for water
            decimals = 3;
        } else {
            return `${limitInMgL} mg/L`; // Fallback for unknown units
        }
        
        return `${limitInMgL} mg/L / ${convertedLimit.toFixed(decimals)} ${originalConc.unit}`;
    } catch (e) {
        console.error('formatPermissibleLimit error:', e, { limitInMgL, metal, sample });
        return `${limitInMgL || 0} mg/L`;
    }
};

// Integrated regulatory table for manual data showing user values with color coding
const IntegratedRegulatoryTable: React.FC<{result: AnalysisResult, selectedStandard: any}> = ({result, selectedStandard}) => {
    const { sample, indices } = result;
    const qualityClass = getQualityClass(indices.hpi, HPI_CLASSIFICATION);
    const qualityInfo = QUALITY_INFO[qualityClass];

    const getValueStatus = (userValue: number | undefined, permissibleLimit: number) => {
        if (userValue === undefined) return 'missing';
        if (userValue <= permissibleLimit) return 'safe';
        return 'unsafe';
    };

    const getValueColor = (status: string) => {
        switch (status) {
            case 'safe': return 'text-green-600';
            case 'unsafe': return 'text-red-600';
            case 'missing': return 'text-slate-400';
            default: return 'text-slate-600';
        }
    };

    return (
        <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-lg shadow-slate-900/5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2 sm:mb-0">Water Quality Assessment</h3>
                    <div className="text-sm text-slate-600">{selectedStandard.name}</div>
                </div>

                {/* Pollution Indices Display */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-4 text-center">
                        <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">HPI</div>
                        <div className="text-2xl font-bold text-purple-700">{indices.hpi.toFixed(1)}</div>
                        <div className="text-xs text-purple-500">Heavy Metal Pollution Index</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-lg p-4 text-center">
                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">HEI</div>
                        <div className="text-2xl font-bold text-blue-700">{indices.hei.toFixed(1)}</div>
                        <div className="text-xs text-blue-500">Heavy Metal Evaluation Index</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg p-4 text-center">
                        <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">HCI</div>
                        <div className="text-2xl font-bold text-emerald-700">{indices.cd.toFixed(1)}</div>
                        <div className="text-xs text-emerald-500">Heavy Metal Contamination Index</div>
                    </div>
                </div>
                
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Metal</th>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Your Value</th>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Permissible Limit</th>
                                <th scope="col" className="px-4 py-3 font-semibold tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(selectedStandard.limits).map(([metal, limits]: [string, any]) => {
                                const userValue = sample.concentrations[metal as Metal];
                                const status = getValueStatus(userValue, limits.permissible);
                                const colorClass = getValueColor(status);
                                
                                return (
                                    <tr key={metal} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{metal}</td>
                                        <td className={`px-4 py-3 font-mono font-semibold rounded-md ${colorClass}`}>
                                            {userValue !== undefined ? formatConcentrationDisplay(metal as Metal, sample) : '—'}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-sm whitespace-nowrap">{formatPermissibleLimit(limits.permissible, metal as Metal, sample)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                status === 'safe' ? 'bg-green-100 text-green-700' :
                                                status === 'unsafe' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {status === 'safe' ? '✓ Safe' : 
                                                 status === 'unsafe' ? '⚠ Exceeds' : 
                                                 'Not tested'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                        <span className="text-slate-600">Within safe limits</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                        <span className="text-slate-600">Exceeds permissible limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-100 rounded-full"></div>
                        <span className="text-slate-600">Not tested</span>
                    </div>
                </div>
        </div>
    );
};

const ReportCard: React.FC<{result: AnalysisResult}> = ({result}) => {
    const { sample, indices } = result;
    const qualityClass = getQualityClass(indices.hpi, HPI_CLASSIFICATION);
    const qualityInfo = QUALITY_INFO[qualityClass];
    
    const relevantMetals = AVAILABLE_METALS.filter(metal => sample.concentrations[metal] !== undefined && sample.concentrations[metal]! > 0);

    return (
        <div className="bg-white rounded-xl shadow-lg shadow-slate-900/5 border border-slate-200/80 p-5 mb-4 transition-shadow hover:shadow-xl hover:-translate-y-0.5">
           <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Sample_1</h3>
                    <p className="text-sm text-slate-500 font-mono">{sample.latitude.toFixed(4)}, {sample.longitude.toFixed(4)}</p>
                </div>
                <div className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${qualityInfo.className}`}>
                    {qualityInfo.text}
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="space-y-2">
                     <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-slate-500">HPI</span>
                        <span className="font-bold text-2xl text-purple-600">{indices.hpi.toFixed(1)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500">HEI</span>
                        <span className="font-medium text-slate-700">{indices.hei.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500">HCI</span>
                        <span className="font-medium text-slate-700">{indices.cd.toFixed(2)}</span>
                    </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-100 sm:border-none sm:pt-0">
                    {relevantMetals.length > 0 ? relevantMetals.map(metal => (
                        <div key={metal} className="flex justify-between">
                            <span className="text-slate-500">{metal}</span>
                            <span className="font-mono text-slate-700">{formatConcentrationDisplay(metal, sample)}</span>
                        </div>
                    )) : <p className="text-slate-400 text-xs italic text-center pt-2">No heavy metals recorded.</p>}
                </div>
            </div>
        </div>
    );
};

const CSVDataTable: React.FC<{
    results: AnalysisResult[];
    selectedStandard: Standard;
}> = ({ results, selectedStandard }) => {
    const getValueStatus = (userValue: number | undefined, permissibleLimit: number) => {
        if (userValue === undefined) return 'missing';
        if (userValue <= permissibleLimit) return 'safe';
        return 'unsafe';
    };

    const getValueColor = (status: string) => {
        switch (status) {
            case 'safe': return 'text-green-600';
            case 'unsafe': return 'text-red-600';
            case 'missing': return 'text-slate-400';
            default: return 'text-slate-600';
        }
    };

    return (
        <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-lg shadow-slate-900/5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-2 sm:mb-0">Sample Analysis Results</h3>
                <div className="text-sm text-slate-600">{selectedStandard.name}</div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80">
                        <tr>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Sample ID</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Location</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Pb</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">As</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Hg</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Cd</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Cr</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Ni</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Zn</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">Fe</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">HPI</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">HEI</th>
                            <th scope="col" className="px-3 py-3 font-semibold tracking-wider">HCI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result, index) => {
                            const { sample, indices } = result;
                            // Use CSV sample ID if it looks like a simple number/ID, otherwise use sequential numbering
                            const displayId = sample.id.match(/^\d+$/) ? sample.id : (index + 1).toString();
                            return (
                                <tr key={sample.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-3 py-3 font-semibold text-slate-700">
                                        {displayId}
                                    </td>
                                    <td className="px-3 py-3 text-xs font-mono text-slate-600">
                                        {sample.latitude.toFixed(4)}, {sample.longitude.toFixed(4)}
                                    </td>
                                    {/* Heavy Metal Values */}
                                    {Object.entries(selectedStandard.limits).map(([metal, limits]: [string, any]) => {
                                        const userValue = sample.concentrations[metal as Metal];
                                        const status = getValueStatus(userValue, limits.permissible);
                                        const colorClass = getValueColor(status);
                                        
                                        return (
                                            <td key={metal} className={`px-3 py-3 font-mono font-medium ${colorClass}`}>
                                                {userValue !== undefined ? formatConcentrationDisplay(metal as Metal, sample) : '—'}
                                            </td>
                                        );
                                    })}
                                    {/* Indices */}
                                    <td className="px-3 py-3 font-bold text-purple-600">{indices.hpi.toFixed(1)}</td>
                                    <td className="px-3 py-3 font-medium text-blue-600">{indices.hei.toFixed(1)}</td>
                                    <td className="px-3 py-3 font-medium text-emerald-600">{indices.cd.toFixed(1)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                    <span className="text-slate-600">Within safe limits</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                    <span className="text-slate-600">Exceeds permissible limit</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-100 rounded-full"></div>
                    <span className="text-slate-600">Not tested</span>
                </div>
            </div>
        </div>
    );
};


export const ReportsView: React.FC<{
    results: AnalysisResult[];
    selectedStandard: Standard;
    isManualData?: boolean;
}> = ({ results, selectedStandard, isManualData = false }) => (
    <div>
        {results.length > 0 ? (
            isManualData ? (
                // Manual data: Show integrated table for single sample
                <div className="space-y-6">
                    {results.map(result => 
                        <IntegratedRegulatoryTable 
                            key={result.sample.id} 
                            result={result} 
                            selectedStandard={selectedStandard} 
                        />
                    )}
                </div>
            ) : (
                // CSV data: Show table with all samples as rows
                <CSVDataTable 
                    results={results}
                    selectedStandard={selectedStandard}
                />
            )
        ) : (
             <div className="flex justify-center items-center py-20">
                <div className="text-center text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="mt-2 font-semibold">No Reports Available</p>
                  <p className="text-sm">Please upload or enter sample data to generate reports.</p>
                </div>
            </div>
        )}
    </div>
);

type MapMetric = 'hpi' | 'hei' | 'cd' | Metal.As | Metal.Fe | 'none';

// Component to force map resize
const MapResizer: React.FC = () => {
    const map = useMap();
    
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [map]);
    
    return null;
};



// Function to get color based on selected metric
const getPointColor = (result: AnalysisResult, selectedMetric: string, allResults?: AnalysisResult[]): { fillColor: string; color: string; qualityClass: string } => {
    let value: number;
    let qualityClass: string;
    
    // Get the value based on selected metric
    switch (selectedMetric) {
        case 'hpi':
            value = result.indices.hpi;
            qualityClass = getQualityClass(value, HPI_CLASSIFICATION);
            break;
        case 'hei':
            value = result.indices.hei;
            qualityClass = getQualityClass(value, HEI_CLASSIFICATION);
            break;
        case 'cd':
            value = result.indices.cd;
            qualityClass = getQualityClass(value, CD_CLASSIFICATION);
            break;
        default:
            // Individual metal
            const metalValue = result.sample.concentrations[selectedMetric as Metal];
            if (metalValue === undefined || metalValue === 0) {
                return { fillColor: '#6b7280', color: '#374151', qualityClass: 'No Data' }; // Gray for no data or zero
            }
            
            if (allResults) {
                // For individual metals, use a proper scale based on actual values
                const validValues = allResults
                    .map(r => r.sample.concentrations[selectedMetric as Metal])
                    .filter(v => v !== undefined && v > 0) as number[];
                
                if (validValues.length === 0) {
                    return { fillColor: '#6b7280', color: '#374151', qualityClass: 'No Data' };
                }
                
                const maxValue = Math.max(...validValues);
                const minValue = Math.min(...validValues);
                
                // If all values are the same, just color them medium
                if (maxValue === minValue) {
                    return { fillColor: '#eab308', color: '#a16207', qualityClass: 'Uniform' };
                }
                
                // Normalize the value between 0 and 1
                const normalizedValue = (metalValue - minValue) / (maxValue - minValue);
                
                if (normalizedValue < 0.2) {
                    qualityClass = 'Very Low';
                    return { fillColor: '#10b981', color: '#065f46', qualityClass }; // Green - LOW values
                } else if (normalizedValue < 0.4) {
                    qualityClass = 'Low';
                    return { fillColor: '#22c55e', color: '#166534', qualityClass }; // Light green
                } else if (normalizedValue < 0.6) {
                    qualityClass = 'Medium';
                    return { fillColor: '#eab308', color: '#a16207', qualityClass }; // Yellow
                } else if (normalizedValue < 0.8) {
                    qualityClass = 'High';
                    return { fillColor: '#f97316', color: '#c2410c', qualityClass }; // Orange
                } else {
                    qualityClass = 'Very High';
                    return { fillColor: '#ef4444', color: '#dc2626', qualityClass }; // Red - HIGH values
                }
            } else {
                // Fallback if no all results provided
                qualityClass = 'Unknown';
                return { fillColor: '#6b7280', color: '#374151', qualityClass };
            }
    }
    
    // Use the same colors as defined in QUALITY_INFO but adapted for map markers
    switch (qualityClass) {
        case 'Excellent':
            return { fillColor: '#10b981', color: '#065f46', qualityClass }; // Green
        case 'Good':
            return { fillColor: '#22c55e', color: '#166534', qualityClass }; // Light green
        case 'Fair':
            return { fillColor: '#eab308', color: '#a16207', qualityClass }; // Yellow
        case 'Poor':
            return { fillColor: '#f97316', color: '#c2410c', qualityClass }; // Orange
        case 'Very Poor':
            return { fillColor: '#ef4444', color: '#dc2626', qualityClass }; // Red
        case 'Unsuitable':
            return { fillColor: '#b91c1c', color: '#7f1d1d', qualityClass }; // Dark red
        default:
            return { fillColor: '#6b7280', color: '#374151', qualityClass: 'Unknown' }; // Gray fallback
    }
};

export const MapView: React.FC<{
    results: AnalysisResult[], 
    onPointClick?: (result: AnalysisResult) => void,
    showPoints?: boolean,
    showColorLegend?: boolean,
    selectedMetric?: string
}> = ({ results, onPointClick, showPoints = true, showColorLegend = true, selectedMetric = 'hpi' }) => {
    return (
        <div className="h-full w-full bg-slate-200 rounded-xl overflow-hidden border border-slate-200/80 shadow-lg shadow-slate-900/5 relative">
            <MapContainer 
                center={[20.5937, 78.9629]}
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
                worldCopyJump={false}
                minZoom={1}
                maxZoom={18}
            >
                <MapResizer />
                <TileLayer 
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                {showPoints && results.map(result => {
                    const colorInfo = getPointColor(result, selectedMetric, results);
                    
                    return (
                        <CircleMarker
                            key={result.sample.id}
                            center={[result.sample.latitude, result.sample.longitude]}
                            radius={8}
                            pathOptions={{ 
                                color: '#fff', 
                                weight: 2, 
                                fillColor: colorInfo.fillColor, 
                                fillOpacity: 0.85 
                            }}
                            eventHandlers={{
                                click: () => onPointClick?.(result)
                            }}
                        >
                            <Tooltip>
                                <div className="text-center">
                                    {selectedMetric === 'hpi' && (
                                        <>
                                            <div className="font-semibold">HPI: {result.indices.hpi.toFixed(2)}</div>
                                            <div className="text-xs text-slate-600">{colorInfo.qualityClass} Quality</div>
                                        </>
                                    )}
                                    {selectedMetric === 'hei' && (
                                        <>
                                            <div className="font-semibold">HEI: {result.indices.hei.toFixed(2)}</div>
                                            <div className="text-xs text-slate-600">{colorInfo.qualityClass} Quality</div>
                                        </>
                                    )}
                                    {selectedMetric === 'cd' && (
                                        <>
                                            <div className="font-semibold">HCI: {result.indices.cd.toFixed(2)}</div>
                                            <div className="text-xs text-slate-600">{colorInfo.qualityClass} Quality</div>
                                        </>
                                    )}
                                    {!['hpi', 'hei', 'cd'].includes(selectedMetric) && (
                                        <>
                                            <div className="font-semibold">{selectedMetric}: {
                                                result.sample.concentrations[selectedMetric as Metal]?.toFixed(3) || 'N/A'
                                            }</div>
                                            <div className="text-xs text-slate-600">{colorInfo.qualityClass}</div>
                                        </>
                                    )}
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
            
            {/* Color Legend */}
            {showPoints && showColorLegend && results.length > 0 && (
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg z-[1000]">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">
                        {['hpi', 'hei', 'cd'].includes(selectedMetric) ? 'Water Quality' : `${selectedMetric} Levels`}
                    </h4>
                    <div className="space-y-1">
                        {['hpi', 'hei', 'cd'].includes(selectedMetric) ? (
                            // Standard quality classifications
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#10b981' }}></div>
                                    <span className="text-xs text-slate-600">Excellent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#22c55e' }}></div>
                                    <span className="text-xs text-slate-600">Good</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#eab308' }}></div>
                                    <span className="text-xs text-slate-600">Fair</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#f97316' }}></div>
                                    <span className="text-xs text-slate-600">Poor</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#ef4444' }}></div>
                                    <span className="text-xs text-slate-600">Very Poor</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#b91c1c' }}></div>
                                    <span className="text-xs text-slate-600">Unsuitable</span>
                                </div>
                            </>
                        ) : (
                            // Individual metal concentration levels
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#10b981' }}></div>
                                    <span className="text-xs text-slate-600">Very Low</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#22c55e' }}></div>
                                    <span className="text-xs text-slate-600">Low</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#eab308' }}></div>
                                    <span className="text-xs text-slate-600">Medium</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#f97316' }}></div>
                                    <span className="text-xs text-slate-600">High</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#ef4444' }}></div>
                                    <span className="text-xs text-slate-600">Very High</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: '#6b7280' }}></div>
                                    <span className="text-xs text-slate-600">No Data</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export const AiAnalysisView: React.FC<{ geminiAnalysis: string; isLoading: boolean }> = ({ geminiAnalysis, isLoading }) => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    const element = reportContentRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      const { jsPDF } = jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const canvasHeightInPdf = pdfWidth / ratio;
      
      let heightLeft = canvasHeightInPdf;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
        heightLeft -= pdfHeight;
      }
      
      pdf.save('aqua-assess-ai-report.pdf');
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Sorry, there was an error generating the PDF.");
    } finally {
        setIsDownloading(false);
    }
  };
  
  const formattedHtml = useMemo(() => {
    if (typeof marked !== 'undefined' && geminiAnalysis) {
        return marked.parse(geminiAnalysis);
    }
    return '';
  }, [geminiAnalysis]);

  const hasContent = !isLoading && !!geminiAnalysis && !geminiAnalysis.toLowerCase().startsWith("error") && !geminiAnalysis.toLowerCase().startsWith("an error occurred");

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-lg shadow-slate-900/5">
      <div className="p-4 flex justify-between items-center border-b border-slate-200 flex-shrink-0">
        <h3 className="font-semibold text-slate-800">AI Analysis Report</h3>
        <button
            onClick={handleDownloadPDF}
            disabled={!hasContent || isDownloading}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
                <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          )}
          <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
        </button>
      </div>
      <div className="prose prose-sm max-w-none p-6 prose-headings:font-semibold prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-700">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="mt-3 text-slate-500 font-semibold">Generating AI analysis...</p>
              <p className="text-xs text-slate-400">This may take a moment.</p>
            </div>
          </div>
        ) : hasContent ? (
          <div ref={reportContentRef} dangerouslySetInnerHTML={{ __html: formattedHtml }} />
        ) : (
          <div className="flex justify-center items-center py-20">
            <div className="text-center text-slate-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <p className="mt-2 font-semibold">No data for AI analysis</p>
              <p className="text-sm">Please upload or enter sample data to generate a report.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};