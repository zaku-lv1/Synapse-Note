/**
 * Google Apps Script Service
 * 
 * This service handles communication with the Google Apps Script API endpoint
 * to replace or supplement existing API functionality as requested.
 */

const https = require('https');
const http = require('http');

class GoogleAppsScriptService {
    constructor() {
        // The Google Apps Script endpoint URL
        this.scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || 
            'https://script.google.com/macros/s/AKfycbyQX2O29UD5hJqNOsmoyxXDdPaTX0ZGmfUuwdmUXpps6Gk9zSBEpO80spmN_lnMIegqpg/exec';
    }

    /**
     * Make a request to the Google Apps Script endpoint
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {Object} data - Data to send (for POST requests)
     * @param {Object} params - URL parameters (for GET requests)
     * @returns {Promise<Object>} - Response from the script
     */
    async makeRequest(method = 'GET', data = null, params = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.scriptUrl);
            
            // Add parameters to URL
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            const requestData = data ? JSON.stringify(data) : null;
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'IdentityV-Match/1.0.0'
                }
            };

            if (requestData) {
                options.headers['Content-Length'] = Buffer.byteLength(requestData);
            }

            const req = httpModule.request(options, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    try {
                        // Check if response is HTML (redirect page) instead of JSON
                        const trimmedBody = body.trim();
                        const isHtml = trimmedBody.toLowerCase().includes('<html') || 
                                      trimmedBody.toLowerCase().includes('<!doctype') ||
                                      trimmedBody.toLowerCase().includes('moved temporarily') ||
                                      trimmedBody.toLowerCase().includes('moved permanently');
                        
                        if (isHtml || res.statusCode >= 300) {
                            // This is likely a redirect page or error page, not valid JSON
                            reject(new Error(`Google Apps Script returned invalid response: ${res.statusCode} ${trimmedBody.substring(0, 100)}...`));
                            return;
                        }

                        const response = body ? JSON.parse(body) : {};
                        resolve({
                            statusCode: res.statusCode,
                            data: response,
                            headers: res.headers
                        });
                    } catch (error) {
                        // If JSON parsing fails, it's likely not a valid API response
                        reject(new Error(`Google Apps Script returned invalid JSON: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Google Apps Script request failed: ${error.message}`));
            });

            // Set timeout for the request
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Google Apps Script request timeout'));
            });

            if (requestData) {
                req.write(requestData);
            }

            req.end();
        });
    }

    /**
     * Get system statistics from Google Apps Script
     * Replaces the internal /api/public/stats endpoint functionality
     */
    async getSystemStats() {
        try {
            const response = await this.makeRequest('GET', null, { action: 'getStats' });
            return {
                success: true,
                data: response.data,
                source: 'google-apps-script',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get stats from Google Apps Script:', error);
            throw error;
        }
    }

    /**
     * Get user count from Google Apps Script
     * Replaces the internal /api/public/users/count endpoint functionality
     */
    async getUserCount() {
        try {
            const response = await this.makeRequest('GET', null, { action: 'getUserCount' });
            return {
                success: true,
                data: response.data,
                source: 'google-apps-script',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get user count from Google Apps Script:', error);
            throw error;
        }
    }

    /**
     * Get quiz count from Google Apps Script
     * Replaces the internal /api/public/quizzes/count endpoint functionality
     */
    async getQuizCount() {
        try {
            const response = await this.makeRequest('GET', null, { action: 'getQuizCount' });
            return {
                success: true,
                data: response.data,
                source: 'google-apps-script',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get quiz count from Google Apps Script:', error);
            throw error;
        }
    }

    /**
     * Submit user data to Google Apps Script
     * Can be used for analytics, logging, or data synchronization
     */
    async submitUserData(userData) {
        try {
            const response = await this.makeRequest('POST', {
                action: 'submitUserData',
                data: userData
            });
            return {
                success: true,
                data: response.data,
                source: 'google-apps-script',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to submit user data to Google Apps Script:', error);
            throw error;
        }
    }

    /**
     * Submit quiz data to Google Apps Script
     * Can be used for analytics, logging, or data synchronization
     */
    async submitQuizData(quizData) {
        try {
            const response = await this.makeRequest('POST', {
                action: 'submitQuizData',
                data: quizData
            });
            return {
                success: true,
                data: response.data,
                source: 'google-apps-script',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to submit quiz data to Google Apps Script:', error);
            throw error;
        }
    }

    /**
     * Generic method to send any action to Google Apps Script
     * @param {string} action - Action to perform
     * @param {Object} data - Data to send
     * @returns {Promise<Object>} - Response from the script
     */
    async performAction(action, data = {}) {
        try {
            const response = await this.makeRequest('POST', {
                action: action,
                data: data
            });
            return {
                success: true,
                data: response.data,
                source: 'google-apps-script',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Failed to perform action ${action} on Google Apps Script:`, error);
            throw error;
        }
    }

    /**
     * Test the connection to Google Apps Script
     * @returns {Promise<boolean>} - True if connection is successful
     */
    async testConnection() {
        try {
            const response = await this.makeRequest('GET', null, { action: 'ping' });
            return response.statusCode >= 200 && response.statusCode < 300;
        } catch (error) {
            console.error('Google Apps Script connection test failed:', error);
            return false;
        }
    }
}

module.exports = GoogleAppsScriptService;