# Enhanced AI Generation with Sample-Based Format Enforcement

This document describes the enhanced AI generation system that achieves >95% format accuracy using sample template files for format enforcement.

## Overview

The enhanced AI generation system improves content quality and format consistency by:
1. **Sample Template Matching**: Finds the best matching golden sample templates
2. **Format Enforcement**: Uses sample outputs to enforce exact format requirements
3. **Quality Scoring**: Provides comprehensive quality metrics for all generated content
4. **Fallback Strategies**: Ensures reliability with multiple fallback mechanisms
5. **Performance Tracking**: Monitors generation quality and performance over time

## Key Features

### 🎯 Format Accuracy >95%
- Golden sample templates ensure exact format matching
- Bilingual headers (Chinese/English) enforcement
- Table structure validation
- Content language requirements

### 📊 Quality Metrics
- **Format Accuracy**: Structural correctness (0.00-1.00)
- **Content Quality**: Relevance and usefulness (0.00-1.00)
- **Completeness**: How well input variables are addressed (0.00-1.00)
- **Consistency**: Format consistency throughout (0.00-1.00)
- **Overall Score**: Weighted average of all metrics (0.00-1.00)

### 🔄 Intelligent Fallbacks
- Enhanced generation → Standard generation → Hardcoded fallbacks
- Multiple AI model support (GLM-4.6, GPT-5-nano, GPT-5-mini, GPT-4o)
- Quality threshold enforcement
- Automatic retry mechanisms

### 📈 Performance Tracking
- Generation metrics storage
- Template performance analytics
- Usage statistics
- Quality trends over time

## API Endpoints

### Enhanced Generation Endpoints

#### 1. Generate Enhanced Lesson Plan
```http
POST /api/ai-ops
Content-Type: application/json

{
  "action": "generate-plan-enhanced",
  "lesson": {
    "unitNumber": "1",
    "lessonNumber": "1",
    "title": "水果 (Fruits)",
    "type": "New Content",
    "vocabulary": ["苹果", "香蕉", "橙子"],
    "objectives": ["学习水果名称", "练习这是什么句型"],
    "ageGroup": "3-6岁",
    "duration": "45分钟"
  },
  "options": {
    "useEnhancedGeneration": true,
    "qualityThreshold": 0.75,
    "enforceFormat": true,
    "aiModel": "GLM-4.6"
  }
}
```

**Response:**
```json
{
  "content": "| Level 1 | N1 | Unit 1 | 水果 (Fruits) | Lesson 1 | 第1节课 |...",
  "quality": {
    "overallScore": 0.92,
    "formatAccuracy": 0.98,
    "contentQuality": 0.88,
    "completeness": 0.95,
    "consistency": 0.90,
    "validation": {
      "isValid": true,
      "score": 0.98,
      "issues": [],
      "suggestions": []
    }
  },
  "success": true,
  "templateUsed": {
    "template": {
      "id": "golden-lesson-plan-001",
      "name": "Golden Lesson Plan - Fruits Theme",
      "qualityScore": 0.98
    },
    "matchScore": 0.85,
    "reason": "High vocabulary similarity; Theme match: 水果 vs 水果; Perfect level match: Level 1"
  }
}
```

#### 2. Generate Enhanced Flashcards
```http
POST /api/ai-ops
Content-Type: application/json

{
  "action": "generate-flashcards-enhanced",
  "vocabulary": ["猫", "狗", "兔子", "鸟", "鱼"],
  "theme": "动物",
  "level": "Level 1",
  "ageGroup": "3-6岁",
  "options": {
    "useEnhancedGeneration": true,
    "qualityThreshold": 0.7,
    "aiModel": "GLM-4.6"
  }
}
```

#### 3. Enhanced Content Analysis
```http
POST /api/ai-ops
Content-Type: application/json

{
  "action": "analyze-enhanced",
  "content": "今天我们要学习关于动物的课程。主要词汇包括：猫、狗、兔子、鸟、鱼。",
  "outputLanguage": "auto",
  "options": {
    "useEnhancedGeneration": true,
    "qualityThreshold": 0.8,
    "aiModel": "gpt-5-nano"
  }
}
```

#### 4. Enhanced Summary Generation
```http
POST /api/ai-ops
Content-Type: application/json

{
  "action": "generate-summary-enhanced",
  "lessonPlan": "完整的课程计划内容...",
  "options": {
    "useEnhancedGeneration": true,
    "qualityThreshold": 0.7,
    "aiModel": "GLM-4.6"
  }
}
```

### Utility Endpoints

#### 5. Get Generation Recommendations
```http
POST /api/ai-ops
Content-Type: application/json

{
  "action": "get-generation-recommendations",
  "type": "single_lesson_plan",
  "variables": {
    "topic": "水果",
    "level": "Level 1",
    "ageGroup": "3-6岁",
    "vocabulary": "苹果, 香蕉, 橙子"
  }
}
```

