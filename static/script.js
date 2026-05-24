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
// SHOW SLIDES
// ======================================

function showSlides(){

let gallery =
document.getElementById("gallery");

gallery.innerHTML = "";

slides.forEach(file=>{

let wrapper =
document.createElement("div");

let img =
document.createElement("img");

img.src =
"/frames/" + file + "?t=" + Date.now();

img.style.width = "100%";

img.style.borderRadius = "18px";

img.style.cursor = "pointer";

img.style.border =
"4px solid transparent";

img.style.transition = "0.3s";

img.onclick = function(){

toggleSlide(file,img);

};

wrapper.appendChild(img);

gallery.appendChild(wrapper);

});

}


// ======================================
// TOGGLE SELECT
// ======================================

function toggleSlide(file,img){

if(selected.has(file)){

selected.delete(file);

img.style.border =
"4px solid transparent";

img.style.opacity = "1";

}else{

selected.add(file);

img.style.border =
"4px solid red";

img.style.opacity = "0.8";

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

});

}


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


// ===================================
// SEND REQUEST
// ===================================

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

alert(err);

}

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

let text = await response.text();

console.log(text);

let data = JSON.parse(text);

progressBar.style.width =
"100%";

progressBar.innerHTML =
"100%";

progressText.innerHTML =
"Downloading PDF...";


// ===================================
// FORCE DOWNLOAD
// ===================================

let link =
document.createElement("a");

link.href = data.pdf;

link.download = "slides.pdf";

document.body.appendChild(link);

link.click();

document.body.removeChild(link);

}catch(err){

console.log(err);

alert("PDF generation failed!");

}

}