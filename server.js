const express = require("express");
const app = express();
app.use(express.json());
const cors = require('cors'); 
app.use(cors());

const fs = require("fs");
const multer = require("multer");
const path = require("path");

const storage_profilePic = multer.diskStorage({

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

const upload_profilePic = multer({ storage: storage_profilePic });

app.post("/signup", upload_profilePic.single("profile_pic"), function(req, res){
    
    const curentUser = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        channelName: req.body.channelName,
        uploadCount: 1
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
    const email = req.headers.email;
    const password = req.headers.password;
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


app.post("/login", giveCurrentUser, function(req, res){
    res.send("Login successful");
});




const storage_upload = multer.diskStorage({
    destination: function(req, file, cb){
        const user = req.currentUser.email.replaceAll(".", "_").replaceAll("@", "_");
        fs.mkdirSync('./uploads/' + user, { recursive: true });
        cb(null, "./uploads/" + user);
    },
    filename: function(req, file, cb){

        const fileName =
            req.currentUser.uploadCount
            + path.extname(file.originalname);

        cb(null, fileName);
    }
});

const upload_upload = multer({ storage: storage_upload });

app.post("/upload", giveCurrentUser, upload_upload.fields([{ name : "video", maxCount: 1 }, { name : "thumbnail", maxCount: 1 }]), function(req, res){
     const video = req.files.video[0];
     const thumbnail = req.files.thumbnail[0];
     const title = req.body.title;
     const description = req.body.description;

     const metaData = {
        title: title,
        description : description
     }

    const user = req.currentUser.email.replaceAll(".", "_").replaceAll("@", "_");
    fs.writeFileSync("./uploads/" + user + "/" + req.currentUser.uploadCount + ".json", JSON.stringify(metaData, null, 2));
    
    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
    let currentIndex = 0;
    for(let i=0; i<users.length; i++){
        if(users[i].email === req.currentUser.email){
            currentIndex = i;
            break;
        }
    }

    users[currentIndex].uploadCount++;
    fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));


    res.send("Upload successful");
});


app.listen(3000);