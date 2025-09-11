import React from 'react';

type View = 'reports' | 'ai';

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
    onUploadClick: () => void;
    onManualClick: () => void;
    onGoHome: () => void;
}

const NavButton: React.FC<{
    label: string;
    isActive?: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-3 py-2 text-sm font-semibold transition-colors duration-200 relative ${
            isActive
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-800'
        }`}
    >
        {label}
        {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-600 rounded-full"></div>}
    </button>
);


const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onUploadClick, onManualClick, onGoHome }) => {
  return (
    <header className="bg-slate-100/70 backdrop-blur-lg p-3 sticky top-3 z-40 border border-slate-200/60 rounded-xl shadow-lg shadow-slate-900/5 max-w-screen-2xl mx-auto">
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

        <div className="hidden md:flex items-center space-x-2">
             <NavButton
                label="Reports"
                isActive={activeView === 'reports'}
                onClick={() => setActiveView('reports')}
            />
             <NavButton
                label="AI Analysis"
                isActive={activeView === 'ai'}
                onClick={() => setActiveView('ai')}
            />
        </div>
        
        <div className="flex items-center space-x-3">
            <button onClick={onUploadClick} className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-semibold text-slate-700 bg-white/70 border border-slate-300 hover:bg-white hover:text-slate-900 hover:border-slate-400 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                <span className="hidden sm:inline">Upload</span>
            </button>
             <button onClick={onManualClick} className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                <span className="hidden sm:inline">Add Sample</span>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;