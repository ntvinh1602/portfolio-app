--create view flight.lifetime_stats with (security_invoker = on) as
with visited_airports as (
    select user_id, departure_airport_id as airport_id
    from flight.flights

    union

    select user_id, arrival_airport_id
    from flight.flights
)
select
    f.user_id,
    f.flights_count,
    count(distinct va.airport_id) as airports_count,
    count(distinct a.country) as country_count,
    f.airframe_count,
    f.total_distance,
    f.total_duration
from (
    select
        user_id,
        count(*) as flights_count,
        count(distinct aircraft_model) as airframe_count,
        sum(distance_km) as total_distance,
        round(
            extract(
                epoch from sum(arrival_time - departure_time)
            ) / 3600,
            1
        ) || ' hours' as total_duration
    from flight.flights_readable
    group by user_id
) f
left join visited_airports va
    on va.user_id = f.user_id
left join flight.airports a
    on a.id = va.airport_id
group by
    f.user_id,
    f.flights_count,
    f.airframe_count,
    f.total_distance,
    f.total_duration;