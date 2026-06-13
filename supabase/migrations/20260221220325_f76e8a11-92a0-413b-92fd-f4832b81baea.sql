
-- Fix security definer view warning: set bars view to use invoker security
ALTER VIEW bars SET (security_invoker = on);
