// ======================================
// USER ID SYSTEM
// ======================================

if(!localStorage.getItem("userId")){

    localStorage.setItem(
        "userId",
        "user_" + Math.random().toString(36).substring(7)
    );

}

// ======================================
// GLOBAL VARIABLES
// ======================================

let selected = new Set();

let slides = [];


// ======================================
// UPLOAD VIDEO
// ======================================

async function uploadVideo(){

selected.clear();

let fileInput =
document.getElementById("videoFile");

let file = fileInput.files[0];

if(!file){

alert("Please select video!");

return;

}

let progressContainer =
document.getElementById(
"progressContainer"
);

let progressBar =
document.getElementById(
"progressBar"
);

let progressText =
document.getElementById(
"progressText"
);

progressContainer.style.display =
"block";

progressBar.style.width = "0%";

progressBar.innerHTML = "0%";

progressText.innerHTML =
"Uploading video...";

let formData = new FormData();

formData.append("video", file);


// ===================================
// FAKE PROGRESS
// ===================================

let percent = 0;

let interval = setInterval(()=>{

if(percent < 90){

percent += 5;

progressBar.style.width =
percent + "%";

progressBar.innerHTML =
percent + "%";

if(percent < 50){

progressText.innerHTML =
"Uploading video...";

}else{

progressText.innerHTML =
"Extracting slides...";

}

}

},800);


try{

let response = await fetch("/upload",{

method:"POST",

headers:{
"user-id":
localStorage.getItem("userId")
},

body:formData

});

clearInterval(interval);

let data = await response.json();

if(data.error){

alert(data.error);

progressContainer.style.display =
"none";

return;

}

progressBar.style.width = "100%";

progressBar.innerHTML = "100%";

progressText.innerHTML =
"Slides extracted successfully ✅";

slides = data.slides;

showSlides();

}catch(err){

console.log(err);

clearInterval(interval);

progressContainer.style.display =
"none";

alert("Upload failed");

}

}

// ===================================
// RESPONSE
// ===================================

xhr.onreadystatechange = function(){

if(xhr.readyState === 4){

if(xhr.status === 200){

progressBar.style.width =
"100%";

progressBar.innerHTML =
"100%";

progressText.innerHTML =
"Slides extracted successfully ✅";

let data =
JSON.parse(xhr.responseText);

slides = data.slides;

showSlides();

}else{

try{

let err =
JSON.parse(xhr.responseText);

alert(err.error);

}catch{

alert("Upload failed");

}

}

}

};

xhr.send(formData);

// ===================================
// FAKE EXTRACTION PROGRESS
// ===================================

let fake = 50;

let interval = setInterval(()=>{

if(fake >= 95){

clearInterval(interval);

return;

}

fake += 3;

progressBar.style.width =
fake + "%";

progressBar.innerHTML =
fake + "%";

progressText.innerHTML =
"Extracting slides...";

},1000);

}

    // LOADING UI
    document.getElementById("gallery").innerHTML = `

    <div style="
        text-align:center;
        color:white;
        font-size:25px;
        padding:50px;
    ">

    Processing Video... ⏳

    </div>

    `;

    let formData = new FormData();

    formData.append("video", file);

    try{

        let response = await fetch("/upload",{

            method:"POST",

            headers:{
                "user-id":
                localStorage.getItem("userId")
            },

            body:formData

        });

        let data = await response.json();

        // ERROR
        if(data.error){

            alert(data.error);

            document.getElementById(
                "gallery"
            ).innerHTML = "";

            return;
        }

        slides = data.slides;

        showSlides();

    }catch(err){

        console.log(err);

        alert("Upload failed!");

        document.getElementById(
            "gallery"
        ).innerHTML = "";

    }

// ======================================
// SHOW SLIDES
// ======================================

function showSlides(){

    let gallery =
    document.getElementById("gallery");

    gallery.innerHTML = "";

    slides.forEach(file=>{

        // WRAPPER
        let wrapper =
        document.createElement("div");

        wrapper.style.position = "relative";

        wrapper.style.width = "100%";

        // IMAGE
        let img =
        document.createElement("img");

        img.src = "/frames/" + file;

        img.style.width = "100%";

        img.style.borderRadius = "18px";

        img.style.cursor = "pointer";

        img.style.border =
        "4px solid transparent";

        img.style.transition = "0.3s";

        img.style.boxSizing = "border-box";

        img.style.display = "block";

        img.loading = "lazy";

        // CLICK EVENT
        img.onclick = function(){

            toggleSlide(file, img);

        };

        wrapper.appendChild(img);

        gallery.appendChild(wrapper);

    });

}


// ======================================
// TOGGLE SELECT
// ======================================

function toggleSlide(file, img){

    if(selected.has(file)){

        // REMOVE
        selected.delete(file);

        img.style.border =
        "4px solid transparent";

        img.style.opacity = "1";

        img.style.transform =
        "scale(1)";

    }else{

        // ADD
        selected.add(file);

        img.style.border =
        "4px solid red";

        img.style.opacity = "0.8";

        img.style.transform =
        "scale(0.98)";
    }

}


// ======================================
// SELECT ALL
// ======================================

function selectAll(){

    selected = new Set(slides);

    document.querySelectorAll(
        "#gallery img"
    ).forEach(img=>{

        img.style.border =
        "4px solid red";

        img.style.opacity = "0.8";

        img.style.transform =
        "scale(0.98)";

    });

}


// ======================================
// CLEAR ALL
// ======================================

function clearAll(){

    selected.clear();

    document.querySelectorAll(
        "#gallery img"
    ).forEach(img=>{

        img.style.border =
        "4px solid transparent";

        img.style.opacity = "1";

        img.style.transform =
        "scale(1)";

    });

}


// ======================================
// DOWNLOAD PDF
// ======================================
async function downloadPDF(){

if(selected.size === 0){

alert("Select slides first!");

return;

}

let progressContainer =
document.getElementById(
"progressContainer"
);

let progressBar =
document.getElementById(
"progressBar"
);

let progressText =
document.getElementById(
"progressText"
);

progressContainer.style.display =
"block";

progressBar.style.width = "0%";

progressBar.innerHTML = "0%";

progressText.innerHTML =
"Generating PDF...";

let fake = 0;

let interval = setInterval(()=>{

if(fake >= 90){

clearInterval(interval);

return;

}

fake += 5;

progressBar.style.width =
fake + "%";

progressBar.innerHTML =
fake + "%";

},500);

try{

let response = await fetch(
"/generate_pdf",
{

method:"POST",

headers:{

"Content-Type":
"application/json",

"user-id":
localStorage.getItem(
"userId"
)

},

body:JSON.stringify({

slides:
Array.from(selected)

})

}

);

let data = await response.json();

clearInterval(interval);

if(data.error){

alert(data.error);

return;

}

progressBar.style.width =
"100%";

progressBar.innerHTML =
"100%";

progressText.innerHTML =
"Downloading PDF...";

window.location = data.pdf;

}catch(err){

alert("PDF generation failed");

}

}


// ======================================
// SUBSCRIBE
// ======================================

async function subscribe(){

    let name =
    prompt("Enter your name");

    let email =
    prompt("Enter your email");

    if(!name || !email){

        alert("Name & Email required");

        return;
    }

    try{

        let response = await fetch(
            "/subscribe",
            {

                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:JSON.stringify({

                    name:name,

                    email:email,

                    user_id:
                    localStorage.getItem(
                        "userId"
                    )

                })

            }
        );

        let data = await response.json();

        alert(data.msg);

    }catch(err){

        console.log(err);

        alert("Subscription failed!");

    }

}