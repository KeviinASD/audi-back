import { ConfigService, registerAs } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

export default registerAs("database", () => ({
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || "hospital",
    password: process.env.DATABASE_PASSWORD || "root",
    database: process.env.DATABASE_NAME || "postgres",
    autoLoadEntities: true,
    synchronize: true,
}));
/* 
Type '{ type: string; host: string; port: number; username: string; password: string; database: string; autoLoadEntities: boolean; synchronize: boolean; }
*/