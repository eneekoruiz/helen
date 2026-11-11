import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RECORDATORIOS_URL =
  process.env.RECORDATORIOS_URL || 'https://recordatorios-delta.vercel.app';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token =
      authHeader.replace('Bearer ', '').trim() ||
      process.env.RECORDATORIOS_TOKEN ||
      process.env.HELEN_RECORDATORIOS_TOKEN;

    if (!token) {
      return NextResponse.json({
        connected: false,
        message: 'No hay token configurado para Recordatorios.',
        tasks: [
          {
            id: 'demo-1',
            title: 'Configurar token de Recordatorios en Ajustes',
            list: 'Ajustes',
            completed: false,
            priority: 'high',
            due: null,
          },
          {
            id: 'demo-2',
            title: 'Beber 2.5L de agua hoy',
            list: 'Hábitos Vitales',
            completed: true,
            priority: 'normal',
            due: null,
          },
          {
            id: 'demo-3',
            title: 'Repasar entregas pendientes de la semana',
            list: 'General',
            completed: false,
            priority: 'normal',
            due: null,
          },
        ],
        stats: {
          total: 3,
          completed: 1,
          pending: 2,
        },
      });
    }

    // Call Recordatorios MCP or Status API
    const response = await fetch(`${DEFAULT_RECORDATORIOS_URL}/api/helen/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          status: response.status,
          message: 'Error de autenticación con Recordatorios.',
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      connected: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        error: error?.message || 'Error conectando a Recordatorios',
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, task, token: clientToken } = body;

    const token =
      clientToken ||
      process.env.RECORDATORIOS_TOKEN ||
      process.env.HELEN_RECORDATORIOS_TOKEN;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Falta el token de conexión con Recordatorios.',
      });
    }

    // Call Recordatorios MCP tool or sync
    const res = await fetch(`${DEFAULT_RECORDATORIOS_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'req-1',
        method: 'tools/call',
        params: {
          name: action || 'create_task',
          arguments: task,
        },
      }),
    });

    const result = await res.json();
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error al procesar acción' },
      { status: 500 }
    );
  }
}
