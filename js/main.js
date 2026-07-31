// Small helper: make skip link visible and toggle nav on small screens
// Also provides a mock form handler for prototype sign-ups (client-side demo)

document.addEventListener('DOMContentLoaded', function(){
  var skip = document.querySelector('.skip-link');
  if(skip){
    skip.addEventListener('click', function(){
      var main = document.getElementById('main-content');
      if(main) main.tabIndex = -1;
    });
  }

  // Inject hamburger toggle button and wire up mobile nav
  var headerNav = document.querySelector('header nav');
  if(headerNav){
    if(!headerNav.id) headerNav.id = 'main-nav';
    var toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Toggle navigation');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'main-nav');
    toggle.innerHTML = '&#9776;'; // ☰
    headerNav.parentElement.insertBefore(toggle, headerNav);

    toggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      this.innerHTML = expanded ? '&#9776;' : '&#10005;'; // ☰ / ✕
      headerNav.classList.toggle('open', !expanded);
    });

    // Close nav when a link is clicked (useful on mobile)
    headerNav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '&#9776;';
        headerNav.classList.remove('open');
      });
    });
  }

  // Mock form handler: intercept demo sign-ups and show a friendly confirmation.
  function saveMockSubmission(data){
    try{
      var key = 'kidcode_demo_submissions';
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      arr.push(data);
      localStorage.setItem(key, JSON.stringify(arr));
    }catch(e){
      console.error('Could not save demo submission', e);
    }
  }

  function showMockConfirmation(details){
    // Create an overlay
    var overlay = document.createElement('div');
    overlay.id = 'mock-overlay';
    overlay.className = 'mock-overlay';
    overlay.innerHTML = '\n      <div class="mock-panel">\n        <h2>Thanks — we got it! 🎉</h2>\n        <p>Demo booking ID: <strong>' + details.bookingId + '</strong></p>\n        <p>We saved your request locally in your browser for this demo. In a real site we would email a confirmation and let you book a time.</p>\n        <details style="margin-top:.6rem"><summary>Submission details</summary>\n          <pre class="mock-pre">' + escapeHtml(JSON.stringify(details.submission, null, 2)) + '</pre>\n        </details>\n        <div style="margin-top:1rem;text-align:right">\n          <button id="mock-close" class="btn-primary">Close</button>\n        </div>\n      </div>';
    document.body.appendChild(overlay);

    document.getElementById('mock-close').addEventListener('click', function(){
      overlay.remove();
    });
  }

  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  document.addEventListener('submit', function(ev){
    var form = ev.target;
    if(!(form && (form.id === 'kidcode-form' || form.classList.contains('mock-form')))) return;
    ev.preventDefault();

    // Collect common fields
    var formData = new FormData(form);
    var submission = {};
    formData.forEach(function(val, key){ submission[key] = val; });

    // Basic validation: require name and email
    if(!submission.name || !submission.email){
      alert('Please enter your name and email.');
      return;
    }

    // Build a demo booking id
    var bookingId = 'KID-' + Date.now().toString(36).toUpperCase().slice(-8);

    var record = {
      bookingId: bookingId,
      submission: submission,
      createdAt: new Date().toISOString()
    };

    saveMockSubmission(record);
    showMockConfirmation(record);

    // Optionally clear the form (commented out to let user keep values)
    // form.reset();
  });

  // Small utility: if user wants to view demo submissions, press Shift+S
  document.addEventListener('keydown', function(e){
    if(e.shiftKey && e.key.toLowerCase() === 's'){
      try{
        var key = 'kidcode_demo_submissions';
        var arr = JSON.parse(localStorage.getItem(key) || '[]');
        var w = window.open('', '_blank');
        w.document.write('<pre>' + escapeHtml(JSON.stringify(arr, null, 2)) + '</pre>');
        w.document.title = 'KidCode — Demo Submissions';
      }catch(err){
        console.error('Could not open submissions', err);
      }
    }
  });

});
