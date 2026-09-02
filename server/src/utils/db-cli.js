const readline = require('readline');
const { db, dbPath } = require('../config/db');

function listTables() {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `).all();

  console.log('\n📦 Database Tables:');
  console.log('----------------------------------------------------');
  
  const summary = tables.map(t => {
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
    return {
      'Table Name': t.name,
      'Total Records': countRow ? countRow.count : 0
    };
  });

  console.table(summary);
  console.log('----------------------------------------------------\n');
}

function showSchema(tableName) {
  const schema = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name = ?;
  `).get(tableName);

  if (schema && schema.sql) {
    console.log(`\n📋 Schema for table "${tableName}":\n`);
    console.log(schema.sql);
    console.log('');
  } else {
    console.log(`❌ Table "${tableName}" not found.\n`);
  }
}

function runQuery(sql) {
  const trimmed = sql.trim().replace(/;+$/, '');
  if (!trimmed) return;

  const lower = trimmed.toLowerCase();

  if (lower === '.tables' || lower === 'tables' || lower === '\\dt') {
    listTables();
    return;
  }

  if (lower.startsWith('.schema ') || lower.startsWith('schema ')) {
    const table = trimmed.split(' ')[1];
    showSchema(table);
    return;
  }

  try {
    const startTime = Date.now();
    if (lower.startsWith('select') || lower.startsWith('pragma') || lower.startsWith('explain')) {
      const rows = db.prepare(trimmed).all();
      const elapsed = Date.now() - startTime;
      console.log(`\n📊 Query Results (${rows.length} row${rows.length === 1 ? '' : 's'}, ${elapsed}ms):`);
      if (rows.length > 0) {
        console.table(rows);
      } else {
        console.log('(0 rows returned)\n');
      }
    } else {
      const result = db.prepare(trimmed).run();
      const elapsed = Date.now() - startTime;
      console.log(`\n✅ Query executed successfully in ${elapsed}ms:`, result, '\n');
    }
  } catch (err) {
    console.error(`\n❌ SQL Error: ${err.message}\n`);
  }
}

// 1. If query argument provided via CLI (e.g. node db-cli.js "SELECT * FROM users")
const cliQuery = process.argv.slice(2).join(' ');
if (cliQuery) {
  runQuery(cliQuery);
  process.exit(0);
}

// 2. Interactive SQL Shell
console.log('\n======================================================');
console.log('🗄️  LocalForVocal SQLite Database Terminal');
console.log(`📁 File: ${dbPath}`);
console.log('======================================================');
console.log('Commands:');
console.log(' • Type any SQL query (e.g. SELECT * FROM users;)');
console.log(' • .tables          (List all tables and record counts)');
console.log(' • .schema <table > (View table creation schema)');
console.log(' • exit or quit     (Exit database shell)');
console.log('======================================================');

listTables();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'sqlite> '
});

rl.prompt();

rl.on('line', (line) => {
  const input = line.trim();
  if (input === 'exit' || input === 'quit' || input === '.exit' || input === '.quit') {
    rl.close();
    return;
  }

  runQuery(input);
  rl.prompt();
});

rl.on('close', () => {
  console.log('\nGoodbye! 👋\n');
  process.exit(0);
});
