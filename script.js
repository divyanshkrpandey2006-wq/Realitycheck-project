const taskNameInput=document.getElementById("taskName");
const plannedTimeInput=document.getElementById("plannedTime");
const taskList=document.getElementById("taskList");
const dateSelect=document.getElementById("dateSelect");

let today=new Date().toISOString().slice(0,10);
dateSelect.value=today;

let allTasks=JSON.parse(localStorage.getItem("allTasks"))||{};
let tasks=allTasks[today]||[];

let activeTaskIndex=null;
let startTime=null;

let xp=parseInt(localStorage.getItem("xp"))||0;
let level=parseInt(localStorage.getItem("level"))||1;
let streak=parseInt(localStorage.getItem("streak"))||0;

let chart=null;
let trendChart=null;
let tabSwitched = false;
document.addEventListener("visibilitychange", () => {

if(document.hidden){

tabSwitched = true;

}
else{

if(tabSwitched && activeTaskIndex !== null){
document.getElementById("tabSwitchPrompt").style.display = "block";
}

}

});


/* ---------- TIME FORMAT ---------- */
function formatTime(ms){
let sec=Math.floor(ms/1000);
let h=Math.floor(sec/3600);
let m=Math.floor((sec%3600)/60);
let s=sec%60;
return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ---------- REWARD SYSTEM ---------- */
function calculateReward(minutes){
if(minutes<=10) return 15;
if(minutes<=30) return 120;
if(minutes<=60) return 300;
return 1200;
}

/* ---------- XP + LEVEL ---------- */
function addXP(amount){
xp+=amount;
if(xp>=100){
xp=0;
level++;
}
localStorage.setItem("xp",xp);
localStorage.setItem("level",level);
}

/* ---------- STREAK ---------- */
function updateStreak(){
streak++;
localStorage.setItem("streak",streak);
}

/* ---------- BREAK POPUP ---------- */
let breakInterval=null;

function showBreak(seconds){

document.getElementById("breakPopup").style.display="block";
let end=Date.now()+seconds*1000;

breakInterval=setInterval(()=>{
let remaining=end-Date.now();

if(remaining<=0){
clearInterval(breakInterval);
document.getElementById("breakTimer").textContent="Break Over!";
alert("⏰ Break finished! Back to work.");
return;
}

document.getElementById("breakTimer").textContent=formatTime(remaining);

},1000);

}

function closeBreak(){
clearInterval(breakInterval);
document.getElementById("breakPopup").style.display="none";
}

/* ---------- ADD TASK ---------- */
function addTask(){

const name=taskNameInput.value;
const planned=parseInt(plannedTimeInput.value);

if(!name||!planned) return alert("Fill fields");

tasks.push({
name,
planned,
actual:null,
accuracy:null,
distractions:0,
running:false
});

taskNameInput.value="";
plannedTimeInput.value="";
saveAndRender();
}

/* ---------- START TASK ---------- */
function startTask(index){

if(activeTaskIndex!==null) return alert("Finish current task first");

activeTaskIndex=index;
startTime=Date.now();
tasks[index].running=true;

/* ⭐ AUTO STOP CHECK */
autoStopInterval=setInterval(()=>{

let elapsed=(Date.now()-startTime)/60000;

if(elapsed>=tasks[index].planned){
stopTask(index,true); // system stop
}

},1000);

saveAndRender();
}


/* ---------- STOP TASK ---------- */
let autoStopInterval=null;

function stopTask(index,autoStopped=false){

if(activeTaskIndex!==index) return;

clearInterval(autoStopInterval);

const minutes=(Date.now()-startTime)/60000;

tasks[index].actual=minutes;

let ratio=minutes/tasks[index].planned;
tasks[index].accuracy=Math.min(100,Math.round(ratio*100));

tasks[index].running=false;
activeTaskIndex=null;
startTime=null;

/* XP + STREAK */
addXP(20);
updateStreak();

/* ⭐ BREAK REWARD */
let reward=calculateReward(tasks[index].planned);
showBreak(reward);

/* ⭐ AUTO STOP MESSAGE */
if(autoStopped){
alert("⏰ Planned time completed! Great discipline!");
}

saveAndRender();
}


/* ---------- DELETE ---------- */
function deleteTask(index){
if(!confirm("Delete task?")) return;
tasks.splice(index,1);
saveAndRender();
}

/* ---------- DAILY SCORE ---------- */
function calculateDailyScore(){

let total=0,completed=0,distractions=0;

tasks.forEach(t=>{
if(t.actual!==null){
total+=t.accuracy;
completed++;
distractions+=t.distractions;
}
});

if(!completed) return 0;
return Math.max(0,Math.round(total/completed-distractions*5));
}

/* ---------- MOTIVATION ---------- */
function showMotivation(score){

let msg="";
if(score>=80) msg="🔥 Excellent Focus!";
else if(score>=50) msg="💪 Good Work!";
else msg="🎯 Stay Focused!";

document.getElementById("motivationMessage").textContent=msg;
}

/* ---------- WEEKLY SUMMARY ---------- */
function updateWeeklySummary(){

let total=0,tasksCount=0,distractions=0;

Object.values(allTasks).forEach(day=>{
day.forEach(t=>{
if(t.accuracy){
total+=t.accuracy;
tasksCount++;
distractions+=t.distractions;
}
});
});

let avg=tasksCount?(total/tasksCount).toFixed(1):0;

document.getElementById("weeklyAvg").textContent="Average Productivity: "+avg+"%";
document.getElementById("weeklyTasks").textContent="Tasks Completed: "+tasksCount;
document.getElementById("weeklyDistractions").textContent="Total Distractions: "+distractions;

}

/* ---------- RENDER TASKS ---------- */
function renderTasks(){

let score=calculateDailyScore();
document.getElementById("score").textContent=score;
showMotivation(score);

document.getElementById("xp").textContent=xp;
document.getElementById("level").textContent=level;
document.getElementById("streak").textContent=streak;

taskList.innerHTML="";

tasks.forEach((task,i)=>{

let runningTime="00:00:00";

if(task.running && startTime){
runningTime=formatTime(Date.now()-startTime);
}
else if(task.actual){
runningTime=formatTime(task.actual*60000);
}

let progress=task.running
?((Date.now()-startTime)/60000/task.planned)*100
:0;

const li=document.createElement("li");
li.className="task";

li.innerHTML=`
<strong>${task.name}</strong><br>
⏳ <span class="timerDisplay">${runningTime}</span><br>
Planned: ${task.planned} min<br>
Accuracy: ${task.accuracy??"-"}%<br>

<div class="progressBar">
<div class="progressFill" style="width:${progress}%"></div>
</div>

<button onclick="startTask(${i})" ${task.running?"disabled":""}>Start</button>
<button onclick="stopTask(${i})" ${!task.running?"disabled":""}>Stop</button>
<button onclick="deleteTask(${i})">Delete</button>
`;

taskList.appendChild(li);

});
}

/* ---------- CHART ---------- */
function renderChart(){

if(chart) chart.destroy();

chart=new Chart(document.getElementById("reportChart"),{
type:"bar",
data:{
labels:tasks.map(t=>t.name),
datasets:[
{label:"Planned",data:tasks.map(t=>t.planned)},
{label:"Actual",data:tasks.map(t=>t.actual||0)}
]
}
});
}

/* ---------- TREND ---------- */
function drawTrendChart(){

if(trendChart) trendChart.destroy();

let dates=[],scores=[];

for(let d in allTasks){

let day=allTasks[d];
let total=0;

day.forEach(t=>{if(t.accuracy) total+=t.accuracy;});

if(day.length){
dates.push(d);
scores.push((total/day.length).toFixed(1));
}

}

trendChart=new Chart(document.getElementById("trendChart"),{
type:"line",
data:{labels:dates,datasets:[{label:"Daily Productivity",data:scores}]}
});
}

/* ---------- SAVE ---------- */
function saveAndRender(){
allTasks[today]=tasks;
localStorage.setItem("allTasks",JSON.stringify(allTasks));
renderTasks();
renderChart();
drawTrendChart();
updateWeeklySummary();
}

/* TIMER LIVE UPDATE */
setInterval(()=>{
if(activeTaskIndex!==null) renderTasks();
},1000);

/* TODAY BUTTON */
function goToday(){
today=new Date().toISOString().slice(0,10);
dateSelect.value=today;
tasks=allTasks[today]||[];
saveAndRender();
}
function markProductive(){

tabSwitched = false;
document.getElementById("tabSwitchPrompt").style.display = "none";

}

function markUnproductive(){

if(activeTaskIndex !== null){
tasks[activeTaskIndex].distractions++;
}

tabSwitched = false;
document.getElementById("tabSwitchPrompt").style.display = "none";

saveAndRender();
}

saveAndRender();
