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
    if(!curentUser.email.endsWith("@gmail.com")) return res.status(403).send("Only gmail address allowed!!!")

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
    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));

    for(let i=0; i<users.length; i++){
        if(users[i].email === email){
            if(users[i].password === password){
                req.currentUser = users[i];
                return next();
            }
            else return res.send("Invalid password, Please login again");
        }
    }
    return res.send("User not found, Please Signup");
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


app.get("/videos", giveCurrentUser, function(req, res){
    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
    const videos = [];
    let currentIndex = 0;
    for(let i=0; i<users.length; i++){
        for(let j=1; j<users[i].uploadCount; j++){
            let email = users[i].email.replaceAll(".", "_").replaceAll("@", "_");
            let metadata = JSON.parse(fs.readFileSync("./uploads/" + email + "/" + j + ".json", "utf8"));
            videos.push({
                title: metadata.title,
                description: metadata.description,
                channelName: users[i].channelName,
                videoPath: "/uploads/" + email + "/" + j + ".mp4",
                thumbnailPath: "/uploads/" + email + "/" + j + ".jpg",
                channelLogoPath: "/data/profile_pics/" + email + ".jpg"
            });
        }
    }
    res.send(videos);
});

app.get("/video", giveCurrentUser, function(req, res){
    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
    let channelName = " ";
    const path = req.query.videoPath;
    const emailFolderName = path.split("/")[2];
    const channelEmail = emailFolderName.replaceAll("_gmail_com", "@gmail.com");

    for(let i=0; i<users.length; i++){
        if(users[i].email === channelEmail){
            channelName = users[i].channelName;
            break;
        }
    }

    console.log(path);
    const metadataPath = path.replaceAll(".mp4", ".json");
    const metadata = JSON.parse(fs.readFileSync("." + metadataPath, "utf8"));
    const channelLogoPath = "./data/profile_pics/" + emailFolderName + ".jpg";
    const ans = {
        path: path,
        title: metadata.title,
        description: metadata.description,
        channelName: channelName,
        channelLogoPath: channelLogoPath
    }
    console.log(ans);
    res.send(ans);
});

app.get("/metadata", giveCurrentUser, function(req, res){
    let email = req.headers.email;
    let upload_number = req.headers.upload_number;

    email = email.replaceAll(".", "_").replaceAll("@", "_");

    const metadata_path = "./uploads/" + email + "/" + upload_number +".json";
    const metadata = JSON.parse(fs.readFileSync(metadata_path, "utf8"));
    const title = metadata.title;
    res.send({
        metadata_path,
        title
    });
});

app.get("/profile", giveCurrentUser, function(req, res){
    const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
    let email = req.headers.email;
    let password = req.headers.password;
    let currentIndex = -1;
    for(let i=0; i<users.length; i++){
        if(users[i].email === email){
            currentIndex = i;
            break;
        }
    }
    if(currentIndex === -1) res.send("No profile Pic found...");
    email = users[currentIndex].email.replaceAll(".", "_").replaceAll("@", "_");
    const ans = {
        profile_pic_path: "/data/profile_pics/" + email + ".jpg",
        channelName: users[currentIndex].channelName,
        no_of_videos: users[currentIndex].uploadCount
    };
    res.send(ans);
});



app.listen(3000);