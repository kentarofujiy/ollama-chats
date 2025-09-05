# Ollama Chats Blessed TUI

A terminal user interface (TUI) version of Ollama Chats using the blessed library instead of Vue.js.

## Features

- **Terminal Interface**: Beautiful terminal UI using the blessed library
- **Chat Interface**: Full conversation support with message history
- **Model Management**: List, select, and switch between Ollama models
- **OpenRouter Support**: Works with OpenRouter API for cloud models
- **Save/Load Chats**: Save conversations to JSON files and load them later
- **Settings**: Configure URL, nicknames, and other preferences
- **Keyboard Navigation**: Full keyboard support with hotkeys

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- Ollama server running locally OR OpenRouter API key

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start the TUI application:
```bash
npm start
# or
node tui.js
```

## Usage

### Basic Usage

1. Launch the application with `npm start`
2. The TUI will automatically try to connect to Ollama at `http://127.0.0.1:11434`
3. Models will be loaded automatically if connection is successful
4. Type your message in the input area and press Enter to send
5. The AI will respond in the chat area

### Hotkeys

| Key | Action |
|-----|--------|
| **F1** | Show help |
| **F2** | Select model |
| **F3** | Settings (URL, nicknames) |
| **F4** | Save chat to file |
| **F5** | Load chat from file |
| **F8** | Clear current chat |
| **Ctrl+C** | Quit application |
| **Enter** | Send message |
| **Escape** | Cancel current action |

### Configuration

Press **F3** to open settings where you can configure:

- **Ollama URL**: Change the server URL (default: `http://127.0.0.1:11434`)
- **Your Nickname**: How you appear in the chat
- **AI Nickname**: How the AI appears in the chat

### Using with OpenRouter

1. Press **F3** to open settings
2. Set the URL to: `https://openrouter.ai/api/v1`
3. You'll need to modify the code to add your API key (see below)

#### OpenRouter API Key

To use OpenRouter, you'll need to add your API key. You can either:

1. Set an environment variable:
```bash
export OPENROUTER_API_KEY=your_key_here
node tui.js
```

2. Or modify the code to include your key in the settings

### File Operations

#### Saving Chats
- Press **F4** to save the current conversation
- Files are saved as `ollama-chat-[timestamp].json`
- Contains full conversation history and settings

#### Loading Chats
- Press **F5** to load a saved conversation
- Enter the filename when prompted
- Previous conversations will be restored

## Architecture

The blessed TUI version maintains the core functionality of the original Vue.js application while providing a terminal-based interface:

### Core Components

- **Main Screen**: Terminal interface with panels for chat, info, input, and status
- **Chat Engine**: Handles communication with Ollama/OpenRouter APIs
- **Model Management**: Lists and manages available models
- **Session Management**: Save/load functionality for conversations

### API Compatibility

The TUI version uses the same APIs as the original:
- `/api/tags` - List available models
- `/api/chat` - Chat completions (preferred)
- `/api/generate` - Text generation (fallback)
- OpenRouter `/models` and `/chat/completions` endpoints

## Differences from Vue Version

### Included Features
- ✅ Basic chat interface
- ✅ Model selection
- ✅ Save/load conversations
- ✅ OpenRouter support
- ✅ Settings configuration
- ✅ Keyboard navigation

### Not Yet Implemented
- ❌ Multiple characters/personas
- ❌ RAG (Retrieval-Augmented Generation)
- ❌ Character generator
- ❌ Image upload support
- ❌ Advanced prompt templates
- ❌ Rating system
- ❌ Stories/context management
- ❌ Parameter optimization

### Future Enhancements

The blessed TUI could be extended to include:
- Character management system
- Plugin architecture for extensions
- More advanced chat features
- Integration with local embeddings
- Custom theming support

## Development

### Project Structure

```
├── tui.js          # Main TUI application
├── package.json    # Node.js dependencies
└── README-TUI.md   # This file
```

### Key Classes

- `OllamaChatsBlessed`: Main application class
  - `setupUI()`: Creates the blessed interface
  - `setupEvents()`: Handles keyboard events
  - `loadModels()`: Fetches available models
  - `sendMessage()`: Handles chat communication
  - UI methods for dialogs and forms

## Troubleshooting

### Connection Issues

1. **"Error loading models"**: 
   - Ensure Ollama is running: `ollama serve`
   - Check the URL in settings (F3)
   - Verify firewall/network settings

2. **"No models found"**:
   - Install models: `ollama pull llama2`
   - Check Ollama installation

3. **OpenRouter Issues**:
   - Verify API key is set
   - Check internet connection
   - Ensure URL is set to `https://openrouter.ai/api/v1`

### Interface Issues

1. **Display Problems**:
   - Ensure terminal supports colors
   - Try resizing terminal window
   - Use a modern terminal emulator

2. **Keyboard Issues**:
   - Some terminals may not support all hotkeys
   - Try using mouse if available
   - Check terminal key mapping

## License

Same as the original Ollama Chats:
- Free for personal non-commercial use
- Not allowed for commercial/business use without agreement
- Source code available for review and personal modification

## Contributing

This is a simplified implementation focusing on core chat functionality. 

For feature requests or issues specific to the blessed TUI version, please note that this is an alternative interface implementation focusing on simplicity and terminal compatibility.