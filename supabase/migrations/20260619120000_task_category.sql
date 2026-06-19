alter table public.tasks
add column category text not null default 'personal'
check (category in ('personal', 'work'));
