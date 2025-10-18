# Copilot Instructions for PlanCompareAI

This file tracks workspace-specific instructions and progress for the prepaid mobile plan comparison Node.js project.

## Project Overview
PlanCompareAI is a production-ready Node.js application that compares mobile prepaid plans using AI-powered recommendations through OpenAI ChatKit integration.

## Architecture
- **Backend**: Node.js with Express.js (MVC pattern)
- **Database**: PostgreSQL with SSL (production on Render)
- **AI Integration**: OpenAI ChatKit for intelligent plan recommendations
- **Frontend**: Vanilla JavaScript with floating chat widget
- **Deployment**: Render.com with automatic CI/CD from GitHub
- **Repository**: https://github.com/eocecm1/plancompareai
- **Live URL**: https://plancompareai.onrender.com

## Project Requirements
- Node.js project using MVC architecture
- Compare T-Mobile prepaid plans with competitors (AT&T, Verizon, Sprint, others)
- Output: JSON and human-readable formats (table, markdown, dashboard)
- AI/LLM integration (OpenAI ChatKit) for intelligent recommendations
- n8n automation placeholders for future expansion
- Modular, scalable, beginner-friendly code

## Progress Checklist
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete
- [x] Database Setup and Configuration
- [x] ChatKit Integration with OpenAI
- [x] Floating Chat Widget Implementation
- [x] API Endpoints for Plan Comparison
- [x] Production Database Connection (Render PostgreSQL)
- [x] GitHub Repository Setup
- [x] Render.com Deployment Configuration
- [x] Production Deployment and Testing
- [x] GitHub Copilot Integration Setup

## Deployment Information
- **GitHub Repository**: https://github.com/eocecm1/plancompareai
- **Production URL**: https://plancompareai.onrender.com
- **Database**: Render PostgreSQL with SSL
- **CI/CD**: Automatic deployment from main branch
- **Environment**: Production-ready with proper environment variables

## Current Status
- ✅ Server running successfully on Render.com
- ✅ ChatKit AI assistant fully functional
- ✅ Production database configured with SSL
- ✅ All API endpoints operational
- ✅ Frontend chat interface working perfectly
- ✅ GitHub repository with proper CI/CD
- ✅ GitHub Copilot integration configured
- ✅ Automatic code review workflows

## GitHub Copilot Features Enabled
- **Pull Request Reviews**: Automatic code analysis and suggestions
- **Issue Templates**: Structured bug reports and feature requests
- **Workflow Automation**: CI/CD with Copilot review integration
- **Code Suggestions**: Context-aware assistance for development
- **Security Analysis**: Automated security checks and recommendations

## Development Guidelines for Copilot
- **Focus Areas**: API security, database optimization, error handling, performance
- **Code Style**: Follow existing MVC patterns and Express.js conventions
- **Testing**: Ensure all API endpoints are properly tested
- **Documentation**: Keep README and API documentation up to date
- **Security**: Validate all inputs, use parameterized queries, handle errors gracefully

## Next Steps for Enhancement
- [ ] Add comprehensive plan database seeding
- [ ] Implement advanced plan comparison algorithms
- [ ] Add carrier data scraping automation
- [ ] Create admin dashboard for plan management
- [ ] Add user authentication and preferences
- [ ] Implement plan recommendation engine
- [ ] Add mobile-responsive design improvements
- [ ] Set up monitoring and analytics
- [ ] Add automated testing pipeline
- [ ] Implement rate limiting and caching

## Copilot Context Files
Key files for Copilot to understand the project:
- `app.js` - Main server and API endpoints
- `package.json` - Dependencies and scripts
- `database/schema.sql` - Database structure
- `controllers/` - Business logic
- `routes/` - API route definitions
- `models/` - Database models
- `.env.example` - Environment configuration template

Update this file as you complete each step and add new features.