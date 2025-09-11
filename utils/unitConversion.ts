import { Metal } from '../types';

export enum Unit {
  MG_L = 'mg/L',
  PPM = 'ppm', 
  PPB = 'ppb',
  UG_L = 'μg/L'
}

export interface ConcentrationWithUnit {
  value: number;
  unit: Unit;
}

export interface UnitInfo {
  symbol: string;
  name: string;
  toMgL: number; // conversion factor to mg/L
}

export const UNIT_INFO: Record<Unit, UnitInfo> = {
  [Unit.MG_L]: { symbol: 'mg/L', name: 'Milligrams per Liter', toMgL: 1 },
  [Unit.PPM]: { symbol: 'ppm', name: 'Parts per Million', toMgL: 1 }, // ppm = mg/L for water
  [Unit.PPB]: { symbol: 'ppb', name: 'Parts per Billion', toMgL: 0.001 }, // ppb = μg/L
  [Unit.UG_L]: { symbol: 'μg/L', name: 'Micrograms per Liter', toMgL: 0.001 }
};

export const AVAILABLE_UNITS = Object.values(Unit);

// Typical ranges for each metal in different units to help with auto-detection
export const TYPICAL_RANGES: Record<Metal, Record<Unit, { min: number; max: number }>> = {
  [Metal.Pb]: {
    [Unit.MG_L]: { min: 0.0001, max: 0.1 },
    [Unit.PPM]: { min: 0.0001, max: 0.1 },
    [Unit.PPB]: { min: 0.1, max: 100 },
    [Unit.UG_L]: { min: 0.1, max: 100 }
  },
  [Metal.As]: {
    [Unit.MG_L]: { min: 0.0001, max: 0.1 },
    [Unit.PPM]: { min: 0.0001, max: 0.1 },
    [Unit.PPB]: { min: 0.1, max: 100 },
    [Unit.UG_L]: { min: 0.1, max: 100 }
  },
  [Metal.Hg]: {
    [Unit.MG_L]: { min: 0.00001, max: 0.01 },
    [Unit.PPM]: { min: 0.00001, max: 0.01 },
    [Unit.PPB]: { min: 0.01, max: 10 },
    [Unit.UG_L]: { min: 0.01, max: 10 }
  },
  [Metal.Cd]: {
    [Unit.MG_L]: { min: 0.0001, max: 0.01 },
    [Unit.PPM]: { min: 0.0001, max: 0.01 },
    [Unit.PPB]: { min: 0.1, max: 10 },
    [Unit.UG_L]: { min: 0.1, max: 10 }
  },
  [Metal.Cr]: {
    [Unit.MG_L]: { min: 0.001, max: 0.5 },
    [Unit.PPM]: { min: 0.001, max: 0.5 },
    [Unit.PPB]: { min: 1, max: 500 },
    [Unit.UG_L]: { min: 1, max: 500 }
  },
  [Metal.Ni]: {
    [Unit.MG_L]: { min: 0.001, max: 0.2 },
    [Unit.PPM]: { min: 0.001, max: 0.2 },
    [Unit.PPB]: { min: 1, max: 200 },
    [Unit.UG_L]: { min: 1, max: 200 }
  },
  [Metal.Zn]: {
    [Unit.MG_L]: { min: 0.01, max: 10 },
    [Unit.PPM]: { min: 0.01, max: 10 },
    [Unit.PPB]: { min: 10, max: 10000 },
    [Unit.UG_L]: { min: 10, max: 10000 }
  },
  [Metal.Fe]: {
    [Unit.MG_L]: { min: 0.01, max: 5 },
    [Unit.PPM]: { min: 0.01, max: 5 },
    [Unit.PPB]: { min: 10, max: 5000 },
    [Unit.UG_L]: { min: 10, max: 5000 }
  }
};

/**
 * Convert concentration from one unit to another
 */
