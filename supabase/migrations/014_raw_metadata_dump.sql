-- Paste the output here so we can see exactly where the date is stored.

SELECT
  id,
  title,
  due_date,
  metadata
FROM tasks
WHERE title = 'שולחנות עגולים';
