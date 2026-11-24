(function(){
 const root=document.documentElement,saved=localStorage.getItem('etude-theme');root.dataset.theme=saved||'light';
 const toggle=document.querySelector('[data-theme-toggle]');function sync(){if(toggle)toggle.textContent=root.dataset.theme==='dark'?'☀':'☾'}sync();
 if(toggle)toggle.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';localStorage.setItem('etude-theme',root.dataset.theme);sync()});
 const drawer=document.querySelector('.drawer'),scrim=document.querySelector('.drawer-scrim');function close(){if(drawer)drawer.classList.remove('open');if(scrim)scrim.classList.remove('open');document.body.style.overflow=''}
 const openBtn=document.querySelector('[data-menu-open]'),closeBtn=document.querySelector('[data-menu-close]');if(openBtn)openBtn.addEventListener('click',()=>{drawer.classList.add('open');scrim.classList.add('open');document.body.style.overflow='hidden'});if(closeBtn)closeBtn.addEventListener('click',close);if(scrim)scrim.addEventListener('click',close);if(drawer)drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.querySelectorAll('[data-new-until]').forEach(el=>{if(Date.now()>=new Date(el.dataset.newUntil).getTime()){const badge=el.querySelector('.new-badge')||el;if(badge)badge.remove()}});
 const lightbox=document.querySelector('.lightbox');if(lightbox){const img=lightbox.querySelector('img'),caption=lightbox.querySelector('[data-lightbox-caption]'),counter=lightbox.querySelector('[data-lightbox-counter]');let items=[],index=0,startX=0;
 function show(){const item=items[index];if(!item)return;img.src=item.dataset.fullImage;img.alt=item.querySelector('img')?.alt||'Фотография';caption.textContent=img.alt;counter.textContent=(index+1)+' / '+items.length}
 function open(item){const gallery=item.closest('[data-gallery]');items=Array.from(gallery.querySelectorAll('[data-full-image]'));index=items.indexOf(item);show();lightbox.classList.add('open');document.body.style.overflow='hidden'}
 function shut(){lightbox.classList.remove('open');document.body.style.overflow='';img.src=''}function prev(){index=(index-1+items.length)%items.length;show()}function next(){index=(index+1)%items.length;show()}
 document.querySelectorAll('[data-full-image]').forEach(btn=>btn.addEventListener('click',()=>open(btn)));lightbox.querySelector('[data-lightbox-close]').addEventListener('click',shut);lightbox.querySelector('[data-lightbox-prev]').addEventListener('click',prev);lightbox.querySelector('[data-lightbox-next]').addEventListener('click',next);lightbox.addEventListener('click',e=>{if(e.target===lightbox)shut()});lightbox.addEventListener('touchstart',e=>{startX=e.changedTouches[0].clientX},{passive:true});lightbox.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>45){dx<0?next():prev()}},{passive:true});
 document.addEventListener('keydown',e=>{if(!lightbox.classList.contains('open'))return;if(e.key==='Escape')shut();if(e.key==='ArrowLeft')prev();if(e.key==='ArrowRight')next()});}
 // Independent reactions for each article: Netlify Function + Supabase.
const groups = Array.from(document.querySelectorAll('[data-reactions]'));

if (groups.length) {
  const issueIds = [...new Set(
    groups.map(group => group.dataset.reactionId).filter(Boolean)
  )];

  const deviceKey = 'etude-device-id-v1';
  let deviceId = localStorage.getItem(deviceKey);

  if (!deviceId) {
    deviceId = crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 3 | 8)).toString(16);
        });

    localStorage.setItem(deviceKey, deviceId);
  }

  issueIds.forEach(issueId => {
    const articleGroups = groups.filter(
      group => group.dataset.reactionId === issueId
    );

    const voteKey = 'etude-vote-' + issueId;

    let vote = localStorage.getItem(voteKey);
    let likes = 0;
    let busy = false;

    function render(message) {
      articleGroups.forEach(group => {
        group.querySelectorAll('[data-vote]').forEach(btn => {
          btn.setAttribute(
            'aria-pressed',
            vote === btn.dataset.vote ? 'true' : 'false'
          );
          btn.disabled = busy;
        });

        const count = group.querySelector('[data-count="up"]');
        if (count) count.textContent = String(likes);

        const note = group.parentElement.querySelector('[data-reaction-note]');
        if (note && message) note.textContent = message;
      });
    }

    async function refresh() {
      try {
        const response = await fetch(
          '/.netlify/functions/reactions?issueId=' +
          encodeURIComponent(issueId) +
          '&deviceId=' + encodeURIComponent(deviceId),
          { cache: 'no-store' }
        );

        if (!response.ok) throw new Error('Не удалось загрузить реакции');

        const data = await response.json();

        likes = Number(data.likes) || 0;
        vote = data.vote === 'up' || data.vote === 'down'
          ? data.vote
          : null;

        if (vote) localStorage.setItem(voteKey, vote);
        else localStorage.removeItem(voteKey);

        render();
      } catch (error) {
        render('Не удалось загрузить общий счётчик. Проверь подключение к интернету.');
        console.error(error);
      }
    }

    async function submitVote(selected) {
      if (busy) return;

      busy = true;
      render();

      try {
        const next = vote === selected ? null : selected;

        const response = await fetch('/.netlify/functions/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueId,
            deviceId,
            vote: next
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Не удалось сохранить реакцию');
        }

        likes = Number(data.likes) || 0;
        vote = data.vote === 'up' || data.vote === 'down'
          ? data.vote
          : null;

        if (vote) localStorage.setItem(voteKey, vote);
        else localStorage.removeItem(voteKey);

        render(next === null
          ? 'Реакция убрана. Если захочешь, можно выбрать её снова.'
          : next === 'up'
            ? 'Спасибо за поддержку! ♥'
            : 'Спасибо за честный отзыв — будем становиться лучше.');

        if (next) {
          articleGroups.forEach(group => {
            const chosen = group.querySelector('[data-vote="' + next + '"]');
            if (chosen) {
              void chosen.offsetWidth;
              chosen.classList.add('is-animated');
            }
          });
        }
      } catch (error) {
        render('Не удалось сохранить реакцию. Попробуй ещё раз.');
        console.error(error);
      } finally {
        busy = false;
        render();
      }
    }

    articleGroups.forEach(group => {
      group.querySelectorAll('[data-vote]').forEach(btn => {
        btn.addEventListener('click', () => submitVote(btn.dataset.vote));
      });
    });

    render();
    refresh();

    window.addEventListener('focus', refresh);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });

    setInterval(refresh, 60000);
  });
}
})();
