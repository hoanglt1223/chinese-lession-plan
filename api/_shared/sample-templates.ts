import { PromptVariables } from './prompt-service.js';

export interface SampleTemplate {
  id: string;
  type: 'lesson_plan' | 'flashcard' | 'summary' | 'analysis';
  name: string;
  description: string;
  sampleInput: PromptVariables;
  sampleOutput: any;
  qualityScore: number;
  formatStructure: any;
}

export const SAMPLE_TEMPLATES: SampleTemplate[] = [
  {
    id: 'golden-lesson-plan-001',
    type: 'lesson_plan',
    name: 'Golden Lesson Plan - Fruits Theme',
    description: 'Perfect format example for single lesson plan with bilingual headers and Chinese content',
    sampleInput: {
      unit: '1',
      lesson: '1',
      topic: '水果 (Fruits)',
      duration: '45分钟',
      ageGroup: '3-6岁',
      objectives: '学习水果名称，练习"这是什么"句型，培养观察能力',
      vocabulary: '苹果，香蕉，橙子，葡萄',
      existingActivities: '水果蹲，水果蹲蹲乐，猜水果，水果配对',
      type: 'New Content'
    },
    sampleOutput: `| Level 1 | N1 | Unit 1 | 水果 (Fruits) | Lesson 1 | 第1节课 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **References:** | 参考资料 | | | | |
| **Lesson aim:** | 教学目标 | **Cognitive domain:** | 认识5种水果名称 | **Skill domain:** | 练习"这是什么"句型 |
| **Sub aim:** | 次要教学目标 | | 培养观察和描述能力 | | 提高参与度 |
| **Type of lesson** | 课型 | New Content | **Materials required:** | 教具 | 闪卡，实物水果，白板 |
| **Lesson content** | 教学内容 | **Vocabulary:** | 苹果，香蕉，橙子，葡萄，西瓜 | **Grammar/Other:** | "这是什么"句型 |
| **Duration:** | 课时 | 45分钟 | | | |

| Stage & aim 教学环节与目标 | Activities ideas & Procedures 活动设计与教学步骤 | Materials / 教具 |
| :--- | :--- | :--- |
| **Warm up 热身**<br>(Aim: 激活兴趣，准备学习) | **水果蹲 (Fruit Squat)**<br>1. 老师展示水果闪卡，说出水果名称<br>2. 学生跟着老师做蹲起动作<br>3. 加快速度，看谁反应最快<br>4. 全班分成小组进行比赛 | 水果闪卡x5，音响 |
| **Rules 规则**<br>(Aim: 提醒课堂规则) | 1. 举手发言<br>2. 认真听讲<br>3. 积极参与<br>老师用中文解释规则，学生复述 | 规则海报 |
| **Review / Presentation**<br>(Aim: 学习新单词) | **新单词学习**<br>1. 老师展示实物水果：苹果，香蕉，橙子，葡萄<br>2. 逐个教读：苹果(píngguǒ)，香蕉(xiāngjiāo)<br>3. 学生跟读3遍<br>4. "这是什么？"练习句型 | 实物水果x4，白板 |
| **Practice**<br>(Aim: 练习巩固) | **猜水果游戏**<br>1. 老师描述水果特征："它是红色的，圆圆的"<br>2. 学生猜："这是苹果！"<br>3. 猜对的学生可以摸水果<br>4. 分组练习，互相描述和猜测 | 眼罩，水果实物 |
| **Production**<br>(Aim: 运用输出) | **水果摊主游戏**<br>1. 设置水果摊场景<br>2. 学生扮演摊主和顾客<br>3. 练习对话："我要苹果" "给你苹果"<br>4. 用假钱币进行买卖游戏 | 玩具钱币，水果篮 |
| **Wrap up 总结**<br>(Aim: 复习总结) | **水果连一连**<br>1. 发放连线练习纸<br>2. 学生将水果图片与中文名称连线<br>3. 老师检查答案<br>4. 唱水果歌结束课程 | 练习纸，彩色笔 |`,
    qualityScore: 0.98,
    formatStructure: {
      hasHeaderTable: true,
      hasProcedureTable: true,
      bilingualHeaders: true,
      chineseContent: true,
      timeAllocations: true,
      specificMaterials: true,
      interactiveGames: true
    }
  },
  {
    id: 'golden-flashcard-001',
    type: 'flashcard',
    name: 'Golden Flashcard - Animals',
    description: 'Perfect format example for flashcard generation with image queries',
    sampleInput: {
      vocabulary: '猫，狗，兔子，鸟，鱼',
      theme: '动物',
      level: 'Level 1',
      ageGroup: '3-6岁'
    },
    sampleOutput: [
      {
        word: '猫',
        pinyin: 'māo',
        meaning: 'con mèo',
        partOfSpeech: 'danh từ',
        imageQuery: 'cute cat cartoon white background'
      },
      {
        word: '狗',
        pinyin: 'gǒu',
        meaning: 'con chó',
        partOfSpeech: 'danh từ',
        imageQuery: 'friendly dog cartoon colorful'
      },
      {
        word: '兔子',
        pinyin: 'tùzi',
        meaning: 'con thỏ',
        partOfSpeech: 'danh từ',
        imageQuery: 'cute rabbit cartoon illustration'
      },
      {
        word: '鸟',
        pinyin: 'niǎo',
        meaning: 'con chim',
        partOfSpeech: 'danh từ',
        imageQuery: 'colorful bird flying illustration'
      },
      {
        word: '鱼',
        pinyin: 'yú',
        meaning: 'con cá',
        partOfSpeech: 'danh từ',
        imageQuery: 'tropical fish swimming underwater'
      }
    ],
    qualityScore: 0.95,
    formatStructure: {
      hasWord: true,
      hasPinyin: true,
      hasMeaning: true,
      hasPartOfSpeech: true,
      hasImageQuery: true,
      consistentFormat: true,
      appropriateQueries: true
    }
  },
  {
    id: 'golden-summary-001',
    type: 'summary',
    name: 'Golden Summary - Lesson Overview',
    description: 'Perfect format example for parent-friendly lesson summary',
    sampleInput: {
      lessonPlan: '水果主题课程，包含水果蹲游戏、新词学习、买卖游戏等活动',
      theme: '水果',
      level: 'Level 1'
    },
    sampleOutput: `今天我们学习了水果主题的中文课程。孩子们通过水果蹲、猜水果等有趣游戏认识了苹果、香蕉、橙子等水果的中文名称，并练习了"这是什么"的句型。课程结束时，孩子们能够用中文说出常见水果的名称，并在买卖游戏中运用所学词汇进行简单对话。`,
    qualityScore: 0.92,
    formatStructure: {
      appropriateLength: true,
      parentFriendly: true,
      includesActivities: true,
      includesLearning: true,
      professionalTone: true
    }
  },
  {
    id: 'golden-analysis-001',
    type: 'analysis',
    name: 'Golden Analysis - Content Extraction',
    description: 'Perfect format example for PDF content analysis',
    sampleInput: {
      content: '今天我们要学习关于动物的课程。主要词汇包括：猫、狗、兔子、鸟、鱼。通过游戏和活动，让孩子们认识这些动物的名称。',
      langInstruction: '中文'
    },
    sampleOutput: {
      vocabulary: ['猫', '狗', '兔子', '鸟', '鱼'],
      activities: ['动物模仿游戏', '动物叫声识别', '动物配对游戏'],
      learningObjectives: ['认识动物中文名称', '学习动物叫声', '培养观察能力'],
      detectedLevel: 'Level 1',
      ageAppropriate: '3-6',
      mainTheme: '动物',
      duration: '45 mins'
    },
    qualityScore: 0.96,
    formatStructure: {
      hasVocabulary: true,
      hasActivities: true,
      hasObjectives: true,
      hasLevel: true,
      hasAgeGroup: true,
      hasTheme: true,
      hasDuration: true,
      validJSON: true
    }
  }
];

