-- Migration: Remove 'in_progress' status from tasks
-- Created: 2026-06-20
--
-- The Kanban "In Progress" column is gone. A running timer no longer flips a
-- task to 'in_progress'; running state is tracked via the active timer session
-- and shown in a dedicated banner instead. Convert any leftover in_progress
-- rows back to their resting status (mirrors resolveIdleTaskStatus), then drop
-- the value from the status CHECK constraint.

-- First, convert any in_progress tasks back to scheduled/planned (so we don't lose data)
update public.tasks
set status = case when scheduled_block_id is not null then 'scheduled' else 'planned' end
where status = 'in_progress';

-- Drop the old constraint and create a new one without 'in_progress'
alter table public.tasks
drop constraint if exists tasks_status_check;

alter table public.tasks
add constraint tasks_status_check
check (status in ('inbox', 'planned', 'scheduled', 'done'));
