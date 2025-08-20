import { GoogleGenerativeAI } from '@google/generative-ai';

// The API key is securely loaded from environment variables.
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Define the model to use.
// We'll use gemini-2.5-flash-preview-05-20 for messages with images/files.
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

// A helper function to convert file data to a format the Gemini API can understand.
function fileToGenerativePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
}

// This is the handler for POST requests to /api/chat.
export async function POST(req) {
  try {
    const { messages, uploadedFile } = await req.json();
    
    // Determine which model to use based on whether a file was uploaded.
    let modelToUse = textModel;
    let parts = [];

    // This is the key part for personality: The system message.
    const systemPrompt = {
      text: "You are a professional comedian and a sarcastic, humorous chatbot. Your primary goal is to entertain the user with witty, clever, and sometimes subtly mocking jokes. You should understand double meanings and play on words. Keep your replies short and punchy. Avoid giving formal or serious responses unless absolutely necessary.",
    };

    // The entire conversation history should be sent to the API.
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    
    // Add the user's latest message to the parts.
    const latestUserMessage = messages[messages.length - 1].content;
    const latestUserPart = { text: latestUserMessage };
    
    // Add the image part if a file was uploaded.
    if (uploadedFile) {
      if (uploadedFile.mimeType.startsWith('image/')) {
        parts.push(fileToGenerativePart(uploadedFile.data, uploadedFile.mimeType));
      } else {
        // Handle other file types by extracting text.
        // This is a placeholder. You would need to implement this logic.
        parts.push({ text: "I can't directly read documents like PDFs yet. Please provide text or an image." });
      }
      modelToUse = visionModel;
    }

    // Add the system prompt and the latest user message to the parts array.
    parts.unshift(systemPrompt);
    parts.push(latestUserPart);

    const result = await modelToUse.generateContent({
      contents: [{ role: "user", parts: parts }],
    });
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate content.' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
