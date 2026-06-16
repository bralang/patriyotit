import { createClient } from './supabase';
import type { ProjectStage, StageWorkerTime } from './types';

export async function toggleStageDone(stageId: number, done: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('project_stages')
    .update({ done })
    .eq('id', stageId);
  if (error) throw error;
}

export async function updateStageField(
  stageId: number,
  field: 'client_days' | 'notes' | 'target_hours',
  value: string | number | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('project_stages')
    .update({ [field]: value })
    .eq('id', stageId);
  if (error) throw error;
}

export async function upsertWorkerTime(
  stageId: number,
  workerId: number,
  durationMs: number
): Promise<StageWorkerTime> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stage_worker_times')
    .upsert(
      { stage_id: stageId, worker_id: workerId, duration_ms: durationMs },
      { onConflict: 'stage_id,worker_id' }
    )
    .select('*, worker:workers(*)')
    .single();
  if (error) throw error;
  return data as StageWorkerTime;
}

export async function getWorkerTime(
  stageId: number,
  workerId: number
): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from('stage_worker_times')
    .select('duration_ms')
    .eq('stage_id', stageId)
    .eq('worker_id', workerId)
    .maybeSingle();
  return (data?.duration_ms as number) ?? 0;
}
