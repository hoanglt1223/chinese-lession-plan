
import * as dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import * as path from 'path';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genericActivities = [
  // ... (keep existing activities)
  {
    name: 'Little Detective (小侦探)',
    type: 'Game',
    description: 'Students use a "magnifying glass" or look closely to find hidden characters/objects.',
    instructions: '1. Hide small flashcards or characters around the room or in a complex picture.\n2. Give students a "magnifying glass" (prop).\n3. Teacher says a word.\n4. Students must find the corresponding card/object and say "Found it!" along with the word.',
    duration: '10-15 mins',
    ageGroup: 'Preschool/Primary',
    materials: ['Flashcards', 'Magnifying glass prop', 'Complex picture scene'],
    benefits: 'Enhances observation skills and vocabulary recognition.'
  },
  {
    name: 'True or False (判断对错)',
    type: 'Game',
    description: 'Students judge if a statement or image match is correct.',
    instructions: '1. Teacher shows an image and says a word.\n2. If it matches, students make a circle with arms (O). If not, they make an X.\n3. Can be done with physical movement (jump left for True, right for False).',
    duration: '5-10 mins',
    ageGroup: 'All Ages',
    materials: ['Flashcards'],
    benefits: 'Quick comprehension check.'
  },
  {
    name: 'Stroke Review (复习笔画)',
    type: 'Drill',
    description: 'Reviewing Chinese character strokes.',
    instructions: '1. Teacher shows a stroke card.\n2. Students say the name of the stroke and write it in the air with their finger.\n3. Can be turned into a "Simon Says" style game (Teacher says stroke, students do action).',
    duration: '5-10 mins',
    ageGroup: 'Primary',
    materials: ['Stroke cards'],
    benefits: 'Reinforces writing foundations.'
  },
  {
    name: 'Fruit Squat (水果蹲)',
    type: 'Game',
    description: 'Rhythm game where students assigned different fruits must squat when called.',
    instructions: '1. Assign each student/group a fruit name (e.g., Apple, Banana).\n2. Rhythm: "Apple squat, apple squat, apple squat then Banana squat!"\n3. The named group must squat immediately and call the next group.\n4. Hesitation eliminates the player.',
    duration: '10-15 mins',
    ageGroup: 'Primary/Lower Secondary',
    materials: ['None (optional: fruit headbands)'],
    benefits: 'High energy, listening skills, vocabulary recall.'
  },
  {
    name: 'Sticky Ball (黏球大战)',
    type: 'Game',
    description: 'Throwing a sticky ball at flashcards on the board.',
    instructions: '1. Put flashcards on the whiteboard.\n2. Teacher says a word.\n3. Student throws a sticky ball at the correct card.\n4. Points awarded for accuracy and speed.',
    duration: '10 mins',
    ageGroup: 'Preschool/Primary',
    materials: ['Sticky ball', 'Flashcards', 'Whiteboard'],
    benefits: 'Hand-eye coordination, word recognition.'
  }
];

async function main() {
  console.log('Seeding generic activities...');
  
  const { db } = await import('../api/_shared/database.js');
  const { activities } = await import('../api/_shared/db-schema.js');

  try {
    for (const activity of genericActivities) {
      console.log(`Processing: ${activity.name}`);
      
      // Check if exists
      const existing = await db.select().from(activities).where(eq(activities.name, activity.name));
      
      if (existing.length === 0) {
        console.log(` - Inserting...`);
        await db.insert(activities).values(activity as any);
      } else {
        console.log(` - Already exists, skipping.`);
      }
    }
    console.log('✅ Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Error seeding activities:', error);
  } finally {
    process.exit(0);
  }
}

main();
