import React, { useState } from 'react';
import { SampleData, Metal, ConcentrationValue } from '../types';
import { AVAILABLE_METALS } from '../constants';
import { Unit, AVAILABLE_UNITS, UNIT_INFO, convertToMgL } from '../utils/unitConversion';

interface SampleInputFormProps {
  onAddSample: (sample: SampleData) => void;
}

const SampleInputForm: React.FC<SampleInputFormProps> = ({ onAddSample }) => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [concentrations, setConcentrations] = useState<Record<Metal, string>>({
    Pb: '', As: '', Hg: '', Cd: '', Cr: '', Ni: '', Zn: '', Fe: '',
  });
  const [selectedUnit, setSelectedUnit] = useState<Unit>(Unit.MG_L);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = latitude.trim() ? parseFloat(latitude) : null;
    const lon = longitude.trim() ? parseFloat(longitude) : null;

    // Only validate coordinates if one is provided but not both
    if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
      alert('Please enter both latitude and longitude, or leave both empty.');
      return;
    }
    
    if (lat !== null && lon !== null && (isNaN(lat) || isNaN(lon))) {
      alert('Please enter valid latitude and longitude.');
      return;
    }
    
    const numericConcentrations: Record<Metal, number | undefined> = {} as Record<Metal, number | undefined>;
    const originalConcentrations: Record<Metal, ConcentrationValue | undefined> = {} as Record<Metal, ConcentrationValue | undefined>;
    let hasConcentration = false;
    for (const metal of AVAILABLE_METALS) {
        const val = parseFloat(concentrations[metal]);
        if (!isNaN(val) && val > 0) { // Only add if it's a valid positive number
            // Convert to mg/L for storage (standard unit)
            const mgLValue = convertToMgL({ value: val, unit: selectedUnit });
            numericConcentrations[metal] = mgLValue;
            // Store original value with unit for display
            originalConcentrations[metal] = {
                value: val,
                unit: selectedUnit,
                mgLValue: mgLValue
            };
            hasConcentration = true;
        }
    }
    
    if (!hasConcentration) {
        alert('Please enter at least one metal concentration.');
        return;
    }

    const newSample: SampleData = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID each time
      latitude: lat ?? 0, // Default to 0 if not provided
      longitude: lon ?? 0, // Default to 0 if not provided
      concentrations: numericConcentrations,
      originalConcentrations: originalConcentrations,
    };

    onAddSample(newSample);
    
    // Reset form
    setLatitude('');
    setLongitude('');
    setConcentrations({ Pb: '', As: '', Hg: '', Cd: '', Cr: '', Ni: '', Zn: '', Fe: '' });
    // Reset unit to default
    setSelectedUnit(Unit.MG_L);
  };

  const handleConcentrationChange = (metal: Metal, value: string) => {
    setConcentrations(prev => ({ ...prev, [metal]: value }));
  };

  const handleUnitChange = (unit: Unit) => {
    setSelectedUnit(unit);
  };

  return (
    <div className="bg-white p-8 rounded-lg w-full">
      <h3 className="text-xl font-bold mb-1 text-slate-800">Add Sample Manually</h3>
       <p className="text-sm text-slate-500 mb-6">Enter the coordinates and metal concentrations for a single sample.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
             <label className="block text-sm font-medium text-slate-600 mb-2">Coordinates <span className="text-xs text-slate-400 font-normal">(optional)</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="number" value={latitude} onChange={e => setLatitude(e.target.value)} step="any" className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Latitude (optional)" />
                <input type="number" value={longitude} onChange={e => setLongitude(e.target.value)} step="any" className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Longitude (optional)" />
            </div>
        </div>
        <div>
            <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-600">Metal Concentrations</label>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">Unit:</label>
                    <select 
                      value={selectedUnit} 
                      onChange={e => handleUnitChange(e.target.value as Unit)}
                      className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {AVAILABLE_UNITS.map(unit => (
                        <option key={unit} value={unit}>
                          {UNIT_INFO[unit].symbol}
                        </option>
                      ))}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {AVAILABLE_METALS.map(metal => (
                <div key={metal}>
                  <label htmlFor={metal} className="block text-xs font-medium text-slate-500 mb-1">{metal}</label>
                  <input 
                    type="number" 
                    id={metal} 
                    value={concentrations[metal]} 
                    onChange={e => handleConcentrationChange(metal, e.target.value)} 
                    step="any" 
                    min="0" 
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                    placeholder="0.00" 
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">All values will be entered in <span className="font-medium">{UNIT_INFO[selectedUnit].symbol}</span></p>
        </div>
        <button type="submit" className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-purple-500 transition duration-150 shadow-sm">
          Add Sample
        </button>
      </form>
    </div>
  );
};

export default SampleInputForm;