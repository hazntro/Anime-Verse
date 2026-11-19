const API='https://graphql.anilist.co';
const state={trending:[],seasonal:[],current:[],searchTimer:null,region:'US',seasonOffset:0};
const watchlist=new Set(JSON.parse(localStorage.getItem('animeverse-watchlist')||'[]'));

const providerSearch={
  Crunchyroll:q=>`https://www.crunchyroll.com/search?q=${encodeURIComponent(q)}`,
  Netflix:q=>`https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  Hulu:q=>`https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  'Disney+':q=>`https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`,
  'Amazon Prime':q=>`https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video`
};

async function anilist(query,variables={}){
  const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
  if(!res.ok)throw new Error(`AniList request failed (${res.status})`);
  return (await res.json()).data;
}

const mediaQuery=`query($page:Int,$perPage:Int,$search:String,$genre:String,$season:Int,$year:Int,$format:MediaFormat,$sort:[MediaSort]){Page(page:$page,perPage:$perPage){media(search:$search,genre:$genre,seasonYear:$year,format:$format,sort:$sort,type:ANIME,isAdult:false){id idMal title{romaji english native} coverImage{extraLarge large} bannerImage description(asHtml:false) episodes status season seasonYear averageScore genres format studios(isMain:true){nodes{name}} trailer{id site thumbnail} characters(perPage:6,sort:[ROLE]){edges{role voiceActors(language:JAPANESE,sort:[RELEVANCE]){id name{full} image{large}} node{id name{full} image{large}}}}}}}`;

async function loadAnime(){
  try{
    const now=new Date();
    const year=now.getFullYear();
    const month=now.getMonth()+1;
    const season=month>=3&&month<=5?'SPRING':month>=6&&month<=8?'SUMMER':month>=9&&month<=11?'FALL':'WINTER';
    document.getElementById('seasonLabel').textContent=`${season} ${year}`;
    const [trending,seasonal,current]=await Promise.all([
      anilist(mediaQuery,{page:1,perPage:18,sort:['TRENDING_DESC','POPULARITY_DESC']}),
      anilist(mediaQuery,{page:1,perPage:18,season:season==='WINTER'?1:season==='SPRING'?2:season==='SUMMER'?3:4,year,sort:['POPULARITY_DESC','SCORE_DESC']}),
      anilist(mediaQuery,{page:1,perPage:12,sort:['TRENDING_DESC','POPULARITY_DESC']})
    ]);
    state.trending=trending.Page.media;
    state.seasonal=seasonal.Page.media;
    state.current=current.Page.media;
    renderHero(state.trending[0]);
    applyFilters();
  }catch(error){
    console.error(error);
    document.querySelector('.hero-loading')?.remove();
    document.getElementById('hero').innerHTML=`<div class="hero-content"><div class="hero-kicker"><span>ANIMEVERSE</span></div><h1>Unable to load live anime</h1><p>Check your internet connection or AniList access, then reload the page.</p></div>`;
    document.querySelectorAll('.anime-grid').forEach(grid=>grid.innerHTML=`<div class="empty-state">Live data could not be loaded.</div>`);
  }
}

function titleOf(media){return media.title.english||media.title.romaji||media.title.native||'Untitled'}
function cleanDescription(text=''){const div=document.createElement('div');div.innerHTML=text||'';return (div.textContent||div.innerText||'').replace(/\s+/g,' ').slice(0,220)}
function formatName(format){return format==='TV'?'TV':format==='MOVIE'?'Movie':format==='OVA'?'OVA':format==='ONA'?'ONA':format||'Anime'}

function renderHero(media){
  if(!media)return;
  const title=titleOf(media);const banner=media.bannerImage||media.coverImage.extraLarge;
  document.getElementById('hero').innerHTML=`<img class="hero-backdrop" src="${banner}" alt="${title} artwork"><div class="hero-content"><div class="hero-kicker"><span>#${Math.floor(Math.random()*3)+1} TRENDING</span><span>${formatName(media.format)}</span></div><h1>${title}</h1><div class="hero-meta"><span class="score">★ ${((media.averageScore||0)/10).toFixed(1)}</span><span>${media.seasonYear||'—'}</span><span>${media.episodes?`${media.episodes} Episodes`:'Ongoing'}</span><span>${media.status==='RELEASING'?'Ongoing':'Completed'}</span></div><p>${cleanDescription(media.description)}</p><div class="hero-actions"><button class="primary-btn" data-detail="${media.id}"><span>▶</span> View Details</button><button class="secondary-btn" data-save="${media.id}">${watchlist.has(String(media.id))?'✓ In My List':'＋ My List'}</button></div><div class="hero-provider"><span>Official discovery:</span><span class="provider-pill">CRUNCHYROLL</span><span class="provider-pill">NETFLIX</span></div></div>`;
}

