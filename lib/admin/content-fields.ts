export type ContentSection =
  | 'landing'
  | 'personal'
  | 'team'
  | 'leader'
  | 'company'
  | 'groups'
  | 'elements'
  | 'feedback'
  | 'scoring';

export const CONTENT_SECTIONS: Array<{
  id: ContentSection;
  label: string;
  description: string;
}> = [
  { id: 'landing', label: 'Questionnaire landing', description: 'Shown before the questionnaire starts' },
  { id: 'personal', label: 'Personal report', description: 'Individual report copy' },
  { id: 'team', label: 'Team report', description: 'Team report copy' },
  { id: 'leader', label: 'Leadership team report', description: 'Leadership team report copy' },
  { id: 'company', label: 'Company report', description: 'Company report copy' },
  { id: 'groups', label: 'Report groups', description: 'Adapt / Innovate or Growth / Execute titles' },
  { id: 'elements', label: 'Elements & questions', description: 'Element paragraphs and question text' },
  { id: 'feedback', label: 'Feedback phrases', description: 'Score-band words used in reports' },
  { id: 'scoring', label: 'Scoring (advanced)', description: 'Weighting matrices and numeric weights' },
];

export type CopyFieldKind = 'text' | 'rich';

export interface CopyFieldDef {
  key: string;
  label: string;
  kind: CopyFieldKind;
  where: string;
  /** Show {{user_name}} / {{report_date}} helper */
  interpolates?: boolean;
  required?: boolean;
}

const INTERPOLATION_HINT =
  'You can use {{user_name}}, {{report_date}}, {{pronoun}}, {{em_score}}, {{gp_score}}, and {{target_score}}.';

export const INTERPOLATION_HELP = INTERPOLATION_HINT;

export const FEEDBACK_TOKEN_HINT =
  'Scoring may replace **level**, **verb**, **adjective**, and **focus** with the matching feedback-band phrases.';

export const RECOMPILE_HINT =
  'Already-compiled reports keep the previous wording until they are recompiled (system admin) or a new submission completes.';

/** Shared questionnaire name field shown on landing. */
export const LANDING_FIELDS: CopyFieldDef[] = [
  {
    key: 'name',
    label: 'Questionnaire name',
    kind: 'text',
    where: 'Questionnaire selector and admin labels',
    required: true,
  },
  {
    key: 'introParagraph',
    label: 'Landing intro',
    kind: 'rich',
    where: 'Top of the questionnaire landing card before someone starts',
    required: true,
  },
];

function reportFields(prefix: {
  intro: string;
  end?: string;
  heading: string;
  graphic: string;
  detail: string;
  howTo: string;
  nextSteps: string;
  contextLabel: string;
}): CopyFieldDef[] {
  const fields: CopyFieldDef[] = [
    {
      key: prefix.intro,
      label: 'Intro paragraph',
      kind: 'rich',
      where: `Opening copy on the ${prefix.contextLabel} report`,
      interpolates: true,
    },
    {
      key: prefix.heading,
      label: 'Report heading',
      kind: 'text',
      where: `Main title on the ${prefix.contextLabel} report`,
      interpolates: true,
    },
    {
      key: prefix.graphic,
      label: 'Graphic heading',
      kind: 'text',
      where: `Heading above the score graphic on the ${prefix.contextLabel} report`,
      interpolates: true,
    },
    {
      key: prefix.detail,
      label: 'Detail / impact heading',
      kind: 'text',
      where: `Label next to the impact score on the ${prefix.contextLabel} report`,
      interpolates: true,
    },
    {
      key: prefix.howTo,
      label: 'How to read this report',
      kind: 'rich',
      where: `Expandable “how to” section on the ${prefix.contextLabel} report`,
      interpolates: true,
    },
    {
      key: prefix.nextSteps,
      label: 'Next steps',
      kind: 'rich',
      where: `Closing guidance on the ${prefix.contextLabel} report`,
      interpolates: true,
    },
  ];

  if (prefix.end) {
    fields.splice(1, 0, {
      key: prefix.end,
      label: 'End paragraph',
      kind: 'rich',
      where: `Closing paragraph on the ${prefix.contextLabel} report`,
      interpolates: true,
    });
  }

  return fields;
}

export const SECTION_COPY_FIELDS: Partial<Record<ContentSection, CopyFieldDef[]>> = {
  landing: LANDING_FIELDS,
  personal: reportFields({
    intro: 'personalIntroParagraph',
    end: 'personalEndParagraph',
    heading: 'personalReportHeading',
    graphic: 'personalGraphicHeading',
    detail: 'personalReportDetailHeading',
    howTo: 'reportHowToIndividual',
    nextSteps: 'reportNextStepsIndividual',
    contextLabel: 'personal',
  }),
  team: reportFields({
    intro: 'teamIntroParagraph',
    end: 'teamEndParagraph',
    heading: 'teamReportHeading',
    graphic: 'teamGraphicHeading',
    detail: 'teamReportDetailHeading',
    howTo: 'reportHowToTeam',
    nextSteps: 'reportNextStepsTeam',
    contextLabel: 'team',
  }),
  leader: reportFields({
    intro: 'leaderteamIntroParagraph',
    heading: 'leaderteamReportHeading',
    graphic: 'leaderteamGraphicHeading',
    detail: 'leaderteamReportDetailHeading',
    howTo: 'reportHowToLeaderteam',
    nextSteps: 'reportNextStepsLeaderteam',
    contextLabel: 'leadership team',
  }),
  company: reportFields({
    intro: 'companyIntroParagraph',
    end: 'companyEndParagraph',
    heading: 'companyReportHeading',
    graphic: 'companyGraphicHeading',
    detail: 'companyReportDetailHeading',
    howTo: 'reportHowToCompany',
    nextSteps: 'reportNextStepsCompany',
    contextLabel: 'company',
  }),
};

/** All questionnaire text keys (for search indexing). */
export function allQuestionnaireCopyKeys(): string[] {
  const keys = new Set<string>();
  for (const fields of Object.values(SECTION_COPY_FIELDS)) {
    for (const f of fields ?? []) keys.add(f.key);
  }
  return [...keys];
}

export function isContentSection(value: string | null): value is ContentSection {
  return CONTENT_SECTIONS.some((s) => s.id === value);
}
