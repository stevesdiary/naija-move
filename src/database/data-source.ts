import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
dotenv.config()

export const AppDataSource = new DataSource({
   type: "mysql",
   host: process.env.DB_HOST || "127.0.0.1",
   port: Number(process.env.DB_PORT) || 3360,
   username: process.env.DB_USERNAME || "root",
   password: process.env.DB_PASSWORD || "admin",
   database: process.env.DB_DATABASE || "type-orm",
   logging: true,
   synchronize: false,
   entities: [],
   subscribers: []
})