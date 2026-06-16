/**
 * Migration script: imports DEFAULT_PROJECTS from index.html into Supabase.
 *
 * Usage:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local  (Settings > API in Supabase dashboard)
 *   2. npx tsx scripts/migrate.ts
 *
 * The service role key bypasses RLS — required for inserting rows without a user session.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found — falling back to anon key. Inserts may fail due to RLS.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WORK_STAGES = [
  'העברת תשלום', 'שיחת פיצוח קונספט', 'איסוף תכנים',
  'פרוטוטיפ', 'אישור לקוח', 'מאסטרטיפ', 'אישור לקוח',
];

// Raw project data extracted from index.html DEFAULT_PROJECTS
const DEFAULT_PROJECTS = [
  { id:1, name:'מעבר לאופק', type:'ערב הורים', client:'אילת השחר', contact:'הינדי hs0583268187@gmail.com', contact2:'מזכירות: ay@shtilim.org', status:'שלב 5: מאסטרפיס', drive:'https://drive.google.com/drive/folders/1SEcMdd8qg_Z6JtYS18XHvQ9zmpc8Tbmf?usp=drive_link', instructions:'https://docs.google.com/document/d/1Ik5jqcFGfGIkPLU5ldA3UdLhqGX6wsrJGF-vDXcwPFI/edit?usp=drive_link', template:'https://docs.google.com/document/d/18RVXcODFDrv6Srsyw1eSeiX6fZV7VjgcIEHeFjRESt0/edit?usp=sharing', notes:'' },
  { id:2, name:'מז\'תומרת', type:'מחנה', client:'אוסטרי חיפה', contact:'מרים m0556781330@gmail.com', contact2:'טובה t0548464384@gmail.com', status:'שלב 4: פרוטוטייפ', drive:'', instructions:'https://docs.google.com/document/d/1-7zAXnSZ2ucAVQm4vftvUbgLcMQ7nBRuTinshO8mXns/edit?usp=sharing', template:'', notes:'' },
  { id:3, name:'לשם ולתהילה', type:'ערב הורים', client:'תהילה חיפה', contact:'אפרת efrat7828@gmail.com', contact2:'', status:'פרויקט ננעל', drive:'https://drive.google.com/drive/folders/16Q9z4oKLUOYAKsbZNdXZT4Q5RTaploeQ?usp=drive_link', instructions:'', template:'https://docs.google.com/document/d/1lcYyGYHy05CuC-5x5cLxuKkCCWAlJKQYgzGQ4QbyMuI/edit?usp=drive_link', notes:'' },
  { id:4, name:'איזה חום', type:'מחנה', client:'מורשת דליה', contact:'אמונה e0548561599@gmail.com', contact2:'שמחה simcha4112@gmail.com', status:'שלב 5: מאסטרפיס', drive:'https://drive.google.com/drive/folders/111iYKnVuVm9a-Ine5Iew5pnXAEYaDu2v?usp=drive_link', instructions:'', template:'', notes:'' },
  { id:5, name:'פצצת אנרגיה', type:'מחנה', client:'עכו', contact:'אילה ואתי az12239211@gmail.com', contact2:'', status:'שלב 4: פרוטוטייפ', drive:'', instructions:'https://docs.google.com/document/d/13hTAWdxWSKJtlnLvZ5c34d-s5WMwyce7ewg7J-xVxVo/edit?usp=sharing', template:'', notes:'' },
  { id:6, name:'high level', type:'מחנה', client:'כפר גדעון', contact:'יעל yael207107@gmail.com', contact2:'', status:'שלב 1: קבלת תשלום', drive:'', instructions:'https://docs.google.com/document/d/1W5FVQ-cgy0OZeG4GoEIVQO7HxHBtuBFss5gDnMBfbc4/edit?usp=sharing', template:'', notes:'' },
  { id:7, name:'את בעוצמך', type:'מחנה', client:'תפארת טבריה', contact:'דסי dasi212422926@gmail.com', contact2:'', status:'שלב 5: מאסטרפיס', drive:'https://drive.google.com/drive/folders/1zPP4tyFCzsLEE1rNDZa9d3lRX774K95I?usp=drive_link', instructions:'https://docs.google.com/document/d/11cPot6fzNcT095wfsGK69oIMKHUATsa8x2_hRp_YeeM/edit?usp=sharing', template:'https://docs.google.com/document/d/1TDLk82pG-Rxb0DqHggLIzf8wBSA1GsSCzTOVn3h1KA0/edit?usp=sharing', notes:'' },
  { id:8, name:'מעברים', type:'עיתון', client:'קרית אתא', contact:'עידית yh656462@gmail.com', contact2:'', status:'שלב 1: קבלת תשלום', drive:'https://drive.google.com/drive/folders/18dL-kvuCRx8_JXirPioHOetzteHMGMWe?usp=drive_link', instructions:'', template:'', notes:'' },
  { id:9, name:'כריכה סיום יב', type:'אחר', client:'קרן הילד', contact:'דסי בנדיקט dasi44518@gmail.com', contact2:'', status:'', drive:'', instructions:'', template:'', notes:'' },
  { id:10, name:'המשך יבוא', type:'נושא שנתי', client:'בית מלכה מנצסטר', contact:'רוחי ruchilipshitz@gmail.com', contact2:'', status:'שלב 4: פרוטוטייפ', drive:'', instructions:'', template:'', notes:'' },
];

function parseContact(raw: string): { contact_name: string; phone: string; email: string } {
  const emailMatch = raw.match(/[\w.+-]+@[\w-]+\.[a-z.]+/i);
  const email = emailMatch?.[0] ?? '';
  const withoutEmail = raw.replace(email, '').trim();
  const phoneMatch = withoutEmail.match(/0\d[\d-]{7,}/);
  const phone = phoneMatch?.[0] ?? '';
  const contact_name = withoutEmail.replace(phone, '').trim();
  return { contact_name, phone, email };
}

async function main() {
  console.log('Starting migration...');

  // 1. Load lookup data from Supabase
  const [{ data: statuses }, { data: types }] = await Promise.all([
    supabase.from('statuses').select('id, name'),
    supabase.from('project_types').select('id, name'),
  ]);

  const statusMap: Record<string, number> = {};
  (statuses ?? []).forEach((s: { id: number; name: string }) => { statusMap[s.name] = s.id; });
  const typeMap: Record<string, number> = {};
  (types ?? []).forEach((t: { id: number; name: string }) => { typeMap[t.name] = t.id; });

  // 2. Create clients from project data
  const clientInserts = DEFAULT_PROJECTS.map(p => {
    const { contact_name, phone, email } = parseContact(p.contact);
    return { school_name: p.client, contact_name: contact_name || null, phone: phone || null, email: email || null };
  });

  const { data: insertedClients, error: clientErr } = await supabase
    .from('clients')
    .insert(clientInserts)
    .select('id, school_name');
  if (clientErr) { console.error('Client insert error:', clientErr); process.exit(1); }

  const clientIdByName: Record<string, number> = {};
  (insertedClients ?? []).forEach((c: { id: number; school_name: string }, i: number) => {
    clientIdByName[DEFAULT_PROJECTS[i].client] = c.id;
  });

  // 3. Insert projects
  for (const p of DEFAULT_PROJECTS) {
    const isLocked = p.status.includes('ננעל');
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .insert({
        name: p.name,
        client_id: clientIdByName[p.client] ?? null,
        contact2: p.contact2 || null,
        drive_url: p.drive || null,
        instructions_url: p.instructions || null,
        template_url: p.template || null,
        notes: p.notes || null,
        status_id: statusMap[p.status] ?? null,
        type_id: typeMap[p.type] ?? null,
        locked_at: isLocked ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (projectErr) { console.error(`Project "${p.name}" error:`, projectErr); continue; }

    // Insert 7 default stages
    await supabase.from('project_stages').insert(
      WORK_STAGES.map((name, i) => ({ project_id: project.id, stage_index: i, name }))
    );
    console.log(`✓ Migrated: ${p.name}`);
  }

  console.log('\nMigration complete!');
}

main().catch(console.error);
