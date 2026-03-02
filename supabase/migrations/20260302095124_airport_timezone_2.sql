alter table flight.airports
alter column timezone set not null;

alter table flight.airports
add constraint timezone_format_check
check (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$');