export interface SystemCompanyRow {
  id: number;
  name: string;
  user_count: number;
  team_count: number;
  email_domains: string[];
}

export interface SystemTeamRow {
  id: number;
  name: string;
  company_id: number;
  company_name: string;
  member_count: number;
}

export interface SystemUserRow {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'CONTENT_MANAGER' | 'COMPANY_ADMIN' | 'SUPER_ADMIN';
  company_id: number | null;
  company_name: string | null;
  team_id: number | null;
  team_name: string | null;
}

export interface CompanyDeleteImpact {
  id: number;
  name: string;
  user_count: number;
  team_count: number;
  domain_count: number;
  invite_count: number;
}

export interface UserDeleteImpact {
  id: number;
  name: string;
  email: string;
  submission_count: number;
  invite_count: number;
}
