-- ============================================================
-- Backup semanal automático del lado del servidor
-- No depende de que alguien abra la app.
--
-- Antes de ejecutar: habilitar la extensión pg_cron en
-- Supabase Dashboard -> Database -> Extensions -> pg_cron
-- (o Integrations -> Cron).
-- ============================================================

create extension if not exists pg_cron;

create or replace function public.create_weekly_backup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text;
  v_players jsonb;
  v_matches jsonb;
begin
  -- Misma clave que usa la app: el miércoles de la semana actual (UTC).
  v_week := to_char(
    (date_trunc('week', (now() at time zone 'UTC'))::date + 2),
    'YYYY-MM-DD'
  );

  select coalesce(jsonb_agg(data order by id), '[]'::jsonb)
    into v_players
    from public.players;

  select coalesce(jsonb_agg(data order by id), '[]'::jsonb)
    into v_matches
    from public.matches;

  insert into public.backups (id, data)
  values (
    v_week,
    jsonb_build_object(
      'week', v_week,
      'ts', (extract(epoch from now()) * 1000)::bigint,
      'kind', 'auto',
      'players', v_players,
      'matches', v_matches
    )
  )
  on conflict (id) do update
    set data = excluded.data,
        updated_at = now();

  -- Conservar solo las últimas 8 semanas.
  delete from public.backups
  where id not in (
    select id from public.backups order by id desc limit 8
  );
end;
$$;

-- Solo el cron (postgres) puede ejecutarla.
revoke all on function public.create_weekly_backup() from public;
revoke all on function public.create_weekly_backup() from anon, authenticated;

-- Reemplazar el job si ya existía.
select cron.unschedule('piel-morena-fc-weekly-backup')
where exists (
  select 1 from cron.job where jobname = 'piel-morena-fc-weekly-backup'
);

-- Miércoles 03:00 UTC = miércoles 00:00 en Argentina.
select cron.schedule(
  'piel-morena-fc-weekly-backup',
  '0 3 * * 3',
  $$select public.create_weekly_backup();$$
);

-- Verificación
select jobid, jobname, schedule, active
from cron.job
where jobname = 'piel-morena-fc-weekly-backup';
