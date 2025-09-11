import React from 'react';
import { Standard } from '../types';
import { STANDARDS } from '../constants';

interface StandardsEditorProps {
  selectedStandard: Standard;
  onStandardChange: (standard: Standard) => void;
}

const StandardsEditor: React.FC<StandardsEditorProps> = ({ selectedStandard, onStandardChange }) => {
  return (
    <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-lg shadow-slate-900/5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-2 sm:mb-0">Regulatory Standard</h3>
        <select
          value={selectedStandard.name}
          onChange={(e) => {
              const newStandard = Object.values(STANDARDS).find(s => s.name === e.target.value);
              if (newStandard) {
                  onStandardChange(newStandard);
              }
          }}
          className="w-full sm:w-auto bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
        >
          {Object.values(STANDARDS).map(std => (
            <option key={std.name} value={std.name}>{std.name}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50/80">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold tracking-wider">Metal</th>
              <th scope="col" className="px-4 py-2 font-semibold tracking-wider">Permissible Limit (mg/L)</th>
              <th scope="col" className="px-4 py-2 font-semibold tracking-wider">Ideal Value (mg/L)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(selectedStandard.limits).map(([metal, limits]: [string, any]) => (
              <tr key={metal} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2.5 font-semibold text-slate-700">{metal}</td>
                <td className="px-4 py-2.5">{limits.permissible}</td>
                <td className="px-4 py-2.5">{limits.ideal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StandardsEditor;