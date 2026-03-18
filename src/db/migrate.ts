import pool from "./pool";
import fs from "fs";
import path from "path";

async function migrate() {
  // Create a migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Read all .sql files from the migrations folder, sorted by name
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    // Check if this migration has already been run
    const { rows } = await pool.query("SELECT id FROM migrations WHERE name = $1", [file]);
    if (rows.length > 0) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }

    // Run the migration inside a transaction
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`  done: ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`  FAIL: ${file}`, err);
      process.exit(1);
    }
  }

  console.log("Migrations complete.");
  await pool.end();
}

migrate();
