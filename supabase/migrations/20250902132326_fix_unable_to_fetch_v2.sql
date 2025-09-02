alter table public.daily_performance_snapshots
    drop constraint daily_performance_snapshots_pkey;

alter table public.daily_performance_snapshots
    drop column id;

alter table public.daily_performance_snapshots
    add constraint daily_performance_snapshots_pkey primary key (date);
