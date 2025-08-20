"use client";

import React, { useState, useRef, useEffect } from 'react';

// The main App component for our chatbot UI.
// This component handles the chat interface, message history,
// and file uploads for image analysis.
export default function App() {
  // State for managing the chat history. Each object contains a role ('user' or 'model') and content.
  const [messages, setMessages] = useState([]);
  // State for the current user's input text.
  const [input, setInput] = useState('');
  // State to handle the loading indicator while the model is thinking.
  const [isLoading, setIsLoading] = useState(false);
  // State for the uploaded file, if any.
  const [uploadedFile, setUploadedFile] = useState(null);
  // State for the URL of the uploaded image preview.
  const [imagePreview, setImagePreview] = useState(null);

  // A ref to automatically scroll the chat window to the latest message.
  const chatEndRef = useRef(null);

  // A list of sample prompts to inspire the user.
  const samplePrompts = [
    'Tell me a fun fact about space.',
    'Describe the photo I just uploaded.',
    'Write a short story about a brave knight.',
    'What are the ingredients in this dish?',
  ];

  // This useEffect hook is used to automatically scroll to the bottom of the chat window
  // whenever a new message is added.
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handles the file input change event.
  // This function reads the uploaded file and creates a preview URL.
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      // Create a temporary URL for the image preview.
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handles the form submission when the user sends a message.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && !uploadedFile) return;

    // Add the user's message to the chat history immediately.
    const userMessage = {
      role: 'user',
      content: input,
      ...(uploadedFile && { image: imagePreview }),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Clear the input field and file states.
    setInput('');
    setUploadedFile(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      // Create the payload for the API call to your Vercel serverless function.
      const payload = {
        messages: [...messages, userMessage],
      };

      // Handle the file data. If a file is uploaded, convert it to Base64 and include it
      // in the payload for the vision model.
      if (uploadedFile) {
        // We need to read the file as a Data URL (Base64) to send it in the JSON payload.
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFile);
        reader.onloadend = async () => {
          const base64Data = reader.result.split(',')[1];
          const mimeType = uploadedFile.type;
          
          payload.uploadedFile = {
            data: base64Data,
            mimeType: mimeType
          };

          // Make the API call to your Vercel serverless function.
          await callApi(payload);
        };
      } else {
        // If no file is uploaded, just call the API with text content.
        await callApi(payload);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add an error message to the chat history if something goes wrong.
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'model', content: 'Oops! Something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // This function makes the API call to your serverless function.
  const callApi = async (payload) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const modelResponse = {
        role: 'model',
        content: data.text,
      };

      setMessages((prevMessages) => [...prevMessages, modelResponse]);
    } catch (error) {
      console.error('API call failed:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'model', content: 'Oops! Something went wrong with the API call. Please check your backend server.' },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-inter">
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-center">🤖 Sarcastic Chatbot</h1>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-lg">Start a new conversation.</p>
            <p className="text-sm mt-2">Try one of the prompts below!</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {samplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className="max-w-full rounded-md mb-2 object-cover" />
              )}
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="max-w-xs md:max-w-md p-3 rounded-lg shadow-sm bg-gray-200 dark:bg-gray-800 rounded-bl-none">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        {imagePreview && (
          <div className="mb-4 relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setUploadedFile(null); setImagePreview(null); }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 leading-none text-xs"
            >
              &times;
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="file"
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            id="file-upload"
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full cursor-pointer transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Upload an image or document"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type a message..."
            className="flex-1 p-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !uploadedFile)}
            className="p-3 rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
