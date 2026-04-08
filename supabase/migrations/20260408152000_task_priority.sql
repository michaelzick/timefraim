alter table public.tasks
add column priority text;

update public.tasks
set priority = case status
  when 'inbox' then 'low'
  when 'planned' then 'medium'
  when 'scheduled' then 'high'
  when 'in_progress' then 'urgent'
  when 'done' then 'low'
  when 'archived' then 'low'
  else 'low'
end
where priority is null;

update public.tasks
set status = 'planned'
where status = 'inbox';

alter table public.tasks
alter column priority set default 'low';

alter table public.tasks
alter column priority set not null;

alter table public.tasks
add constraint tasks_priority_check
check (priority in ('low', 'medium', 'high', 'urgent'));
