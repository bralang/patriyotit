import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  // Verify caller is authenticated
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate body
  const body = await request.json().catch(() => null);
  const name: string = (body?.name ?? '').trim();
  const email: string = (body?.email ?? '').trim();

  if (!name || !email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'כתובת המייל אינה תקינה' }, { status: 400 });
  }

  // Invite via service-role admin client (trigger auto-creates the workers row)
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already been registered') || msg.includes('already registered') || error.code === 'email_exists') {
      return NextResponse.json({ error: 'כתובת המייל כבר רשומה במערכת' }, { status: 409 });
    }
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת ההזמנה' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
