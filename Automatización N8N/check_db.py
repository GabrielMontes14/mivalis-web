import sqlite3
import json

try:
    c = sqlite3.connect('/app/database_temp.sqlite').cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in c.fetchall()]
    print("Tables:", tables)
    
    # Try execution_entity
    if 'execution_entity' in tables:
        c.execute('SELECT count(*) FROM execution_entity')
        count = c.fetchone()[0]
        print('Total Rows in execution_entity:', count)
        c.execute('SELECT id, workflowId, status, stoppedAt FROM execution_entity ORDER BY id DESC LIMIT 5')
        for row in c.fetchall():
            print(f'Exec ID: {row[0]}, WF: {row[1]}, Status: {row[2]}, StoppedAt: {row[3]}')
            
except Exception as e:
    print('Error:', e)
