import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import packsRouter from "./packs";
import wordsRouter from "./words";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(packsRouter);
router.use(wordsRouter);

export default router;
