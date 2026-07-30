// Small helper: make skip link visible and toggle nav on small screens
document.addEventListener('DOMContentLoaded', function(){
  var skip = document.querySelector('.skip-link');
  if(skip){
    skip.addEventListener('click', function(){
      var main = document.getElementById('main-content');
      if(main) main.tabIndex = -1;
    });
  }

  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  if(btn && nav){
    btn.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? '' : 'block';
    });
  }
});
