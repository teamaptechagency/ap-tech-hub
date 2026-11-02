-- One-time restart requested for 2 November 2026. Snapshot progress before resetting.
-- Expense records, users, task definitions and assignments are preserved.
  INSERT INTO "WorkStationGrowthArchive" ("id", "reason", "snapshot") SELECT
    'growth-restart-20261102', 'Restart roadmap progress from 2026-11-02 inside Work Station',
    jsonb_build_object(
      'months', COALESCE((SELECT jsonb_agg(t) FROM "GrowthMonth" t), '[]'::jsonb),
      'weeks', COALESCE((SELECT jsonb_agg(t) FROM "GrowthWeek" t), '[]'::jsonb),
      'monthlyTasks', COALESCE((SELECT jsonb_agg(t) FROM "GrowthMonthlyTask" t), '[]'::jsonb),
      'weeklyTemplates', COALESCE((SELECT jsonb_agg(t) FROM "GrowthWeeklyTemplate" t), '[]'::jsonb),
      'tasks', COALESCE((SELECT jsonb_agg(t) FROM "GrowthTask" t), '[]'::jsonb),
      'milestones', COALESCE((SELECT jsonb_agg(t) FROM "GrowthMilestone" t), '[]'::jsonb)
    );
  WITH reset_delta AS (SELECT COALESCE(TIMESTAMP '2026-11-01 18:00:00' - MIN((m->>'startDate')::timestamp), INTERVAL '0') AS delta FROM "WorkStationGrowthArchive" a, jsonb_array_elements(a.snapshot->'months') m WHERE a.id = 'growth-restart-20261102')
  UPDATE "GrowthMonth" SET "startDate" = "startDate" + reset_delta.delta, "endDate" = "endDate" + reset_delta.delta, "completedAt" = NULL, "completedById" = NULL FROM reset_delta;
  WITH reset_delta AS (SELECT COALESCE(TIMESTAMP '2026-11-01 18:00:00' - MIN((m->>'startDate')::timestamp), INTERVAL '0') AS delta FROM "WorkStationGrowthArchive" a, jsonb_array_elements(a.snapshot->'months') m WHERE a.id = 'growth-restart-20261102')
  UPDATE "GrowthWeek" SET "startDate" = "startDate" + reset_delta.delta, "endDate" = "endDate" + reset_delta.delta FROM reset_delta;
  UPDATE "GrowthMonthlyTask" SET "status" = 'PENDING', "completedAt" = NULL, "completedById" = NULL;
  UPDATE "GrowthTask" SET "status" = 'PENDING', "completedAt" = NULL, "completedById" = NULL, "cancelledAt" = NULL, "cancelledById" = NULL, "cancelReason" = NULL;
  WITH reset_delta AS (SELECT COALESCE(TIMESTAMP '2026-11-01 18:00:00' - MIN((m->>'startDate')::timestamp), INTERVAL '0') AS delta FROM "WorkStationGrowthArchive" a, jsonb_array_elements(a.snapshot->'months') m WHERE a.id = 'growth-restart-20261102')
  UPDATE "GrowthMilestone" SET "status" = 'PENDING', "completedAt" = NULL, "deadline" = "deadline" + reset_delta.delta FROM reset_delta;
