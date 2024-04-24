// Acquiring All Dependencies 
import dotenv from 'dotenv';
dotenv.config();
import express from "express";
const app = express();
import path from "path";
import hbs from "hbs";
import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import cookieParser from 'cookie-parser';
import { auth, checkAuth, redirectIfLoggedIn } from "./app";
import mongoose from 'mongoose';

// Setting views 
import { SignInUser, SignUpUser } from "./mongodb";

const templatePath = path.join(__dirname, '../tempelates');

app.use(cookieParser());
app.use('/images', express.static('images'));
app.use('/imagess', express.static('imagess'));
app.use('/questionArraysImages', express.static('questionArraysImages'));
app.use('/SolutionArrayImages', express.static('SolutionArrayImages'));
app.use(express.json());
app.set("view engine", "hbs");
app.set("views", templatePath);
app.use(express.urlencoded({ extended: false }));

mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error("MongoDB URI is not defined in environment variables.");
            process.exit(1);
        }

        const conn = await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

// Nodemailer Setup
const trasnporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'javaholicnoreply@gmail.com',
        pass: 'kuuz xvxz txos ljqz'
    }
});

// Mailgen Setup
const mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        name: "JAVAHOLIC",
        link: 'http://localhost:5000/'
    }
});

app.get("/", redirectIfLoggedIn, (req, res) => {
    res.render("intro");
});

app.get("/test", redirectIfLoggedIn, (req, res) => {
    res.send("all are working fine")
});

app.get("/secret", auth, (req, res) => {
    res.render("secret");
});

app.get('/array', auth, (req, res) => {
    res.render('array');
});

app.get('/arraysolution', auth, (req, res) => {
    res.render('arrays');
});

app.get("/logout", auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((currentEle) => {
            return currentEle.token != req.token;
        });

        res.clearCookie("jwt");
        console.log("logout successfully");
        await req.user.save();
        res.render("intro");
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get("/home", auth, (req, res) => {
    res.render("home");
});

app.post("/home", async (req, res) => {
    const action = req.body.action;

    try {
        if (action === 'login') {
            const { email, password } = req.body;

            const user = await SignUpUser.findOne({ email });

            if (!user) {
                return res.status(401).json({ message: "Invalid Credentials" });
            }

            const isPasswordMatch = await bcrypt.compare(password, user.password);

            const token = await user.generateAuthToken();

            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 10 * 60 * 1000), // 2 minutes
                httpOnly: true
            });

            if (isPasswordMatch) {
                return res.render("home");
            } else {
                return res.status(401).json({ message: "Invalid Credentials" });
            }
        } else if (action === 'signup') {
            const { email, username, password, cp } = req.body;

            const existingEmail = await SignUpUser.findOne({ email });
            const existingUsername = await SignUpUser.findOne({ username });

            if (existingEmail || existingUsername) {
                const errors = {};

                if (existingEmail) {
                    return res.status(400).json({ message: "Email Already Exists" });
                }

                if (existingUsername) {
                    return res.status(400).json({ message: "Username Already Exists" });
                }
                return res.status(400).json({ errors });
            }

            const newUser = new SignUpUser({ email, username, password, cp });

            const token = await newUser.generateAuthToken();

            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 10 * 60 * 1000), // 2 minutes
                httpOnly: true
            });

            await newUser.save();
            const emailTemplate = mailGenerator.generate({
                body: {
                    name: username,
                    intro: `Welcome to JAVAHOLIC, ${username}! Thank You For Sign-In Up`,
                    action: {
                        instructions: 'Click the button below to get started:',
                        button: {
                            color: '#22BC66',
                            text: 'Explore JAVAHOLIC',
                            link: 'http://localhost:5000/',
                        },
                    },
                    outro: `Your login credentials:<br>Email: ${email}<br>Password: ${password}`,
                },
            });

            const mailOptions = {
                from: 'adityakr.sinha2661@gmail.com',
                to: email,
                subject: 'noreply@javaholic',
                html: emailTemplate
            };

            await trasnporter.sendMail(mailOptions);

            return res.render("home");
        } else {
            return res.status(400).send("Invalid Action");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error processing the request");
    }
});

connectDB().then(() => {
    app.listen(5000, () => {
        console.log("Server running on port 5000");
    });
});


export default app
