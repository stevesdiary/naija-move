import express from "express";
import { AuthorsControlller } from "../controllers/AuthorsController";
const authorsControlller = new AuthorsControlller();
const router = express.Router();

router.get("/", authorsControlller.getAuthors);

export default router;