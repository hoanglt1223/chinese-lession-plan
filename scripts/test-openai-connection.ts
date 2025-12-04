
import * as dotenv from 'dotenv';
dotenv.config();

import OpenAI from "openai";

console.log('Testing OpenAI Connection...');
console.log('Base URL:', process.env.OPENAI_BASE_URL);
console.log('API Key Prefix:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : 'undefined');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function test() {
  try {
    console.log('Sending request...');
    const response = await openai.chat.completions.create({
      model: "GLM-4.6", // Or gpt-3.5-turbo to test
      messages: [{ role: "user", content: "Hello, are you working?" }],
      max_tokens: 10
    });
    console.log('Response:', response.choices[0].message.content);
    console.log('✅ Connection Successful!');
  } catch (error: any) {
    console.error('❌ Connection Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    }
  }
}

test();
