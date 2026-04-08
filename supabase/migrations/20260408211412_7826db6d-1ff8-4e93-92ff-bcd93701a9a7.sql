
CREATE OR REPLACE FUNCTION public.remove_team_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_store_id uuid;
  _member_store_id uuid;
BEGIN
  -- Get caller's store
  SELECT store_id INTO _caller_store_id FROM profiles WHERE id = auth.uid();
  
  -- Get member's store
  SELECT store_id INTO _member_store_id FROM profiles WHERE id = _member_id;
  
  -- Validate same store
  IF _caller_store_id IS NULL OR _member_store_id IS NULL OR _caller_store_id != _member_store_id THEN
    RAISE EXCEPTION 'Membro não pertence à sua loja';
  END IF;
  
  -- Validate caller is owner
  IF NOT has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Apenas administradores podem remover membros';
  END IF;
  
  -- Prevent self-removal
  IF _member_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover sua própria conta';
  END IF;
  
  -- Remove member from store
  UPDATE profiles SET store_id = NULL, updated_at = now() WHERE id = _member_id;
  
  -- Remove their role
  DELETE FROM user_roles WHERE user_id = _member_id;
  
  -- Remove commission settings
  DELETE FROM commission_settings WHERE member_id = _member_id AND store_id = _caller_store_id;
END;
$$;
