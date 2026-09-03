const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const localSqlFile = path.join(__dirname, 'resequence.sql');
const remoteSqlFile = '/tmp/resequence.sql';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready, opening SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    sftp.fastPut(localSqlFile, remoteSqlFile, (putErr) => {
      if (putErr) {
        console.error('Upload Error:', putErr);
        conn.end();
        return;
      }
      console.log('Uploaded resequence.sql to VPS successfully!');

      const cmd = `
        mysql -u root -p123456 sniper_car_care < /tmp/resequence.sql
        NEW_ID=$(mysql -u root -p123456 -N -s sniper_car_care -e "SELECT MAX(id) + 1 FROM orders")
        mysql -u root -p123456 sniper_car_care -e "ALTER TABLE orders AUTO_INCREMENT = $NEW_ID;"
        echo "=== AUTO_INCREMENT SET TO $NEW_ID ==="
        echo "=== RESULTING ORDERS (>= 1788) ==="
        mysql -u root -p123456 sniper_car_care -e "SELECT id, customer_id, total, status, payment_status, created_at FROM orders WHERE id >= 1788 ORDER BY id ASC;"
      `;

      conn.exec(cmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec Error:', execErr);
          conn.end();
          return;
        }
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
          console.log('Resequence process finished!');
          conn.end();
        });
      });
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
