# Getting Started with EduFlow

This guide will help you set up and start using EduFlow for the first time.

## 📋 Prerequisites

- Node.js 20 or higher
- PostgreSQL 15+ (optional for development)
- OpenAI API key

## 🚀 Quick Setup

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (uses in-memory storage if not provided)
DATABASE_URL=postgresql://user:password@localhost:5432/eduflow

# Session configuration
SESSION_SECRET=your-super-secret-session-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🎯 First Use

### 1. Upload a PDF Lesson

- Click "Upload PDF" in Step 1
- Select a Chinese lesson PDF file
- Wait for AI analysis to complete

### 2. Review Extracted Content

- Check the vocabulary words extracted
- Review learning objectives and activities
- Verify the detected education level

### 3. Generate Lesson Plan

- Click "Generate Plan" in Step 2
- AI will create a structured lesson plan
- Edit the plan if needed

### 4. Edit Vocabulary & Create Flashcards

- In Step 3, edit the vocabulary list:
  - Click any word to edit it
  - Use the × button to remove words
  - Add new words using the input field
- Click "Generate Flashcards" to create visual cards

### 5. Generate Summary

- Step 4 creates a parent/student summary
- Includes homework instructions
- Provides Vietnamese translations

## 📱 Quick Test Flow

Use the "Quick Test Flow" button to try the system with sample content:

1. Click "Quick Test Flow" 
2. System automatically processes sample lesson
3. Review all generated content
4. Understand the complete workflow

## 🔧 Configuration Options

### AI Model Settings

The system uses:
- **Text Generation**: GPT-5-nano for all content creation
- **Image Generation**: DALL-E 3 with standard quality
- **Language**: Optimized for Chinese-Vietnamese education

### File Processing

Supported formats:
- **Input**: PDF files (lesson materials)
- **Output**: DOCX (lesson plans, summaries), Visual flashcards

### Storage Options

1. **Development**: In-memory storage (default)
2. **Production**: PostgreSQL database (recommended)

## 🎨 User Interface

### Navigation
- **Steps 1-5**: Main workflow progression
- **Lesson History**: Previous lessons (when using database)
- **Settings**: AI model configuration (future feature)

### Key Components
- **File Upload**: Drag-and-drop PDF interface
- **Markdown Editor**: For lesson plan editing
- **Vocabulary Editor**: Add/edit/remove words
- **Flashcard Preview**: Visual card display

## 🔍 Troubleshooting Quick Start

### Common Issues

1. **OpenAI API Key Error**
   - Verify your API key is valid
   - Check account has sufficient credits
   - Ensure key has access to GPT and DALL-E models

2. **PDF Upload Fails**
   - Check file size (max 10MB)
   - Verify file is a valid PDF
   - Try with a simpler PDF first

3. **Images Not Loading**
   - Check network connection
   - Verify DALL-E API access
   - Images may take 30-60 seconds to generate

4. **Database Connection Issues**
   - Use in-memory storage for testing
   - Verify PostgreSQL is running
   - Check DATABASE_URL format

### Performance Tips

- PDFs with lots of text may take longer to process
- Image generation is the slowest step (1-2 minutes)
- Use smaller vocabulary lists for faster flashcard generation

## 📚 Next Steps

Once you have the basic setup working:

1. Read the [User Guide](./user-guide.md) for detailed feature explanations
2. Check [Architecture](./architecture.md) to understand the system design
3. Review [API Reference](./api-reference.md) for integration options
4. See [Deployment Guide](./deployment.md) for production setup

## 💡 Tips for Best Results

### PDF Content
- Use PDFs with clear Chinese text
- Include vocabulary lists when possible
- Structured lesson content works best

### Vocabulary Management
- Start with 3-5 core words per lesson
- Use simple, age-appropriate vocabulary
- Include common greetings and basic words

### Lesson Planning
- Review AI-generated plans for accuracy
- Adjust activities for your specific classroom
- Consider cultural context for Vietnamese students

---

*Need more help? Check our [Troubleshooting Guide](./troubleshooting.md) or [User Guide](./user-guide.md)*