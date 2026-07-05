const express = require("express");
const app = express();
app.use(express.json());
const cors = require('cors'); 
app.use(cors());

const fs = require("fs");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, "./data/profile_pics");
    },

    filename: function(req, file, cb){

        const fileName =
            req.body.email
            .replaceAll(".", "_")
            .replaceAll("@", "_")
            + path.extname(file.originalname);

        cb(null, fileName);
    }

});

const upload = multer({ storage: storage });

app.post("/signup", upload.single("profile_pic"), function(req, res){
    
    const curentUser = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        channelName: req.body.channelName
    }
    

    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));

    // console.log(req.body);
    console.log(curentUser);
    for(let i=0; i<users.length; i++){
        if(users[i].email === curentUser.email){
            res.send("User already exists");
            return;
        }
    }

    users.push(curentUser);
    fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));


    res.send("Signup successful");
})


function giveCurrentUser(req, res, next){
    let currentUser = null;
    const email = req.body.email;
    const password = req.body.password;
    console.log(email, "\n", password);
    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));

    for(let i=0; i<users.length; i++){
        if(users[i].email === email){
            if(users[i].password === password){
                req.currentUser = users[i];
                return next();
            }
            else return res.send("Invalid password");
        }
    }
    return res.send("User not found");
}


app.post("/login", upload.none(), giveCurrentUser, function(req, res){
    res.send("Login successful");
});


app.post("/upload", upload.fields([{ name : "video", maxCount: 1 }, { name : "thumbnail", maxCount: 1 }]),giveCurrentUser,  function(req, res){
     
});


app.listen(3000);