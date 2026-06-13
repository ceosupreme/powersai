-- Fix Toast restaurant GUIDs based on authoritative /era/v1/restaurants-information lookup.
-- Previously Waterfront was assigned d55e89ca-... which Toast confirms is Werewolf's GUID.
-- Waterfront's real GUID is 0e8437d5-2642-4e6d-9bb9-fad109835e1a.

UPDATE public.venues
SET toast_restaurant_guid = '0e8437d5-2642-4e6d-9bb9-fad109835e1a',
    toast_api_enabled = true
WHERE id = '71644cb9-8605-418b-89b2-110de1247145'; -- Waterfront Bar & Grill

UPDATE public.venues
SET toast_restaurant_guid = 'd55e89ca-cc40-43a6-a946-814ae6f1890f',
    toast_api_enabled = true
WHERE id = '79f60e97-e826-42e9-a8ee-5f932d9c3f03'; -- Werewolf
