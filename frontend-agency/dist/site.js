(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.getElementById('theme-toggle');
  const applyTheme = value => {
    const dark = value === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    if (themeButton) {
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.setAttribute('aria-label', dark ? 'Switch to day mode' : 'Switch to night mode');
      themeButton.title = dark ? 'Switch to day mode' : 'Switch to night mode';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#17291D' : '#556B2F';
  };
  applyTheme(root.dataset.theme);
  if (themeButton) {
    themeButton.hidden = false;
    themeButton.addEventListener('click', () => {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem('ap-tech-theme', theme); } catch {}
    });
  }
  window.addEventListener('storage', event => {
    if (event.key === 'ap-tech-theme') applyTheme(event.newValue);
  });

  const header = document.querySelector('.floating-header');
  const menuButton = header?.querySelector('.nav-toggle');
  const closeMenu = () => {
    if (!header || !menuButton) return;
    header.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  const chat = document.getElementById('chat-panel');
  const launcher = document.getElementById('chat-launcher');
  const chatClose = document.getElementById('chat-close');
  const setChat = (open, restoreFocus = true) => {
    if (!chat || !launcher) return;
    chat.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close WhatsApp message' : 'Open WhatsApp message');
    if (open) {
      closeMenu();
      chatClose?.focus({preventScroll:true});
    } else if (restoreFocus) launcher.focus({preventScroll:true});
  };
  if (header && menuButton) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      setChat(false, false);
      header.classList.toggle('menu-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
    window.matchMedia('(max-width: 1180px)').addEventListener('change', closeMenu);
  }
  if (chat && launcher) {
    const message = chat.querySelector('textarea');
    const link = document.getElementById('chat-whatsapp');
    const topics = [...chat.querySelectorAll('[data-chat-topic]')];
    let selected = '';
    const updateLink = () => {
      const parts = ['Hi AP Tech Agency!'];
      if (selected) parts.push('I’d like to discuss: ' + selected + '.');
      if (message.value.trim()) parts.push(message.value.trim());
      const url = new URL('https://wa.me/8801799664826');
      url.searchParams.set('text', parts.join('\n\n'));
      link.href = url.href;
    };
    topics.forEach(button => button.addEventListener('click', () => {
      selected = selected === button.dataset.chatTopic ? '' : button.dataset.chatTopic;
      topics.forEach(topic => topic.setAttribute('aria-pressed', String(topic.dataset.chatTopic === selected)));
      updateLink();
    }));
    message.addEventListener('input', updateLink);
    launcher.addEventListener('click', () => setChat(chat.hidden));
    chatClose.addEventListener('click', () => setChat(false));
    updateLink();
    launcher.hidden = false;
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (chat && !chat.hidden) { event.preventDefault(); setChat(false); }
    else if (menuButton?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus({preventScroll:true});
    }
  });

  document.querySelectorAll('[data-tabs]').forEach(widget => {
    const tabs = [...widget.querySelectorAll('[role="tab"]')];
    const select = tab => {
      tabs.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
      });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(tabs[next]); tabs[next].focus(); }
      });
    });
  });

  document.querySelectorAll('[data-review-list]').forEach(section => {
    const cards=[...section.querySelectorAll('[data-review-card]')];
    const more=section.querySelector('[data-review-more]');
    const count=section.querySelector('[data-review-count]');
    let visible=Math.min(3,cards.length);
    const update=()=>{cards.forEach((card,index)=>{card.hidden=index>=visible;});if(more){more.hidden=visible>=cards.length;more.textContent=`Show more reviews (${cards.length-visible} remaining)`;}if(count)count.textContent=`Showing ${visible} of ${cards.length} reviews`;};
    more?.addEventListener('click',()=>{visible=Math.min(visible+3,cards.length);update();});
    update();
  });

  document.querySelectorAll('[data-filter-area]').forEach(area => {
    const buttons = [...area.querySelectorAll('[data-filter]')];
    const cards = [...area.querySelectorAll('[data-filter-item]')];
    const search = area.querySelector('[data-filter-search]');
    const empty = area.querySelector('[data-filter-empty]');
    const status = area.querySelector('[data-filter-status]');
    const more = area.querySelector('[data-filter-more]');
    const moreWrap = area.querySelector('[data-filter-more-wrap]');
    const pageSize = Math.max(1, Number(area.dataset.pageSize) || cards.length);
    const param = area.dataset.filterParam;
    const requested = param ? new URLSearchParams(location.search).get(param) : null;
    let selected = buttons.some(button => button.dataset.filter === requested) ? requested : 'all';
    let limit = pageSize;
    let matches = [];
    const syncURL = () => {
      if (!param) return;
      const url = new URL(location.href);
      if (selected === 'all') url.searchParams.delete(param);
      else url.searchParams.set(param, selected);
      history.replaceState(null, '', url);
    };
    const update = () => {
      const query = (search?.value || '').toLowerCase().trim();
      let visible = 0;
      matches = [];
      cards.forEach(card => {
        const categoryMatch = selected === 'all' || card.dataset.filterItem.split(' ').includes(selected);
        const match = categoryMatch && (card.dataset.searchText || card.textContent).toLowerCase().includes(query);
        if (match) matches.push(card);
        card.hidden = !match || matches.length > limit;
        if (!card.hidden) visible++;
      });
      if (empty) empty.hidden = matches.length > 0;
      if (status) status.textContent = visible < matches.length ? `Showing ${visible} of ${matches.length} projects` : `${matches.length} ${matches.length === 1 ? 'project' : 'projects'}`;
      if (moreWrap) moreWrap.hidden = visible >= matches.length;
      if (more) more.textContent = `Show more projects (${matches.length - visible} remaining)`;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === selected)));
    };
    buttons.forEach(button => button.addEventListener('click', () => { selected = button.dataset.filter; limit = pageSize; update(); syncURL(); }));
    search?.addEventListener('input', () => { limit = pageSize; update(); });
    area.querySelector('[data-filter-reset]')?.addEventListener('click', () => { selected='all'; limit=pageSize; if(search) search.value=''; update(); syncURL(); search?.focus(); });
    more?.addEventListener('click', () => {
      const next = matches[limit];
      limit += pageSize;
      update();
      next?.focus({preventScroll:true});
    });
    update();
  });

  const variantGalleries = new Map();
  document.querySelectorAll('[data-project-gallery]').forEach(area => {
    const cards = [...area.querySelectorAll('[data-variant-card]')];
    const group = area.querySelector('[data-variant-group-select]');
    const type = area.querySelector('[data-variant-type-select]');
    const search = area.querySelector('[data-variant-search]');
    const status = area.querySelector('[data-variant-status]');
    const empty = area.querySelector('[data-variant-empty]');
    const more = area.querySelector('[data-variant-more]');
    const moreWrap = area.querySelector('[data-variant-more-wrap]');
    const pageSize = Math.max(1, Number(area.dataset.variantPageSize) || 12);
    const state = {matches:[], filtered:false, label:'All project screens'};
    let limit = pageSize;
    const update = () => {
      const query = search.value.trim().toLocaleLowerCase();
      state.matches = cards.filter(card => (!group.value || card.dataset.variantGroup === group.value) && (!type.value || card.dataset.variantKind === type.value) && (!query || card.dataset.variantSearch.toLocaleLowerCase().includes(query)));
      state.filtered = Boolean(group.value || type.value || query);
      state.label = group.value || (query ? 'Search results' : type.value==='image' ? 'Image previews' : type.value==='source' ? 'Figma sources' : 'All project screens');
      const visible = new Set(state.matches.slice(0, limit));
      cards.forEach(card => { card.hidden = !visible.has(card); });
      const count = state.matches.length;
      const shown = Math.min(limit, count);
      status.textContent = shown < count ? `Showing ${shown} of ${count} screens` : `${count} ${count === 1 ? 'screen' : 'screens'}`;
      empty.hidden = count > 0;
      moreWrap.hidden = shown >= count;
      more.textContent = `Show more screens (${count - shown} remaining)`;
    };
    group.addEventListener('change', () => { limit = pageSize; update(); });
    type.addEventListener('change', () => { limit = pageSize; update(); });
    search.addEventListener('input', () => { limit = pageSize; update(); });
    area.querySelector('[data-variant-reset]').addEventListener('click', () => { group.value=''; type.value=''; search.value=''; limit=pageSize; update(); search.focus(); });
    more.addEventListener('click', () => {
      const next = state.matches[limit];
      limit += pageSize;
      update();
      next?.querySelector('a')?.focus();
    });
    area.querySelector('[data-variant-controls]').hidden = false;
    variantGalleries.set(area,state);
    update();
  });

  const viewer = document.getElementById('design-viewer');
  const previewLinks = [...document.querySelectorAll('[data-design-preview]')];
  const uniquePreviews = new Map();
  previewLinks.forEach(link => {
    const src = link.dataset.previewSrc;
    const entry={src,alt:link.dataset.previewAlt,label:link.dataset.previewLabel,group:link.dataset.previewGroup};
    if(!uniquePreviews.has(src))uniquePreviews.set(src,entry);
    else if(link.closest('[data-project-gallery]'))Object.assign(uniquePreviews.get(src),entry);
  });
  const allPreviews = [...uniquePreviews.values()];
  if (viewer && allPreviews.length && typeof viewer.showModal === 'function') {
    const image = viewer.querySelector('[data-preview-image]');
    const canvas = viewer.querySelector('[data-preview-canvas]');
    const counter = viewer.querySelector('[data-preview-counter]');
    const label = viewer.querySelector('[data-preview-label]');
    const scope = viewer.querySelector('[data-preview-scope]');
    const jump = viewer.querySelector('[data-preview-jump]');
    const previous = viewer.querySelector('[data-preview-prev]');
    const next = viewer.querySelector('[data-preview-next]');
    const zoom = viewer.querySelector('[data-preview-zoom]');
    const original = viewer.querySelector('[data-preview-original]');
    const close = viewer.querySelector('[data-preview-close]');
    const loading = viewer.querySelector('[data-preview-loading]');
    const error = viewer.querySelector('[data-preview-error]');
    let pool = allPreviews;
    let active = 0;
    let opener = null;
    let savedOverflow = '';
    const setZoom = full => {
      viewer.classList.toggle('is-full-size', full);
      zoom.setAttribute('aria-pressed', String(full));
      zoom.textContent = full ? 'Fit width' : 'Full size';
      canvas.scrollTop = 0;
      canvas.scrollLeft = 0;
    };
    const loaded = () => {
      if(!image.complete || !image.naturalWidth)return;
      loading.hidden = true;
      image.hidden = false;
      canvas.setAttribute('aria-busy','false');
    };
    const show = index => {
      active = (index + pool.length) % pool.length;
      const preview = pool[active];
      error.hidden = true;
      loading.hidden = false;
      image.hidden = true;
      canvas.setAttribute('aria-busy','true');
      image.alt = preview.alt;
      image.src = preview.src;
      original.href = preview.src;
      label.textContent = preview.label;
      counter.textContent = `${active + 1} / ${pool.length}`;
      jump.value = String(active);
      previous.hidden = next.hidden = pool.length < 2;
      jump.disabled = pool.length < 2;
      setZoom(false);
      loaded();
    };
    const setPool = (preview, state) => {
      const keys = state ? new Set(state.matches.map(card => card.querySelector('[data-design-preview]')?.dataset.previewSrc).filter(Boolean)) : null;
      pool = keys ? allPreviews.filter(item => keys.has(item.src)) : allPreviews;
      if(!pool.some(item => item.src === preview.dataset.previewSrc))pool = allPreviews;
      const groups = new Map();
      jump.replaceChildren();
      pool.forEach((item,index) => {
        let parent = jump;
        if(item.group){
          if(!groups.has(item.group)){
            const optgroup = document.createElement('optgroup');
            optgroup.label = item.group;
            groups.set(item.group,optgroup);
            jump.append(optgroup);
          }
          parent = groups.get(item.group);
        }
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = item.label;
        parent.append(option);
      });
      scope.textContent = `${state?.filtered&&state.label!=='Image previews' ? state.label+' · ' : ''}Image previews · Esc to close`;
      return pool.findIndex(item => item.src === preview.dataset.previewSrc);
    };
    previewLinks.forEach(preview => preview.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = preview;
      const state = variantGalleries.get(preview.closest('[data-project-gallery]'));
      show(setPool(preview,state));
      closeMenu();
      setChat(false, false);
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      viewer.showModal();
      close.focus({preventScroll:true});
    }));
    close.addEventListener('click', () => viewer.close());
    previous.addEventListener('click', () => show(active - 1));
    next.addEventListener('click', () => show(active + 1));
    jump.addEventListener('change', () => show(Number(jump.value)));
    zoom.addEventListener('click', () => setZoom(!viewer.classList.contains('is-full-size')));
    image.addEventListener('load', loaded);
    image.addEventListener('error', () => { image.hidden=true; loading.hidden=true; error.hidden=false; canvas.setAttribute('aria-busy','false'); });
    viewer.addEventListener('click', event => {
      if (event.target !== viewer) return;
      const bounds = viewer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
    });
    viewer.addEventListener('keydown', event => {
      if(event.target.matches('input,select,textarea'))return;
      if (event.target === canvas && viewer.classList.contains('is-full-size')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(active + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    viewer.addEventListener('close', () => {
      document.body.style.overflow = savedOverflow;
      opener?.focus({preventScroll:true});
    });
  }

  const finder = document.getElementById('service-finder');
  if (finder) {
    const suggestions = {
      website: {title:'Website development', description:'A custom website or web app built for the way your business works.', href:'/services/website-development/'},
      manage: {title:'WordPress websites', description:'A WordPress website your team can edit and grow.', href:'/services/wordpress/'},
      design: {title:'UI/UX design', description:'Make your website or app easier to understand and use.', href:'/services/ui-ux-design/'},
      sell: {title:'Ecommerce', description:'Help customers find products, place orders and check out.', href:'/services/ecommerce/'},
      automate: {title:'AI automation · Our core service', description:'Handle customer chats, calls, orders and bookings with less manual work.', href:'/services/ai-automation/'},
      improve: {title:'Website care', description:'Plan updates, fix issues and keep your website running smoothly.', href:'/services/website-care/'}
    };
    const output = finder.querySelector('[data-finder-result]');
    finder.addEventListener('change', () => {
      const choice = suggestions[finder.querySelector('select').value];
      output.hidden = !choice;
      if (!choice) return;
      output.querySelector('h3').textContent = choice.title;
      output.querySelector('p').textContent = choice.description;
      output.querySelector('a').href = choice.href;
    });
  }

  const form = document.getElementById('project-form');
  if (form) {
    form.querySelector('.form-submit').disabled = false;
    const service = form.elements.service;
    const requested = new URLSearchParams(location.search).get('service');
    if ([...service.options].some(option => option.value === requested)) service.value = requested;
    const automationFields = document.getElementById('automation-fields');
    const automationGoal = form.elements.automation_goal;
    const syncServiceFields = () => {
      const isAI = service.value === 'ai-automation';
      if (automationFields) automationFields.hidden = !isAI;
      if (automationGoal) automationGoal.disabled = !isAI;
    };
    syncServiceFields();
    service.addEventListener('change', syncServiceFields);
    const result = document.getElementById('brief-result');
    const preview = document.getElementById('brief-output');
    const status = document.getElementById('brief-status');
    const updateBrief = () => {
      const fields = form.elements;
      const lines = ['Project brief for AP Tech Agency', '', 'Name: '+fields.name.value.trim(), 'Email: '+fields.email.value.trim(), 'Service: '+service.selectedOptions[0].text];
      if (service.value === 'ai-automation' && automationGoal) lines.push('First task to automate: '+automationGoal.selectedOptions[0].text);
      if (fields.website.value.trim()) lines.push('Current website: '+fields.website.value.trim());
      lines.push('Budget: '+fields.budget.selectedOptions[0].text, 'Timing: '+fields.timing.selectedOptions[0].text, '', 'About the project:', fields.message.value.trim());
      const text = lines.join('\n');
      preview.value = text;
      const whatsapp = new URL('https://wa.me/8801799664826');
      whatsapp.searchParams.set('text', text);
      document.getElementById('brief-whatsapp').href = whatsapp.href;
      document.getElementById('brief-email').href = 'mailto:info@aptechagency.com?subject='+encodeURIComponent('Project enquiry · '+service.selectedOptions[0].text)+'&body='+encodeURIComponent(text);
      return text;
    };
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements.name.value.trim().length < 2) { form.elements.name.setCustomValidity('Please enter your name.'); form.elements.name.reportValidity(); return; }
      if (form.elements.message.value.trim().length < 20) { form.elements.message.setCustomValidity('Please add at least 20 characters about your project.'); form.elements.message.reportValidity(); return; }
      updateBrief();
      document.dispatchEvent(new CustomEvent('aptech:brief-ready'));
      result.hidden = false;
      status.textContent = 'Your brief is ready. Choose how you would like to share it.';
      result.querySelector('h2').focus({preventScroll:true});
      result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    });
    form.addEventListener('input', event => {
      if (event.target.setCustomValidity) event.target.setCustomValidity('');
      if (!result.hidden) { result.hidden = true; status.textContent = ''; }
    });
    form.addEventListener('change', () => { if (!result.hidden) { result.hidden = true; status.textContent = ''; } });
    document.getElementById('copy-brief').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(preview.value); status.textContent='Copied. Your brief is ready to share.'; }
      catch { preview.focus(); preview.select(); status.textContent='Your brief is selected. Use your device’s Copy command.'; }
    });
    document.getElementById('download-brief').addEventListener('click', () => {
      const url=URL.createObjectURL(new Blob([preview.value], {type:'text/plain;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='AP-Tech-project-brief.txt';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent='Your project brief download is ready.';
    });
  }
})();
