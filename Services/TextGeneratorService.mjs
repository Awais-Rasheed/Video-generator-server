import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyBbhgCUNWQjDwUyvw8JaiHWfv2VXDAVTzE');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    maxOutputTokens: 150, // Limit output tokens (adjust as needed)
  }, 
});

const TextGenerator = async (promptText) => {
    try {
        // Modify the prompt to request a specific format
        const formattedPrompt = `${promptText} 
        
        Format your response as a clean single paragraph with only sentences separated by periods. 
        Do not include bullet points, line breaks, special characters, or formatting symbols.`;
        
        console.log({ content: formattedPrompt });
        const result = await model.generateContent(formattedPrompt);
        const response = result.response;

        let text = await response.text();
        
        // Post-processing to ensure the output is correctly formatted
        text = text
            // Remove any markdown or special formatting
            .replace(/[#*_~`]/g, '')
            // Replace multiple spaces with a single space
            .replace(/\s+/g, ' ')
            // Remove bullet points and numbering
            .replace(/[-•*]\s+/g, '')
            .replace(/\d+\.\s+/g, '')
            // Remove line breaks to make it a single paragraph
            .replace(/\n+/g, ' ')
            // Clean up multiple periods
            .replace(/\.{2,}/g, '.')
            // Remove any non-alphanumeric characters except periods, commas, and spaces
            .replace(/[^\w\s.,?!]/g, '')
            // Ensure sentences are properly separated (period followed by space)
            .replace(/\.\s*/g, '. ')
            // Remove any trailing/leading whitespace
            .trim();
        
        // Make sure sentences end with periods
        if (!text.endsWith('.')) {
            text += '.';
        }
        
        console.log({ generated: text });
        return text;
    } catch (error) {
        console.error('Error generating content:', error);
        throw error;
    }
};

export default TextGenerator;