import { createClient } from './supabase';
import type { Lead, LeadStep, LeadWorkerTime } from './lead-types';

const LEAD_SELECT = `
  *,
  steps:lead_steps(*),
  worker_times:lead_worker_times(*)
`;

export async function getLeads(): Promise<Lead[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function saveLead(lead: Partial<Lead> & { name: string }): Promise<Lead> {
  const supabase = createClient();
  const payload = {
    name: lead.name,
    school_name: lead.school_name ?? null,
    city: lead.city ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    source: lead.source ?? 'organic',
    referrer_name: lead.referrer_name ?? null,
    status: lead.status ?? 'open',
    lost_reason: lead.lost_reason ?? null,
    notes: lead.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (lead.id) {
    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', lead.id)
      .select(LEAD_SELECT)
      .single();
    if (error) throw error;
    return data as Lead;
  } else {
    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select(LEAD_SELECT)
      .single();
    if (error) throw error;
    return data as Lead;
  }
}

export async function deleteLead(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertLeadStep(
  leadId: number,
  stepKey: string,
  done: boolean,
  clientDays?: number | null
): Promise<LeadStep> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lead_steps')
    .upsert(
      {
        lead_id: leadId,
        step_key: stepKey,
        done,
        done_at: done ? new Date().toISOString() : null,
        ...(clientDays !== undefined ? { client_days: clientDays } : {}),
      },
      { onConflict: 'lead_id,step_key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as LeadStep;
}

export async function upsertLeadWorkerTime(
  leadId: number,
  stepKey: string,
  workerId: number,
  durationMs: number
): Promise<LeadWorkerTime> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lead_worker_times')
    .upsert(
      { lead_id: leadId, step_key: stepKey, worker_id: workerId, duration_ms: durationMs, updated_at: new Date().toISOString() },
      { onConflict: 'lead_id,step_key,worker_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as LeadWorkerTime;
}

export async function convertLeadToProject(leadId: number, projectId: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('leads')
    .update({ status: 'won', converted_project_id: projectId, updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw error;
}