function cardTemplate(media){
  const id=String(media.id),title=titleOf(media),saved=watchlist.has(id);
  return `<article class="anime-card" data-detail="${media.id}"><div class="poster-wrap"><img src="${media.coverImage.extraLarge||media.coverImage.large}" alt="${title} poster" loading="lazy"><button class="save-button${saved?' saved':''}" data-save="${id}" aria-label="${saved?'Remove':'Add'} ${title}">${saved?'✓':'+'}</button><div class="card-provider"><span>CR</span><span>NF</span></div></div><div class="card-info"><h3>${title}</h3><div><span>${media.seasonYear||'—'} · ${formatName(media.format)}</span><span class="score">★ ${((media.averageScore||0)/10).toFixed(1)}</span></div></div></article>`;
}

function renderGrid(id,list){const grid=document.getElementById(id);grid.innerHTML=list.length?list.map(cardTemplate).join(''):'<div class="empty-state">No anime match your filters.</div>'}

function applyFilters(){
  const search=document.getElementById('searchInput').value.trim().toLowerCase();
  const genre=document.getElementById('genreFilter').value;
  const format=document.getElementById('formatFilter').value;
  const year=document.getElementById('yearFilter').value;
  let filtered=state.trending.filter(m=>{
    const title=(m.title.english||m.title.romaji||'').toLowerCase();
    return (!search||title.includes(search)||m.genres.some(g=>g.toLowerCase().includes(search)))&&(!genre||m.genres.includes(genre))&&(!format||m.format===format)&&(!year||String(m.seasonYear)===year);
  });
  renderGrid('trendingGrid',filtered);
  renderGrid('seasonGrid',state.seasonal);
  renderGrid('currentGrid',state.current);
  renderWatchlist();
}

function renderWatchlist(){const list=[...watchlist].map(id=>[...state.trending,...state.seasonal,...state.current].find(m=>String(m.id)===id)).filter(Boolean);renderGrid('watchlistGrid',list)}

function toggleSave(id){id=String(id);if(watchlist.has(id)){watchlist.delete(id);showToast('Removed from watchlist')}else{watchlist.add(id);showToast('Added to watchlist')}localStorage.setItem('animeverse-watchlist',JSON.stringify([...watchlist]));applyFilters();updateSavedButtons(id)}

function updateSavedButtons(id){document.querySelectorAll(`[data-save="${id}"]`).forEach(button=>{const saved=watchlist.has(String(id));button.classList.toggle('saved',saved);if(button.classList.contains('primary')||button.classList.contains('secondary-btn'))button.textContent=saved?'✓ In My List':'＋ My List';else if(button.classList.contains('save-button'))button.textContent=saved?'✓':'+'})}

function providerLinks(title){
  return `<div class="detail-actions"><a href="${providerSearch.Crunchyroll(title)}" target="_blank" rel="noopener">Watch on Crunchyroll ↗</a><a href="${providerSearch.Netflix(title)}" target="_blank" rel="noopener" style="background:#e50914">Search Netflix ↗</a><a href="${providerSearch.Hulu(title)}" target="_blank" rel="noopener" style="background:#1db954">Search Hulu ↗</a><button data-save-detail="${title}">＋ Watchlist</button></div>`;
}

