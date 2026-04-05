create policy "Users can view own reactions" on public.post_reactions
  for select using (auth.uid() = user_id);
