/* Helper: safe escape */
function esc(s){ 
  return (s||'').replace(/[&<>"']/g, m => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  )); 
}

/* MOBILE SIDEBAR TOGGLE */
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("open");
}
document.addEventListener("click", e => {
  if (window.innerWidth < 920){
    const sb = document.getElementById("sidebar");
    if (!sb.contains(e.target) && !e.target.classList.contains("mobile-toggle")){
      sb.classList.remove("open");
    }
  }
});

/* DARK MODE TOGGLE */
document.getElementById("darkToggle").onclick = () => {
  document.body.classList.toggle("dark");
  const btn = document.getElementById("darkToggle");
  if(document.body.classList.contains('dark')){
    document.documentElement.style.setProperty('--card','#0b1220');
    btn.textContent = 'Light';
  } else {
    document.documentElement.style.setProperty('--card','#ffffff');
    btn.textContent = 'Dark';
  }
};

/* SUB-BUTTON active state */
document.querySelectorAll('.sub-btn').forEach(b=>{
  b.addEventListener('click', function(){
    document.querySelectorAll('.sub-btn').forEach(s=>s.classList.remove('active'));
    this.classList.add('active');
  });
});

/* SIDEBAR SEARCH & CLEAR */
const sidebarSearch = document.getElementById('sidebarSearch');
const sidebarClear = document.getElementById('sidebarClear');

if(sidebarSearch){
  sidebarSearch.addEventListener('input', function(){
    const q = this.value.trim().toLowerCase();
    filterSidebarAndPosts(q);
    if(window.innerWidth <= 920){
      if(q) document.getElementById('sidebar').classList.add('open');
      else document.getElementById('sidebar').classList.remove('open');
    }
  });
}
if(sidebarClear){
  sidebarClear.addEventListener('click', function(){
    if(sidebarSearch) sidebarSearch.value = '';
    filterSidebarAndPosts('');
  });
}

/* ======================================================
   POSTS LOADER (Guaranteed thumbnails) & helpers
   ====================================================== */
function extractImg(html){
  if(!html) return null;
  const div = document.createElement('div');
  div.innerHTML = html;
  const img = div.querySelector('img');
  if(!img) return null;
  const attrs = ['data-src','data-original','data-lazy','data-echo','src'];
  for(const a of attrs){
    const v = img.getAttribute(a);
    if(v) return v;
  }
  return img.src || null;
}

function buildExcerpt(html, len=180){
  const txt = html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  return txt.length > len ? txt.slice(0,len) + '...' : txt;
}

function loadLabel(label, btnRef){
  const container = document.getElementById('postContainer') || document.getElementById('postsContainer');
  const showing = document.getElementById('showingInfo') || document.getElementById('currentLabel');
  showing.textContent = 'Showing: ' + label;
  container.innerHTML = '<div style="padding:40px;text-align:center;color:#888">Loading…</div>';

  const encoded = encodeURIComponent(label);
  const feedUrl = (label === "Coding") ? `/feeds/posts/default/-/${encoded}?alt=json&max-results=30` : `/feeds/posts/default/-/${encoded}?alt=json&max-results=30`;

  fetch(feedUrl)
    .then(r => {
      if(!r.ok) throw new Error('Network error');
      return r.json();
    })
    .then(data => {
      const items = (data.feed && data.feed.entry) ? data.feed.entry : [];
      if(items.length === 0){
        container.innerHTML = `<div style="padding:40px;text-align:center;color:#888">No posts under "${label}"</div>`;
        return;
      }

      let out = '';
      items.forEach(e => {
        const title = e.title?.$t || 'Untitled';
        let link = '#';
        if(e.link){
          const alt = e.link.find(l => l.rel === 'alternate');
          if(alt) link = alt.href;
        }

        const htmlContent = e.content?.$t || e.summary?.$t || '';
        let thumb = extractImg(htmlContent);
        if(!thumb && e.media$thumbnail){
          try{
            thumb = e.media$thumbnail.url.replace(/\/s72-c/,'/s600');
          }catch(err){
            thumb = e.media$thumbnail.url;
          }
        }
        if(!thumb){
          thumb = 'https://via.placeholder.com/800x600?text=No+Image';
        }

        const excerpt = buildExcerpt(htmlContent, 180);

        out += `
          <article class="post-card">
            <a class="post-thumb" href="${esc(link)}" target="_blank" rel="noopener">
              <img src="${esc(thumb)}" loading="lazy" alt="${esc(title)}">
            </a>
            <div class="post-body">
              <a class="post-title" href="${esc(link)}" target="_blank" rel="noopener">${esc(title)}</a>
              <div class="post-excerpt">${esc(excerpt)}</div>
              <div class="meta-row">
                <div class="badge">Label: ${esc(label)}</div>
                <div style="flex:1"></div>
                <button class="btn" onclick="window.open('${esc(link)}','_blank')">Open post</button>
              </div>
            </div>
          </article>
        `;
      });

      container.innerHTML = out;
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = `<div style="padding:40px;text-align:center;color:#c33">Failed to load posts</div>`;
    });
}

/* SUB-BUTTONS: load their specific label and main category toggles */
document.addEventListener('click', function(e){
  const sb = e.target.closest('.sub-btn');
  if(sb){
    const label = sb.dataset.sub || sb.textContent.trim();
    document.querySelectorAll('.sub-btn').forEach(x => x.classList.remove('active'));
    sb.classList.add('active');
    loadLabel(label);
  }

  const cm = e.target.closest('.cat-main');
  if(cm){
    const parent = cm.dataset.cat || cm.textContent.trim();
    document.querySelectorAll('.sub-wrap').forEach(w => w.style.display = 'none');
    const wrap = cm.nextElementSibling;
    if(wrap && wrap.classList.contains('sub-wrap')){
      wrap.style.display = (wrap.style.display === 'flex') ? 'none' : 'flex';
      wrap.style.flexDirection = 'column';
    }
    loadLabel(parent);
    document.querySelectorAll('.cat-main').forEach(x => x.classList.remove('active'));
    cm.classList.add('active');
  }
});

/* SIDEBAR SEARCH (filter categories + posts) */
function filterSidebarAndPosts(q){
  q = (q||'').toString().trim().toLowerCase();
  const mains = document.querySelectorAll('.cat-main');
  const subs = document.querySelectorAll('.sub-btn');
  const wraps = document.querySelectorAll('.sub-wrap');
  const posts = document.querySelectorAll('#postContainer .post-card, #postsContainer .post-card');

  if(!q){
    mains.forEach(m => m.style.display = '');
    subs.forEach(s => s.style.display = '');
    wraps.forEach(w => w.style.display = 'none');
    posts.forEach(p => p.style.display = '');
    return;
  }

  // filter posts
  posts.forEach(p => {
    const title = (p.querySelector('.post-title')?.textContent || '').toLowerCase();
    const excerpt = (p.querySelector('.post-excerpt')?.textContent || '').toLowerCase();
    const badges = (p.querySelector('.badges')?.textContent || '').toLowerCase();
    const labelBadge = (p.querySelector('.meta-row .badge')?.textContent || '').toLowerCase();
    p.style.display = (title.includes(q) || excerpt.includes(q) || badges.includes(q) || labelBadge.includes(q)) ? '' : 'none';
  });

  // filter sidebar labels
  mains.forEach(main => {
    const mainText = main.textContent.toLowerCase();
    let matchMain = mainText.includes(q);
    let matchSub = false;

    const childSubs = document.querySelectorAll(`.sub-wrap .sub-btn`);
    childSubs.forEach(sub => {
      const subText = sub.textContent.toLowerCase();
      if(subText.includes(q)){
        sub.style.display = 'block';
        matchSub = true;
      } else {
        sub.style.display = 'none';
      }
    });

    if(matchMain || matchSub){
      main.style.display = 'flex';
      if(matchSub){
        const wrap = main.nextElementSibling;
        if(wrap && wrap.classList.contains('sub-wrap')){
          wrap.style.display = 'flex';
          wrap.style.flexDirection = 'column';
        }
      }
    } else {
      main.style.display = 'none';
    }
  });
}

/* attach search listeners */
if(sidebarSearch){
  sidebarSearch.addEventListener('input', e => filterSidebarAndPosts(e.target.value));
}

/* quick post search helper */
function quickPostSearch(q){
  q = (q||'').toString().trim().toLowerCase();
  const posts = document.querySelectorAll('#postContainer .post-card, #postsContainer .post-card');
  if(!q){ posts.forEach(p=>p.style.display=''); return; }
  posts.forEach(p=>{
    const title = (p.querySelector('.post-title')?.textContent || '').toLowerCase();
    const excerpt = (p.querySelector('.post-excerpt')?.textContent || '').toLowerCase();
    const labelBadge = (p.querySelector('.meta-row .badge')?.textContent || '').toLowerCase();
    p.style.display = (title.includes(q) || excerpt.includes(q) || labelBadge.includes(q)) ? '' : 'none';
  });
}

/* AUTO-LOAD DEFAULT = Coding */
document.addEventListener("DOMContentLoaded", () => {
  loadLabel("Coding");
});