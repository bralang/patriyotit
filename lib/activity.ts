import { createClient } from './supabase';
import type { ActivityLogEntry } from './types';

export async function logActivity(
  action: string,
  projectName: string,
  workerId: number | null
): Promise<void> {
  const supabase = createClient();
  await supabase.from('activity_log').insert({
    action,
    project_name: projectName,
    worker_id: workerId,
  });
}

export async function getActivityLog(limit = 200): Promise<ActivityLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, worker:workers(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityLogEntry[];
}

export async function clearActivityLog(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('activity_log').delete().neq('id', 0);
  if (error) throw error;
}
