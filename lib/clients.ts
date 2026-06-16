import { createClient } from './supabase';
import type { Client } from './types';

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('school_name');
  if (error) throw error;
  return data as Client[];
}

export async function getClientWithProjectCount(): Promise<(Client & { project_count: number })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*, projects(count)')
    .order('school_name');
  if (error) throw error;
  return (data ?? []).map((c: Client & { projects: { count: number }[] }) => ({
    ...c,
    project_count: c.projects?.[0]?.count ?? 0,
  }));
}

export async function saveClient(
  client: Partial<Client> & { school_name: string }
): Promise<Client> {
  const supabase = createClient();
  const { id, created_at, ...fields } = client as Client;
  if (id) {
    const { data, error } = await supabase
      .from('clients')
      .update(fields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Client;
  }
  const { data, error } = await supabase
    .from('clients')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function searchClients(query: string): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .or(`school_name.ilike.%${query}%,city.ilike.%${query}%,contact_name.ilike.%${query}%`)
    .order('school_name')
    .limit(20);
  if (error) throw error;
  return data as Client[];
}
