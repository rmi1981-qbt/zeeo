import psycopg2
import sys

DATABASE_URL = "postgresql://postgres.ppqmjtxsqnlmcdgwshgq:%405MBEtwqP2T%40S5h@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

def restore_access():
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 1. Look up user by email
        email = 'rmi1981@hotmail.com'
        cur.execute("SELECT id FROM auth.users WHERE email = %s", (email,))
        user_res = cur.fetchone()
        
        if not user_res:
            print("User not found in auth.users.")
            # fallback to profiles
            cur.execute("SELECT id FROM profiles WHERE id in (SELECT id FROM auth.users WHERE email = %s)", (email,))
            profile_res = cur.fetchone()
            if not profile_res:
                print("Could not find user anywhere.")
                return
            user_id = profile_res[0]
        else:
            user_id = user_res[0]
            
        print(f"User ID found: {user_id}")
        
        # 2. Get Condos
        cur.execute("SELECT id, name FROM condominiums")
        condos = cur.fetchall()
        print(f"Found {len(condos)} condominiums")
        
        # 3. Clean and Insert
        cur.execute("DELETE FROM condominium_members WHERE user_id = %s", (user_id,))
        inserted = 0
        for condo in condos:
            condo_id = condo[0]
            cur.execute("""
                INSERT INTO condominium_members (user_id, condominium_id, role, status)
                VALUES (%s, %s, 'admin', 'approved')
            """, (user_id, condo_id))
            inserted += 1
            
        conn.commit()
        print(f"Successfully added {inserted} memberships.")
        
    except Exception as e:
        print("Error connecting to database:", e)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    restore_access()
