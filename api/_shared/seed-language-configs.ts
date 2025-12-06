import { db } from './database.js';
import { languageConfigs } from './db-schema.js';

// Default language configurations
const defaultLanguageConfigs = [
  {
    languageCode: 'zh',
    languageName: 'Chinese',
    aiPrompts: {
      analysis: 'Analyze this Chinese educational content and extract key vocabulary, grammar patterns, and cultural context suitable for Chinese language learners.',
      lessonPlan: 'Create a comprehensive Chinese language lesson plan with clear objectives, activities, and assessments appropriate for the specified age group and proficiency level.',
      flashcard: 'Generate Chinese flashcards with accurate pinyin, English translations, and contextual examples. Include cultural notes where relevant.',
      summary: 'Create a summary of the Chinese lesson content that highlights key learning points, cultural insights, and practice recommendations for students and parents.'
    },
    culturalSettings: {
      culturalContext: 'Mainland Chinese education system and cultural norms',
      writingSystem: 'Simplified Chinese characters',
      pronunciationSystem: 'Hanyu Pinyin',
      culturalThemes: ['Confucian values', 'Festivals', 'Family traditions', 'Chinese history'],
      educationalApproach: 'Teacher-centered with emphasis on memorization and practice'
    },
    translationSettings: {
      targetLanguage: 'zh',
      sourceLanguage: 'en',
      translationStyle: 'formal',
      culturalAdaptation: true,
      idiomHandling: 'translate-cultural-equivalent'
    },
    educationalStandards: {
      system: 'Chinese National Curriculum',
      levels: ['HSK 1-6', 'YCT', 'Local school standards'],
      ageGroups: {
        preschool: '3-6 years',
        primary: '6-12 years',
        secondary: '12-18 years'
      },
      assessmentTypes: ['Written exams', 'Oral proficiency', 'Character writing', 'Listening comprehension']
    }
  },
  {
    languageCode: 'en',
    languageName: 'English',
    aiPrompts: {
      analysis: 'Analyze this English educational content and identify vocabulary, grammar structures, and learning objectives suitable for English language learners.',
      lessonPlan: 'Develop an engaging English language lesson with communicative activities, clear learning outcomes, and differentiated instruction strategies.',
      flashcard: 'Create English vocabulary flashcards with definitions, example sentences, phonetic transcriptions, and usage notes.',
      summary: 'Summarize the English lesson content focusing on key language points, practice activities, and progress recommendations for learners.'
    },
    culturalSettings: {
      culturalContext: 'International English education',
      writingSystem: 'Latin alphabet',
      pronunciationSystem: 'IPA/Phonics',
      culturalThemes: ['Global communication', 'Western culture', 'Literature', 'Critical thinking'],
      educationalApproach: 'Student-centered with emphasis on communication and critical thinking'
    },
    translationSettings: {
      targetLanguage: 'en',
      sourceLanguage: 'zh',
      translationStyle: 'natural',
      culturalAdaptation: true,
      idiomHandling: 'explain-cultural-difference'
    },
    educationalStandards: {
      system: 'CEFR (Common European Framework)',
      levels: ['A1-C2', 'IELTS', 'TOEFL', 'Cambridge exams'],
      ageGroups: {
        preschool: '3-5 years',
        primary: '5-11 years',
        secondary: '11-18 years'
      },
      assessmentTypes: ['Four skills (reading, writing, listening, speaking)', 'Portfolio assessment', 'Project work']
    }
  },
  {
    languageCode: 'vi',
    languageName: 'Vietnamese',
    aiPrompts: {
      analysis: 'Analyze this Vietnamese educational content and extract important vocabulary, tonal patterns, and cultural elements for Vietnamese language learners.',
      lessonPlan: 'Design a Vietnamese language lesson that incorporates tonal practice, cultural context, and age-appropriate learning activities.',
      flashcard: 'Generate Vietnamese flashcards with accurate tone marks, English translations, and cultural context notes.',
      summary: 'Create a Vietnamese lesson summary emphasizing tonal pronunciation, cultural insights, and practical application tips for learners.'
    },
    culturalSettings: {
      culturalContext: 'Vietnamese educational and cultural traditions',
      writingSystem: 'Latin-based Quốc Ngữ script',
      pronunciationSystem: 'Northern dialect (Hanoi) standard',
      culturalThemes: ['Family values', 'Festivals (Tết)', 'Vietnamese history', 'Buddhist influences'],
      educationalApproach: 'Respect for teachers with group-based learning activities'
    },
    translationSettings: {
      targetLanguage: 'vi',
      sourceLanguage: 'zh',
      translationStyle: 'natural',
      culturalAdaptation: true,
      idiomHandling: 'find-closest-equivalent'
    },
    educationalStandards: {
      system: 'Vietnamese National Curriculum',
      levels: ['Elementary to Advanced', 'VSTEP'],
      ageGroups: {
        preschool: '3-5 years',
        primary: '6-10 years',
        secondary: '11-18 years'
      },
      assessmentTypes: ['Reading comprehension', 'Writing skills', 'Listening/speaking', 'Grammar exercises']
    }
  },
  {
    languageCode: 'ja',
    languageName: 'Japanese',
    aiPrompts: {
      analysis: 'Analyze this Japanese educational content and identify kanji, grammar patterns, and cultural elements appropriate for Japanese language learners.',
      lessonPlan: 'Create a comprehensive Japanese lesson plan that integrates kanji learning, grammar practice, and cultural understanding.',
      flashcard: 'Generate Japanese flashcards with kanji, hiragana/katakana, romaji, English translations, and stroke order information.',
      summary: 'Summarize Japanese lesson content highlighting kanji usage, grammar patterns, cultural context, and study strategies.'
    },
    culturalSettings: {
      culturalContext: 'Japanese educational system and cultural traditions',
      writingSystem: 'Mixed script (Kanji, Hiragana, Katakana)',
      pronunciationSystem: 'Standard Tokyo dialect',
      culturalThemes: ['Politeness levels', 'Seasonal traditions', 'Japanese aesthetics', 'Modern vs traditional'],
      educationalApproach: 'Structured progression with emphasis on mastery and perfection'
    },
    translationSettings: {
      targetLanguage: 'ja',
      sourceLanguage: 'zh',
      translationStyle: 'formal-polite',
      culturalAdaptation: true,
      idiomHandling: 'adapt-to-japanese-culture'
    },
    educationalStandards: {
      system: 'Japanese Ministry of Education standards',
      levels: ['JLPT N5-N1', 'School grade levels'],
      ageGroups: {
        preschool: '3-6 years',
        primary: '6-12 years',
        secondary: '12-18 years'
      },
      assessmentTypes: ['Kanji recognition', 'Grammar patterns', 'Reading comprehension', 'Listening proficiency']
    }
  }
];

export async function seedLanguageConfigs() {
  console.log('Seeding language configurations...');

  try {
    for (const config of defaultLanguageConfigs) {
      await db.insert(languageConfigs)
        .values(config)
        .onConflictDoUpdate({
          target: languageConfigs.languageCode,
          set: {
            languageName: config.languageName,
            aiPrompts: config.aiPrompts,
            culturalSettings: config.culturalSettings,
            translationSettings: config.translationSettings,
            educationalStandards: config.educationalStandards,
            updatedAt: new Date()
          }
        });
    }

    console.log(`✅ Seeded ${defaultLanguageConfigs.length} language configurations`);
  } catch (error) {
    console.error('❌ Error seeding language configurations:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLanguageConfigs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}