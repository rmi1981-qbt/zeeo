import psycopg2
import sys

DATABASE_URL = "postgresql://postgres.ppqmjtxsqnlmcdgwshgq:%405MBEtwqP2T%40S5h@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

def check():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'residents';
    """)
    cols = cur.fetchall()
    print("Table 'residents' columns:")
    for c in cols:
        print(f" - {c[0]}: {c[1]}")

    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'units';
    """)
    cols = cur.fetchall()
    print("\nTable 'units' columns:")
    for c in cols:
        print(f" - {c[0]}: {c[1]}")

    conn.close()

if __name__ == '__main__':
    check()
