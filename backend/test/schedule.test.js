import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceNextRunAt,
  createSchedulePreview,
  getCronExpression,
  getFirstRunAt,
} from "@cron-dashboard/shared";

test("generates a conventional cron preview for clean minute intervals", () => {
  assert.equal(getCronExpression("Minutes", 5), "*/5 * * * *");
});

test("falls back to the polling expression for intervals cron cannot represent cleanly", () => {
  assert.equal(getCronExpression("Weeks", 2), "* * * * *");
  assert.equal(getCronExpression("Minutes", 7), "* * * * *");
});

test("first run happens after the selected interval from the anchor time", () => {
  const anchorAt = new Date("2026-04-19T10:00:00.000Z");
  const nextRunAt = getFirstRunAt(anchorAt, "Hours", 2);

  assert.equal(nextRunAt.toISOString(), "2026-04-19T12:00:00.000Z");
});

test("advances overdue next run timestamps until they are in the future", () => {
  const nextRunAt = advanceNextRunAt(
    new Date("2026-04-19T10:00:00.000Z"),
    "Minutes",
    5,
    new Date("2026-04-19T10:11:00.000Z"),
  );

  assert.equal(nextRunAt.toISOString(), "2026-04-19T10:15:00.000Z");
});

test("preview returns human schedule text and next run", () => {
  const preview = createSchedulePreview({
    frequencyType: "Days",
    intervalNumber: 1,
    anchorAt: new Date("2026-04-19T10:00:00.000Z"),
  });

  assert.equal(preview.humanReadable, "Every day");
  assert.equal(preview.nextRunAt.toISOString(), "2026-04-20T10:00:00.000Z");
});
