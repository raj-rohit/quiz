-- Nations machinery (2026-07-11 spec §Sub-project 2). Run via management API / SQL editor.
alter table quiz_brands add column if not exists market text not null default 'nl';
create index if not exists quiz_brands_market_idx on quiz_brands (market, pack_id);

alter table packs add column if not exists markets text[];  -- null = all markets

alter table app_config add column if not exists markets jsonb
  default '[{"code": "nl", "name": "Nederland"}]'::jsonb;
update app_config set markets = '[{"code": "nl", "name": "Nederland"}]'::jsonb where markets is null;

select column_name, data_type from information_schema.columns
 where table_name in ('quiz_brands', 'packs', 'app_config') order by table_name, ordinal_position;
