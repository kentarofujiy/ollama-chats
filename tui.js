#!/usr/bin/env node

import blessed from 'blessed';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// For CommonJS compatibility
const __dirname = path.dirname(new URL(import.meta.url).pathname);

class OllamaChatsBlessed {
    constructor() {
        this.config = {
            url: 'http://127.0.0.1:11434',
            model: '',
            theme: 'dark'
        };
        
        this.models = [];
        this.turns = [];
        this.currentTurn = 0;
        this.currentMessage = '';
        this.nick = 'You';
        this.aiNick = 'AI';
        
        this.setupUI();
        this.setupEvents();
        this.loadModels();
    }

    setupUI() {
        // Create screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Ollama Chats TUI v1.9.10',
            mouse: true,
            keys: true
        });

        // Header
        this.header = blessed.box({
            parent: this.screen,
            top: 0,
            left: 0,
            width: '100%',
            height: 3,
            content: '{center}Ollama Chats TUI v1.9.10{/center}',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'cyan'
                }
            }
        });

        // Chat area
        this.chatBox = blessed.log({
            parent: this.screen,
            top: 3,
            left: 0,
            width: '75%',
            height: '70%',
            content: '',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'green'
                }
            },
            label: ' Chat ',
            scrollable: true,
            alwaysScroll: true,
            mouse: true
        });

        // Info panel (models, settings)
        this.infoBox = blessed.box({
            parent: this.screen,
            top: 3,
            left: '75%',
            width: '25%',
            height: '70%',
            content: '',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'yellow'
                }
            },
            label: ' Info ',
            scrollable: true,
            mouse: true
        });

        // Input area
        this.inputBox = blessed.textbox({
            parent: this.screen,
            bottom: 3,
            left: 0,
            width: '100%',
            height: 5,
            content: '',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'blue'
                }
            },
            label: ' Input (Enter to send, Ctrl+C to quit) ',
            inputOnFocus: true,
            keys: true,
            mouse: true
        });

        // Status bar
        this.statusBar = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 3,
            content: '{center}Ready | URL: ' + this.config.url + ' | Model: Loading...{/center}',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'magenta'
                }
            }
        });

        this.screen.render();
    }

    setupEvents() {
        // Quit on Escape, q, or Control-C
        this.screen.key(['escape', 'q', 'C-c'], () => {
            return process.exit(0);
        });

        // Help on F1
        this.screen.key('f1', () => {
            this.showHelp();
        });

        // Model selection on F2
        this.screen.key('f2', () => {
            this.showModelSelector();
        });

        // Settings on F3
        this.screen.key('f3', () => {
            this.showSettings();
        });

        // Save chat on F4
        this.screen.key('f4', () => {
            this.saveChat();
        });

        // Load chat on F5
        this.screen.key('f5', () => {
            this.loadChat();
        });

        // Clear chat on F8
        this.screen.key('f8', () => {
            this.clearChat();
        });

        // Input events
        this.inputBox.on('submit', (value) => {
            if (value.trim()) {
                this.sendMessage(value.trim());
                this.inputBox.clearValue();
                this.screen.render();
            }
        });

        // Focus on input by default
        this.inputBox.focus();
    }

    async loadModels() {
        try {
            this.updateStatus('Loading models...');
            
            const isOpenRouter = this.config.url.includes('openrouter.ai');
            const endpoint = isOpenRouter ? '/models' : '/api/tags';
            
            const response = await fetch(this.config.url + endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (isOpenRouter) {
                this.models = data.data.map(model => ({
                    name: model.id,
                    tag: model.id,
                    size: model.created || 0
                }));
            } else {
                this.models = data.models || [];
            }
            
            if (this.models.length > 0) {
                this.config.model = this.models[0].name || this.models[0].tag;
                this.updateStatus(`Loaded ${this.models.length} models | Current: ${this.config.model}`);
                this.updateInfoPanel();
            } else {
                this.updateStatus('No models found');
            }
            
        } catch (error) {
            this.updateStatus(`Error loading models: ${error.message}`);
            this.chatBox.log(`{red-fg}Error connecting to Ollama: ${error.message}{/red-fg}`);
            this.chatBox.log(`{yellow-fg}Make sure Ollama is running at ${this.config.url}{/yellow-fg}`);
        }
    }

    updateStatus(message) {
        this.statusBar.setContent(`{center}${message}{/center}`);
        this.screen.render();
    }

    updateInfoPanel() {
        let content = `{bold}Models (${this.models.length}):{/bold}\n\n`;
        
        this.models.slice(0, 10).forEach((model, index) => {
            const name = model.name || model.tag;
            const marker = name === this.config.model ? '> ' : '  ';
            content += `${marker}${name}\n`;
        });
        
        if (this.models.length > 10) {
            content += `  ... and ${this.models.length - 10} more\n`;
        }
        
        content += `\n{bold}Current Model:{/bold}\n${this.config.model}\n\n`;
        content += `{bold}URL:{/bold}\n${this.config.url}\n\n`;
        content += `{bold}Hotkeys:{/bold}\n`;
        content += `F1 - Help\n`;
        content += `F2 - Select Model\n`;
        content += `F3 - Settings\n`;
        content += `F4 - Save Chat\n`;
        content += `F5 - Load Chat\n`;
        content += `F8 - Clear Chat\n`;
        content += `Ctrl+C - Quit\n`;
        
        this.infoBox.setContent(content);
        this.screen.render();
    }

    addMessage(nick, content, isUser = false) {
        const timestamp = new Date().toLocaleTimeString();
        const color = isUser ? 'cyan' : 'green';
        const message = `{bold}[${timestamp}] ${nick}:{/bold} {${color}-fg}${content}{/${color}-fg}`;
        
        this.chatBox.log(message);
        this.turns.push({ nick, content, timestamp, isUser });
        this.screen.render();
    }

    async sendMessage(content) {
        if (!this.config.model) {
            this.chatBox.log('{red-fg}No model selected. Press F2 to select a model.{/red-fg}');
            this.screen.render();
            return;
        }

        // Add user message
        this.addMessage(this.nick, content, true);
        
        // Show thinking indicator
        this.updateStatus('AI is thinking...');
        
        try {
            const isOpenRouter = this.config.url.includes('openrouter.ai');
            
            let messages = [];
            
            // Build conversation history
            this.turns.forEach(turn => {
                messages.push({
                    role: turn.isUser ? 'user' : 'assistant',
                    content: turn.content
                });
            });

            const endpoint = isOpenRouter ? '/chat/completions' : '/api/chat';
            const requestBody = {
                model: this.config.model,
                messages: messages,
                stream: false
            };

            const headers = {
                'Content-Type': 'application/json'
            };

            if (isOpenRouter) {
                // Add API key for OpenRouter
                headers['Authorization'] = `Bearer ${this.config.openrouterKey || ''}`;
                headers['HTTP-Referer'] = 'https://github.com/kentarofujiy/ollama-chats';
                headers['X-Title'] = 'Ollama Chats Blessed';
            }

            const response = await fetch(this.config.url + endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            let aiResponse = '';
            if (isOpenRouter) {
                aiResponse = data.choices?.[0]?.message?.content || 'No response';
            } else {
                aiResponse = data.message?.content || 'No response';
            }

            this.addMessage(this.aiNick, aiResponse, false);
            this.updateStatus(`Ready | Model: ${this.config.model}`);
            
        } catch (error) {
            this.chatBox.log(`{red-fg}Error: ${error.message}{/red-fg}`);
            this.updateStatus(`Error: ${error.message}`);
        }
        
        this.inputBox.focus();
    }

    showHelp() {
        const helpBox = blessed.message({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '80%',
            height: '70%',
            content: `{center}{bold}Ollama Chats Blessed - Help{/bold}{/center}\n\n` +
                     `This is a terminal user interface (TUI) version of Ollama Chats.\n\n` +
                     `{bold}Features:{/bold}\n` +
                     `• Chat with Ollama models in terminal\n` +
                     `• Model selection and management\n` +
                     `• Save and load chat sessions\n` +
                     `• Support for OpenRouter API\n\n` +
                     `{bold}Hotkeys:{/bold}\n` +
                     `F1  - Show this help\n` +
                     `F2  - Select model\n` +
                     `F3  - Settings\n` +
                     `F4  - Save chat to file\n` +
                     `F5  - Load chat from file\n` +
                     `F8  - Clear current chat\n` +
                     `Ctrl+C - Quit application\n\n` +
                     `{bold}Usage:{/bold}\n` +
                     `Type your message and press Enter to send.\n` +
                     `The AI will respond in the chat area.\n\n` +
                     `Press any key to close this help.`,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'cyan'
                }
            }
        });

        helpBox.focus();
        helpBox.on('keypress', () => {
            helpBox.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        this.screen.render();
    }

    showModelSelector() {
        if (this.models.length === 0) {
            this.chatBox.log('{red-fg}No models available. Check your Ollama connection.{/red-fg}');
            this.screen.render();
            return;
        }

        const list = blessed.list({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '50%',
            items: this.models.map(m => m.name || m.tag),
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'cyan'
                },
                selected: {
                    bg: 'blue'
                }
            },
            label: ' Select Model ',
            keys: true,
            mouse: true
        });

        // Find current model index
        const currentIndex = this.models.findIndex(m => 
            (m.name || m.tag) === this.config.model
        );
        if (currentIndex >= 0) {
            list.select(currentIndex);
        }

        list.on('select', (item) => {
            const selectedModel = this.models[list.selected];
            this.config.model = selectedModel.name || selectedModel.tag;
            this.updateStatus(`Model selected: ${this.config.model}`);
            this.updateInfoPanel();
            list.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        list.on('cancel', () => {
            list.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        list.focus();
        this.screen.render();
    }

    showSettings() {
        const form = blessed.form({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '60%',
            content: '',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'cyan'
                }
            },
            label: ' Settings '
        });

        // URL input
        blessed.text({
            parent: form,
            top: 1,
            left: 2,
            content: 'Ollama URL:'
        });

        const urlInput = blessed.textbox({
            parent: form,
            top: 2,
            left: 2,
            width: '90%',
            height: 3,
            value: this.config.url,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black'
            },
            inputOnFocus: true
        });

        // Nick input
        blessed.text({
            parent: form,
            top: 6,
            left: 2,
            content: 'Your nickname:'
        });

        const nickInput = blessed.textbox({
            parent: form,
            top: 7,
            left: 2,
            width: '90%',
            height: 3,
            value: this.nick,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black'
            },
            inputOnFocus: true
        });

        // AI Nick input
        blessed.text({
            parent: form,
            top: 11,
            left: 2,
            content: 'AI nickname:'
        });

        const aiNickInput = blessed.textbox({
            parent: form,
            top: 12,
            left: 2,
            width: '90%',
            height: 3,
            value: this.aiNick,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black'
            },
            inputOnFocus: true
        });

        // Buttons
        const saveBtn = blessed.button({
            parent: form,
            bottom: 2,
            left: 2,
            width: 10,
            height: 3,
            content: 'Save',
            border: {
                type: 'line'
            },
            style: {
                bg: 'green',
                fg: 'white'
            }
        });

        const cancelBtn = blessed.button({
            parent: form,
            bottom: 2,
            right: 2,
            width: 10,
            height: 3,
            content: 'Cancel',
            border: {
                type: 'line'
            },
            style: {
                bg: 'red',
                fg: 'white'
            }
        });

        saveBtn.on('press', async () => {
            this.config.url = urlInput.value.trim() || this.config.url;
            this.nick = nickInput.value.trim() || this.nick;
            this.aiNick = aiNickInput.value.trim() || this.aiNick;
            
            form.destroy();
            this.inputBox.focus();
            
            // Reload models if URL changed
            await this.loadModels();
            this.screen.render();
        });

        cancelBtn.on('press', () => {
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        urlInput.focus();
        this.screen.render();
    }

    saveChat() {
        const data = {
            config: this.config,
            nick: this.nick,
            aiNick: this.aiNick,
            turns: this.turns,
            timestamp: new Date().toISOString()
        };

        const filename = `ollama-chat-${Date.now()}.json`;
        try {
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            this.chatBox.log(`{green-fg}Chat saved to ${filename}{/green-fg}`);
        } catch (error) {
            this.chatBox.log(`{red-fg}Error saving chat: ${error.message}{/red-fg}`);
        }
        this.screen.render();
    }

    loadChat() {
        // Simple file selector - in a real implementation you'd want a file browser
        const input = blessed.textbox({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: 3,
            content: '',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'cyan'
                }
            },
            label: ' Enter filename to load ',
            inputOnFocus: true
        });

        input.on('submit', (filename) => {
            try {
                if (fs.existsSync(filename)) {
                    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
                    
                    this.config = { ...this.config, ...data.config };
                    this.nick = data.nick || this.nick;
                    this.aiNick = data.aiNick || this.aiNick;
                    this.turns = data.turns || [];
                    
                    // Rebuild chat display
                    this.chatBox.setContent('');
                    this.turns.forEach(turn => {
                        const timestamp = turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString() : 'Unknown';
                        const color = turn.isUser ? 'cyan' : 'green';
                        const message = `{bold}[${timestamp}] ${turn.nick}:{/bold} {${color}-fg}${turn.content}{/${color}-fg}`;
                        this.chatBox.log(message);
                    });
                    
                    this.chatBox.log(`{green-fg}Chat loaded from ${filename}{/green-fg}`);
                    this.updateInfoPanel();
                } else {
                    this.chatBox.log(`{red-fg}File not found: ${filename}{/red-fg}`);
                }
            } catch (error) {
                this.chatBox.log(`{red-fg}Error loading chat: ${error.message}{/red-fg}`);
            }
            
            input.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        input.on('cancel', () => {
            input.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        input.focus();
        this.screen.render();
    }

    clearChat() {
        this.turns = [];
        this.chatBox.setContent('');
        this.chatBox.log('{yellow-fg}Chat cleared{/yellow-fg}');
        this.screen.render();
    }
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
    const app = new OllamaChatsBlessed();
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}

export default OllamaChatsBlessed;