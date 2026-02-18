
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client exclusively using the API key from process.env.API_KEY.
// As per guidelines, we assume this environment variable is pre-configured.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini to rephrase and professionalize proposal descriptions.
 */
export const enhanceProposalDescription = async (input: string) => {
  if (!input || input.trim().length < 3) return input;
  
  const prompt = `Reescreva esta solicitação de serviço para um aplicativo de contratação profissional. Mantenha curto (máximo 2 frases), direto, corrija o português e deixe o tom educado mas objetivo. Texto original: "${input}"`;
  const sysInstr = "Você é um assistente útil do app Linka Jobi. Seu objetivo é ajudar usuários a descreverem problemas domésticos de forma clara para profissionais.";

  try {
    // Calling generateContent directly with the model name and prompt as per SDK guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        systemInstruction: sysInstr,
      },
    });
    // Accessing the .text property directly (not as a function).
    return response.text?.trim() || input;
  } catch (error: any) {
    console.warn("Gemini enhancement failed (fallback):", error);
    return input; // Fallback to original text if AI fails
  }
};

/**
 * Uses Gemini to suggest the best category for a given service description.
 */
export const suggestServiceCategory = async (input: string) => {
  if (!input) return "";
  
  // Lista exata de categorias/serviços disponíveis no constants.ts para o prompt
  const categories = "Pedreiro, Eletricista, Encanador, Pintor, Marido de Aluguel, Montador, Gesseiro, Diarista, Lavanderia, Pós Obra, Mudanças, Carretos, Jardinagem, Chaveiro";
  const prompt = `Analise este problema: "${input}". Com base nisso, qual destes serviços é o mais adequado? Lista: [${categories}]. Retorne APENAS o nome exato do serviço da lista. Se não tiver certeza, retorne 'Marido de Aluguel'.`;

  try {
    // Calling generateContent directly as per SDK guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
    });
    // Accessing the .text property directly.
    return response.text?.trim() || "";
  } catch (error: any) {
    console.warn("Gemini classification failed (fallback):", error);
    return "";
  }
};
