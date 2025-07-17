#!/usr/bin/env node
/**
 * Environment Variables Validation Script
 * This script checks if all required environment variables are properly configured
 */

require('dotenv').config();

const requiredVars = [
    'SESSION_SECRET',
    'FIREBASE_PROJECT_ID',
    'GEMINI_API_KEY'
];

const optionalVars = [
    'PORT',
    'NODE_ENV',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON',
    'GOOGLE_APPS_SCRIPT_URL',
    'USE_GOOGLE_APPS_SCRIPT'
];

console.log('🔍 Environment Variables Validation\n');

let hasErrors = false;

// Check required variables
console.log('Required Variables:');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: Set (${value.length > 20 ? value.substring(0, 20) + '...' : value})`);
    } else {
        console.log(`❌ ${varName}: Not set`);
        hasErrors = true;
    }
});

// Check Firebase credentials
console.log('\nFirebase Credentials:');
const hasCredentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const hasCredentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (hasCredentialsJson) {
    try {
        JSON.parse(hasCredentialsJson);
        console.log('✅ GOOGLE_APPLICATION_CREDENTIALS_JSON: Valid JSON');
    } catch (e) {
        console.log('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON: Invalid JSON');
        hasErrors = true;
    }
} else if (hasCredentialsFile) {
    console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS: ${hasCredentialsFile}`);
} else {
    console.log('❌ No Firebase credentials configured');
    console.log('   Set either GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS');
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
    process.exit(1);
} else {
    console.log('✅ All required environment variables are properly configured!');
    console.log('\n💡 Next steps:');
    console.log('   - For local development: npm run dev');
    console.log('   - For Vercel deployment: Configure the same variables in Vercel dashboard');
}