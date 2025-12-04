
import 'dotenv/config';
import { db } from '../api/_shared/database.js';
import { promptTemplates, promptComponents } from '../api/_shared/db-schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("Checking for 'single_lesson_plan' prompt template in DB...");

  const template = await db.query.promptTemplates.findFirst({
    with: {
      components: {
        orderBy: [promptComponents.order]
      }
    },
    where: eq(promptTemplates.type, 'single_lesson_plan')
  });

  if (template) {
    console.log("Found template in DB:");
    console.log(`ID: ${template.id}`);
    console.log(`Name: ${template.name}`);
    console.log(`Is Default: ${template.isDefault}`);
    console.log(`Is Active: ${template.isActive}`);
    console.log("Components:");
    template.components.forEach((c: any) => {
      console.log(`\n--- [${c.type}] (Order: ${c.order}) ---`);
      console.log(c.content);
    });
  } else {
    console.log("No 'single_lesson_plan' template found in DB. Using fallback code.");
  }

  process.exit(0);
}

main();
