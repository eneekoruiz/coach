import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configurar Web Push
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@bioavatar.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function GET(request: Request) {
  try {
    // 1. Verificación de Seguridad CRON
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized CRON execution' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase env variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    // a) Obtener todas las suscripciones Push
    const { data: subscriptions } = await supabase
      .from('user_push_subscriptions')
      .select('user_id, subscription');

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found' });
    }

    let sentCount = 0;

    for (const subRecord of subscriptions) {
      const uid = String(subRecord.user_id);

      // Comprobar si tiene routine_templates creados
      const { data: templates, error: templatesErr } = await supabase
        .from('routine_templates')
        .select('id')
        .eq('user_id', uid);

      if (templatesErr || !templates || templates.length === 0) {
        // No tiene rutinas creadas, no envía notificación a este usuario
        continue;
      }

      // Comprobar cuántas completó hoy
      const { data: logs, error: logsErr } = await supabase
        .from('routine_logs')
        .select('routine_id')
        .eq('user_id', uid)
        .eq('completed_date', today);

      if (logsErr) {
        console.error(`Error fetching logs for user ${uid}:`, logsErr);
        continue;
      }

      const totalTemplates = templates.length;
      const completedCount = logs ? logs.length : 0;
      const pendingCount = totalTemplates - completedCount;

      // Si ya completó todo o no tiene rutinas creadas, no envía notificación
      if (pendingCount <= 0) {
        continue;
      }

      // Enviar una única notificación con el mensaje agrupado
      let notificationMessage = '';
      if (pendingCount === 1) {
        notificationMessage = '¡Casi lo tienes! Te falta 1 tarea para cerrar tu día perfecto.';
      } else {
        notificationMessage = `Recuerda terminar tus tareas diarias. Tienes ${pendingCount} pendientes.`;
      }

      const payload = JSON.stringify({
        title: 'Tareas pendientes de hoy',
        body: notificationMessage,
        url: '/'
      });

      try {
        await webpush.sendNotification(subRecord.subscription, payload);
        sentCount++;
      } catch (pushError: any) {
        console.error(`Error sending push to ${uid}:`, pushError);
        // Si la suscripción expiró o el usuario bloqueó notificaciones (Gone = 410)
        if (pushError.statusCode === 410) {
          await supabase.from('user_push_subscriptions').delete().eq('user_id', uid);
        }
      }
    }

    return NextResponse.json({ success: true, sentCount });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
