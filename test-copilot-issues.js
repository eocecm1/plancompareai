// Test file to demonstrate GitHub Copilot review functionality
// This file contains intentional issues for Copilot to catch
// TODO: Fix security vulnerabilities and performance issues identified by Copilot

const express = require('express');
const app = express();

// Security issue: No input validation
app.post('/test-endpoint', (req, res) => {
    const userInput = req.body.data;
    
    // Potential SQL injection vulnerability
    const query = `SELECT * FROM users WHERE name = '${userInput}'`;
    
    // Missing error handling
    const result = database.query(query);
    
    // Sending sensitive data
    res.json({
        success: true,
        data: result,
        serverConfig: process.env, // Security issue: exposing environment variables
        password: 'hardcoded-password' // Security issue: hardcoded credentials
    });
});

// Performance issue: Synchronous operation
app.get('/slow-endpoint', (req, res) => {
    // This will block the event loop
    const start = Date.now();
    while (Date.now() - start < 5000) {
        // Busy waiting for 5 seconds
    }
    
    res.json({ message: 'This took 5 seconds' });
});

// Code style issues
function badFunction( param1,param2 ){
    if(param1==param2){
        return true
    }else{
        return false
    }
}

// Unused variable
const unusedVariable = 'This variable is never used';

module.exports = app;