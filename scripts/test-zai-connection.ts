import 'dotenv/config';
import OpenAI from 'openai';

async function testConnection() {
  console.log("Testing Z.ai connection...");
  
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;

  console.log("Config:", {
    baseURL,
    apiKey: apiKey ? `${apiKey.substring(0, 5)}...` : "undefined"
  });

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "GLM-4.6",
      messages: [
        { role: "user", content: "Hello, are you working?" }
      ]
    });

    console.log("Response success!");
    console.log("Content:", response.choices[0].message.content);
  } catch (error: any) {
    console.error("Connection failed:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

testConnection();
