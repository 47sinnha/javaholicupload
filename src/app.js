require('dotenv').config(); 
const jwt = require("jsonwebtoken");
const {SignInUser, SignUpUser} = require("./mongodb");

//Verifying user for any page (specific page)
const auth = async (req, res, next)=>{
 try {
    const token = req.cookies.jwt;
    console.log(`here is ${token}`);
    const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
    console.log(verifyUser); 

    const user= await SignUpUser.findOne({_id:verifyUser._id});
    console.log(user);

    req.token = token;
    req.user = user; 


    next(); 
    //without next it won't be proceed
 } catch (error) {
    res.render("intro")
 }
}

//For Session to home page 
// Add this function after the app.get("/default") route
//This will prevent user from sending the link after login to his/her friends when  their friends try to use after login website which was sent by user to friends user friends must have to login 

const checkAuth = (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.redirect("/"); // Redirect to the login page if no token is present
        }

        const verifiedUser = jwt.verify(token, process.env.SECRET_KEY);

        // If the user is authenticated, redirect to the default page
        res.redirect("/");
    } catch (error) {
        console.error(error);
        return res.redirect("/");
    }
};

  
//To redirect directly when there is bymistake close of website and user have token/cookies 
const redirectIfLoggedIn = async (req, res, next) => {
    try {
      // Check if the jwt cookie is present
      const token = req.cookies.jwt;
      if (token) {
        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        // If the token is valid, redirect the user to the homepage
        return res.render('home');
        
      }
      // If there is no token, proceed to the next middleware
      next();
    } catch (error) {
      console.error(error);
      return res.status(500).send("Error processing the request");
    }
  };


 
module.exports = {auth, checkAuth, redirectIfLoggedIn}; 