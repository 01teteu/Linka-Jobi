
/**
 * Uses the Backend API to rephrase and professionalize proposal descriptions.
 * Security Note: API Key is now safely handled on the server side.
 */
export const enhanceProposalDescription = async (input: string) => {
  if (!input || input.trim().length < 3) return input;
  
  try {
    const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
    });
    
    if (!response.ok) throw new Error("AI service unavailable");
    
    const data = await response.json();
    return data.text || input;
  } catch (error: any) {
    console.warn("Gemini enhancement failed (fallback):", error);
    return input; // Fallback to original text if API fails
  }
};

/**
 * Uses the Backend API to suggest the best category for a given service description.
 */
export const suggestServiceCategory = async (input: string) => {
  if (!input) return "";

  try {
    const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
    });

    if (!response.ok) return "";

    const data = await response.json();
    return data.category || "";
  } catch (error: any) {
    console.warn("Gemini classification failed (fallback):", error);
    return "";
  }
};
