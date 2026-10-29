import "dotenv/config"
import { AppDataSource } from "./data-source.js"

try {
  await AppDataSource.initialize()
  const migrations = await AppDataSource.runMigrations({ transaction: "all" })
  console.log(
    migrations.length
      ? `Applied ${migrations.length} migration(s).`
      : "Database is already up to date.",
  )
  await AppDataSource.destroy()
} catch (error) {
  console.error("Database migration failed.", error)
  process.exitCode = 1
}
