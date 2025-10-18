// ChatKit Widget - Floating Chat Bubble Integration
class ChatKitWidget {
    constructor() {
        this.isOpen = false;
        this.isLoaded = false;
        this.clientSecret = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.init();
    }

    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('plancompareai_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('plancompareai_device_id', deviceId);
        }
        return deviceId;
    }

    init() {
        this.createChatBubble();
        this.createChatContainer();
        this.loadChatKitScript();
    }

    createChatBubble() {
        // Create the floating chat bubble
        const bubble = document.createElement('div');
        bubble.id = 'chatkit-bubble';
        bubble.className = 'chatkit-bubble';
        bubble.innerHTML = `
            <div class="bubble-content">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.99 3.06 16.26L2 22L7.74 20.94C9.01 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C10.76 20 9.57 19.68 8.52 19.1L8 18.82L4.5 19.75L5.43 16.25L5.15 15.73C4.32 14.68 4 13.39 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="white"/>
                </svg>
                <span class="bubble-text">Chat</span>
            </div>
        `;
        
        bubble.addEventListener('click', () => this.toggleChat());
        document.body.appendChild(bubble);
    }

    createChatContainer() {
        // Create the chat container
        const container = document.createElement('div');
        container.id = 'chatkit-container';
        container.className = 'chatkit-container';
        container.innerHTML = `
            <div class="chatkit-header">
                <h3>PlanCompareAI Assistant</h3>
                <button class="chatkit-close" onclick="window.chatKitWidget.closeChat()">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div id="chatkit-content" class="chatkit-content">
                <div class="loading-message">
                    <div class="spinner"></div>
                    <p>Loading chat...</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
    }

    async loadChatKitScript() {
        if (document.querySelector('script[src*="chatkit.js"]')) {
            this.isLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js';
            script.async = true;
            
            script.onload = () => {
                console.log('ChatKit script loaded successfully');
                this.isLoaded = true;
                // Give the script time to initialize
                setTimeout(() => resolve(), 500);
            };
            
            script.onerror = (error) => {
                console.error('Failed to load ChatKit script:', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    async getClientSecret() {
        try {
            const response = await fetch('/api/chatkit/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deviceId: this.deviceId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to create session');
            }

            return data.client_secret;
        } catch (error) {
            console.error('Error getting client secret:', error);
            throw error;
        }
    }

    async initializeChatKit() {
        try {
            console.log('Initializing chat interface...');

            const chatContainer = document.getElementById('chatkit-content');
            chatContainer.innerHTML = '<div id="simple-chat-container" style="height: 100%; width: 100%;"></div>';

            // Load the simple chat interface script if not already loaded
            if (!window.SimpleChatInterface) {
                await this.loadSimpleChatScript();
            }

            // Initialize the simple chat interface
            const container = document.getElementById('simple-chat-container');
            const apiConfig = {
                getClientSecret: async () => {
                    return await this.getClientSecret();
                }
            };

            new window.SimpleChatInterface(container, apiConfig);
            console.log('Simple chat interface initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            const chatContainer = document.getElementById('chatkit-content');
            chatContainer.innerHTML = `
                <div class="error-message">
                    <p><strong>Chat Service Error</strong></p>
                    <p>Unable to load the chat interface.</p>
                    <p><small>Error: ${error.message}</small></p>
                    <button onclick="window.chatKitWidget.initializeChatKit()" 
                            style="margin-top: 15px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                        🔄 Retry
                    </button>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                        <p>Troubleshooting:</p>
                        <ul style="text-align: left; margin: 5px 0;">
                            <li>API Status: ${error.message.includes('HTTP') ? '❌ Failed' : '✅ OK'}</li>
                            <li>Script Loading: ${this.isLoaded ? '✅ OK' : '❌ Failed'}</li>
                            <li>Try refreshing the page</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    async loadSimpleChatScript() {
        if (window.SimpleChatInterface) {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'simple-chat.js';
            script.async = true;
            
            script.onload = () => {
                console.log('Simple chat script loaded successfully');
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('Failed to load simple chat script:', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    async toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            await this.openChat();
        }
    }

    async openChat() {
        const container = document.getElementById('chatkit-container');
        const bubble = document.getElementById('chatkit-bubble');
        
        container.classList.add('open');
        bubble.classList.add('hidden');
        this.isOpen = true;

        // Initialize ChatKit if not already done
        if (!this.clientSecret) {
            await this.initializeChatKit();
        }
    }

    closeChat() {
        const container = document.getElementById('chatkit-container');
        const bubble = document.getElementById('chatkit-bubble');
        
        container.classList.remove('open');
        bubble.classList.remove('hidden');
        this.isOpen = false;
    }
}

// CSS Styles
const styles = `
/* ChatKit Floating Widget Styles */
.chatkit-bubble {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    z-index: 1000;
}

.chatkit-bubble:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.chatkit-bubble.hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8);
}

.bubble-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.bubble-text {
    font-size: 10px;
    color: white;
    font-weight: 500;
}

.chatkit-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    transform: translateY(100%) scale(0.8);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s ease;
    z-index: 1001;
}

.chatkit-container.open {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: auto;
}

.chatkit-header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px 12px 0 0;
}

.chatkit-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.chatkit-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
}

.chatkit-close:hover {
    background: rgba(255, 255, 255, 0.2);
}

.chatkit-content {
    flex: 1;
    padding: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

#chatkit-widget {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
}

.loading-message, .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: #6b7280;
}

.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.error-message p {
    margin: 4px 0;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
    .chatkit-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 40px);
        bottom: 20px;
        right: 20px;
    }
    
    .chatkit-bubble {
        bottom: 15px;
        right: 15px;
    }
}
`;

// Inject styles
function injectStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Initialize when DOM is loaded
function initializeChatKitWidget() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyles();
            window.chatKitWidget = new ChatKitWidget();
        });
    } else {
        injectStyles();
        window.chatKitWidget = new ChatKitWidget();
    }
}

// Auto-initialize
initializeChatKitWidget();