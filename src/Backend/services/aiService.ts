import { User, Project } from "../types";

export const aiService = {
  /**
   * Analyzes an image for topographic information via the server proxy
   * @param base64Image Base64 encoded image string (without data: prefix)
   * @param mimeType Image mime type (e.g. 'image/jpeg')
   */
  async analyzeTopographyImage(base64Image: string, mimeType: string) {
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType: mimeType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("AI Analysis Client Error:", error);
      throw error;
    }
  },

  /**
   * Answers questions about a topographic image
   */
  async chatAboutImage(base64Image: string, mimeType: string, question: string) {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType: mimeType,
          question: question
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("AI Chat Client Error:", error);
      throw error;
    }
  }
};
