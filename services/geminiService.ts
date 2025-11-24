import { GoogleGenAI } from "@google/genai";

// Declare process to avoid TypeScript errors when accessing process.env.API_KEY
// This is necessary because we are strictly following the SDK guideline to use process.env.API_KEY
declare const process: {
  env: {
    API_KEY: string | undefined;
  }
};

export const getFitnessAdvice = async (query: string): Promise<string> => {
  try {
    // NOTE: We access API_KEY via process.env as per @google/genai guidelines.
    // This variable is injected via vite.config.ts 'define' configuration.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        return "ไม่พบ API Key กรุณาตรวจสอบการตั้งค่า Environment Variable (API_KEY)";
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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