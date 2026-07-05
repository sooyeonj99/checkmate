import paramiko
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "101.79.25.139"
USER = "root"
PASSWORD = "F9$GHayU=Td5y"

COMMANDS = """
cd /var/www/checkmate
git pull
cd frontend && npm run build && cd ..
source backend/venv/bin/activate
python3 -c "
import sys, sqlite3
sys.path.insert(0,'/var/www/checkmate/backend')
from app.db.session import engine
from app.db.base import Base
import app.models.user
import app.models.signing
import app.models.user_template
import app.models.team
Base.metadata.create_all(bind=engine)

# ALTER TABLE for new columns (safe - ignores if already exists)
db_path = '/var/www/checkmate/backend/checkmate.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
existing_users = [row[1] for row in cur.execute('PRAGMA table_info(users)').fetchall()]
if 'password_reset_token' not in existing_users:
    cur.execute('ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)')
    print('Added column: users.password_reset_token')
if 'password_reset_token_expires' not in existing_users:
    cur.execute('ALTER TABLE users ADD COLUMN password_reset_token_expires DATETIME')
    print('Added column: users.password_reset_token_expires')
if 'phone_number' not in existing_users:
    cur.execute('ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)')
    print('Added column: users.phone_number')
existing_signing = [row[1] for row in cur.execute('PRAGMA table_info(signing_records)').fetchall()]
if 'user_template_id' not in existing_signing:
    cur.execute('ALTER TABLE signing_records ADD COLUMN user_template_id INTEGER')
    print('Added column: signing_records.user_template_id')
if 'requestee_phone' not in existing_signing:
    cur.execute('ALTER TABLE signing_records ADD COLUMN requestee_phone VARCHAR(20)')
    print('Added column: signing_records.requestee_phone')
existing_saved = [row[1] for row in cur.execute('PRAGMA table_info(saved_contracts)').fetchall()]
if 'expiry_date' not in existing_saved:
    cur.execute('ALTER TABLE saved_contracts ADD COLUMN expiry_date DATETIME')
    print('Added column: saved_contracts.expiry_date')
if 'expiry_notice_days' not in existing_saved:
    cur.execute('ALTER TABLE saved_contracts ADD COLUMN expiry_notice_days INTEGER DEFAULT 7')
    print('Added column: saved_contracts.expiry_notice_days')
conn.commit()
conn.close()
print('DB migration OK')
"
systemctl restart checkmate-backend
sleep 3
systemctl is-active checkmate-backend && echo "SERVICE: RUNNING" || echo "SERVICE: FAILED"
journalctl -u checkmate-backend -n 20 --no-pager
""".strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print(f"Connecting to {HOST}...")
client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
print("Connected!")

transport = client.get_transport()
channel = transport.open_session()
channel.get_pty()
channel.exec_command("bash --login")

channel.send(COMMANDS.replace("\n", "\n") + "\nexit\n")

import time
time.sleep(15)

while channel.recv_ready() or not channel.exit_status_ready():
    if channel.recv_ready():
        output = channel.recv(4096).decode('utf-8', errors='replace')
        print(output, end='')
    if channel.recv_stderr_ready():
        err = channel.recv_stderr(4096).decode('utf-8', errors='replace')
        print(err, end='', file=sys.stderr)
    if channel.exit_status_ready() and not channel.recv_ready():
        break
    time.sleep(0.5)

client.close()
print("\nDone.")
