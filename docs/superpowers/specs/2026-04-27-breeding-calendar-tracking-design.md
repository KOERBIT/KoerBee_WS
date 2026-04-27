# Zuchtkalender — Tracking & Report Design

**Goal:** Track larvae and queen survival metrics across breeding batch lifecycle, with event-level and batch-level annotations, plus PDF/CSV export.

**Architecture:** Extend BreedingBatch model with numeric fields; add event-level fields for values and comments. Modal-based input at each phase. Report generation combines all data into structured export.

**Tech Stack:** Prisma (schema update), Next.js API routes, React modals, PDF generation library (e.g., jsPDF or pdfkit), CSV serialization

---

## Feature Overview

### **Core Tracking Metrics**

Track four critical numbers across the breeding cycle:

1. **Umgelarvt (Larvae Grafted)** — Entered at batch creation
2. **Angenommen (Accepted at Check)** — Entered when "Stiftkontrolle" event completes (Day 4)
3. **Geschlüpft (Hatched)** — Entered when "Schlupf" event completes (Day 12)
4. **Begattet (Mated)** — Entered when "Begattung" event completes (Day 14)

These form a survival pipeline: `Umgelarvt → Angenommen → Geschlüpft → Begattet`

### **Commenting System**

Two levels of comments:

- **Event Comments** — Per-event notes (e.g., "3 deformiert" at hatch, "1 dead, 2 not mated" at mating)
- **Batch Notes** — Global notes on the entire batch (e.g., "Linie zeigt gute Größe, sehr homogen")

### **Report Export**

Two formats, triggered by "Report exportieren" button:

- **PDF** — Visual summary with survival chart, timeline, all comments, batch notes
- **CSV** — Machine-readable: Event, Date, Value, Comment, Status for spreadsheet analysis

---

## Data Model

### **Schema Changes (Prisma)**

**BreedingBatch** — Add fields:
```
larvaeGrafted: Int?          // Umgelarvt
larvaeAccepted: Int?         // Angenommen bei Stiftkontrolle
queensHatched: Int?          // Geschlüpft
queensMated: Int?            // Begattet
notes: String?               // Batch-level notes
```

**BreedingEvent** — Add fields:
```
eventValue: Int?             // e.g., 38 queens for "hatch" event
eventNotes: String?          // e.g., "3 deformiert"
```

### **Rationale**

- Numbers are optional (`Int?`) because they're filled in at different times
- Batch-level numbers are source-of-truth for the 4 metrics; event fields are complementary detail
- Event fields allow granular comments without cluttering batch

---

## User Workflows

### **1. Create Batch**

1. User goes to "Neue Zuchtlinie"
2. Form includes:
   - Zuchtlinie (select)
   - Mutter-Volk (select)
   - Graft-Datum
   - **NEW:** "Wieviele Larven umgelarvt?" (number input)
   - **NEW:** Batch-Notizen (textarea, optional)
3. Submit → creates batch, immediately shows timeline

### **2. Mark Event Complete + Log Data**

User sees timeline with clickable event buttons.

1. Event comes due (e.g., "Schlupf" on Day 12)
2. User clicks the event button
3. Modal opens: 
   - "Wieviele Königinnen geschlüpft?" (number input, required)
   - Kommentar (textarea, optional)
4. User fills in, clicks "Speichern"
5. Modal closes, event is marked complete (green checkmark), number shown in timeline

### **3. View Batch Summary**

Batch detail page shows:
- Timeline (existing)
- **NEW:** Survival summary below timeline:
  ```
  Umgelarvt: 50 → Angenommen: 48 (96%) → Geschlüpft: 42 (87.5%) → Begattet: 38 (90.5%)
  ```
- All event comments displayed inline with timeline
- Batch notes section at bottom
- "Report exportieren" button

### **4. Export Report**

1. User clicks "Report exportieren"
2. Dialog: "PDF" or "CSV" (or both, back-to-back)
3. Files download

---

## Components & API

### **Frontend Components**

- **EventInputModal** — Modal for "Schlupf" → asks for count + comment
- **BatchSummary** — Shows survival pipeline with percentages
- **ReportExportButton** — Triggers PDF/CSV generation
- **ExistingPhaseTimeline** — Updated to show values and comments from events

### **API Endpoints**

**PATCH `/api/breeding/[lineId]/batches/[batchId]`**
- Update batch fields (includes `larvaeGrafted`, `notes`)

**PATCH `/api/breeding/events/[eventId]`**
- Update event fields (`eventValue`, `eventNotes`)

**GET `/api/breeding/[lineId]/batches/[batchId]/export?format=pdf|csv`**
- Generate report, return file

---

## Report Design

### **PDF Report**

Layout:
```
┌─────────────────────────────────────┐
│ Zuchtkalender Report                │
│ Linie: [Line Name]                  │
│ Graft-Datum: [Date]                 │
└─────────────────────────────────────┘

Überlebenschance:
  50 Larven umgelarvt
  ↓ 96%
  48 angenommen (Stiftkontrolle)
  ↓ 87.5%
  42 geschlüpft
  ↓ 90.5%
  38 begattet

Timeline:
  [Gantt/table with all events, dates, values, comments]

Notizen:
  [All event comments]
  [Batch notes]
```

### **CSV Report**

Columns:
```
Event,Datum,Wert,Typ,Kommentar,Status
Umlarven,2026-04-20,50,Metric,,Completed
Stiftkontrolle,2026-04-24,48,Metric,48 akzeptiert,Completed
Schlupf,2026-05-02,42,Metric,3 deformiert,Completed
Begattung,2026-05-04,38,Metric,38 erfolgreich begattet,Completed
```

---

## Data Flow

1. **Create batch** → Set `larvaeGrafted`
2. **Day 4:** User clicks "Stiftkontrolle" → Modal → Set `eventValue` (48) + `eventNotes` → Auto-updates `larvaeAccepted` field
3. **Day 12:** User clicks "Schlupf" → Modal → Set `eventValue` (42) + `eventNotes` → Auto-updates `queensHatched`
4. **Day 14:** User clicks "Begattung" → Modal → Set `eventValue` (38) + `eventNotes` → Auto-updates `queensMated`
5. **Export:** Gather all fields → generate PDF/CSV with percentages

---

## Error Handling

- All numeric inputs are `Int`, validated on client and server
- CSV export handles missing values gracefully (empty cells)
- PDF generation fails gracefully with user message if library unavailable
- Modals validate that user entered a number before submit

---

## Testing

- Unit tests for percentage calculations (e.g., 48/50 = 96%)
- API tests for PATCH endpoints with various numeric values
- Export tests: verify PDF contains all data, CSV valid format
- UI: modals appear on event click, numbers display in timeline

---

## Success Criteria

- ✅ User can log 4 metrics at different phases
- ✅ Batch and event comments work independently
- ✅ Report shows survival percentages
- ✅ Both PDF and CSV export
- ✅ All existing functionality (timeline, events) unchanged
