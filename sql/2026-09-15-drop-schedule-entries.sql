-- The timetable is now generated from courses.sessions; the standalone table
-- is gone from the entities. TypeORM synchronize never drops tables it no
-- longer knows about, so remove it by hand once on existing databases.
-- Fresh databases need none of this.

DROP TABLE IF EXISTS schedule_entries;

-- courses.schedule (free text) was replaced by courses.sessions (jsonb);
-- synchronize drops the column itself. Nothing to migrate: the old text
-- ("월·수 10:00–11:30") cannot be parsed reliably — re-enter sessions in the
-- course form.
