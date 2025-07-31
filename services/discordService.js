/**
 * Discord Service
 * 
 * This service handles Discord nickname resolution and prompt integration
 * for the Synapse Note application.
 */

const admin = require('firebase-admin');

class DiscordService {
    constructor() {
        this.db = null;
        try {
            this.db = admin.firestore();
        } catch (error) {
            console.error('Firebase not initialized for DiscordService:', error.message);
        }
    }

    /**
     * Get all Discord mappings for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Array of Discord mappings
     */
    async getUserDiscordMappings(userId) {
        if (!this.db) {
            throw new Error('Database not available');
        }

        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return [];
            }

            const userData = userDoc.data();
            return userData.discordMappings || [];
        } catch (error) {
            console.error('Error fetching Discord mappings:', error);
            throw error;
        }
    }

    /**
     * Resolve Discord nicknames in a text/prompt
     * @param {string} text - The text containing potential nicknames
     * @param {string} userId - User ID to get mappings for
     * @returns {Promise<Object>} - Object with resolved text and mapping info
     */
    async resolveNicknamesInText(text, userId) {
        try {
            const mappings = await this.getUserDiscordMappings(userId);
            
            if (!mappings || mappings.length === 0) {
                return {
                    originalText: text,
                    resolvedText: text,
                    foundMappings: [],
                    hasDiscordReferences: false
                };
            }

            let resolvedText = text;
            const foundMappings = [];

            // Sort mappings by nickname length (longest first) to avoid partial matches
            const sortedMappings = mappings.sort((a, b) => b.nickname.length - a.nickname.length);

            for (const mapping of sortedMappings) {
                const nickname = mapping.nickname;
                // Create regex patterns for different nickname formats
                const patterns = [
                    new RegExp(`@${this.escapeRegex(nickname)}\\b`, 'gi'), // @nickname
                    new RegExp(`\\b${this.escapeRegex(nickname)}\\b`, 'gi'), // nickname (whole word)
                ];

                for (const pattern of patterns) {
                    if (pattern.test(resolvedText)) {
                        foundMappings.push({
                            nickname: nickname,
                            discordId: mapping.discordId,
                            description: mapping.description || '',
                            matchPattern: pattern.toString()
                        });

                        // Replace with a more explicit format showing it's a Discord reference
                        resolvedText = resolvedText.replace(pattern, `[Discord:${nickname}(${mapping.discordId})]`);
                    }
                }
            }

            return {
                originalText: text,
                resolvedText: resolvedText,
                foundMappings: foundMappings,
                hasDiscordReferences: foundMappings.length > 0
            };
        } catch (error) {
            console.error('Error resolving nicknames in text:', error);
            return {
                originalText: text,
                resolvedText: text,
                foundMappings: [],
                hasDiscordReferences: false,
                error: error.message
            };
        }
    }

    /**
     * Get Discord mapping by nickname for a specific user
     * @param {string} nickname - The nickname to search for
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} - Discord mapping object or null
     */
    async getDiscordMappingByNickname(nickname, userId) {
        try {
            const mappings = await this.getUserDiscordMappings(userId);
            return mappings.find(mapping => 
                mapping.nickname.toLowerCase() === nickname.toLowerCase()
            ) || null;
        } catch (error) {
            console.error('Error getting Discord mapping by nickname:', error);
            return null;
        }
    }

    /**
     * Get Discord mapping by Discord ID for a specific user
     * @param {string} discordId - The Discord ID to search for
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} - Discord mapping object or null
     */
    async getDiscordMappingByDiscordId(discordId, userId) {
        try {
            const mappings = await this.getUserDiscordMappings(userId);
            return mappings.find(mapping => 
                mapping.discordId === discordId
            ) || null;
        } catch (error) {
            console.error('Error getting Discord mapping by Discord ID:', error);
            return null;
        }
    }

    /**
     * Generate prompt with Discord context
     * @param {string} originalPrompt - The original prompt text
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Enhanced prompt with Discord context
     */
    async enhancePromptWithDiscordContext(originalPrompt, userId) {
        try {
            const resolution = await this.resolveNicknamesInText(originalPrompt, userId);
            
            let enhancedPrompt = resolution.resolvedText;
            let contextInfo = '';

            if (resolution.hasDiscordReferences) {
                contextInfo = '\n\n--- Discord Context ---\n';
                contextInfo += 'The following Discord users are referenced in this prompt:\n';
                
                resolution.foundMappings.forEach(mapping => {
                    contextInfo += `- "${mapping.nickname}" (Discord ID: ${mapping.discordId})`;
                    if (mapping.description) {
                        contextInfo += ` - ${mapping.description}`;
                    }
                    contextInfo += '\n';
                });
                
                contextInfo += 'Please consider these Discord user references when processing the prompt.\n';
                enhancedPrompt += contextInfo;
            }

            return {
                originalPrompt: originalPrompt,
                enhancedPrompt: enhancedPrompt,
                discordContext: contextInfo,
                foundMappings: resolution.foundMappings,
                hasDiscordReferences: resolution.hasDiscordReferences
            };
        } catch (error) {
            console.error('Error enhancing prompt with Discord context:', error);
            return {
                originalPrompt: originalPrompt,
                enhancedPrompt: originalPrompt,
                discordContext: '',
                foundMappings: [],
                hasDiscordReferences: false,
                error: error.message
            };
        }
    }

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} - Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Test connection (for health checks)
     * @returns {Promise<boolean>} - True if service is operational
     */
    async testConnection() {
        try {
            if (!this.db) {
                return false;
            }
            // Simple test query
            await this.db.collection('_health_check').limit(1).get();
            return true;
        } catch (error) {
            console.error('Discord service test connection failed:', error);
            return false;
        }
    }
}

module.exports = DiscordService;