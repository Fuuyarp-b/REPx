import { GoogleGenAI } from "@google/genai";

// Declare process to avoid TypeScript errors when accessing process.env.API_KEY
// This is necessary because we are strictly following the SDK guideline to use process.env.API_KEY
declare const process: {
  env: {
    API_KEY: string | undefined;
  }
};

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("ไม่พบ API Key กรุณาตรวจสอบการตั้งค่า Environment Variable (API_KEY)");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

export const getFitnessAdvice = async (query: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: "คุณคือโค้ชฟิตเนสมืออาชีพ (Personal Trainer) ที่มีความรู้ด้านวิทยาศาสตร์การกีฬา ตอบคำถามสั้น กระชับ ได้ใจความ และเน้นความปลอดภัย เป็นภาษาไทย ให้กำลังใจผู้ใช้งานเสมอ",
        temperature: 0.7,
      },
    });

    return response.text || "ขออภัย ไม่สามารถประมวลผลคำตอบได้ในขณะนี้";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Coach กรุณาลองใหม่อีกครั้ง";
  }
};

export const analyzeFoodImage = async (imageBase64: string): Promise<any> => {
  try {
    const ai = getClient();

    // Clean base64 string if it contains metadata prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        },
        {
          text: "Analyze this image and identify the food. Estimate the calories, protein, carbs, and fat for the portion shown. Return the result in JSON format with keys: 'foodName' (Thai name), 'calories' (number), 'protein' (number, g), 'carbs' (number, g), 'fat' (number, g). If it's not food, return foodName as 'Not Food' and others as 0."
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("ไม่สามารถวิเคราะห์รูปภาพได้");
  }
};
