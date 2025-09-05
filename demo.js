#!/usr/bin/env node

import blessed from 'blessed';

// Create a simple demo of the TUI interface for screenshot
const screen = blessed.screen({
    smartCSR: true,
    title: 'Ollama Chats TUI Demo v1.9.10',
    mouse: true,
    keys: true
});

// Header
const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: '{center}Ollama Chats TUI v1.9.10 - DEMO{/center}',
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
const chatBox = blessed.log({
    parent: screen,
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

// Info panel
const infoBox = blessed.box({
    parent: screen,
    top: 3,
    left: '75%',
    width: '25%',
    height: '70%',
    content: `{bold}Models:{/bold}

> llama3.1:8b
  llama2:7b
  codellama:13b
  mistral:7b

{bold}Hotkeys:{/bold}
F1 - Help
F2 - Select Model
F3 - Settings
F4 - Save Chat
F5 - Load Chat
F8 - Clear Chat
Ctrl+C - Quit

{bold}Status:{/bold}
Connected
Ready to chat`,
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
const inputBox = blessed.textbox({
    parent: screen,
    bottom: 3,
    left: 0,
    width: '100%',
    height: 5,
    content: 'Type your message here...',
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
const statusBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: '{center}Ready | URL: http://127.0.0.1:11434 | Model: llama3.1:8b{/center}',
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

// Add some demo chat messages
chatBox.log('{bold}[14:32:15] You:{/bold} {cyan-fg}Hello! How are you today?{/cyan-fg}');
chatBox.log('{bold}[14:32:16] AI:{/bold} {green-fg}Hello! I\'m doing well, thank you for asking. I\'m here and ready to help you with any questions or tasks you might have. How can I assist you today?{/green-fg}');
chatBox.log('{bold}[14:33:02] You:{/bold} {cyan-fg}Can you explain what a blessed TUI is?{/cyan-fg}');
chatBox.log('{bold}[14:33:03] AI:{/bold} {green-fg}A blessed TUI (Terminal User Interface) is a way to create interactive applications that run in the terminal. It allows you to build rich, responsive interfaces with windows, menus, forms, and other UI elements, all rendered using text characters and colors in the terminal.{/green-fg}');
chatBox.log('{bold}[14:33:45] You:{/bold} {cyan-fg}That\'s really cool! This TUI version looks great.{/cyan-fg}');
chatBox.log('{bold}[14:33:46] AI:{/bold} {green-fg}Thank you! This blessed TUI provides a terminal-based alternative to the Vue.js web interface, making it possible to use Ollama Chats directly in the terminal without needing a web browser.{/green-fg}');

// Quit on Escape, q, or Control-C
screen.key(['escape', 'q', 'C-c'], () => {
    return process.exit(0);
});

// Focus on input by default
inputBox.focus();

screen.render();

console.log('\nOllama Chats Blessed TUI Demo');
console.log('This shows what the interface looks like.');
console.log('Press Ctrl+C to exit the demo.');