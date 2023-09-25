import * as dotenv from "dotenv";
import "reflect-metadata";
import app from './app';
import { AppDataSource } from "./database/data-source";

dotenv.config();

const PORT = process.env.PORT || 3000

AppDataSource.initialize().then(async ()=> {
   console.log("Database connected successfully!")
})
.catch((err) => console.log(err))

app.listen(PORT, () => {
   console.log(`App running on port ${PORT}`);
});