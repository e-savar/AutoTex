import { AlertCircle, CheckCircle, Eye, EyeOff, FileDown, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

// Types
interface OllamaResponse {
  response: string;
  done: boolean;
}

interface ConversionResult {
  latex: string;
  error?: string;
}

interface OllamaModel {
  name: string;
  size: number;
}

// Load MathJax dynamically
const loadMathJax = () => {
  return new Promise((resolve) => {
    if (window.MathJax) {
      resolve(window.MathJax);
      return;
    }

    // Configure MathJax
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        tags: 'ams'
      },
      options: {
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      },
      startup: {
        ready: () => {
          window.MathJax.startup.defaultReady();
          resolve(window.MathJax);
        }
      }
    };

    // Load MathJax script
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js';
    script.async = true;
    document.head.appendChild(script);
  });
};

const App: React.FC = () => {
  const [naturalText, setNaturalText] = useState('');
  const [latexOutput, setLatexOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3.2', 'llama2', 'codellama', 'mistral']);
  const [debugInfo, setDebugInfo] = useState('');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [mathJaxLoaded, setMathJaxLoaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load MathJax on component mount
  useEffect(() => {
    loadMathJax().then(() => {
      setMathJaxLoaded(true);
    });
  }, []);

  // Re-render MathJax when LaTeX output changes
  useEffect(() => {
    if (mathJaxLoaded && latexOutput && window.MathJax && previewRef.current) {
      window.MathJax.typesetPromise([previewRef.current]).catch((err: any) => {
        console.error('MathJax rendering error:', err);
      });
    }
  }, [latexOutput, mathJaxLoaded, showPreview]);

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaConnection();
  }, []);

  const checkOllamaConnection = async () => {
    setIsCheckingConnection(true);
    try {
      setDebugInfo('Checking Ollama connection...');
      
      // First check if Ollama is running
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOllamaConnected(true);
        
        // Extract model names from the response
        if (data.models && Array.isArray(data.models)) {
          const modelNames = data.models.map((model: OllamaModel) => model.name);
          setAvailableModels(modelNames);
          
          // Set default model if current selection isn't available
          if (modelNames.length > 0 && !modelNames.includes(selectedModel)) {
            setSelectedModel(modelNames[0]);
          }
          
          setDebugInfo(`Ollama connected successfully. Found ${modelNames.length} models: ${modelNames.join(', ')}`);
        } else {
          setDebugInfo('Ollama connected but no models found. Please install a model first.');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setOllamaConnected(false);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setDebugInfo(`Ollama connection failed: ${errorMsg}. Make sure Ollama is installed and running.`);
      console.error('Ollama connection failed:', error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const convertToLatex = useCallback(async (text: string): Promise<ConversionResult> => {
    if (!text.trim()) {
      return { latex: '' };
    }

    try {
      setDebugInfo('Sending request to Ollama...');
      
      const prompt = `You are a LaTeX expert. Convert the following natural language description into clean, well-formatted LaTeX code. Only return the LaTeX code without any explanations, markdown formatting, or additional text.

Rules:
- Use appropriate document structure (sections, subsections, etc.)
- Format mathematical expressions properly with $ or $$ delimiters
- Use proper LaTeX commands for formatting (\\textbf, \\textit, etc.)
- Include necessary packages if needed (but don't include \\documentclass or \\begin{document})
- Make the output clean and compilable

Natural language description: ${text}

LaTeX code:`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        }),
      });

      setDebugInfo(`Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Model "${selectedModel}" not found. Please check if the model is installed.`);
        } else if (response.status === 500) {
          throw new Error('Ollama server error. The model might be loading or there\'s an internal issue.');
        } else {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
      }

      const data: OllamaResponse = await response.json();
      setDebugInfo(`Response received. Length: ${data.response?.length || 0} characters`);
      
      // Clean up the response
      let cleanedResponse = data.response?.trim() || '';
      
      // Remove any markdown code block formatting if present
      cleanedResponse = cleanedResponse.replace(/^```latex\s*/gm, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/gm, '');
      cleanedResponse = cleanedResponse.replace(/```$/gm, '');
      
      console.log('Ollama response:', cleanedResponse);
      
      return { latex: cleanedResponse };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setDebugInfo(`Error: ${errorMsg}`);
      return { 
        latex: '', 
        error: errorMsg
      };
    }
  }, [selectedModel]);

  // Manual conversion function
  const handleConvert = async () => {
    if (!naturalText.trim() || !ollamaConnected) return;
    
    setIsConverting(true);
    setDebugInfo('Starting conversion...');
    
    try {
      const result = await convertToLatex(naturalText);
      
      if (result.error) {
        console.error('Conversion error:', result.error);
        setDebugInfo(`Conversion error: ${result.error}`);
        setLatexOutput('');
      } else {
        console.log('Conversion successful:', result.latex);
        setLatexOutput(result.latex);
        setDebugInfo(`Conversion successful. Output length: ${result.latex.length} characters`);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setDebugInfo(`Unexpected error: ${error}`);
      setLatexOutput('');
    }
    
    setIsConverting(false);
  };

  const downloadLatex = async () => {
    if (!latexOutput.trim()) return;

    try {
      // Create a complete LaTeX document
      const fullLatexDocument = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{geometry}
\\usepackage{graphicx}
\\geometry{margin=1in}

\\begin{document}

${latexOutput}

\\end{document}`;

      // Download the LaTeX source
      const blob = new Blob([fullLatexDocument], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.tex';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setDebugInfo('LaTeX file downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      setDebugInfo('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const renderLatexPreview = (latex: string) => {
    if (!latex) return '';
    
    // Enhanced LaTeX to HTML conversion with better math handling
    let preview = latex;
    
    // Handle document structure
    preview = preview
      .replace(/\\documentclass\{[^}]+\}/g, '')
      .replace(/\\usepackage(\[[^\]]*\])?\{[^}]+\}/g, '')
      .replace(/\\begin\{document\}/g, '')
      .replace(/\\end\{document\}/g, '')
      .replace(/\\title\{([^}]+)\}/g, '<h1 class="text-2xl font-bold text-center mb-4">$1</h1>')
      .replace(/\\author\{([^}]+)\}/g, '<p class="text-center italic mb-2">$1</p>')
      .replace(/\\date\{([^}]+)\}/g, '<p class="text-center text-sm text-gray-600 mb-4">$1</p>')
      .replace(/\\maketitle/g, '')
      .replace(/\\section\{([^}]+)\}/g, '<h2 class="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300">$1</h2>')
      .replace(/\\subsection\{([^}]+)\}/g, '<h3 class="text-lg font-medium mt-4 mb-2">$1</h3>')
      .replace(/\\subsubsection\{([^}]+)\}/g, '<h4 class="text-base font-medium mt-3 mb-2">$1</h4>')
      .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
      .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
      .replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
      .replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>')
      .replace(/\\\\/g, '<br>')
      .replace(/\\newline/g, '<br>')
      .replace(/\\par/g, '<br><br>')
      .replace(/\\begin\{itemize\}/g, '<ul class="list-disc ml-6 my-2">')
      .replace(/\\end\{itemize\}/g, '</ul>')
      .replace(/\\begin\{enumerate\}/g, '<ol class="list-decimal ml-6 my-2">')
      .replace(/\\end\{enumerate\}/g, '</ol>')
      .replace(/\\item/g, '<li class="mb-1">')
      .replace(/\\\\$/gm, '<br>')
      .replace(/\n\s*\n/g, '<br><br>')
      .trim();
    
    return preview;
  };

  // Test function for debugging
  const testConversion = () => {
    setNaturalText('Create a document with the title "Mathematical Analysis". Add a section called "Derivatives" with the formula for the derivative of x squared, which is 2x. Then add another section about "Integrals" with the integral of 2x dx equals x squared plus C.');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AutoTex
          </h1>
          <p className="text-gray-600 mb-4">
            Convert natural language descriptions into LaTeX formatting using Ollama AI
          </p>
          
          {/* Connection Status */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${ollamaConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${ollamaConnected ? 'text-green-700' : 'text-red-700'}`}>
                Ollama {ollamaConnected ? 'Connected' : 'Disconnected'}
              </span>
              {ollamaConnected && (
                <CheckCircle size={16} className="text-green-500" />
              )}
              {!ollamaConnected && (
                <AlertCircle size={16} className="text-red-500" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${mathJaxLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className={`text-sm ${mathJaxLoaded ? 'text-green-700' : 'text-yellow-700'}`}>
                MathJax {mathJaxLoaded ? 'Ready' : 'Loading...'}
              </span>
            </div>
            
            {ollamaConnected && availableModels.length > 0 && (
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
            
            <button
              onClick={checkOllamaConnection}
              disabled={isCheckingConnection}
              className="text-sm text-blue-600 hover:text-blue-800 bg-none border-none cursor-pointer flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isCheckingConnection ? 'animate-spin' : ''} />
              {isCheckingConnection ? 'Checking...' : 'Refresh'}
            </button>
            
            <button
              onClick={testConversion}
              className="text-sm text-purple-600 hover:text-purple-800 border border-purple-600 hover:border-purple-800 cursor-pointer px-2 py-1 rounded hover:bg-purple-50"
            >
              Test Conversion
            </button>
          </div>
          
          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Natural Language Input
            </h2>
            <textarea
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              placeholder="Describe what you want in LaTeX... For example: 'Create a title that says Mathematical Analysis, then add a section about derivatives with the formula for the derivative of x squared'"
              className="w-full h-96 p-4 border border-slate-300 rounded-xl resize-none text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
              disabled={!ollamaConnected}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleConvert();
                }
              }}
            />
            
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <button
                onClick={handleConvert}
                disabled={!naturalText.trim() || !ollamaConnected || isConverting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold min-w-36 justify-center transition-all duration-150 shadow-sm"
              >
                {isConverting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <span className="text-base font-bold">↵</span>
                    Convert to LaTeX
                  </>
                )}
              </button>
              
              <span className="text-xs text-gray-500 italic">
                Or press Ctrl+Enter (Cmd+Enter on Mac)
              </span>
            </div>
            
            {!ollamaConnected && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Setup Required:</strong> Please make sure Ollama is installed and running on localhost:11434. 
                  Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> to download and install Ollama, then run a model like <code className="bg-yellow-100 px-1 rounded">ollama run llama3.2</code>
                </p>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                LaTeX Output
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-none border-none cursor-pointer rounded hover:text-gray-800 hover:bg-gray-100"
                >
                  {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  onClick={downloadLatex}
                  disabled={!latexOutput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-all duration-150 shadow-sm disabled:bg-slate-300"
                >
                  <FileDown size={16} />
                  Download .tex
                </button>
              </div>
            </div>

            {isConverting && (
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">Converting...</span>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Show message when no output */}
              {!latexOutput && !isConverting && (
                <div className="text-center p-12 text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm">
                    Click "Convert to LaTeX" to generate LaTeX code from your natural language input.
                  </p>
                </div>
              )}

              {/* LaTeX Code */}
              {latexOutput && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    LaTeX Code:
                  </h3>
                  <pre className="bg-slate-100 p-4 rounded-xl text-sm font-mono overflow-auto h-48 border border-slate-300 whitespace-pre-wrap break-words shadow-inner">
                    {latexOutput}
                  </pre>
                </div>
              )}

              {/* Preview with MathJax */}
              {showPreview && latexOutput && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Preview {!mathJaxLoaded && <span className="text-yellow-600">(Loading MathJax...)</span>}:
                  </h3>
                  <div 
                    ref={previewRef}
                    className="bg-white p-6 border border-slate-300 rounded-xl h-48 overflow-auto mb-2 text-sm leading-relaxed text-slate-700 tex2jax_process"
                    dangerouslySetInnerHTML={{ 
                      __html: renderLatexPreview(latexOutput) 
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Mathematical expressions are rendered using MathJax for accurate preview.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p className="mb-1">
            Make sure Ollama is installed and running with your preferred model.
          </p>
          <p className="mb-1">
            For PDF generation, use the downloaded .tex file with a LaTeX compiler like pdflatex.
          </p>
          <p>
            Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ollama.ai</a> and run <code className="bg-gray-100 px-1 rounded">ollama run llama3.2</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;