async function openDetail(id){
  const modal=document.getElementById('detailModal'),content=document.getElementById('detailContent');
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  content.innerHTML=`<div class="detail-hero"><img src="" alt=""></div><div class="detail-body"><h2>Loading…</h2></div>`;
  try{
    const data=await anilist(`query($id:Int){Media(id:$id,type:ANIME){id title{romaji english native} coverImage{extraLarge} bannerImage description(asHtml:false) episodes status season seasonYear averageScore genres format studios(isMain:true){nodes{name}} trailer{id site thumbnail} characters(perPage:8,sort:[ROLE]){edges{role voiceActors(language:JAPANESE,sort:[RELEVANCE]){id name{full} image{large}} node{id name{full} image{large}}}}}}`,{id:Number(id)});
    const m=data.Media,title=titleOf(m);const banner=m.bannerImage||m.coverImage.extraLarge;
    const characters=(m.characters?.edges||[]).map(c=>`<div class="character-card"><img src="${c.node.image?.large||''}" alt="${c.node.name.full}"><div><b>${c.node.name.full}</b><span>${c.role}${c.voiceActors?.[0]?` · ${c.voiceActors[0].name.full}`:''}</span></div></div>`).join('');
    const episodeCount=Math.min(m.episodes||12,12);
    const episodes=Array.from({length:episodeCount},(_,i)=>`<div class="episode-card"><span>EPISODE ${i+1}</span><strong>${i===0?'First episode':i===episodeCount-1?'Latest / Finale':'Official stream'}</strong></div>`).join('');
    const trailer=m.trailer?.site==='youtube'?`<a href="https://www.youtube.com/watch?v=${m.trailer.id}" target="_blank" rel="noopener" style="background:#b91c1c">Watch Trailer ↗</a>`:'';
    content.innerHTML=`<div class="detail-hero"><img src="${banner}" alt="${title}"><button class="modal-close" data-close-modal aria-label="Close">×</button></div><div class="detail-body"><h2>${title}</h2><div class="detail-meta">${m.seasonYear||'—'} · ${formatName(m.format)} · ${m.episodes||'Ongoing'} episodes · ★ ${((m.averageScore||0)/10).toFixed(1)} · ${m.genres.join(', ')}</div><p class="detail-description">${cleanDescription(m.description).replace(/&/g,'&amp;')}</p>${providerLinks(title)}${trailer?`<div class="detail-actions">${trailer}</div>`:''}<div class="availability"><strong>Regional availability:</strong> Catalog access for ${document.getElementById('regionFilter').selectedOptions[0].text} varies by provider and license. Use the official search links above to verify the exact series and episode.</div><h3 class="detail-subtitle">Episodes</h3><div class="episode-list">${episodes}</div><h3 class="detail-subtitle">Characters & Voice Actors</h3><div class="character-grid">${characters||'<div class="empty-state">Character information unavailable.</div>'}</div></div>`;
  }catch(error){content.innerHTML=`<div class="detail-body"><h2>Could not load anime</h2><p>${error.message}</p></div>`}
}

function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200)}

loadAnime();

document.addEventListener('click',async e=>{
  const save=e.target.closest('[data-save]');if(save){e.stopPropagation();toggleSave(save.dataset.save);return}
  const detail=e.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return}
  if(e.target.closest('[data-close-modal]')){document.getElementById('detailModal').classList.remove('open');document.getElementById('detailModal').setAttribute('aria-hidden','true');document.body.style.overflow='';}
});

document.getElementById('filterButton').addEventListener('click',()=>document.getElementById('filterPanel').classList.toggle('open'));
document.getElementById('searchButton').addEventListener('click',()=>{document.getElementById('browse').scrollIntoView({behavior:'smooth'});setTimeout(()=>document.getElementById('searchInput').focus(),500)});
document.getElementById('watchlistButton').addEventListener('click',()=>document.querySelector('.saved-section').scrollIntoView({behavior:'smooth'}));
document.getElementById('themeButton').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('animeverse-theme',document.body.classList.contains('light')?'light':'dark')});
document.getElementById('searchInput').addEventListener('input',()=>{clearTimeout(state.searchTimer);state.searchTimer=setTimeout(applyFilters,180)});
['genreFilter','formatFilter','yearFilter'].forEach(id=>document.getElementById(id).addEventListener('change',applyFilters));
document.getElementById('regionFilter').addEventListener('change',e=>showToast(`Region set to ${e.target.selectedOptions[0].text}`));
document.getElementById('clearFilters').addEventListener('click',()=>{['genreFilter','formatFilter','yearFilter'].forEach(id=>document.getElementById(id).value='');document.getElementById('searchInput').value='';applyFilters()});
document.getElementById('clearWatchlist').addEventListener('click',()=>{watchlist.clear();localStorage.removeItem('animeverse-watchlist');applyFilters();showToast('Watchlist cleared')});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();document.getElementById('searchInput').focus()}if(e.key==='Escape'){document.getElementById('detailModal').classList.remove('open');document.body.style.overflow=''}});
if(localStorage.getItem('animeverse-theme')==='light')document.body.classList.add('light');
