-- Create a sequence for ticket display IDs to avoid race conditions
CREATE SEQUENCE IF NOT EXISTS ticket_display_id_seq START WITH 6;

-- Update the function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_ticket_display_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use sequence to avoid race conditions
  NEW.display_id := 'TKT-' || LPAD(nextval('ticket_display_id_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;