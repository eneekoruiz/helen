import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { ELLEN_SYSTEM_PROMPT } from '@/lib/ellen-prompt';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, apiKey: clientApiKey } = body;

    const apiKey =
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          role: 'assistant',
          content:
            '¡Hola! Para que pueda responderte en tiempo real, añade tu `GEMINI_API_KEY` en Ajustes o en las variables de entorno de Vercel.',
        },
        { status: 200 }
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    // Format chat history into text format
    const formattedMessages = (messages || []).map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })
    );

    const modelCandidates = [
      process.env.GEMINI_MODEL,
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    let text = '';
    let lastError: any = null;

    for (const modelId of modelCandidates) {
      try {
        const result = await generateText({
          model: google(modelId),
          system: ELLEN_SYSTEM_PROMPT,
          messages: formattedMessages,
        });
        text = result.text;
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        if (
          msg.includes('not found') ||
          msg.includes('no longer available') ||
          msg.includes('404') ||
          msg.includes('deprecated')
        ) {
          continue;
        }
        throw err;
      }
    }

    if (lastError && !text) {
      throw lastError;
    }

    return NextResponse.json({
      role: 'assistant',
      content: text,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json(
      {
        role: 'assistant',
        content: `He tenido un problema procesando tu mensaje: ${
          error?.message || 'Error desconocido'
        }. Revisa la conexión o tu clave de API.`,
      },
      { status: 500 }
    );
  }
}