export function convertUnit(value: number, fromUnit: Unit, toUnit: Unit): number {
  if (fromUnit === toUnit) return value;
  
  // Convert to mg/L first, then to target unit
  const mgLValue = value * UNIT_INFO[fromUnit].toMgL;
  return mgLValue / UNIT_INFO[toUnit].toMgL;
}

/**
 * Convert concentration to mg/L (standard unit for calculations)
 */
export function convertToMgL(concentration: ConcentrationWithUnit): number {
  return convertUnit(concentration.value, concentration.unit, Unit.MG_L);
}


/**
 * Auto-detect units for an entire dataset
 * Analyzes all values across all metals to determine the most consistent unit for the whole dataset
 */
export function detectUnitForDataset(samples: Array<{ concentrations: Record<Metal, number | undefined> }>): Unit {
  if (samples.length === 0) return Unit.MG_L;
  
  // Collect all concentration values from all metals and samples
  const allValues: number[] = [];
  
  samples.forEach(sample => {
    Object.values(sample.concentrations).forEach(value => {
      if (value !== undefined && value > 0) {
        allValues.push(value);
      }
    });
  });
  
  if (allValues.length === 0) return Unit.MG_L;
  
  // Count how many values fit within typical ranges for each unit across all metals
  const unitScores: Record<Unit, number> = {
    [Unit.MG_L]: 0,
    [Unit.PPM]: 0,
    [Unit.PPB]: 0,
    [Unit.UG_L]: 0
  };
  
  // For each value, check which units it could reasonably belong to
  allValues.forEach(value => {
    AVAILABLE_UNITS.forEach(unit => {
      // Check if this value fits in any metal's range for this unit
      let fitsInAnyRange = false;
      Object.values(TYPICAL_RANGES).forEach(metalRanges => {
        const range = metalRanges[unit];
        if (value >= range.min && value <= range.max) {
          fitsInAnyRange = true;
        }
      });
      
      if (fitsInAnyRange) {
        unitScores[unit]++;
      }
    });
  });
  
  // Find the unit with the highest score
  let bestUnit = Unit.MG_L;
  let bestScore = unitScores[Unit.MG_L];
  
  AVAILABLE_UNITS.forEach(unit => {
    if (unitScores[unit] > bestScore) {
      bestScore = unitScores[unit];
      bestUnit = unit;
    }
  });
  
  return bestUnit;
}


/**
 * Parse unit from string (case insensitive, flexible matching)
 */
export function parseUnit(unitStr: string): Unit | null {
  const normalized = unitStr.toLowerCase().trim();
  
  // Direct matches
  const unitMappings: Record<string, Unit> = {
    'mg/l': Unit.MG_L,
    'mgl': Unit.MG_L,
    'mg per l': Unit.MG_L,
    'mg per liter': Unit.MG_L,
    'milligrams per liter': Unit.MG_L,
    
    'ppm': Unit.PPM,
    'parts per million': Unit.PPM,
    
    'ppb': Unit.PPB,
    'parts per billion': Unit.PPB,
    
    'μg/l': Unit.UG_L,
    'ug/l': Unit.UG_L,
    'ugl': Unit.UG_L,
    'micrograms per liter': Unit.UG_L,
    'μg per l': Unit.UG_L,
    'ug per l': Unit.UG_L
  };
  
  return unitMappings[normalized] || null;
}

/**
 * Get the best display unit for a concentration value
 * Tries to show the value in a readable range (avoid very small decimals)
 */
export function getBestDisplayUnit(value: number, currentUnit: Unit, metal: Metal): Unit {
  const mgLValue = convertUnit(value, currentUnit, Unit.MG_L);
  
  // If mg/L value is very small (< 0.001), prefer ppb or μg/L
  if (mgLValue < 0.001) {
    const ppbValue = convertUnit(mgLValue, Unit.MG_L, Unit.PPB);
    return ppbValue >= 0.1 ? Unit.PPB : Unit.UG_L;
  }
  
  // If mg/L value is reasonable (>= 0.001), use mg/L or ppm
  return mgLValue >= 0.001 ? Unit.MG_L : Unit.PPM;
}