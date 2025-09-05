#!/bin/bash

# Ollama Chats Blessed TUI Launcher

echo "Starting Ollama Chats Blessed TUI..."
echo "Make sure you have Node.js and npm installed."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 14+ to run this TUI."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the TUI
echo "Launching Ollama Chats TUI..."
echo "Press Ctrl+C to exit when running."
echo ""
node tui.js