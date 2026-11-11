import fs from 'fs';
import path from 'path';

const file = path.resolve('src/services/analyzeService.ts');
let content = fs.readFileSync(file, 'utf8');

// 1) Update AnalyzeParams interface
const interfaceTarget = `export interface AnalyzeParams {
  text: string;
  rawImage?: string | null;
  habitReports: Array<{ habit_id: number; amount: number }>;
  localDate?: string;
  authHeader?: string;
  supabase: SupabaseClient;
  user: User;
}`;

const interfaceReplacement = `export interface AnalyzeParams {
  text: string;
  rawImage?: string | null;
  habitReports: Array<{ habit_id: number; amount: number }>;
  localDate?: string;
  authHeader?: string;
  supabase: SupabaseClient;
  user: User;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}`;

if (content.includes(interfaceTarget)) {
  content = content.replace(interfaceTarget, interfaceReplacement);
} else {
  // Try CRLF formatting
  const interfaceTargetCRLF = interfaceTarget.replace(/\n/g, '\r\n');
  const interfaceReplacementCRLF = interfaceReplacement.replace(/\n/g, '\r\n');
  content = content.replace(interfaceTargetCRLF, interfaceReplacementCRLF);
}

// 2) Update function signature
const signatureTarget = `export async function analyzeAndPersistDailyLog(params: AnalyzeParams) {
  const { text, rawImage, habitReports, localDate, authHeader, supabase, user } = params;`;

const signatureReplacement = `export async function analyzeAndPersistDailyLog(params: AnalyzeParams) {
  const { text, rawImage, habitReports, localDate, authHeader, supabase, user, history } = params;

  // Insert user's chat message to chat_history table
  if (text && text.trim()) {
    await supabase
      .from('chat_history')
      .insert({ user_id: user.id, role: 'user', content: text });
  }`;

if (content.includes(signatureTarget)) {
  content = content.replace(signatureTarget, signatureReplacement);
} else {
  const signatureTargetCRLF = signatureTarget.replace(/\n/g, '\r\n');
  const signatureReplacementCRLF = signatureReplacement.replace(/\n/g, '\r\n');
  content = content.replace(signatureTargetCRLF, signatureReplacementCRLF);
}

// 3) Update messages array in generateObject
const messagesTarget = `      messages: [
        {
          role: 'user',
          content: userMessageContent,
        },
      ],`;

const messagesReplacement = `      messages: [
        ...(history || []).map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: msg.content,
        })),
        {
          role: 'user',
          content: userMessageContent,
        },
      ],`;

if (content.includes(messagesTarget)) {
  content = content.replace(messagesTarget, messagesReplacement);
} else {
  const messagesTargetCRLF = messagesTarget.replace(/\n/g, '\r\n');
  const messagesReplacementCRLF = messagesReplacement.replace(/\n/g, '\r\n');
  content = content.replace(messagesTargetCRLF, messagesReplacementCRLF);
}

// 4) Insert assistant response into chat_history
const assistantInsertTarget = `    analyzedLog = validatedResult.data;`;
const assistantInsertReplacement = `    analyzedLog = validatedResult.data;
    
    // Insert AI's response message into chat_history table
    if (analyzedLog.metricas && analyzedLog.metricas.accion_manana) {
      await supabase
        .from('chat_history')
        .insert({ user_id: user.id, role: 'assistant', content: analyzedLog.metricas.accion_manana });
    }`;

if (content.includes(assistantInsertTarget)) {
  content = content.replace(assistantInsertTarget, assistantInsertReplacement);
} else {
  const assistantInsertTargetCRLF = assistantInsertTarget.replace(/\n/g, '\r\n');
  const assistantInsertReplacementCRLF = assistantInsertReplacement.replace(/\n/g, '\r\n');
  content = content.replace(assistantInsertTargetCRLF, assistantInsertReplacementCRLF);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched analyzeService.ts');
