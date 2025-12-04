
import { CourseLesson } from '../api/_shared/course-processor.js';

export function generateMockLessonPlan(lesson: CourseLesson): string {
  return `# Lesson Plan: ${lesson.title}

## General Information
| **Unit** | ${lesson.unitNumber} |
|---|---|
| **Lesson** | ${lesson.lessonNumber} |
| **Topic** | ${lesson.title} |
| **Level** | ${lesson.level} |
| **Age Group** | ${lesson.ageGroup} |
| **Duration** | ${lesson.duration} |

## Objectives
${lesson.objectives.map(o => `- ${o}`).join('\n')}

## Vocabulary
${lesson.vocabulary.map(v => `- ${v}`).join('\n')}

## Materials
${lesson.materials.map(m => `- ${m}`).join('\n')}

## Procedure

| Stage | Time | Teacher Activity | Student Activity | Materials |
|---|---|---|---|---|
| **Warm-up** | 5 min | **Greeting & Song**<br>Teacher greets students with "Ni hao!". Play the "Hello Song". | Students wave and sing along. | Audio Player |
| **Presentation** | 10 min | **Flashcard Intro**<br>Show flashcards for: ${lesson.vocabulary.join(', ')}.<br>Pronounce each word clearly. | Listen and repeat after the teacher.<br>Point to the correct card when asked. | Flashcards |
| **Practice** | 15 min | **Game: ${lesson.activities?.[0] || 'Missing Card'}**<br>Place cards on board. Ask students to close eyes. Remove one. Ask "What's missing?" | Open eyes and shout out the missing word. | Flashcards, Board |
| **Production** | 10 min | **Role Play / Activity**<br>Students practice using the words in simple sentences or a group activity. | Work in pairs or groups. | Props |
| **Wrap-up** | 5 min | **Review & Goodbye**<br>Quick review of words. Sing "Goodbye Song". | Sing goodbye and wave. | Audio Player |

## Notes
- Ensure all students participate.
- Adjust pacing based on student engagement.
`;
}

export function generateMockFlashcards(lesson: CourseLesson): any[] {
  return lesson.vocabulary.map(word => ({
    word: word,
    pinyin: 'pīn yīn', // In a real mock, we might want a pinyin library, but this suffices for structure
    vietnamese: `Nghĩa của ${word}`,
    partOfSpeech: 'Noun',
    imageUrl: `https://placehold.co/600x400/png?text=${encodeURIComponent(word)}`
  }));
}
