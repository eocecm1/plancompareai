// Keep-Alive Service for Render.com Cold Start Prevention
// This file prevents the 30-minute sleep on Render.com free tier

const https = require('https');

class KeepAliveService {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.appUrl = process.env.RENDER_EXTERNAL_URL || 'https://plancompareai.onrender.com';
        this.pingInterval = 25 * 60 * 1000; // 25 minutes (before 30min sleep)
        this.intervalId = null;
        this.enabled = process.env.KEEP_ALIVE === 'true' || this.isProduction;
    }

    start() {
        if (!this.enabled) {
            console.log('🔄 Keep-alive service disabled');
            return;
        }

        console.log(`🔄 Keep-alive service starting (ping every 25 minutes)`);
        console.log(`📡 Target URL: ${this.appUrl}/ping`);
        
        // Start pinging after initial 25 minutes
        this.intervalId = setInterval(() => {
            this.ping();
        }, this.pingInterval);

        // Initial ping after 1 minute to test connectivity
        setTimeout(() => {
            this.ping();
        }, 60000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Keep-alive service stopped');
        }
    }

    ping() {
        const url = `${this.appUrl}/ping`;
        const startTime = Date.now();
        
        https.get(url, (res) => {
            const responseTime = Date.now() - startTime;
            
            if (res.statusCode === 200) {
                console.log(`✅ Keep-alive ping successful (${responseTime}ms): ${new Date().toISOString()}`);
            } else {
                console.log(`⚠️  Keep-alive ping returned status ${res.statusCode}`);
            }
        }).on('error', (err) => {
            console.log(`❌ Keep-alive ping failed: ${err.message}`);
        });
    }

    // Manual ping for testing
    async testPing() {
        console.log('🧪 Testing keep-alive ping...');
        this.ping();
    }
}

module.exports = new KeepAliveService();