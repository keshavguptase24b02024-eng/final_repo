import React, { useState, useCallback } from 'react';
import { SampleData, Metal, ConcentrationValue } from '../types';
import { AVAILABLE_METALS } from '../constants';
import { Unit, parseUnit, detectUnitForDataset, convertToMgL } from '../utils/unitConversion';

interface DataUploaderProps {
  onDataLoaded: (data: SampleData[]) => void;
  setErrorMessage: (message: string) => void;
}

const DataUploader: React.FC<DataUploaderProps> = ({ onDataLoaded, setErrorMessage }) => {
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      parseCSV(file);
    }
     event.target.value = ''; // Reset file input
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type === "text/csv") {
        setFileName(file.name);
        parseCSV(file);
      } else {
        setErrorMessage("Please drop a valid .csv file.");
      }
  };


  const parseCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMessage("File is empty or could not be read.");
        return;
      }

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            setErrorMessage("CSV must have a header row and at least one data row.");
            return;
        }

        const header = lines[0].split(',').map(h => h.trim());
        const latIndex = header.indexOf('latitude');
        const lonIndex = header.indexOf('longitude');
        const idIndex = header.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'sample_id' || h.toLowerCase() === 'sampleid');

        if (latIndex === -1 || lonIndex === -1) {
            setErrorMessage("CSV header must contain 'latitude' and 'longitude' columns.");
            return;
        }

        // Find metal columns - will detect units for entire dataset later
        const metalIndices: Partial<Record<Metal, number>> = {};
        let hasExplicitUnits = false;
        let explicitUnit: Unit = Unit.MG_L;
        
        AVAILABLE_METALS.forEach(metal => {
            // Look for columns like "Pb", "Pb (mg/L)", "As (ppm)", "Fe (ppb)", etc.
            const metalRegex = new RegExp(`^\s*${metal}\s*(\([^)]+\))?\s*$`, 'i');
            const matchingIndex = header.findIndex(h => metalRegex.test(h.trim()));
            
            if (matchingIndex !== -1) {
                const columnName = header[matchingIndex].trim();
                
                // Try to extract unit from column header like "Pb (mg/L)" or "As (ppm)"
                const unitMatch = columnName.match(/\(([^)]+)\)/);
                if (unitMatch && !hasExplicitUnits) {
                    const parsedUnit = parseUnit(unitMatch[1]);
                    if (parsedUnit) {
                        explicitUnit = parsedUnit;
                        hasExplicitUnits = true;
                    }
                }
                
                metalIndices[metal] = matchingIndex;
            }
        });

        // First, collect all raw data to detect dataset-wide units
        const rawSamples: Array<{ 
          id: string; 
          latitude: number; 
          longitude: number; 
          rawConcentrations: Record<Metal, number | undefined>; 
        }> = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const rawConcentrations: Record<Metal, number | undefined> = {} as Record<Metal, number | undefined>;
          
          // Collect raw values
          Object.entries(metalIndices).forEach(([metal, index]) => {
            const value = parseFloat(values[index]);
            if (!isNaN(value) && value > 0) {
              rawConcentrations[metal as Metal] = value;
            }
          });
          
          const latitude = parseFloat(values[latIndex]);
          const longitude = parseFloat(values[lonIndex]);

          if (isNaN(latitude) || isNaN(longitude)) {
              console.warn(`Skipping row ${i+1} due to invalid coordinates.`);
              continue;
          }

          // Use CSV ID if available, otherwise generate sequential ID
          const csvId = idIndex !== -1 ? values[idIndex]?.trim() : null;
          const sampleId = csvId && csvId !== '' ? csvId : (i).toString();
          
          rawSamples.push({
            id: sampleId,
            latitude,
            longitude,
            rawConcentrations,
          });
        }

        // Detect unit for entire dataset
        let datasetUnit: Unit;
        if (hasExplicitUnits) {
          datasetUnit = explicitUnit;
        } else {
          // Auto-detect based on all values in the dataset
          datasetUnit = detectUnitForDataset(rawSamples.map(s => ({ concentrations: s.rawConcentrations })));
        }

        // Process all samples with the detected dataset unit
        const samples: SampleData[] = rawSamples.map(rawSample => {
          const concentrations: Record<Metal, number | undefined> = {} as Record<Metal, number | undefined>;
          const originalConcentrations: Record<Metal, ConcentrationValue | undefined> = {} as Record<Metal, ConcentrationValue | undefined>;
          
          Object.entries(rawSample.rawConcentrations).forEach(([metal, value]) => {
            if (value !== undefined) {
              // Convert to mg/L for storage (standard unit)
              const mgLValue = convertToMgL({ value, unit: datasetUnit });
              concentrations[metal as Metal] = mgLValue;
              
              // Store original value with unit for display
              originalConcentrations[metal as Metal] = {
                value: value,
                unit: datasetUnit,
                mgLValue: mgLValue
              };
            }
          });
          
          return {
            id: rawSample.id,
            latitude: rawSample.latitude,
            longitude: rawSample.longitude,
            concentrations,
            originalConcentrations,
          };
        });
        
        onDataLoaded(samples);
        setErrorMessage("");
      } catch (error) {
        console.error("CSV Parsing error:", error);
        setErrorMessage(`Failed to parse CSV. Please check the file format. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setFileName('');
      }
    };
    reader.onerror = () => {
        setErrorMessage("Error reading the file.");
        setFileName('');
    };
    reader.readAsText(file);
  }, [onDataLoaded, setErrorMessage]);

  return (
    <div className="bg-white p-8 rounded-lg w-full">
      <h3 className="text-xl font-bold mb-1 text-slate-800">Upload CSV Data</h3>
      <p className="text-sm text-slate-500 mb-4">Get started by uploading your groundwater sample data.</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-xs text-blue-800 font-medium mb-1">Supported Units:</p>
        <p className="text-xs text-blue-600">Headers can include units like: <code>Pb (ppb)</code>, <code>Fe (ppm)</code>, <code>Zn (mg/L)</code>, <code>As (μg/L)</code></p>
      </div>
      <div className="flex items-center justify-center w-full">
        <label 
            htmlFor="csv-upload" 
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 transition-colors ${isDragging ? 'bg-purple-100 border-purple-400' : 'hover:bg-slate-100'}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <svg className="w-10 h-10 mb-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
            </svg>
            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-purple-600">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-slate-400">CSV file with latitude, longitude & metals (units auto-detected)</p>
          </div>
          <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
        </label>
      </div>
      {fileName && <p className="text-sm mt-4 text-center text-green-700 font-medium bg-green-100 py-2 px-4 rounded-md">Successfully loaded: {fileName}</p>}
    </div>
  );
};

export default DataUploader;