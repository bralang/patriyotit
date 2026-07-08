import { createClient } from './supabase';
import type { Project, ProjectStage, StageWorkerTime, Worker, Settings } from './types';
import { WORK_STAGES, MAILING_STAGES, MAILING_TYPE_NAME } from './types';

const PROJECT_SELECT = `
  *,
  client:clients(*),
  status:statuses(*),
  type:project_types(*),
  package:packages(*),
  workers:project_workers(worker:workers(*)),
  stages:project_stages(
    *,
    worker_times:stage_worker_times(*, worker:workers(*))
  )
`;

// Flatten Supabase's nested join shape into our Project type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProject(raw: any): Project {
  return {
    ...raw,
    workers: (raw.workers ?? []).map((pw: { worker: Worker }) => pw.worker).filter(Boolean),
    stages: (raw.stages ?? []).sort(
      (a: ProjectStage, b: ProjectStage) => a.stage_index - b.stage_index
    ),
  };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .order('archived', { ascending: true })
    .order('event_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(normalizeProject);
}

export async function saveProject(
  project: Partial<Project> & { name: string },
  workerIds: number[],
  customStageNames?: string[]
): Promise<Project> {
  const supabase = createClient();

  const fields = {
    name: project.name,
    client_id: project.client_id ?? null,
    contact2: project.contact2 ?? null,
    drive_url: project.drive_url ?? null,
    instructions_url: project.instructions_url ?? null,
    template_url: project.template_url ?? null,
    notes: project.notes ?? null,
    event_date: project.event_date ?? null,
    status_id: project.status_id ?? null,
    type_id: project.type_id ?? null,
    package_id: project.package_id ?? null,
    locked_at: project.locked_at ?? null,
    archived: project.archived ?? false,
    archived_at: project.archived_at ?? null,
  };

  let projectId: number;

  if (project.id) {
    const { error } = await supabase.from('projects').update(fields).eq('id', project.id);
    if (error) throw error;
    projectId = project.id;
  } else {
    const { data, error } = await supabase
      .from('projects')
      .insert(fields)
      .select('id')
      .single();
    if (error) throw error;
    projectId = data.id;
    // Create stages for new project (default 7, or custom for special types)
    const stageNames = customStageNames ?? WORK_STAGES.map(s => s.name);
    await supabase.from('project_stages').insert(
      stageNames.map((name, i) => ({
        project_id: projectId,
        stage_index: i,
        name,
      }))
    );
  }

  // Sync workers
  await supabase.from('project_workers').delete().eq('project_id', projectId);
  if (workerIds.length) {
    await supabase.from('project_workers').insert(
      workerIds.map(worker_id => ({ project_id: projectId, worker_id }))
    );
  }

  // Return full project
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return normalizeProject(data);
}

export async function deleteProject(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function archiveProject(id: number, archive: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .update({
      archived: archive,
      archived_at: archive ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function lockProject(id: number, lock: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .update({ locked_at: lock ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function setProjectStatus(id: number, statusId: number | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .update({ status_id: statusId })
    .eq('id', id);
  if (error) throw error;
}

export async function duplicateProject(id: number): Promise<Project> {
  const supabase = createClient();
  const { data: src, error: srcErr } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .single();
  if (srcErr) throw srcErr;

  const original = normalizeProject(src);
  const workerIds = original.workers?.map((w: Worker) => w.id) ?? [];

  return saveProject(
    {
      ...original,
      id: undefined,
      name: original.name + ' (עותק)',
      locked_at: null,
      archived: false,
      archived_at: null,
    },
    workerIds
  );
}

export async function createMailingProject(
  projectName: string,
  settings: Pick<Settings, 'types' | 'workers' | 'packages'>,
  subtypeName = 'שיתוף',
  isAutoCreated = false
): Promise<Project> {
  const supabase = createClient();

  let mailingType = settings.types.find(t => t.name === MAILING_TYPE_NAME);
  if (!mailingType) {
    const { data } = await supabase
      .from('project_types')
      .insert({ name: MAILING_TYPE_NAME, sort_order: 999 })
      .select()
      .single();
    mailingType = data;
  }

  const worker = settings.workers.find(w => w.name === 'חיה רבקה');
  const subtypePackage = settings.packages.find(p => p.name === subtypeName);
  const name = isAutoCreated ? `דיוור — ${projectName}` : projectName;

  return saveProject(
    {
      name,
      type_id: mailingType?.id ?? null,
      package_id: subtypePackage?.id ?? null,
    },
    worker ? [worker.id] : [],
    MAILING_STAGES.map(s => s.name)
  );
}

export async function checkAutoArchive(projects: Project[]): Promise<void> {
  const sevenDays = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const toArchive = projects.filter(
    p =>
      !p.archived &&
      p.locked_at &&
      now - new Date(p.locked_at).getTime() >= sevenDays
  );
  if (!toArchive.length) return;
  const supabase = createClient();
  await supabase
    .from('projects')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .in('id', toArchive.map(p => p.id));
}
