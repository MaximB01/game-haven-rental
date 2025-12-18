-- Add display_id column to orders table for user-friendly server identification
ALTER TABLE public.orders 
ADD COLUMN display_id TEXT UNIQUE;

-- Create a function to generate the next display_id
CREATE OR REPLACE FUNCTION public.generate_order_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next sequence number based on existing orders
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.orders
  WHERE display_id IS NOT NULL;
  
  -- Generate the display_id in format SRV-XXXXXX
  NEW.display_id := 'SRV-' || LPAD(next_num::TEXT, 6, '0');
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate display_id on insert
CREATE TRIGGER set_order_display_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL)
  EXECUTE FUNCTION public.generate_order_display_id();

-- Update existing orders with display_ids
DO $$
DECLARE
  order_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR order_record IN 
    SELECT id FROM public.orders 
    WHERE display_id IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.orders 
    SET display_id = 'SRV-' || LPAD(counter::TEXT, 6, '0')
    WHERE id = order_record.id;
    counter := counter + 1;
  END LOOP;
END $$;