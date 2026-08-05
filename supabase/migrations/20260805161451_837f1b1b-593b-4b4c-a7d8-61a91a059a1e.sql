create table if not exists public.site_announcements (
    id uuid primary key default gen_random_uuid(),
    content text not null,
    link_url text,
    bg_color text,
    text_color text,
    is_active boolean default true,
    created_at timestamptz default now()
);

grant select on public.site_announcements to anon, authenticated;
grant all on public.site_announcements to service_role;

alter table public.site_announcements enable row level security;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role::text = _role
  )
$$;

drop policy if exists "Anyone can view active announcements" on public.site_announcements;
create policy "Anyone can view active announcements"
on public.site_announcements for select
to public
using (is_active = true);

drop policy if exists "Admins can manage site announcements" on public.site_announcements;
create policy "Admins can manage site announcements"
on public.site_announcements for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

insert into public.site_announcements (content, bg_color, text_color)
values ('10 faiz endirim kompaniyası! kupon kodu: FURSET10', '#ff0055', '#ffffff');