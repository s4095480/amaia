import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, Loader } from 'lucide-react';

export default function AmaiaPlatform() {
  const [currentPage, setCurrentPage] = useState('intro');
  const [isOnCall, setIsOnCall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [callTranscript, setCallTranscript] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const AGENT_ID = 'agent_2401k7zqr76sejkt2xcszb3gqy9j';
  const API_KEY = 'sk_e6c4b42c83ba3caf0080f82f1ca431f3108035a3f7a6a32a';

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            handleUserSpeech(transcript);
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  // Initialize agent conversation
  const initializeConversation = async () => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/agents/conversations', {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: AGENT_ID,
          mode: 'streaming'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation_id);
        console.log('Conversation initialized:', data.conversation_id);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const handleUserSpeech = async (transcript) => {
    if (!transcript.trim()) return;

    // Add user message to transcript
    setCallTranscript(prev => [...prev, {
      id: prev.length + 1,
      sender: 'user',
      text: transcript,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    await sendMessageToAgent(transcript);
  };

  const sendMessageToAgent = async (userMessage) => {
    setIsListening(true);

    try {
      if (!conversationId) {
        await initializeConversation();
      }

      // Send message to agent
      const response = await fetch(
        `https://api.elevenlabs.io/v1/agents/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: userMessage
          })
        }
      );

      if (response.ok) {
        // Get the agent's response
        const responseData = await response.json();
        console.log('Agent response:', responseData);

        // Extract text response
        if (responseData.message) {
          const amaiaResponse = responseData.message;

          // Add to transcript
          setCallTranscript(prev => [...prev, {
            id: prev.length + 1,
            sender: 'amaia',
            text: amaiaResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);

          // Generate voice if not muted
          if (!muted) {
            await generateVoice(amaiaResponse);
          }
        }
      } else {
        console.error('Error response:', response.status);
      }
    } catch (error) {
      console.error('Error sending message to agent:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsListening(false);
    }
  };

  const generateVoice = async (text) => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('Voice generation error:', error);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const startCall = async () => {
    setIsOnCall(true);
    setCurrentPage('log');
    setCallTranscript([{
      id: 0,
      sender: 'amaia',
      text: 'Hey, I\'m so glad you called. Talk to me.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    // Initialize conversation
    await initializeConversation();

    // Generate greeting voice
    if (!muted) {
      await generateVoice("Hey, I'm so glad you called. Talk to me.");
    }
  };

  const endCall = () => {
    setIsOnCall(false);
    setCurrentPage('intro');
    setCallTranscript([]);
    setConversationId(null);
    stopListening();
  };

  // ===== INTRO PAGE =====
  if (currentPage === 'intro') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-96 h-96 bg-pink-600 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 w-full max-w-md px-6 space-y-8">
          <div className="space-y-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl shadow-pink-500/50 animate-pulse" />
            <div>
              <h1 className="text-5xl font-light tracking-wider mb-2">Amaia</h1>
              <p className="text-gray-400 text-sm">is calling...</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-xs text-gray-500">live voice call</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={startCall}
              className="px-12 py-4 bg-green-600 hover:bg-green-700 rounded-full font-semibold transition-all shadow-lg shadow-green-600/50 flex items-center gap-2"
            >
              <Phone size={20} />
              Answer
            </button>
            <button className="px-12 py-4 bg-red-600 hover:bg-red-700 rounded-full font-semibold transition-all shadow-lg shadow-red-600/50">
              Decline
            </button>
          </div>

          <p className="text-center text-xs text-gray-600 mt-8">
            Welcome to Amaia's world. Real voice conversation powered by ElevenLabs.
          </p>
        </div>
      </div>
    );
  }

  // ===== CALL PAGE =====
  if (currentPage === 'log' && isOnCall) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white flex flex-col">
        <div className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="text-center flex-1">
              <h2 className="font-semibold">Amaia</h2>
              <p className="text-xs text-green-400">on call</p>
            </div>
            <button
              onClick={() => setMuted(!muted)}
              className="text-gray-500 hover:text-white mr-4"
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 rounded-full p-3"
            >
              <Phone size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-12">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl shadow-pink-500/50 flex items-center justify-center text-4xl ${
              isRecording ? 'animate-pulse' : isListening ? 'animate-bounce' : ''
            }`}>
              🎤
            </div>
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-pink-500 animate-pulse" />
            )}
          </div>

          <div className="text-center">
            {isRecording && (
              <p className="text-pink-400 text-sm font-medium animate-pulse">Listening...</p>
            )}
            {isListening && (
              <p className="text-purple-400 text-sm font-medium animate-pulse">Amaia is thinking...</p>
            )}
            {!isRecording && !isListening && (
              <p className="text-gray-400 text-sm">Ready to listen</p>
            )}
          </div>

          {callTranscript.length > 1 && (
            <div className="max-w-md space-y-3 max-h-32 overflow-y-auto">
              {callTranscript.slice(-2).map(msg => (
                <div key={msg.id} className={`text-sm ${msg.sender === 'user' ? 'text-pink-300' : 'text-gray-300'}`}>
                  <p className="text-xs text-gray-600 mb-1">{msg.sender === 'user' ? 'You' : 'Amaia'}</p>
                  <p className="italic">{msg.text}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={isRecording ? stopListening : startListening}
            disabled={isListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all transform ${
              isRecording
                ? 'bg-red-600 scale-110 shadow-lg shadow-red-600/50'
                : 'bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-600/50'
            } ${isListening ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
            {isRecording && (
              <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-pulse" />
            )}
          </button>
        </div>

        <div className="bg-black/50 border-t border-gray-800 px-4 py-6 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-4">Call History</p>
          <div className="space-y-3">
            {callTranscript.map(msg => (
              <div key={msg.id} className={`text-xs ${msg.sender === 'user' ? 'text-pink-300' : 'text-gray-400'}`}>
                <p className="font-semibold mb-1">{msg.sender === 'user' ? 'You' : 'Amaia'}</p>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
