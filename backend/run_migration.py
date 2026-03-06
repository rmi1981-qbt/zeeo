import psycopg2
import sys

DATABASE_URL = "postgresql://postgres.ppqmjtxsqnlmcdgwshgq:%405MBEtwqP2T%40S5h@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

def run_migration():
    try:
        with open('mvp2_base_migration.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("Migration executed successfully!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database execution error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_migration()
