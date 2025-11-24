import { GoogleGenAI } from "@google/genai";

export const getFitnessAdvice = async (query: string): Promise<string> => {
  try {
    // NOTE: In a real production environment, ensure process.env.API_KEY is set.
    // For this demo to work, the user must have the key in their environment.
    if (!process.env.API_KEY) {
        return "ไม่พบ API Key กรุณาตรวจสอบการตั้งค่า Environment Variable (API_KEY)";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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