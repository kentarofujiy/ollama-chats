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
            theme: 'dark',
            systemPrompt: '',
            instruction: '',
            temperature: 0.8,
            num_ctx: 2048,
            top_k: 40,
            top_p: 0.9
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

        // Reload models on F6
        this.screen.key('f6', () => {
            this.reloadModels();
        });

        // Pull model on F7
        this.screen.key('f7', () => {
            this.pullModel();
        });

        // Clear chat on F8
        this.screen.key('f8', () => {
            this.clearChat();
        });

        // Advanced settings on F9
        this.screen.key('f9', () => {
            this.showAdvancedSettings();
        });

        // Save character card on Shift+F2
        this.screen.key('S-f2', () => {
            this.saveCharacterCard();
        });

        // Load character card on Shift+F3
        this.screen.key('S-f3', () => {
            this.loadCharacterCard();
        });

        // System prompt editor on Shift+F4
        this.screen.key('S-f4', () => {
            this.showSystemPromptEditor();
        });

        // Instruction editor on Shift+F5
        this.screen.key('S-f5', () => {
            this.showInstructionEditor();
        });

        // Generate character on Shift+F7
        this.screen.key('S-f7', () => {
            this.generateCharacter();
        });

        // Clear on Shift+F8 (same as F8)
        this.screen.key('S-f8', () => {
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
        content += `F6 - Reload Models\n`;
        content += `F7 - Pull Model\n`;
        content += `F8 - Clear Chat\n`;
        content += `F9 - Advanced Settings\n`;
        content += `\n{bold}Shift+F Keys:{/bold}\n`;
        content += `Shift+F2 - Save Character\n`;
        content += `Shift+F3 - Load Character\n`;
        content += `Shift+F4 - System Prompt\n`;
        content += `Shift+F5 - Instructions\n`;
        content += `Shift+F7 - Generate Character\n`;
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

            // Add system prompt if configured
            if (this.config.systemPrompt && this.config.systemPrompt.trim()) {
                messages.unshift({
                    role: 'system',
                    content: this.config.systemPrompt.trim()
                });
            }

            // Add instruction if configured (append to last user message)
            if (this.config.instruction && this.config.instruction.trim() && messages.length > 0) {
                const lastUserMsgIndex = messages.map(m => m.role).lastIndexOf('user');
                if (lastUserMsgIndex >= 0) {
                    messages[lastUserMsgIndex].content += '\n\n' + this.config.instruction.trim();
                }
            }

            const endpoint = isOpenRouter ? '/chat/completions' : '/api/chat';
            const requestBody = {
                model: this.config.model,
                messages: messages,
                stream: false
            };

            // Add advanced parameters if configured
            if (this.config.temperature !== undefined) {
                requestBody.options = requestBody.options || {};
                requestBody.options.temperature = this.config.temperature;
            }
            if (this.config.num_ctx !== undefined) {
                requestBody.options = requestBody.options || {};
                requestBody.options.num_ctx = this.config.num_ctx;
            }
            if (this.config.top_k !== undefined) {
                requestBody.options = requestBody.options || {};
                requestBody.options.top_k = this.config.top_k;
            }
            if (this.config.top_p !== undefined) {
                requestBody.options = requestBody.options || {};
                requestBody.options.top_p = this.config.top_p;
            }

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
                     `F6  - Reload models\n` +
                     `F7  - Pull/download model\n` +
                     `F8  - Clear current chat\n` +
                     `F9  - Advanced settings\n` +
                     `\n{bold}Shift+F Keys:{/bold}\n` +
                     `Shift+F2 - Save character card\n` +
                     `Shift+F3 - Load character card\n` +
                     `Shift+F4 - System prompt editor\n` +
                     `Shift+F5 - Instruction editor\n` +
                     `Shift+F7 - Generate character\n` +
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

    async reloadModels() {
        this.chatBox.log('{yellow-fg}Reloading models...{/yellow-fg}');
        this.screen.render();
        await this.loadModels();
    }

    pullModel() {
        if (this.config.url.includes('openrouter.ai')) {
            this.chatBox.log('{red-fg}Model pulling is not available for OpenRouter API{/red-fg}');
            this.screen.render();
            return;
        }

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
            label: ' Enter model name to pull (e.g., llama2, codellama:7b) ',
            inputOnFocus: true
        });

        input.on('submit', async (modelName) => {
            if (modelName.trim()) {
                try {
                    this.chatBox.log(`{yellow-fg}Pulling model: ${modelName.trim()}{/yellow-fg}`);
                    this.updateStatus('Pulling model...');
                    
                    const response = await fetch(this.config.url + '/api/pull', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: modelName.trim(),
                            stream: false
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    this.chatBox.log(`{green-fg}Model ${modelName.trim()} pulled successfully{/green-fg}`);
                    this.updateStatus('Model pulled successfully');
                    
                    // Reload models to include the new one
                    await this.loadModels();
                    
                } catch (error) {
                    this.chatBox.log(`{red-fg}Error pulling model: ${error.message}{/red-fg}`);
                    this.updateStatus(`Error: ${error.message}`);
                }
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

    showAdvancedSettings() {
        const form = blessed.form({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '90%',
            height: '80%',
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
            label: ' Advanced Settings ',
            scrollable: true,
            mouse: true
        });

        let y = 1;

        // Temperature
        blessed.text({
            parent: form,
            top: y,
            left: 2,
            content: 'Temperature (0.0-2.0, creativity):'
        });
        y += 1;

        const tempInput = blessed.textbox({
            parent: form,
            top: y,
            left: 2,
            width: '30%',
            height: 3,
            value: this.config.temperature || '0.8',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true
        });
        y += 4;

        // Context size
        blessed.text({
            parent: form,
            top: y,
            left: 2,
            content: 'Context Size (tokens):'
        });
        y += 1;

        const ctxInput = blessed.textbox({
            parent: form,
            top: y,
            left: 2,
            width: '30%',
            height: 3,
            value: this.config.num_ctx || '2048',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true
        });
        y += 4;

        // Top K
        blessed.text({
            parent: form,
            top: y,
            left: 2,
            content: 'Top K (diversity control):'
        });
        y += 1;

        const topKInput = blessed.textbox({
            parent: form,
            top: y,
            left: 2,
            width: '30%',
            height: 3,
            value: this.config.top_k || '40',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true
        });
        y += 4;

        // Top P
        blessed.text({
            parent: form,
            top: y,
            left: 2,
            content: 'Top P (nucleus sampling):'
        });
        y += 1;

        const topPInput = blessed.textbox({
            parent: form,
            top: y,
            left: 2,
            width: '30%',
            height: 3,
            value: this.config.top_p || '0.9',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true
        });
        y += 4;

        // System prompt
        blessed.text({
            parent: form,
            top: y,
            left: 2,
            content: 'System Prompt:'
        });
        y += 1;

        const sysPromptInput = blessed.textarea({
            parent: form,
            top: y,
            left: 2,
            width: '90%',
            height: 8,
            value: this.config.systemPrompt || '',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true,
            scrollable: true
        });
        y += 9;

        // Buttons
        const saveBtn = blessed.button({
            parent: form,
            bottom: 2,
            left: 2,
            width: 10,
            height: 3,
            content: 'Save',
            border: { type: 'line' },
            style: { bg: 'green', fg: 'white' }
        });

        const cancelBtn = blessed.button({
            parent: form,
            bottom: 2,
            right: 2,
            width: 10,
            height: 3,
            content: 'Cancel',
            border: { type: 'line' },
            style: { bg: 'red', fg: 'white' }
        });

        saveBtn.on('press', () => {
            // Save advanced settings
            this.config.temperature = parseFloat(tempInput.value) || 0.8;
            this.config.num_ctx = parseInt(ctxInput.value) || 2048;
            this.config.top_k = parseInt(topKInput.value) || 40;
            this.config.top_p = parseFloat(topPInput.value) || 0.9;
            this.config.systemPrompt = sysPromptInput.value || '';
            
            this.chatBox.log('{green-fg}Advanced settings saved{/green-fg}');
            this.updateInfoPanel();
            
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        cancelBtn.on('press', () => {
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        tempInput.focus();
        this.screen.render();
    }

    showSystemPromptEditor() {
        const form = blessed.form({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '90%',
            height: '80%',
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
            label: ' System Prompt Editor '
        });

        blessed.text({
            parent: form,
            top: 1,
            left: 2,
            content: 'System Prompt (defines the AI character and behavior):'
        });

        const promptTextarea = blessed.textarea({
            parent: form,
            top: 3,
            left: 2,
            width: '95%',
            height: '75%',
            value: this.config.systemPrompt || '',
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black'
            },
            inputOnFocus: true,
            scrollable: true,
            mouse: true
        });

        const saveBtn = blessed.button({
            parent: form,
            bottom: 2,
            left: 2,
            width: 10,
            height: 3,
            content: 'Save',
            border: { type: 'line' },
            style: { bg: 'green', fg: 'white' }
        });

        const cancelBtn = blessed.button({
            parent: form,
            bottom: 2,
            right: 2,
            width: 10,
            height: 3,
            content: 'Cancel',
            border: { type: 'line' },
            style: { bg: 'red', fg: 'white' }
        });

        saveBtn.on('press', () => {
            this.config.systemPrompt = promptTextarea.value;
            this.chatBox.log('{green-fg}System prompt saved{/green-fg}');
            
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        cancelBtn.on('press', () => {
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        promptTextarea.focus();
        this.screen.render();
    }

    showInstructionEditor() {
        const form = blessed.form({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '90%',
            height: '80%',
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
            label: ' Instruction Editor '
        });

        blessed.text({
            parent: form,
            top: 1,
            left: 2,
            content: 'Instructions (additional guidance for the current conversation):'
        });

        const instructionTextarea = blessed.textarea({
            parent: form,
            top: 3,
            left: 2,
            width: '95%',
            height: '75%',
            value: this.config.instruction || '',
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black'
            },
            inputOnFocus: true,
            scrollable: true,
            mouse: true
        });

        const saveBtn = blessed.button({
            parent: form,
            bottom: 2,
            left: 2,
            width: 10,
            height: 3,
            content: 'Save',
            border: { type: 'line' },
            style: { bg: 'green', fg: 'white' }
        });

        const cancelBtn = blessed.button({
            parent: form,
            bottom: 2,
            right: 2,
            width: 10,
            height: 3,
            content: 'Cancel',
            border: { type: 'line' },
            style: { bg: 'red', fg: 'white' }
        });

        saveBtn.on('press', () => {
            this.config.instruction = instructionTextarea.value;
            this.chatBox.log('{green-fg}Instruction saved{/green-fg}');
            
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        cancelBtn.on('press', () => {
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        instructionTextarea.focus();
        this.screen.render();
    }

    saveCharacterCard() {
        const characterCard = {
            name: this.aiNick,
            systemPrompt: this.config.systemPrompt || '',
            instruction: this.config.instruction || '',
            temperature: this.config.temperature || 0.8,
            num_ctx: this.config.num_ctx || 2048,
            top_k: this.config.top_k || 40,
            top_p: this.config.top_p || 0.9,
            timestamp: new Date().toISOString()
        };

        const filename = `character-${this.aiNick.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.json`;
        try {
            fs.writeFileSync(filename, JSON.stringify(characterCard, null, 2));
            this.chatBox.log(`{green-fg}Character card saved to ${filename}{/green-fg}`);
        } catch (error) {
            this.chatBox.log(`{red-fg}Error saving character card: ${error.message}{/red-fg}`);
        }
        this.screen.render();
    }

    loadCharacterCard() {
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
            label: ' Enter character card filename to load ',
            inputOnFocus: true
        });

        input.on('submit', (filename) => {
            try {
                if (fs.existsSync(filename)) {
                    const characterCard = JSON.parse(fs.readFileSync(filename, 'utf8'));
                    
                    this.aiNick = characterCard.name || this.aiNick;
                    this.config.systemPrompt = characterCard.systemPrompt || '';
                    this.config.instruction = characterCard.instruction || '';
                    this.config.temperature = characterCard.temperature || 0.8;
                    this.config.num_ctx = characterCard.num_ctx || 2048;
                    this.config.top_k = characterCard.top_k || 40;
                    this.config.top_p = characterCard.top_p || 0.9;
                    
                    this.chatBox.log(`{green-fg}Character card loaded: ${characterCard.name || 'Unknown'}{/green-fg}`);
                    this.updateInfoPanel();
                } else {
                    this.chatBox.log(`{red-fg}File not found: ${filename}{/red-fg}`);
                }
            } catch (error) {
                this.chatBox.log(`{red-fg}Error loading character card: ${error.message}{/red-fg}`);
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

    generateCharacter() {
        if (!this.config.model) {
            this.chatBox.log('{red-fg}No model selected. Please select a model first (F2).{/red-fg}');
            this.screen.render();
            return;
        }

        const form = blessed.form({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '80%',
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
                    fg: 'cyan'
                }
            },
            label: ' Generate Character '
        });

        blessed.text({
            parent: form,
            top: 1,
            left: 2,
            content: 'Character traits/keywords (e.g., "mysterious detective, sarcastic, intelligent"):'
        });

        const traitsInput = blessed.textbox({
            parent: form,
            top: 3,
            left: 2,
            width: '90%',
            height: 3,
            value: '',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true
        });

        blessed.text({
            parent: form,
            top: 7,
            left: 2,
            content: 'Character name (optional):'
        });

        const nameInput = blessed.textbox({
            parent: form,
            top: 9,
            left: 2,
            width: '90%',
            height: 3,
            value: '',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black' },
            inputOnFocus: true
        });

        const generateBtn = blessed.button({
            parent: form,
            bottom: 2,
            left: 2,
            width: 12,
            height: 3,
            content: 'Generate',
            border: { type: 'line' },
            style: { bg: 'green', fg: 'white' }
        });

        const cancelBtn = blessed.button({
            parent: form,
            bottom: 2,
            right: 2,
            width: 10,
            height: 3,
            content: 'Cancel',
            border: { type: 'line' },
            style: { bg: 'red', fg: 'white' }
        });

        generateBtn.on('press', async () => {
            const traits = traitsInput.value.trim();
            const name = nameInput.value.trim() || 'AI Character';

            if (!traits) {
                this.chatBox.log('{red-fg}Please enter some character traits.{/red-fg}');
                this.screen.render();
                return;
            }

            form.destroy();
            this.inputBox.focus();

            try {
                this.chatBox.log(`{yellow-fg}Generating character with traits: ${traits}{/yellow-fg}`);
                this.updateStatus('Generating character...');

                const generatePrompt = `Create a detailed character system prompt for an AI character with these traits: ${traits}. The character's name is ${name}. Write a comprehensive system prompt that defines their personality, background, speaking style, and behavior. Start with "You are ${name}..." and make it detailed and engaging. Only return the system prompt, no additional text.`;

                const isOpenRouter = this.config.url.includes('openrouter.ai');
                const endpoint = isOpenRouter ? '/chat/completions' : '/api/chat';
                
                const requestBody = {
                    model: this.config.model,
                    messages: [{ role: 'user', content: generatePrompt }],
                    stream: false
                };

                const headers = { 'Content-Type': 'application/json' };
                if (isOpenRouter) {
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
                let generatedPrompt = '';
                
                if (isOpenRouter) {
                    generatedPrompt = data.choices?.[0]?.message?.content || 'Failed to generate character';
                } else {
                    generatedPrompt = data.message?.content || 'Failed to generate character';
                }

                this.config.systemPrompt = generatedPrompt;
                this.aiNick = name;
                
                this.chatBox.log(`{green-fg}Character "${name}" generated successfully!{/green-fg}`);
                this.chatBox.log(`{blue-fg}Use Shift+F4 to view/edit the generated system prompt.{/blue-fg}`);
                this.updateStatus(`Character generated: ${name}`);
                this.updateInfoPanel();

            } catch (error) {
                this.chatBox.log(`{red-fg}Error generating character: ${error.message}{/red-fg}`);
                this.updateStatus(`Error: ${error.message}`);
            }

            this.screen.render();
        });

        cancelBtn.on('press', () => {
            form.destroy();
            this.inputBox.focus();
            this.screen.render();
        });

        traitsInput.focus();
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