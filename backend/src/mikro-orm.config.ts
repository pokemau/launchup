import { defineConfig } from '@mikro-orm/postgresql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { config } from 'dotenv';

config();

const createConfig = () => {
  return defineConfig({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    entities: ['./dist/**/*.entity.js'],
    entitiesTs: ['./src/**/*.entity.ts'],
    debug: true,
    driver: PostgreSqlDriver,
    driverOptions: {
      connection: {
        // ssl: { rejectUnauthorized: false },
      },
    },
  });
};

export default createConfig();
