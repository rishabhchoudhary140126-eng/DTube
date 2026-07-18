const express = require("express");
const app = express();
app.use(express.json());
const cors = require('cors'); 
app.use(cors());
const fs = require("fs");
const multer = require("multer");
const path = require("path");

app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/data/profile_pics", express.static(path.join(__dirname, "data/profile_pics")));


const storage_profilePic = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, path.join(__dirname, "data", "profile_pics"));
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
        uploadCount: 1,
        subscriber: 0,
        "subscriptions": []
    }
    if(!curentUser.email.endsWith("@gmail.com")) return res.status(403).send("Only gmail address allowed!!!")

    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));

    // console.log(req.body);
    console.log(curentUser);
    for(let i=0; i<users.length; i++){
        if(users[i].email === curentUser.email){
            res.send("User already exists");
            return;
        }
    }

    users.push(curentUser);
    fs.writeFileSync(path.join(__dirname, "data", "users.json"), JSON.stringify(users, null, 2));


    res.send("Signup successful");
})


function giveCurrentUser(req, res, next){
    let currentUser = null;
    const email = req.headers.email;
    const password = req.headers.password;
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));

    for(let i=0; i<users.length; i++){
        if(users[i].email === email){
            if(users[i].password === password){
                req.currentUser = users[i];
                return next();
            }
            else return res.send("Invalid password, Please login again");
        }
    }
    return res.status(404).send("User not found, Please Signup");
}


app.post("/login", giveCurrentUser, function(req, res){
    res.send("Login successful");
});




const storage_upload = multer.diskStorage({
    destination: function(req, file, cb){
        const user = req.currentUser.email.replaceAll(".", "_").replaceAll("@", "_");
        const uploadPath = path.join(__dirname, "uploads", user);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
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
        description : description,
        views: 0
     }

    const user = req.currentUser.email.replaceAll(".", "_").replaceAll("@", "_");
    const uploadPath = path.join(__dirname, "uploads", user);
    fs.writeFileSync(path.join(uploadPath, `${req.currentUser.uploadCount}.json`), JSON.stringify(metaData, null, 2));
    
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data" , "users.json"), "utf8"));
    let currentIndex = 0;
    for(let i=0; i<users.length; i++){
        if(users[i].email === req.currentUser.email){
            currentIndex = i;
            break;
        }
    }

    users[currentIndex].uploadCount++;
    fs.writeFileSync(path.join(__dirname, "data", "users.json"), JSON.stringify(users, null, 2));


    res.send("Upload successful");
});


app.get("/videos", giveCurrentUser, function(req, res){
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));
    const videos = [];
    let currentIndex = 0;
    for(let i=0; i<users.length; i++){
        for(let j=1; j<users[i].uploadCount; j++){
            let email = users[i].email.replaceAll(".", "_").replaceAll("@", "_");
            let filePathh = j + ".json";
            let metadata = JSON.parse(fs.readFileSync(path.join(__dirname, "uploads", email, filePathh), "utf8"));
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
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));
    let channelName = " ";
    const videoPath = req.query.videoPath;
    const emailFolderName = videoPath.split("/")[2];
    const channelEmail = emailFolderName.replaceAll("_gmail_com", "@gmail.com");

    for(let i=0; i<users.length; i++){
        if(users[i].email === channelEmail){
            channelName = users[i].channelName;
            break;
        }
    }

    console.log(videoPath);
    const metadataPath = videoPath.replaceAll(".mp4", ".json");
    const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, metadataPath), "utf8"));
    const channelLogoPath = "/data/profile_pics/" + emailFolderName + ".jpg";
    const ans = {
        path: videoPath,
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
    let upload_number = req.headers.upload_number + ".json";

    email = email.replaceAll(".", "_").replaceAll("@", "_");

    const metadata_path = path.join(__dirname, "uploads", email, upload_number);
    const metadata = JSON.parse(fs.readFileSync(metadata_path, "utf8"));
    const title = metadata.title;
    res.send({
        metadata_path,
        title
    });
});

app.get("/profile", giveCurrentUser, function(req, res){
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));
    let email = req.headers.email;
    let password = req.headers.password;
    let currentIndex = -1;
    for(let i=0; i<users.length; i++){
        if(users[i].email === email){
            currentIndex = i;
            break;
        }
    }
    if(currentIndex === -1) return res.send("No profile Pic found...");
    email = users[currentIndex].email.replaceAll(".", "_").replaceAll("@", "_");
    const ans = {
        profile_pic_path: "/data/profile_pics/" + email + ".jpg",
        channelName: users[currentIndex].channelName,
        no_of_videos: users[currentIndex].uploadCount,
        subscribers: users[currentIndex].subscriber
    };
    res.send(ans);
});

app.get("/profile_pic", giveCurrentUser, function(req, res){
    let email = req.headers.email;
    email = email.replaceAll("@", "_").replaceAll(".", "_");
    const profilePath = "/data/profile_pics/" + email + ".jpg";
    res.send({profilePath});
});

app.post("/userSubscribed", giveCurrentUser, function(req, res){
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));
    const videoPath = req.query.videoPath;
    const emailFolderName = videoPath.split("/")[2];
    const channelEmail = emailFolderName.replaceAll("_gmail_com", "@gmail.com");

    for(let i=0; i<users.length; i++){
        if(users[i].email === channelEmail){
            
            for(let j = 0; j<users[i].subscriptions.length; j++){
                if(users[i].subscriptions[j] == req.headers.email) return res.status(200).send("Already Subscribed!");
            }
            
            users[i].subscriber++;
            console.log(users[i].subscriber);
            users[i].subscriptions.push(req.headers.email);
            break;
        }
    }
    console.log("One user subscribed!!");
    fs.writeFileSync(path.join(__dirname, "data", "users.json"), JSON.stringify(users, null, 2));
    res.status(200).send("Subscribed!");
});
app.get("/viewCount", giveCurrentUser, function(req, res){
    let videoPath = req.query.videoPath;
    videoPath = path.join(__dirname, videoPath.replaceAll(".mp4", ".json"));
    console.log(videoPath);
    const videoMeta = JSON.parse(fs.readFileSync(videoPath , "utf8"));
    videoMeta.views++;
    fs.writeFileSync(videoPath, JSON.stringify(videoMeta, null, 2));
    res.send(videoMeta.views); 
});

app.get("/channelPage", giveCurrentUser, function(req, res){
    const channelEmail = req.query.channelEmail;
    console.log(channelEmail);
    const channelPath = channelEmail.replaceAll(".", "_").replaceAll("@", "_");
    console.log(channelPath);
    let currentIndex = -1;
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "users.json"), "utf8"));
    for(let i=0; i<users.length; i++){
        if(users[i].email == channelEmail){
            currentIndex = i;
            break;
        }
    }
    const profile_pic_path = "/data/profile_pics/" + channelEmail.replaceAll(".", "_").replaceAll("@", "_") + ".jpg";
    const channelName = users[currentIndex].channelName;


    const numberOfUploads = users[currentIndex].uploadCount;
    let videos = [];
    for(let i = 1; i<numberOfUploads; i++){
        const videoMeta = JSON.parse(fs.readFileSync(`uploads/${channelPath}/${i}.json`, "utf8"));
        videos.push({
            title: videoMeta.title,
            thumbnailPath : `uploads/${channelPath}/${i}.jpg`,
            videoPath : `uploads/${channelPath}/${i}.mp4`
            
        })
    }
    const ans ={
        profile_pic_path,
        channelName,
        videos
    }
    res.send(ans);
});
app.listen(3000);