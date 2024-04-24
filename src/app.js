// auth.js

import jwt from "jsonwebtoken";
import { SignInUser, SignUpUser } from "./mongodb";

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        console.log(`Token: ${token}`);

        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
        console.log("Verified User:", verifyUser);

        const user = await SignUpUser.findOne({ _id: verifyUser._id });
        console.log("User:", user);

        req.token = token;
        req.user = user;

        next();
    } catch (error) {
        res.render("intro");
    }
};

const checkAuth = (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.redirect("/");
        }

        jwt.verify(token, process.env.SECRET_KEY);
        res.redirect("/");
    } catch (error) {
        console.error(error);
        return res.redirect("/");
    }
};

const redirectIfLoggedIn = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (token) {
            jwt.verify(token, process.env.SECRET_KEY);
            return res.render('home');
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error processing the request");
    }
};

export { auth, checkAuth, redirectIfLoggedIn };
