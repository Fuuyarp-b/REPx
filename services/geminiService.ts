/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";

export const getFitnessAdvice = async (query: string): Promise<string> => {
  try {
    // NOTE: In Vite, we use import.meta.env.VITE_... to access environment variables.
    // Ensure VITE_API_KEY is set in your Vercel project settings or .env file.
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) {
        return "ไม่พบ API Key กรุณาตรวจสอบการตั้งค่า Environment Variable (VITE_API_KEY)";
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