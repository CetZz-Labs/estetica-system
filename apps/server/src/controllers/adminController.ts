import { Request, Response } from "express";
import { Admin } from "../models/Admin";

export class AdminController {
    static getAdmin(req: Request, res: Response) {
        return res.json(req.adminInfo);
    }
}