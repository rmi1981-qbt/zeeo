import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppqmjtxsqnlmcdgwshgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcW1qdHhzcW5sbWNkZ3dzaGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDQxODMsImV4cCI6MjA4NDUyMDE4M30.uOQr9UzCM9-KGJKftaVDUg_X8RMTSoDT_UGvBIuFxuY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    const userId = '838f485b-6aba-4cef-9c45-1c0d0cc51acc';

    const { data, error } = await supabase
        .from('condominium_members')
        .select('*, condominiums(*)')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching:', error);
    } else {
        console.log(`Fetched ${data?.length} memberships`);
        if (data && data.length > 0) {
            console.log('First membership:', JSON.stringify(data[0], null, 2));
        }
    }
}

testFetch();
