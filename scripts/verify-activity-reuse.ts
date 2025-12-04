import 'dotenv/config';
import { generateSingleLessonPlan } from '../api/_shared/openai-services.js';
import { db } from '../api/_shared/database.js';
import { activities } from '../api/_shared/db-schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function main() {
  console.log("🚀 Starting Verification of Activity Reuse Logic...");

  const testActivityName = "Magic Dragon Ball Hunt " + Date.now().toString().slice(-4);
  console.log(`📝 Seeding test activity: ${testActivityName}`);
  
  await db.insert(activities).values({
    name: testActivityName,
    type: 'game',
    description: 'A high-energy game where students hunt for hidden dragon balls containing vocabulary words.',
    instructions: '1. Hide balls. 2. Students find them. 3. Read the word inside.',
    duration: '10 mins',
    ageGroup: 'Preschool',
    materials: ['Dragon balls', 'Flashcards']
  });
  console.log("✅ Test activity seeded.");

  // Verify what's in the DB
  const currentActivities = await db.select().from(activities);
  console.log(`📊 Current activities in DB (${currentActivities.length}):`);
  currentActivities.forEach(a => console.log(` - ${a.name}`));

  const mockLesson = {
    unitNumber: 4,
    lessonNumber: 1,
    title: "Finding Treasures",
    type: "Learn",
    vocabulary: ["龙珠", "寻找", "宝藏"],
    objectives: ["Students can say the words", "Students can play the game"],
    level: "Beginner",
    ageGroup: "Preschool",
    duration: "45 mins"
  };

  console.log("🔄 Generating lesson plan...");

  try {
    // We use a dummy model to avoid high costs if possible, or just use the default
    // But we want to verify the prompt construction mostly.
    // We can't easily spy on buildSingleLessonPlanPrompt unless we mock it.
    // But we can check if the output contains the activity name, IF the AI decides to use it.
    // To force it, we might need a strong prompt, but let's see if it picks it up.
    
    const plan = await generateSingleLessonPlan(mockLesson, "GLM-4.6");
    
    console.log("✅ Generation complete.");
    console.log("---------------------------------------------------");
    console.log(plan.substring(0, 500) + "...");
    console.log("---------------------------------------------------");

    // Check if the activity name appears in the plan
    if (plan.includes(testActivityName)) {
      console.log("🎉 SUCCESS: The test activity was reused in the lesson plan!");
    } else {
      console.log("⚠️ WARNING: The test activity was NOT explicitly mentioned in the plan.");
      console.log("This might be because the AI decided not to use it, or the prompt didn't include it correctly.");
    }

    // Clean up
    console.log("🧹 Cleaning up test activity...");
    await db.delete(activities).where(eq(activities.name, testActivityName));
    console.log("✅ Cleanup complete.");

  } catch (error) {
    console.error("❌ Error during verification:", error);
  }
  
  process.exit(0);
}

main();
