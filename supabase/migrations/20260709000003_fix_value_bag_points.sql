-- แก้ value_bag: คะแนน = มูลค่า × 1 (POINTS_PER_BAHT=1) ให้ตรงกับแอป (เดิม × 10 ผิด)
create or replace function value_bag(p_bag_id uuid, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bag mesh_bags%rowtype; v_value numeric; v_points numeric; v_bal numeric;
begin
  if not is_operator() then raise exception 'operator only'; end if;
  select * into v_bag from mesh_bags where id = p_bag_id for update;
  if v_bag.id is null then raise exception 'bag not found'; end if;
  if v_bag.status = 'credited' then raise exception 'bag already credited'; end if;
  select coalesce(sum((it->>'subtotal')::numeric), 0) into v_value from jsonb_array_elements(p_items) it;
  v_points := v_value * 1;
  delete from bag_items where bag_id = p_bag_id;
  insert into bag_items(bag_id, material_id, name, qty, price_per_unit, subtotal)
  select p_bag_id, it->>'material_id', it->>'name', (it->>'qty')::numeric, (it->>'price_per_unit')::numeric, (it->>'subtotal')::numeric
  from jsonb_array_elements(p_items) it;
  update mesh_bags set status = 'credited', value_baht = v_value, points = v_points, credited_at = now() where id = p_bag_id;
  update profiles set points = points + v_points where id = v_bag.user_id returning points into v_bal;
  insert into point_transactions(user_id, type, points, balance_after, note, bag_id)
    values (v_bag.user_id, 'earn', v_points, v_bal, 'ถุง ' || v_bag.qr, p_bag_id);
  return v_points;
end $$;
