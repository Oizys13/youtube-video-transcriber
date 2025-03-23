import React, { useState } from 'react';
import axios from 'axios';
import YouTubeTranscriptAPI from 'youtube-transcript-api';
import {
  Youtube,
  FileText,
  ScrollText,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

function App() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');

    interface TranscriptResponse {
      data: {
        text: string;
      };
    }

    interface SummaryResponse {
      data: {
        summary: string;
      };
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!url) {
        setError('Please enter a YouTube URL');
        return;
      }

      setIsProcessing(true);
      setError('');
      setTranscription('');
      setSummary('');

      try {
        const videoId = extractVideoId(url);
        if (!videoId) {
          throw new Error('Invalid YouTube URL');
        }

        const transcript: TranscriptResponse = await axios.post('http://localhost:3000/transcript', { videoId });
        setTranscription(transcript.data.text);

        // Add your summarization logic here
        const transcription_text = transcript.data.text;
        if (!transcription_text || transcription_text.trim() === '') {
          throw new Error('Transcription text is empty or invalid.');
        }
        console.log(transcription_text);

        const summary: SummaryResponse = await axios.post('http://localhost:3000/summarize', {
          text: transcription_text  // Use 'text' instead of 'transcription_text' if required
        });
        console.log(summary.data.summary);
        setSummary(summary.data.summary);

      } catch (error) {
        console.error('Transcription failed:', error);
        setError('An error occurred while processing the video.');
      } finally {
        setIsProcessing(false);
      }
    };

  // Function to extract YouTube video ID from various URL formats
  interface ExtractVideoId {
    (url: string): string | null;
  }

  const extractVideoId: ExtractVideoId = (url) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/i;
    const match = url.match(regex);
    return match && match[1];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <Youtube className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold">VideoSummarizer AI</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* URL Input Section */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-w-3xl mx-auto">
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Enter YouTube Video URL
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Transcribe & Summarize'
                  )}
                </button>
              </div>
              {error && (
                <div className="mt-2 text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Results Section */}
        {(transcription || summary) && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Transcription Panel */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold">Transcription</h2>
              </div>
              <div className="h-[400px] overflow-y-auto bg-slate-900/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{transcription}</p>
              </div>
            </div>

            {/* Summary Panel */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ScrollText className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold">AI Summary</h2>
              </div>
              <div className="h-[400px] overflow-y-auto bg-slate-900/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!transcription && !summary && !isProcessing && (
          <div className="text-center py-12">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 max-w-2xl mx-auto">
              <CheckCircle2 className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ready to Process</h2>
              <p className="text-slate-400">
                Enter a YouTube URL above to get started. We'll transcribe the video
                and generate an AI-powered summary for you.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-400 text-sm">
            © 2025 VideoSummarizer AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;