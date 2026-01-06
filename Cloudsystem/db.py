import sqlite3
import os
import json
from flask import g

DB_FILE = "ontology_db.sqlite"

def get_db_connection():
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def execute_query(query, params=(), fetch_one=False, fetch_all=False, commit=False):
    conn = get_db_connection()
    if not conn:
        return None, "Database connection failed"
    
    try:
        # SQLite uses ? placeholders, Postgres uses %s
        # Safely convert %s placeholders to ? for SQLite
        # Only replace %s that are actual placeholders (not in strings/comments)
        # Count the number of %s placeholders to ensure we have matching params
        placeholder_count = query.count('%s')
        if placeholder_count > 0:
            # Validate that we have the right number of parameters
            if len(params) != placeholder_count:
                return None, f"Parameter count mismatch: query has {placeholder_count} placeholders but {len(params)} parameters provided"
            # Replace %s with ? for SQLite
            query = query.replace('%s', '?')
        
        cur = conn.cursor()
        cur.execute(query, params)
        
        result = None
        if commit:
            conn.commit()
            if cur.lastrowid:
                # Return ID if insert? 
                # SQLite doesn't return * like Postgres RETURNING
                pass
        
        if fetch_one:
            row = cur.fetchone()
            if row:
                result = dict(row)
            else:
                result = None
        elif fetch_all:
            rows = cur.fetchall()
            if rows:
                result = [dict(row) for row in rows]
            else:
                result = []
        elif commit:
            result = {"status": "success", "lastrowid": cur.lastrowid}

        return result, None
                
    except Exception as e:
        print(f"Query Error: {e}")
        return None, str(e)
    finally:
        if conn:
            conn.close()

def init_db():
    """Initialize database with schema"""
    if os.path.exists(DB_FILE):
        print("Database already exists.")
        # return # Uncomment to prevent overwrite if desired, but for dev we might check tables
    
    conn = get_db_connection()
    if not conn:
        return

    try:
        with open('db_schema.sql', 'r') as f:
            schema = f.read()
        
        cur = conn.cursor()
        cur.executescript(schema)
        conn.commit()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Schema initialization failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
