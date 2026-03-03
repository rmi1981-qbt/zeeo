import psycopg2

DATABASE_URL = "postgresql://postgres.ppqmjtxsqnlmcdgwshgq:%405MBEtwqP2T%40S5h@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

def check():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        select id, email, created_at, raw_app_meta_data 
        from auth.users 
        where email ilike '%rmi1981%';
    """)
    users = cur.fetchall()
    print(f'Users found: {len(users)}')
    for u in users:
        print(f' - ID: {u[0]} | Email: {u[1]} | Metadata: {u[3]}')

    conn.close()

if __name__ == '__main__':
    check()
