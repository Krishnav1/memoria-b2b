const REACT_APP_SUPABASE_URL = 'https://yyuyacacxjuuvzbuogwb.supabase.co';
const REACT_APP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dXlhY2FjeGp1dXZ6YnVvZ3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjU5MzUsImV4cCI6MjA5MjQ0MTkzNX0.bgT5h1DYus2dtsYdmMxdaFKSnjOlZmW6vc2imMRqQHM';

async function query(table, params = '') {
  const res = await fetch(`${REACT_APP_SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      'apikey': REACT_APP_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${REACT_APP_SUPABASE_ANON_KEY}`,
    }
  });
  return res.json();
}

async function main() {
  console.log('=== Studios ===');
  const studios = await query('studios', '?select=*&limit=3');
  console.log(JSON.stringify(studios, null, 2));

  console.log('\n=== Events ===');
  const events = await query('events', '?select=*&limit=3');
  console.log(JSON.stringify(events, null, 2));

  console.log('\n=== Photos ===');
  const photos = await query('photos', '?select=*&limit=3');
  console.log(JSON.stringify(photos, null, 2));
}

main().catch(console.error);