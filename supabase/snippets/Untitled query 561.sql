         SELECT CURRENT_DATE AS today,
            (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date AS start_of_year,
            (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date AS start_of_month,
            '2000-01-01'::date AS start_of_all