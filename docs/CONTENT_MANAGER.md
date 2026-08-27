# Content Manager guide

How to edit questionnaire and report wording in the Growth Predictor **admin console**, without needing a developer.

**Admin URL (production):** https://admin-production-82c8.up.railway.app  
**Main app (to preview):** https://web-production-aae47.up.railway.app  

You need a **Content Manager** (or System Admin) account. After sign-in you land on **Content**. You will not see Companies & users — that is for System Admins only.

---

## What you can edit

Everything that is **product copy stored in the catalog** for the questionnaires:

| Section | What it controls |
|---------|------------------|
| Questionnaire landing | Name and intro on the start screen before someone begins |
| Personal / Team / Leadership team / Company report | Headings, intros, how-to text, next steps, end copy for that report type |
| Report groups | Titles like Adapt / Innovate (or Growth) / Execute and their short descriptions |
| Elements & questions | Element names and paragraphs; question prompts and concepts |
| Feedback phrases | Words substituted into report paragraphs by score band (level, verb, adjective, focus) |
| Scoring (advanced) | Numeric weighting tables — leave alone unless you know scoring |

You do **not** edit company names, user accounts, or people’s personal notes here.

---

## Everyday workflow

1. Sign in at the admin URL.
2. Choose a **questionnaire** card (e.g. Growth Predictor Roadmap or Leadership Effectiveness).
3. Use the left list **Where it appears** to open the right section.
4. Edit the field. Each card shows **Where this appears** so you know what the user sees.
5. Click **Save changes** (or **Save** / **Save group** on that panel).
6. Check the main app if you want a visual confirm. New questionnaire sessions and **newly compiled** reports pick up your wording.

### Find copy quickly

Use the search box above the sections, type a phrase you recognise, press **Search**, then click a result. It opens the matching section (and highlights the field when it can).

---

## Tips by section

### Landing
- **Questionnaire name** — shown in the selector list.
- **Landing intro** — rich text at the top of the landing card (headings, lists, bold, etc.).

### Report sections (Personal, Team, Leadership team, Company)
- Edit one report type at a time.
- Placeholders you may use in some fields: `{{user_name}}`, `{{report_date}}`, `{{pronoun}}`, `{{em_score}}`, `{{gp_score}}`, `{{target_score}}`. Leave them as written (including the braces) if you want personalised values.

### Report groups
- Three groups per questionnaire (1–3). Titles appear as section headers in reports.
- Leadership Effectiveness uses **Growth** for group 2 instead of Innovate — that is intentional and editable here.

### Elements & questions
- Expand a group → click an **element** or a **question** to open the editor.
- **Paragraph** text may include `**level**`, `**verb**`, `**adjective**`, `**focus**` — those are replaced automatically from Feedback phrases based on the person’s score. Do not remove the asterisks if you still want that behaviour.
- Fields marked **Not currently shown in the live app** (e.g. paragraph 2) are stored for later use; changing them will not change what users see today.
- **CEO question labels** are prompts for Q1/Q2 on each capability in report details. See the web [Roadmap notes user guide](../../certify-growth-gp-web/docs/ROADMAP_NOTES.md).

### Feedback phrases
- Shared across **all** questionnaires.
- Each row is a score range plus the four phrases used in element paragraphs.

### Scoring (advanced)
- Only change if instructed. Wrong numbers change how scores are calculated, not just wording.

---

## Important: when changes show up

- **Questionnaire screens** — usually immediately after save (refresh the main app if needed).
- **Reports already generated** — keep the **old** wording until a System Admin **recompiles** that report, or until the person completes a **new** submission and a new report is built.
- **CEO question labels** — these are **prompts** for company notes on each capability in report details, not the note text itself. Editing a label does not change what someone already wrote. New prompt wording shows on reports after recompile / new completion. **Note bodies** (what the CEO, team leader, or individual saves) update live for everyone—no recompile.

If a client says “I changed the text but my old report looks the same,” that is expected for report copy until recompile / new completion—not for saved roadmap notes.

**Deploys do not reset your CMS edits.** Production services never run database seed. Catalog wording you save here stays in the live database.

---

## Rich text editor

Long fields use a visual editor (bold, lists, links, alignment). Prefer that over pasting raw HTML. Short titles and feedback words are plain text boxes.

---

## What to ask a developer for

- Changing button labels or navigation chrome in the main app (not in this CMS).
- Turning on unused fields (`paragraph2`) in the live reports. CEO question labels are prompts for Q1/Q2 on each capability in report details (saved notes are live and separate).
- Likert scale labels (Never → Always) or score-band colour legends.
- Access for new Content Managers (a System Admin assigns the Content Manager role).

---

## Bookmarkable links (optional)

You can share or bookmark a deep link, for example:

`https://admin-production-82c8.up.railway.app/?tab=content&questionnaire=1&section=personal`

Sections: `landing`, `personal`, `team`, `leader`, `company`, `groups`, `elements`, `feedback`, `scoring`.
