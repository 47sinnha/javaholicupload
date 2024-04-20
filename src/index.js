//Acquiring All Dependecies 
require('dotenv').config(); 
const express = require("express");
const app= express();
const path = require("path");
const hbs = require("hbs");
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen'); 
const bcrypt = require('bcryptjs'); 
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const {auth, checkAuth, redirectIfLoggedIn} = require("./app");
const mongoose = require('mongoose'); 







//setting views 
const {SignInUser, SignUpUser} = require("./mongodb"); 
const { register } = require("module");

const templatePath =path.join(__dirname, '../tempelates');

app.use(cookieParser()); 
app.use('/images', express.static('images'));
app.use('/imagess', express.static('imagess')); 
app.use('/questionArraysImages', express.static('questionArraysImages')); 
app.use('/SolutionArrayImages', express.static('SolutionArrayImages')); 
// app.use(redirectIfLoggedIn); 
app.use(express.json());
app.set("view engine", "hbs");
app.set("views", templatePath); 
app.use(express.urlencoded({extended:false})); 


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



//creating token for cookies
// const createToken= async() =>{
    //     const token = await jwt.sign({_id:"65a43a5552146274090cc339"}, "Adityasinhanewswebsitejava",{
        //         expiresIn:"2 seconds"
        //     });
        //     console.log(token); 

//     //After creating token now we will verify the user
//     const userVer= await jwt.verify(token, "Adityasinhanewswebsitejava");
//     console.log(userVer);
// }
// createToken(); 



//Nodemailer Setup
const trasnporter = nodemailer.createTransport({
    service: 'gmail', 
    auth:{
        user: 'javaholicnoreply@gmail.com',
        pass: 'kuuz xvxz txos ljqz'
    }
}); 

//Mailgen Setup
const mailGenerator = new Mailgen({
    theme: 'default',
    product:{
        name: "JAVAHOLIC",
        link: 'http://localhost:5000/'
    }
}); 

//just to check whether secret key is working or not 
// console.log(process.env.SECRET_KEY);

app.get("/", redirectIfLoggedIn,(req,res) => {
    res.render("intro");
});


//In below i have created a cookie geting code in which system check whether the person trying to going on another page is logined or not by verfiying token 
app.get("/secret",auth,(req, res)=>{
    // console.log(`this is the cookie awesome ${req.cookies.jwt}`);
    res.render("secret");
}); 

app.get('/array',auth, (req, res) =>{
    res.render('array');
  });

app.get('/arraysolution', auth, (req, res)=>{
    res.render('arrays'); 
})  

app.get("/logout", auth, async(req, res)=>{
    try{
        //By using below method we are deleting token from the server and also from our database 
        //Another work of this is to logout at only that source in which currently using is trying to logout it will not logout to all devices
        //Below method is called filter array method 
        req.user.tokens = req.user.tokens.filter((currentEle)=>{
            return currentEle.token!=req.token
        })
        //

        res.clearCookie("jwt");
        console.log("logout successfully")
        await req.user.save(); 
        res.render("intro");
    }
    catch(error){
        res.status(500).send(error); 
    }
})

app.get("/home",auth,(req, res)=>{
    res.render("home"); 
});


app.post("/home", async(req, res)=>{
    const action =req.body.action; 

    try{
        if (action === 'login') {
            const { email, password } = req.body;
        
            // Find user by email
            const user = await SignUpUser.findOne({ email });
        
            if (!user) {
                return res.status(401).json({ message: "Invalid Credentials" });
            }
        
            // Compare passwords
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            //Generating Token 
            
            
            const token = await user.generateAuthToken(); 
            
            console.log("the token for login is" + token);

            res.cookie("jwt", token, {
                expires: new Date(Date.now() +  10* 60 * 1000), // 2 minutes
                httpOnly: true
            }); 
            
            
            

            if (isPasswordMatch) {
                return res.render("home");
                
            } else {
                return res.status(401).json({ message: "Invalid Credentials" });
            }
        }
        
        else if(action === 'signup'){
            const {email, username, password, cp} = req.body; 

            const existingEmail = await SignUpUser.findOne({email});
            const existingUsername = await SignUpUser.findOne({username}); 

            if(existingEmail || existingUsername){
                const errors = {}; 

                if(existingEmail){
                    return res.status(400).json({message:"Email Already Exists"}); 
                }

                if(existingUsername){
                    return res.status(400).json({message: "Username Already Exists"});
                }
                return res.status(400).json({errors}); 
            }

            //password hashing before saving user information 
            //This thing is called middleware 
            //Now we will use another middleware that is jwt token and cookies 
            const newUser = new SignUpUser({email, username, password, cp}); 
            console.log("the success part" + newUser);
        
            const token = await newUser.generateAuthToken();
            console.log("the token part" + token);
            //Storing token in cookies 
            //Basic Thing sabout cookies 
            // The res.cookies() function is used to set the cookies name to value. 
            //The value parameter may be a string or object converted to json.
            //Syntax:- 
            // res.cookies(name, value, [options])
            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 10 * 60 * 1000), // 2 minutes
                httpOnly: true
            });
            console.log(token);
            
            

                    //In above we have created a cookie named jwt to hold a token during sign up which have a optional property expires.





            //Insert the new user
            await newUser.save(); 
            //Send Welcome Email
            const emailTemplate = mailGenerator.generate({
                body:{
                    name: username,
                    intro: `Welcome to JAVAHOLIC, ${username}! Thank You For Sign-In Up`, 
                    action:{
                        instructions : 'Click the button below to get started:',
                        button:{
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
        }
        else{
            return res.status(400).send("Invalid Action");
        }
    }
    catch(error){
        console.error(error);
        return res.status(500).send("Error processing the request");
    }
});














connectDB().then(()=>{

    app.listen(5000, () => {
        console.log("Server running on port 5000");
    });  
}); 