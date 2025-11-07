-- Remove materialized views from API exposure (Security Fix: SUPA_materialized_view_in_api)
-- These views should only be accessible server-side via service_role, not through the Data API

-- Revoke permissions from anon and authenticated roles on mv_artist_metrics_daily
REVOKE ALL ON public.mv_artist_metrics_daily FROM anon;
REVOKE ALL ON public.mv_artist_metrics_daily FROM authenticated;
GRANT SELECT ON public.mv_artist_metrics_daily TO service_role;

-- Revoke permissions from anon and authenticated roles on mv_snippet_metrics
REVOKE ALL ON public.mv_snippet_metrics FROM anon;
REVOKE ALL ON public.mv_snippet_metrics FROM authenticated;
GRANT SELECT ON public.mv_snippet_metrics TO service_role;

-- Note: mv_creator_metrics_daily was already secured in a previous migration