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

const duolingoMessages = [
  "¿Vas a perder tu racha por no beber agua? Tu Bio-Avatar se está marchitando. Haz algo.",
  "Oh, genial. Otro día ignorándome. Supongo que tendré que sobrevivir con 0 calorías hoy... 🙄",
  "Tu Bio-Avatar confió en ti. Entra 1 minuto y salva tu inercia.",
  "Parece que a alguien ya no le importa su salud metabólica. Qué pena.",
  "He visto a piedras con más inercia que tú hoy. ¿Registramos algo o nos rendimos?"
];

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

    // 2. Lógica de "Motor de Culpa"
    // a) Buscar logs de hoy para saber quién SÍ ha interactuado
    const { data: logsToday } = await supabase
      .from('daily_logs')
      .select('user_id')
      .eq('date', today);

    const activeUsersToday = new Set((logsToday || []).map(l => String(l.user_id)));

    // b) Obtener todas las suscripciones Push
    const { data: subscriptions } = await supabase
      .from('user_push_subscriptions')
      .select('user_id, subscription');

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found' });
    }

    let sentCount = 0;

    for (const subRecord of subscriptions) {
      const uid = String(subRecord.user_id);
      
      // Si el usuario ya hizo algo hoy, lo saltamos
      if (activeUsersToday.has(uid)) continue;

      // Comprobar su último inercia
      const { data: lastLog } = await supabase
        .from('daily_logs')
        .select('health_momentum')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastMomentum = lastLog?.health_momentum ?? 100;
      
      // Si la inercia es 0, no lo molestamos más (ya abandonó del todo)
      if (lastMomentum <= 0) continue;

      // 3. Enviar Push Pasivo-Agresivo
      const randomMessage = duolingoMessages[Math.floor(Math.random() * duolingoMessages.length)];
      
      const payload = JSON.stringify({
        title: 'Tu Bio-Avatar está esperando',
        body: randomMessage,
        url: '/'
      });

      try {
        await webpush.sendNotification(subRecord.subscription, payload);
        sentCount++;
      } catch (pushError: any) {
        console.error(`Error sending push to ${uid}:`, pushError);
        // Si el error es 410 (Gone), la suscripción expiró o el usuario bloqueó notificaciones
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