export class SampleTemplateService {
  /**
   * Get the best matching sample template for a given type and input
   */
  static getBestMatchingSample(type: string, input: PromptVariables): SampleTemplate | null {
    const samples = SAMPLE_TEMPLATES.filter(s => s.type === type);
    if (samples.length === 0) return null;

    // Simple matching algorithm - can be enhanced
    return samples.reduce((best, current) => {
      const bestScore = this.calculateMatchScore(best, input);
      const currentScore = this.calculateMatchScore(current, input);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate how well a sample matches the given input
   */
  private static calculateMatchScore(sample: SampleTemplate, input: PromptVariables): number {
    let score = 0;
    const totalKeys = Object.keys(input).length;

    if (totalKeys === 0) return sample.qualityScore;

    for (const [key, value] of Object.entries(input)) {
      const sampleValue = sample.sampleInput[key];
      if (sampleValue && value) {
        // Simple text similarity (can be enhanced with more sophisticated algorithms)
        const similarity = this.calculateTextSimilarity(String(value), String(sampleValue));
        score += similarity;
      }
    }

    return (score / totalKeys) * sample.qualityScore;
  }

  /**
   * Simple text similarity calculation
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  /**
   * Extract format structure from sample output
   */
  static extractFormatStructure(sample: SampleTemplate): any {
    return sample.formatStructure;
  }

  /**
   * Get all sample templates for a type
   */
  static getSamplesByType(type: string): SampleTemplate[] {
    return SAMPLE_TEMPLATES.filter(s => s.type === type);
  }

  /**
   * Add new sample template
   */
  static addSampleTemplate(sample: Omit<SampleTemplate, 'id'>): SampleTemplate {
    const newSample: SampleTemplate = {
      ...sample,
      id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    SAMPLE_TEMPLATES.push(newSample);
    return newSample;
  }
}