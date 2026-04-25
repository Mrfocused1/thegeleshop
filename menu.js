(function () {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openBtn = document.getElementById('menu-open');
  const closeBtn = document.getElementById('menu-close');
  if (!drawer || !openBtn) return;

  function open()  { drawer.classList.add('is-open');  overlay.classList.add('is-open');  document.body.classList.add('drawer-open'); }
  function close() { drawer.classList.remove('is-open'); overlay.classList.remove('is-open'); document.body.classList.remove('drawer-open'); }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
})();
