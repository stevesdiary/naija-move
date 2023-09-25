import express, { Express } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import authorsRoute from "./routes/authors"

const app: Express = express();

app.use(cors())
app.use(bodyParser.json());

app.use("/authors", authorsRoute)

app.get('/hello', (req, res, next) => {
   return res.status(200).json({
      message: "Hello world!",
   });
});

export default app;