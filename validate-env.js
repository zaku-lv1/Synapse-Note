#!/usr/bin/env node
/**
 * Environment Variables Validation Script for Firebase Cloud Deployment
 * This script checks if all required environment variables are properly configured
 * for serverless deployment (Vercel/Firebase)
 */

require('dotenv').config();

const requiredVars = [
    'SESSION_SECRET',
    'FIREBASE_PROJECT_ID',
    'GEMINI_API_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON'
];

const optionalVars = [
    'PORT',
    'NODE_ENV',
    'GOOGLE_APPS_SCRIPT_URL',
    'USE_GOOGLE_APPS_SCRIPT'
];

console.log('🔍 Firebase Cloud Deployment - Environment Variables Validation\n');

let hasErrors = false;

// Check required variables
console.log('Required Variables (for cloud deployment):');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        const displayValue = varName === 'GOOGLE_APPLICATION_CREDENTIALS_JSON' ? 
            'Valid JSON credentials' : 
            (value.length > 20 ? value.substring(0, 20) + '...' : value);
        console.log(`✅ ${varName}: Set (${displayValue})`);
    } else {
        console.log(`❌ ${varName}: Not set`);
        hasErrors = true;
    }
});

// Validate Firebase credentials JSON
console.log('\nFirebase Credentials:');
const hasCredentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (hasCredentialsJson) {
    try {
        const parsed = JSON.parse(hasCredentialsJson);
        if (parsed.type === 'service_account' && parsed.private_key && parsed.client_email) {
            console.log('✅ GOOGLE_APPLICATION_CREDENTIALS_JSON: Valid service account JSON');
        } else {
            console.log('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON: Invalid service account JSON format');
            hasErrors = true;
        }
    } catch (e) {
        console.log('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON: Invalid JSON format');
        hasErrors = true;
    }
} else {
    console.log('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON: Required for cloud deployment');
    hasErrors = true;
}

// Check optional variables
console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value}`);
    } else {
        console.log(`⚠️  ${varName}: Not set (using default)`);
    }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
    console.log('❌ Configuration has errors. Please fix the issues above.');
    console.log('\n💡 For cloud deployment, ensure:');
    console.log('   - GOOGLE_APPLICATION_CREDENTIALS_JSON contains valid service account JSON');
    console.log('   - FIREBASE_PROJECT_ID matches your Firebase project');
    console.log('   - SESSION_SECRET is a secure random string');
    console.log('   - GEMINI_API_KEY is valid for AI features');
    process.exit(1);
} else {
    console.log('✅ All required environment variables are properly configured for cloud deployment!');
    console.log('\n💡 Your app is ready for serverless deployment (Vercel/Firebase)');
}