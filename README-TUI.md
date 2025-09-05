# Ollama Chats Blessed TUI

A terminal user interface (TUI) version of Ollama Chats using the blessed library instead of Vue.js.

## Features

- **Terminal Interface**: Beautiful terminal UI using the blessed library
- **Chat Interface**: Full conversation support with message history and timestamps
- **Model Management**: List, select, switch between, reload, and download Ollama models
- **Advanced Configuration**: Complete parameter control (temperature, top_k, top_p, context size)
- **Character System**: Create, save, load, and generate AI characters with system prompts
- **Instruction System**: Add conversation-specific guidance and instructions
- **OpenRouter Support**: Works with OpenRouter API for cloud models
- **Save/Load Chats**: Save conversations to JSON files and load them later
- **Settings**: Configure URL, nicknames, and other preferences
- **Keyboard Navigation**: Full keyboard support with extensive hotkeys

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
| **F3** | Basic settings (URL, nicknames) |
| **F4** | Save chat to file |
| **F5** | Load chat from file |
| **F6** | Reload models |
| **F7** | Pull/download new model |
| **F8** | Clear current chat |
| **F9** | Advanced settings (AI parameters) |

### Shift+F Keys (Advanced Features)

| Key | Action |
|-----|--------|
| **Shift+F2** | Save character card |
| **Shift+F3** | Load character card |
| **Shift+F4** | System prompt editor |
| **Shift+F5** | Instruction editor |
| **Shift+F7** | Generate character automatically |
| **Ctrl+C** | Quit application |

## Advanced Features

### Character Management
- **Character Cards**: Save and load complete AI character profiles including system prompts, instructions, and parameters
- **System Prompts**: Define detailed character personalities, backgrounds, and behaviors
- **Instructions**: Add conversation-specific guidance that gets included with user messages
- **Character Generation**: Automatically generate characters based on trait descriptions

### Model Management
- **Model Selection**: Browse and switch between available models
- **Model Downloading**: Pull new models directly from Ollama library (llama2, codellama, etc.)
- **Model Reloading**: Refresh the model list to detect newly installed models

### Advanced AI Configuration
- **Temperature**: Control creativity and randomness (0.0-2.0)
- **Context Size**: Set memory window in tokens (default: 2048)
- **Top K**: Control diversity of token selection (default: 40)
- **Top P**: Nucleus sampling parameter (default: 0.9)

### Session Management
- **Chat Persistence**: Save complete conversation history with timestamps
- **Multiple Sessions**: Load different chat sessions as needed
- **Character Persistence**: Save and restore character configurations

## Configuration Examples

### Creating a Character
1. Press **Shift+F7** to generate a character automatically
2. Enter traits like "mysterious detective, sarcastic, intelligent"
3. Or manually create using **Shift+F4** for system prompt editing

### Fine-tuning AI Behavior
1. Press **F9** for advanced settings
2. Adjust temperature for creativity (higher = more creative)
3. Increase context size for longer memory
4. Use **Shift+F5** to add conversation-specific instructions
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
- ✅ Model selection and management
- ✅ Model downloading (pull new models)
- ✅ Save/load conversations  
- ✅ Character card save/load
- ✅ System prompt editing
- ✅ Instruction editing
- ✅ Character generation
- ✅ Advanced AI parameter configuration
- ✅ OpenRouter support
- ✅ Settings configuration
- ✅ Keyboard navigation

### Not Yet Implemented
- ❌ Multiple characters/personas simultaneously
- ❌ RAG (Retrieval-Augmented Generation) / Memory system
- ❌ Image upload support
- ❌ Trinity mode (thoughts/actions separation)
- ❌ Rating system for responses
- ❌ Branching conversations
- ❌ Stories/context management per character
- ❌ Parameter auto-tuning

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