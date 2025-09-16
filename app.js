const DB_NAME = "miniSpotifyDB";
const DB_STORE = "tracks";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveTrack(track) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).add(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getTracks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, "readonly")
      .objectStore(DB_STORE)
      .getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteTrackFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- bagian UI dan player ---
const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const progress = document.getElementById("progress");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const playlistEl = document.getElementById("playlist");
const filePicker = document.getElementById("filePicker");

let playlist = [];
let currentIndex = 0;
let isPlaying = false;

function renderPlaylist(){
  playlistEl.innerHTML = "";
  playlist.forEach((t,i)=>{
    const div = document.createElement("div");
    div.className = "track";
    if(i === currentIndex) div.classList.add("active");

    const span = document.createElement("span");
    span.textContent = t.title;
    span.onclick = ()=>{ loadTrack(i); playAudio(); };

    const delBtn = document.createElement("button");
    delBtn.className = "deleteBtn";
    delBtn.textContent = "❌";
    delBtn.onclick = (e)=>{ 
      e.stopPropagation(); 
      deleteTrack(i, t.id); 
    };

    div.appendChild(span);
    div.appendChild(delBtn);
    playlistEl.appendChild(div);
  });
}

function loadTrack(index){
  currentIndex = index;
  const track = playlist[currentIndex];
  if(track.blob){
    // buat object URL baru dari blob yg tersimpan
    track.src = URL.createObjectURL(track.blob);
  }
  audio.src = track.src;
  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;
  renderPlaylist();
}

function playAudio(){
  audio.play();
  isPlaying = true;
  playBtn.textContent = "⏸️";
}
function pauseAudio(){
  audio.pause();
  isPlaying = false;
  playBtn.textContent = "▶️";
}

playBtn.onclick = ()=>{
  if(!audio.src && playlist.length > 0) loadTrack(0);
  if(isPlaying) pauseAudio(); else playAudio();
};
prevBtn.onclick = ()=>{ if(currentIndex>0){ loadTrack(currentIndex-1); playAudio(); } };
nextBtn.onclick = ()=>{ if(currentIndex<playlist.length-1){ loadTrack(currentIndex+1); playAudio(); } };

progress.addEventListener("input", e=>{ audio.currentTime = e.target.value; });
audio.addEventListener("timeupdate", ()=>{
  progress.max = audio.duration || 0;
  progress.value = audio.currentTime || 0;
});
audio.addEventListener("ended", ()=>{ if(currentIndex<playlist.length-1){ loadTrack(currentIndex+1); playAudio(); } });

// pilih file dari penyimpanan
filePicker.addEventListener("change", async (event)=>{
  const files = event.target.files;
  for(let file of files){
    const blob = file; // simpan blob asli
    const track = { title: file.name, artist:"Local File", blob: blob };
    await saveTrack(track); // simpan ke IndexedDB
  }
  playlist = await getTracks();
  if(playlist.length > 0){ loadTrack(0); }
  renderPlaylist();
});

// fungsi hapus track
async function deleteTrack(index, id){
  await deleteTrackFromDB(id);
  playlist.splice(index,1);

  if(currentIndex >= playlist.length) currentIndex = playlist.length-1;
  if(currentIndex < 0) currentIndex = 0;

  if(playlist.length > 0){
    loadTrack(currentIndex);
  } else {
    audio.src = "";
    titleEl.textContent = "Tidak Ada Lagu";
    artistEl.textContent = "—";
    playBtn.textContent = "▶️";
  }
  renderPlaylist();
}

// Load playlist dari IndexedDB saat pertama kali
window.addEventListener("load", async ()=>{
  playlist = await getTracks();
  if(playlist.length > 0){
    loadTrack(0);
  }
  renderPlaylist();
});
