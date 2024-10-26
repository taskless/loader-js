function get(t, ...)
  local v = t;

  -- loop over ... drilling down to the prop
  for _, x in ipairs({...}) do
    if v == nil then
      return nil
    end
    v = v[x]
  end

  return v
end
