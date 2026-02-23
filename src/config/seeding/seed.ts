import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'root',
  database: process.env.DATABASE_NAME || 'postgres',
  synchronize: false,
});

async function seed() {
  console.log('🔌 Connecting to database...');
  await AppDataSource.initialize();
  console.log('✅ Connected to database');

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    // Check if user already exists
    const existingUser = await queryRunner.query(
      `SELECT * FROM "user" WHERE email = $1`,
      ['admin@auditoria.com'],
    );

    if (existingUser.length > 0) {
      console.log('⚠️  Admin user already exists, skipping...');
    } else {
      const hashedPassword = bcrypt.hashSync('admin123', 10);

      await queryRunner.query(
        `INSERT INTO "user" (username, email, password, "roleTier") VALUES ($1, $2, $3, $4)`,
        ['Admin', 'admin@auditoria.com', hashedPassword, 'ADMIN'],
      );

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@auditoria.com');
      console.log('🔑 Password: admin123');
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

seed();
