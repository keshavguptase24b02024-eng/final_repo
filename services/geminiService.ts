
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from '../types';

export const getAnalysisFromGemini = async (results: AnalysisResult[]): Promise<string> => {
  // Fix: Removed explicit API_KEY check to comply with coding guidelines.
  // The API key is assumed to be present in the environment.
  if (results.length === 0) {
    return "No data to analyze. Please upload or enter sample data first.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert environmental scientist specializing in groundwater contamination.
    Analyze the following heavy metal pollution data and provide a concise, actionable report.
    The data includes calculated indices: HPI (Heavy Metal Pollution Index), HEI (Heavy Metal Evaluation Index), and HCI (Heavy Metal Contamination Index).
    
    Data:
    ${JSON.stringify(results, null, 2)}

    Based on the data, please provide the following in your report:
    1.  **Overall Summary:** A brief overview of the water quality across all samples.
    2.  **Hotspot Identification:** Identify the sample locations (by ID and coordinates) with the highest pollution levels for each index (HPI, HEI, HCI).
    3.  **Key Pollutants:** Determine which heavy metals are the most significant contributors to the pollution across the dataset.
    4.  **Potential Risks & Sources:** Briefly mention the potential health risks associated with the key pollutants and suggest likely anthropogenic or natural sources.
    5.  **Recommendations:** Provide clear, actionable recommendations for further investigation, monitoring, and potential remediation.

    Format the response in clear, well-structured markdown.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching analysis from Gemini:", error);
    return `An error occurred while communicating with the AI. Please check your API key and network connection. Details: ${error instanceof Error ? error.message : String(error)}`;
  }
};
