export type FieldType = 'text' | 'number' | 'boolean' | 'textarea' | 'select';

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  inTable?: boolean;
  section?: string;
  optionsKey?: 'questionnaires' | 'elements';
  defaultValue?: string | number | boolean;
  createOnly?: boolean;
}

export interface CrudConfig {
  title: string;
  description: string;
  listPath: string;
  createPath: string;
  updatePath: (id: number) => string;
  deletePath: (id: number) => string;
  getPath?: (id: number) => string;
  fields: FieldConfig[];
}

export type AdminTab =
  | 'questionnaires'
  | 'elements'
  | 'questions'
  | 'feedback'
  | 'matrices';

export interface LookupOption {
  value: number;
  label: string;
}

export type AdminLookups = {
  questionnaires: LookupOption[];
  elements: LookupOption[];
};

export type RowRecord = Record<string, unknown>;
