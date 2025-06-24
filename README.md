# AutoTex 🧠➜📄
AutoTex is a React application that allows you to convert natural language descriptions into clean, compilable LaTeX code using local LLMs powered by Ollama. It provides real-time LaTeX previews with MathJax and lets users download the LaTeX source as a .tex file.

✨ **Features**
✅ **Natural Language to LaTeX** via locally running LLM (e.g. LLaMA, Mistral)

📦 **Ollama Integration** — run LLMs locally on localhost:11434

🔍 **MathJax Rendering** for instant LaTeX previews

📄 **Download .tex File** with full document structure

🔁 **Model Switching** for flexibility across different Ollama models

🛠️ **Debug Info Panel** for transparency and connection troubleshooting

⚡ **Keyboard Shortcut:** Press Ctrl+Enter or Cmd+Enter to convert

# 🚀 Getting Started
**1. Prerequisites**
Node.js and npm or yarn

Ollama installed and running on your machine:
👉 **Download it** from: https://ollama.ai

A downloaded and running model like llama3.2

**2. Clone the Repository**
```bash
git clone https://github.com/your-username/auto-tex.git
cd auto-tex
```
**3. Install Dependencies**
```bash
npm install
```
or
```
yarn install
```
**4. Start Ollama**
Ensure Ollama is running in the background. You can start a model using:

```bash
ollama run llama3.2
```
(Other models like mistral, codellama, etc., are also supported.)

**5. Start the App**
```bash
npm run dev
```
or
```
yarn dev
```
Then open: http://localhost:5173 in your browser.

# 🧠 Usage Guide
In the input box, type your natural language description of what you want in LaTeX.

**Example**:
"Create a document titled 'Mathematical Analysis'. Add a section for derivatives with the formula for the derivative of x squared, which is 2x."

Click "Convert to LaTeX" or press Ctrl+Enter / Cmd+Enter.

View the LaTeX code output and the preview side-by-side.

Click "Download .tex" to save a complete LaTeX document you can compile.

# 🛠 Tech Stack
React + TypeScript

TailwindCSS for styling

Lucide Icons

MathJax for rendering math

Ollama for local LLM inference

# 📄 Example Output
\section{Derivatives}
The derivative of \( x^2 \) is:

\[
\frac{d}{dx}x^2 = 2x
\]
# 🐞 Troubleshooting
**❗ If you see "Ollama Disconnected":**
Make sure Ollama is installed and running.

Use ollama run llama3.2 or another available model.

❗ **If no preview is shown:**

Wait a moment for MathJax to load (check "MathJax Ready" status).

Ensure the generated LaTeX is valid.

# 📥 Download & Compile PDF
After clicking Download .tex, compile it with a LaTeX tool like:

```
pdflatex document.tex
```
Or use an online editor like Overleaf to upload and compile your .tex file.

# 📘 License
MIT License — free to use, modify, and share.
