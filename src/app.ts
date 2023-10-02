import express, { Express, NextFunction, Response, Request } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import authorsRoute from "./routes/authors";
import { EntityNotFoundError } from "typeorm";
import { ResponseUtl } from "./utils/Response";
import { ErrorHandler } from "./middlewares/ErrorHandler";

const app: Express = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
app.use("/authors", authorsRoute);

app.use("*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Invalid route",
    error: String
  });
});

app.use(ErrorHandler.handleErrors);

export default app;
