import express, {Express} from "express";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { AuthorsController } from "../controllers/AuthorsController";
const authorsController = new AuthorsController();
const router = express.Router();

router.get("/", ErrorHandler.handleErrors(authorsController.getAuthors));
router.get("/:id", ErrorHandler.handleErrors(authorsController.getAuthor))

export default router;