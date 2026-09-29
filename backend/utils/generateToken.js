const jwt = require("jsonwebtoken");


const generateToken = (userId) => {

  try {

    const token = jwt.sign(
      {
        userId: userId.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );


    return token;


  } catch (error) {

    console.log(
      "Token Generate Error:",
      error.message
    );

    return null;

  }

};


export default generateToken;