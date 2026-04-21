CREATE OR REPLACE FUNCTION public.build_location_label(_sector text, _zone text, _level text, _position text, _manual_label text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _manual_label IS NOT NULL AND _manual_label <> '' THEN _manual_label
    ELSE NULLIF(TRIM(CONCAT_WS(' › ', NULLIF(_sector,''), NULLIF(_zone,''), NULLIF(_level,''), NULLIF(_position,''))), '')
  END;
$function$;