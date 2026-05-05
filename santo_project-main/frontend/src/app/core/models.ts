export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'user';
}

export interface Observation {
  id: number;
  text: string;
  who: string;
  ts: string;
  created_at?: string;
}

export interface Project {
  id: number;
  name: string;
  client: string;
  owner: string;
  startDate: string | null;
  deadline: string | null;
  priority: 'alta' | 'media' | 'baja';
  status: 'active' | 'done';
  createdBy: string;
  createdByName: string;
  obs: Observation[];
  created_at?: string;
}

export interface NewProject {
  name: string;
  client?: string;
  owner?: string;
  startDate?: string | null;
  deadline?: string | null;
  priority: 'alta' | 'media' | 'baja';
}
