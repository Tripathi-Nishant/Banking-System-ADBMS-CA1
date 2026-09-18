import os
from pathlib import Path

import oracledb
from dotenv import load_dotenv

# The API is started from the project root (``python -m uvicorn
# backend.app.main:app``), so relying on the process working directory leaves
# the backend/.env file undiscovered.  Anchor configuration to this module
# instead, which also works when Uvicorn is launched from backend/.
load_dotenv(Path(__file__).resolve().parents[1] / '.env')
pool = None
def init_pool():
    global pool
    pool = oracledb.create_pool(user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'), dsn=f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT','1521')}/{os.getenv('DB_SERVICE')}", min=1, max=5, increment=1)
def connection():
    if pool is None: init_pool()
    return pool.acquire()
def rows(cur):
    names=[d[0].lower() for d in cur.description]
    return [dict(zip(names,row)) for row in cur.fetchall()]
