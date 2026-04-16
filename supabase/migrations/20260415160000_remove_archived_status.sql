-- Migration: Remove 'archived' status from tasks
-- Created: 2026-04-15

-- First, convert any archived tasks to done (so we don't lose data)
update public.tasks
set status = 'done'
where status = 'archived';

-- Drop the old constraint and create a new one without 'archived'
alter table public.tasks
drop constraint if exists tasks_status_check;

alter table public.tasks
add constraint tasks_status_check
check (status in ('inbox', 'planned', 'scheduled', 'in_progress', 'done'));
