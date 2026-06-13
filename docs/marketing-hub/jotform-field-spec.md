# JotForm → Asana → BarPulse field spec

GMs and staff create marketing efforts from inside Asana via an embedded JotForm. JotForm's native Asana integration creates the task in the venue's "Marketing Efforts" section; BarPulse picks it up via the section sweep in `marketing-asana-pull` and surfaces it in the Marketing Hub with `origin = manual_external` (and `external_subsource = 'jotform'`).

## Embed convention

Each venue's Asana project page should embed the form with the venue prefilled:

```
https://form.jotform.com/<form-id>?venue_id={venueUuid}&venue_name={Venue+Name}
```

`venue_id` and `venue_name` are JotForm hidden fields populated from URL params.

## Field map

| JotForm field             | JotForm type        | Required | → Asana                                   | BarPulse `Campaign` field |
|---------------------------|---------------------|----------|-------------------------------------------|---------------------------|
| Title                     | Short text          | ✅       | Task name                                  | `title`                   |
| Description               | Long text           | ✅       | Task notes                                 | `description`             |
| Objective                 | Long text           | ✅       | Notes (appended)                           | `objective`               |
| Effort Type               | Dropdown            | ✅       | Custom field `Effort Type` (enum)          | `type`                    |
| Start Date                | Date                | ✅       | `start_on`                                 | `startDate`               |
| End Date                  | Date                | ✅       | `due_on`                                   | `endDate`                 |
| Start Time                | Time                |          | Notes header                               | `startTime`               |
| End Time                  | Time                |          | Notes header                               | `endTime`                 |
| Recurrence                | Dropdown            |          | Custom field `Recurrence` (enum)           | `recurrence`              |
| Channels                  | Checkbox group      |          | Notes (bullet list)                        | `channels`                |
| Target Audience           | Short text          |          | Notes                                       | `targetAudience`          |
| Brand Partner             | Short text          |          | Custom field `Brand Partner` (text)        | `brandPartner`            |
| Partner Contribution ($)  | Number              |          | Notes                                       | `brandPartnerContribution`|
| Budget ($)                | Number              |          | Custom field `Budget / Cost` (currency)    | `budget`                  |
| Expected Guest Count      | Number              |          | Custom field `Expected Guest Count`        | `expectedGuestCount`      |
| Expected Revenue ($)      | Number              |          | Custom field `Expected Revenue Impact`     | `expectedRevenueImpact`   |
| Toast Promo Code          | Short text          |          | Custom field `Linked Toast Discount...`    | `linkedToastPromoCode`    |
| Linked Menu Items         | Short text (CSV)    |          | Custom field `Linked Menu Items`           | `linkedMenuItems`         |
| Success Metric            | Short text          |          | Notes                                       | `successMetric`           |
| Assigned to (email)       | Email               |          | Asana assignee                             | `assignedTo`              |
| Internal notes            | Long text           |          | Notes                                       | `internalNotes`           |
| Attachments               | File upload (≤10MB) |          | Asana task attachments                     | `attachments`             |
| **Hidden:** venue_id      | Hidden              | ✅       | _(routed to correct project)_              | `venueId`                 |
| **Hidden:** source        | Hidden = `jotform`  | ✅       | First line of notes: `[source:jotform]`    | `externalSubsource`       |

## Conditional logic

- **Recurrence = Weekly/Biweekly/Monthly** → reveal "Day(s) of week" multi-select (stored in notes).
- **Effort Type = Brand Partnership** → reveal Brand Partner + Partner Contribution fields.
- **Effort Type = Event** → reveal Start Time / End Time as required.

## Asana routing

JotForm's Asana integration must be configured per venue:

- **Workspace:** the venue's Asana workspace
- **Project:** the venue's `asana_project_gid` (from `venue_execution_adapters`)
- **Section:** the venue's `asana_section_gid` (Marketing Efforts)
- **Custom field map:** field GIDs from `venue_execution_adapters.asana_custom_field_map`

## Ingestion

Once the task exists in Asana with the `[source:jotform]` token, `marketing-asana-pull` (sweep mode) detects it, creates a `marketing_campaigns` row with `origin='manual_external'`, `external_subsource='jotform'`, and writes back a `BarPulse Sync ID` custom field so subsequent sweeps recognize the link.

If required fields (effort_type, start_on, due_on) are missing on the Asana task, the row is still created with `needs_details=true` and `missing_fields` populated; the Marketing Hub surfaces a "Needs details" banner with a "Fill in BarPulse" CTA.

## File size limit

Per-attachment size is capped at **10MB** (enforced by `marketing-asana-push`). JotForm's file upload field should set the same limit so users get a JotForm-side error instead of a silent failure on push.
