import { seedPrompts } from './_shared/seed-prompts';

async function main() {
  try {
    console.log('Seeding default prompts...');
    await seedPrompts();
    console.log('✅ Default prompts seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding prompts:', error);
    process.exit(1);
  }
}

main();