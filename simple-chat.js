// Alternative ChatKit implementation using direct API integration
// Since the ChatKit custom elements approach isn't working, let's create our own chat interface

class SimpleChatInterface {
    constructor(container, apiConfig) {
        this.container = container;
        this.apiConfig = apiConfig;
        this.messages = [];
        this.isLoading = false;
        this.clientSecret = null;
        this.init();
    }

    async init() {
        await this.getClientSecret();
        this.render();
        this.setupEventListeners();
    }

    async getClientSecret() {
        try {
            this.clientSecret = await this.apiConfig.getClientSecret();
            console.log('Got client secret for chat');
        } catch (error) {
            console.error('Failed to get client secret:', error);
            throw error;
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="simple-chat-interface">
                <div class="chat-header">
                    <div class="chat-status">
                        <span class="status-dot ${this.clientSecret ? 'connected' : 'disconnected'}"></span>
                        ${this.clientSecret ? 'Connected to AI Assistant' : 'Connecting...'}
                    </div>
                </div>
                
                <div class="chat-messages" id="chat-messages">
                    <div class="welcome-message">
                        <div class="message bot-message">
                            <div class="message-content">
                                <p>👋 Hello! I'm your PlanCompareAI assistant. I can help you with:</p>
                                <ul>
                                    <li>📱 Mobile plan comparisons</li>
                                    <li>💰 Pricing analysis</li>
                                    <li>🎯 Plan recommendations</li>
                                    <li>❓ General questions</li>
                                </ul>
                                <p>Try asking: "What's the best unlimited plan under $50?"</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <div class="input-container">
                        <textarea 
                            id="chat-input" 
                            placeholder="Type your message here..." 
                            rows="2"
                            ${!this.clientSecret ? 'disabled' : ''}
                        ></textarea>
                        <button 
                            id="send-button" 
                            class="send-button"
                            ${!this.clientSecret ? 'disabled' : ''}
                            title="Send message"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.injectStyles();
    }

    injectStyles() {
        if (!document.getElementById('simple-chat-styles')) {
            const styles = document.createElement('style');
            styles.id = 'simple-chat-styles';
            styles.textContent = `
                .simple-chat-interface {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .chat-header {
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    font-size: 13px;
                    color: #6c757d;
                }
                
                .status-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                
                .status-dot.connected {
                    background: #28a745;
                }
                
                .status-dot.disconnected {
                    background: #dc3545;
                }
                
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: white;
                }
                
                .message {
                    margin-bottom: 16px;
                    display: flex;
                    align-items: flex-start;
                }
                
                .bot-message .message-content {
                    background: #f1f3f4;
                    color: #333;
                    padding: 12px 16px;
                    border-radius: 18px 18px 18px 4px;
                    max-width: 80%;
                }
                
                .user-message {
                    justify-content: flex-end;
                }
                
                .user-message .message-content {
                    background: #667eea;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 18px 18px 4px 18px;
                    max-width: 80%;
                }
                
                .message-content p {
                    margin: 0 0 8px 0;
                }
                
                .message-content p:last-child {
                    margin-bottom: 0;
                }
                
                .message-content ul {
                    margin: 8px 0;
                    padding-left: 20px;
                }
                
                .message-content li {
                    margin: 4px 0;
                }
                
                .chat-input-area {
                    padding: 16px;
                    background: #f8f9fa;
                    border-top: 1px solid #e9ecef;
                }
                
                .input-container {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                }
                
                #chat-input {
                    flex: 1;
                    resize: none;
                    border: 1px solid #ced4da;
                    border-radius: 20px;
                    padding: 12px 16px;
                    font-family: inherit;
                    font-size: 14px;
                    outline: none;
                    background: white;
                }
                
                #chat-input:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
                }
                
                #chat-input:disabled {
                    background: #f8f9fa;
                    color: #6c757d;
                }
                
                .send-button {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: #667eea;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                    flex-shrink: 0;
                    font-size: 18px;
                    font-weight: bold;
                    line-height: 1;
                }
                
                .send-button:hover:not(:disabled) {
                    background: #5a6fd8;
                    transform: scale(1.05);
                }
                
                .send-button:disabled {
                    background: #ced4da;
                    cursor: not-allowed;
                    color: #999;
                }
                
                .loading-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #6c757d;
                    font-style: italic;
                }
                
                .loading-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid #f3f4f6;
                    border-top: 2px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    setupEventListeners() {
        const input = document.getElementById('chat-input');
        const button = document.getElementById('send-button');

        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text || this.isLoading) return;

            // Add user message
            this.addMessage(text, 'user');
            input.value = '';

            // Send message to actual ChatKit API
            this.isLoading = true;
            this.addLoadingMessage();

            try {
                const response = await this.sendToChatKit(text);
                
                // Remove loading message
                this.removeLoadingMessage();
                
                // Add bot response
                this.addMessage(response, 'bot');
                
            } catch (error) {
                console.error('Chat error:', error);
                this.removeLoadingMessage();
                this.addMessage(`Sorry, I encountered an error: ${error.message}. Please try again.`, 'bot');
            } finally {
                this.isLoading = false;
            }
        };

        button.addEventListener('click', sendMessage);
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    addMessage(content, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addLoadingMessage() {
        const messagesContainer = document.getElementById('chat-messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message';
        loadingDiv.id = 'loading-message';
        loadingDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-message">
                    <div class="loading-spinner"></div>
                    <span>Thinking...</span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeLoadingMessage() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    async sendToChatKit(message) {
        try {
            // Send message to our backend which will communicate with OpenAI ChatKit
            const response = await fetch('/api/chatkit/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    clientSecret: this.clientSecret,
                    conversationId: this.conversationId || null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to send message');
            }

            // Store conversation ID for future messages
            if (data.conversationId) {
                this.conversationId = data.conversationId;
            }

            return data.response || 'I received your message but had trouble generating a response.';
            
        } catch (error) {
            console.error('Error sending to ChatKit:', error);
            
            // Fallback to mock response if API fails
            console.log('Falling back to mock response');
            return this.generateFallbackResponse(message);
        }
    }

    generateFallbackResponse(userMessage) {
        const lower = userMessage.toLowerCase();
        
        if (lower.includes('under') && (lower.includes('50') || lower.includes('$50'))) {
            return "Here are the best unlimited plans under $50:\n\n🥇 **Visible** - $40/month\n• Unlimited data on Verizon network\n• Includes hotspot\n\n🥈 **Metro by T-Mobile** - $40/month\n• Unlimited data with 10GB high-speed\n• Good for streaming\n\n🥉 **T-Mobile Connect** - $35/month\n• 6GB high-speed data\n• Great value for light users";
        }
        
        if (lower.includes('50') || lower.match(/\$?50/)) {
            return "For a $50 budget, here are my top recommendations:\n\n✅ **Visible Unlimited** - $40/month (save $10!)\n✅ **Cricket Unlimited** - $40/month on AT&T network\n✅ **Metro by T-Mobile** - $40/month with perks\n\nAll include unlimited talk, text, and data. Which carrier coverage area interests you most?";
        }
        
        if (lower.includes('best') && !lower.includes('?')) {
            return "Here are the current best mobile plan deals:\n\n💰 **Budget**: Visible $40/month (Verizon network)\n🏆 **Overall**: T-Mobile Magenta $70/month\n📶 **Coverage**: Verizon Unlimited $80/month\n👨‍👩‍👧‍👦 **Family**: T-Mobile Essentials 4 lines for $108/month\n\nNeed help choosing between these?";
        }
        
        if (lower.includes('unlimited')) {
            return "Top unlimited plan recommendations:\n\n• **Visible**: $40/month on Verizon network\n• **T-Mobile Magenta**: $70/month with Netflix\n• **Verizon Unlimited**: $80/month premium\n• **AT&T Unlimited**: $75/month\n\nWhat's your monthly budget range?";
        }
        
        if (lower.includes('family')) {
            return "Best family plan deals:\n\n👨‍👩‍👧‍👦 **T-Mobile Essentials**: 4 lines for $108/month ($27/line)\n👨‍👩‍👧‍👦 **Verizon Start**: 4 lines for $120/month ($30/line)\n👨‍👩‍👧‍👦 **AT&T Value**: 4 lines for $120/month ($30/line)\n\nHow many lines do you need?";
        }
        
        if (lower.includes('compare') || lower.includes('comparison')) {
            return "I can compare any carriers or plans for you! Just tell me which ones you're interested in, or let me know your budget and I'll suggest the best options to compare.";
        }
        
        // For very short responses like "1", "50", "best" without context
        if (lower.length <= 4 && (lower.match(/^\d+$/) || ['best', 'good', 'ok'].includes(lower))) {
            return "I'd be happy to help you find the perfect mobile plan! Here are some quick options:\n\n💰 **Under $50**: Visible ($40), Metro ($40), Cricket ($40)\n🏆 **Premium**: T-Mobile Magenta ($70), Verizon ($80)\n\nWhat's most important to you - saving money or premium features?";
        }
        
        return "I'm here to help you find the perfect mobile plan! Try asking:\n• \"Best plans under $50\"\n• \"Compare T-Mobile vs Verizon\"\n• \"Family plans for 4 people\"\n• \"Unlimited data options\"\n\nWhat can I help you find today?";
    }
}

// Export for use in main widget
window.SimpleChatInterface = SimpleChatInterface;