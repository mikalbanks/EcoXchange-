import { supabase } from "./client.js";
import type { Project, ProjectStatus } from "./types.js";

const TABLE = "projects";

function unwrap<T>(data: T | null, error: unknown, context: string): T {
  if (error) throw new Error(`${context}: ${(error as Error).message}`);
  if (data === null) throw new Error(`${context}: no row returned`);
  return data;
}

export async function getActiveProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getActiveProjects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProjectById: ${error.message}`);
  return (data as Project | null) ?? null;
}

export async function createProject(
  project: Omit<Project, "id" | "created_at" | "updated_at">,
): Promise<Project> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(project)
    .select()
    .single();
  return unwrap(data as Project, error, "createProject");
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`updateProjectStatus: ${error.message}`);
}
