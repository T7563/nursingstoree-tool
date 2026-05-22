if(!localStorage.getItem("userId")){
localStorage.setItem("userId","user_"+Math.random().toString(36).substring(7));
}

let selected = new Set();
let slides = [];

async function uploadVideo(){

selected.clear();

let file = document.getElementById("videoFile").files[0];

if(!file){
alert("Select video file!");
return;
}

document.getElementById("gallery").innerHTML = "Processing... ⏳";

let formData = new FormData();
formData.append("video", file);

let res = await fetch("/upload",{
method:"POST",
body:formData
});

let data = await res.json();

if(data.error){
alert(data.error);
return;
}

slides = data.slides;
showSlides();
}

function showSlides(){

let gallery = document.getElementById("gallery");
gallery.innerHTML = "";

slides.forEach(file=>{

let img = document.createElement("img");
img.src = "/frames/" + file;

img.onclick = ()=>{
if(selected.has(file)){
selected.delete(file);
img.classList.remove("selected");
}else{
selected.add(file);
img.classList.add("selected");
}
};

gallery.appendChild(img);

});
}

function selectAll(){
selected = new Set(slides);
document.querySelectorAll("#gallery img").forEach(img=>img.classList.add("selected"));
}

function clearAll(){
selected.clear();
document.querySelectorAll("#gallery img").forEach(img=>img.classList.remove("selected"));
}

async function downloadPDF(){

if(selected.size === 0){
alert("Select slides first!");
return;
}

let res = await fetch("/generate_pdf",{
method:"POST",
headers:{
"Content-Type":"application/json",
"user-id": localStorage.getItem("userId")
},
body:JSON.stringify({slides:Array.from(selected)})
});

let data = await res.json();

if(data.error){
alert(data.error);
return;
}

setTimeout(()=>{
window.location="/download";
},1000);
}

async function subscribe(){

let name = prompt("Enter your name");
let email = prompt("Enter your email");

let res = await fetch("/subscribe",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
name:name,
email:email,
user_id:localStorage.getItem("userId")
})
});

let data = await res.json();
alert(data.msg);
}