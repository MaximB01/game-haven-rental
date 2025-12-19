-- Add display_id column to tickets table
ALTER TABLE public.tickets ADD COLUMN display_id text;

-- Create unique index for display_id
CREATE UNIQUE INDEX idx_tickets_display_id ON public.tickets(display_id) WHERE display_id IS NOT NULL;

-- Create function to generate ticket display_id
CREATE OR REPLACE FUNCTION public.generate_ticket_display_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next sequence number based on existing tickets
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tickets
  WHERE display_id IS NOT NULL;
  
  -- Generate the display_id in format TKT-XXXXXX
  NEW.display_id := 'TKT-' || LPAD(next_num::TEXT, 6, '0');
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic display_id generation
CREATE TRIGGER generate_ticket_display_id_trigger
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_display_id();

-- Backfill existing tickets with display_ids
WITH numbered_tickets AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.tickets
  WHERE display_id IS NULL
)
UPDATE public.tickets t
SET display_id = 'TKT-' || LPAD(nt.rn::TEXT, 6, '0')
FROM numbered_tickets nt
WHERE t.id = nt.id;