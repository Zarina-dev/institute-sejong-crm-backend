-- One-off cleanup, run ONCE against an existing development database BEFORE
-- starting the backend built from this commit.
--
-- Background: enrollments and course_applications declared two columns per
-- relation — a scalar "courseId"/"studentId" the service wrote to, and a
-- "course_id"/"student_id" foreign key from @JoinColumn that stayed NULL.
-- The entities now bind the foreign key to the "courseId"/"studentId" column.
-- On boot, synchronize will ADD those constraints, which fails if any row
-- points at a course or student that no longer exists (deleting a course
-- never cascaded while the FK was NULL). This removes such rows first and
-- drops the never-used columns.
--
-- Fresh databases need none of this.

BEGIN;

-- Enrollments whose course or student is gone: a place on a deleted course
-- has no meaning, so remove.
DELETE FROM enrollments
WHERE "courseId" NOT IN (SELECT id FROM courses)
   OR "studentId" NOT IN (SELECT id FROM students);

-- Duplicate (student, course) enrollments would violate the new unique
-- constraint; keep the oldest one.
DELETE FROM enrollments e
USING enrollments newer
WHERE e."studentId" = newer."studentId"
  AND e."courseId" = newer."courseId"
  AND e.created_at > newer.created_at;

-- Applications for a deleted course are meaningless; applications from a
-- deleted student keep the row (matches ON DELETE SET NULL).
DELETE FROM course_applications
WHERE "courseId" NOT IN (SELECT id FROM courses);

UPDATE course_applications
SET "studentId" = NULL
WHERE "studentId" IS NOT NULL
  AND "studentId" NOT IN (SELECT id FROM students);

-- The empty snake_case foreign-key columns are no longer mapped; synchronize
-- would drop them anyway, but doing it here keeps the boot deterministic.
ALTER TABLE enrollments         DROP COLUMN IF EXISTS course_id, DROP COLUMN IF EXISTS student_id;
ALTER TABLE course_applications DROP COLUMN IF EXISTS course_id, DROP COLUMN IF EXISTS student_id;

COMMIT;