#### 6. Batch Enhanced Generation
```http
POST /api/ai-ops
Content-Type: application/json

{
  "action": "batch-generate-enhanced",
  "requests": [
    {
      "type": "single_lesson_plan",
      "variables": { "topic": "水果", "level": "Level 1" },
      "options": { "qualityThreshold": 0.75 }
    },
    {
      "type": "flashcard",
      "variables": { "vocabulary": ["猫", "狗"] },
      "options": { "qualityThreshold": 0.7 }
    }
  ]
}
```

## Usage Examples

### Frontend Integration

```typescript
// Enhanced lesson plan generation
const generateLessonPlan = async (lessonData) => {
  const response = await fetch('/api/ai-ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate-plan-enhanced',
      lesson: lessonData,
      options: {
        useEnhancedGeneration: true,
        qualityThreshold: 0.75,
        enforceFormat: true
      }
    })
  });

  const result = await response.json();

  if (result.success && result.quality.overallScore > 0.8) {
    return result.content;
  } else {
    console.warn('Low quality generation:', result.quality);
    return result.content; // Still return content but with warning
  }
};

// Enhanced flashcard generation
const generateFlashcards = async (vocabulary, theme) => {
  const response = await fetch('/api/ai-ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate-flashcards-enhanced',
      vocabulary,
      theme,
      options: {
        useEnhancedGeneration: true,
        qualityThreshold: 0.7
      }
    })
  });

  return await response.json();
};
```

### Direct Service Usage

```typescript
import { generateSingleLessonPlanEnhanced } from './_shared/enhanced-openai-services.js';

// Direct service call
const result = await generateSingleLessonPlanEnhanced(
  {
    unitNumber: "1",
    lessonNumber: "1",
    title: "水果",
    type: "New Content",
    vocabulary: ["苹果", "香蕉"],
    objectives: ["学习水果名称"],
    ageGroup: "3-6岁"
  },
  {
    useEnhancedGeneration: true,
    qualityThreshold: 0.75,
    enforceFormat: true,
    aiModel: "GLM-4.6"
  }
);

console.log('Generated content:', result.content);
console.log('Quality score:', result.quality?.overallScore);
console.log('Template used:', result.templateUsed);
```

## Configuration

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=your-openai-api-key

# Optional
OPENAI_BASE_URL=https://api.openai.com/v1
DEEPL_AUTH_KEY=your-deepl-auth-key
REDIS_URL=redis://...
```

### Quality Thresholds
- **Excellent**: >0.90 - Production ready
- **Good**: 0.75-0.90 - Usable with minor issues
- **Acceptable**: 0.60-0.75 - May need manual review
- **Poor**: <0.60 - Requires regeneration

### AI Model Selection
- **GLM-4.6**: Default, fastest, most cost-effective
- **GPT-5-nano**: Best for structured JSON output (analysis)
- **GPT-5-mini**: Better for longer content
- **GPT-4o**: High quality but more expensive

## Performance Metrics

The system tracks the following metrics:
- **Generation Time**: Time taken in milliseconds
- **Format Accuracy**: How well output matches expected format
- **Content Quality**: Relevance and usefulness score
- **Success Rate**: Percentage of successful generations
- **Template Match**: How well input matched sample templates
- **User Feedback**: 1-5 rating system

## Database Schema

### New Tables

#### `generation_metrics`
Stores individual generation results and quality metrics:
- Template ID, generation type, AI model used
- Quality scores (overall, format, content, completeness, consistency)
- Generation time, retries, validation issues
- Input variables and user feedback

#### `template_performance`
Aggregated performance data per template:
- Total generations, average scores
- Success rates, average generation time
- Last used timestamps

#### `enhanced_templates`
Golden sample templates with quality tracking:
- Sample outputs and format structure requirements
- Quality scores and usage statistics
- Active status and performance metrics

## Troubleshooting

### Common Issues

1. **Low Quality Scores**
   - Check input data completeness
   - Verify template matching quality
   - Consider using different AI model
   - Lower quality threshold if needed

2. **Format Enforcement Failures**
   - Ensure `enforceFormat: true` in options
   - Check sample template compatibility
   - Review validation issues in response

3. **Performance Issues**
   - Use appropriate AI model for task type
   - Adjust max retries to balance quality vs speed
   - Consider caching frequently used templates

4. **Template Matching Problems**
   - Provide more specific input variables
   - Include age group, level, and theme
   - Check vocabulary overlap with samples

### Debug Mode

Enable detailed logging:
```typescript
const result = await generateSingleLessonPlanEnhanced(lessonData, {
  useEnhancedGeneration: true,
  // Additional debug info will be in console
});
```

## Best Practices

1. **Always provide complete input data** including age group, level, and theme
2. **Use appropriate quality thresholds** for your use case (0.75+ recommended)
3. **Enable format enforcement** for consistent output structure
4. **Monitor quality metrics** to track system performance
5. **Provide user feedback** when possible to improve future generations
6. **Use batch generation** for multiple related requests to improve efficiency

## Future Enhancements

- A/B testing capabilities for template variations
- Machine learning-based template recommendation
- Real-time quality monitoring and alerting
- Custom template creation interface
- Advanced analytics dashboard
- Multi-language support expansion

## Support

For issues or questions regarding the enhanced AI generation system:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check the database schema for required fields
4. Monitor generation metrics for performance issues