import { createClient } from './supabase';
import type { Settings, Status, ProjectType, Worker, Package } from './types';

export async function getSettings(): Promise<Settings> {
  const supabase = createClient();
  const [statuses, types, workers, packages] = await Promise.all([
    supabase.from('statuses').select('*').order('sort_order'),
    supabase.from('project_types').select('*').order('sort_order'),
    supabase.from('workers').select('*').order('sort_order'),
    supabase.from('packages').select('*').order('sort_order'),
  ]);
  return {
    statuses: (statuses.data ?? []) as Status[],
    types: (types.data ?? []) as ProjectType[],
    workers: (workers.data ?? []) as Worker[],
    packages: (packages.data ?? []) as Package[],
  };
}

export async function saveSettings(settings: Omit<Settings, 'workers'>): Promise<void> {
  const supabase = createClient();
  await Promise.all([
    upsertLookup(supabase, 'statuses', settings.statuses),
    upsertLookup(supabase, 'project_types', settings.types),
    upsertLookup(supabase, 'packages', settings.packages),
  ]);
}

export async function linkWorkerToEmail(workerId: number, email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('workers').update({ email }).eq('id', workerId);
  if (error) throw error;
}

// Updates only name + sort_order for existing workers — never touches email
export async function updateWorkerNames(workers: Worker[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    workers
      .filter(w => w.id)
      .map((w, i) =>
        supabase.from('workers').update({ name: w.name, sort_order: i }).eq('id', w.id)
      )
  );
}

// Deletes the workers row only — does NOT delete the Supabase Auth account
export async function deleteWorker(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('workers').delete().eq('id', id);
  if (error) throw error;
}

async function upsertLookup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: { id?: number; name: string; sort_order: number }[]
) {
  const { data: existing } = await supabase.from(table).select('id');
  const existingIds = new Set((existing ?? []).map((r: { id: number }) => r.id));
  const newIds = new Set(rows.filter(r => r.id).map(r => r.id!));
  const toDelete = [...existingIds].filter(id => !newIds.has(id));

  if (toDelete.length) {
    await supabase.from(table).delete().in('id', toDelete);
  }
  if (rows.length) {
    await supabase.from(table).upsert(
      rows.map((r, i) => ({ ...r, sort_order: i })),
      { onConflict: 'id' }
    );
  }
}

export async function addLookupItem(
  table: 'statuses' | 'project_types' | 'packages',
  name: string,
  sort_order: number
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(table)
    .insert({ name, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLookupItem(
  table: 'statuses' | 'project_types' | 'packages',
  id: number
) {
  const supabase = createClient();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
