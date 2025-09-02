# OpenRouter Configuration Example

## Quick Setup for OpenRouter API

1. **Get your API Key**
   - Sign up at https://openrouter.ai/
   - Generate an API key from your dashboard
   - Your key will look like: `sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **Configure ollama-chats**
   - Open `index.html` in your browser
   - In the connection settings:
     - **URL**: `https://openrouter.ai/api/v1`
     - **API Key**: `your-api-key-here`
   - Click "Re-try" to connect

3. **Select a Model**
   - Popular choices:
     - `gpt-4-turbo`: OpenAI's latest GPT-4
     - `claude-3-opus`: Anthropic's most capable model
     - `meta-llama/llama-3.1-70b-instruct`: Meta's latest Llama
     - `mistralai/mistral-7b-instruct`: Fast and efficient

4. **Start Chatting!**
   - The interface will automatically adapt for OpenRouter
   - Features like "Pull" will be hidden (not applicable)
   - RAG/Embeddings can use a separate Ollama instance (configure "Embeddings instance URL" in settings)

## Hybrid Setup: OpenRouter + Ollama Embeddings

You can use OpenRouter for chat completions while keeping Ollama for embeddings/RAG:

1. **Set up OpenRouter as described above**
2. **Install Ollama locally** for embeddings:
   - Follow [Ollama installation guide](https://ollama.ai)
   - Pull an embedding model: `ollama pull nomic-embed-text`
3. **Configure hybrid setup**:
   - Main "URL" should be: `https://openrouter.ai/api/v1`
   - "Embeddings instance URL" should be: `http://127.0.0.1:11434` (your local Ollama)
   - This allows you to use advanced OpenRouter models for chat while using local Ollama for embeddings

## Cost Management

- OpenRouter uses pay-per-token pricing
- Check current rates at https://openrouter.ai/models
- Monitor your usage in your OpenRouter dashboard

## Troubleshooting

- **"Network Error"**: Check your API key and internet connection
- **"No models found"**: Ensure your API key is valid and has credits
- **"Blocked by CORS"**: This shouldn't happen with OpenRouter, but ensure you're using the correct URL

## Privacy Notes

When using OpenRouter:
- Your conversations are sent to OpenRouter's servers and the model providers
- This is different from local Ollama which keeps everything on your machine
- Check OpenRouter's privacy policy for data handling details