// Booking calendar interactions (client-side prototype)
(function(){
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function(){
    var dateInput = $('#book-date');
    var slotsFor = $('#slots-for');
    var slotsContainer = $('#calendar-slots');
    var tutorType = $('#tutor-type');

    // Set min date to today
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth()+1).padStart(2,'0');
    var dd = String(today.getDate()).padStart(2,'0');
    var minDate = yyyy + '-' + mm + '-' + dd;
    dateInput.min = minDate;
    dateInput.value = minDate;

    // Default times (could be dynamic)
    var times = ['09:00','10:00','11:00','14:00','15:00','16:00'];

    function loadBookings(){
      var key = 'kidcode_bookings';
      try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; }
    }

    function saveBooking(b){
      var key = 'kidcode_bookings';
      var arr = loadBookings();
      arr.push(b);
      localStorage.setItem(key, JSON.stringify(arr));
    }

    function isTaken(date, time, type){
      var arr = loadBookings();
      return arr.some(function(b){ return b.date === date && b.time === time && b.type === type && (b.status !== 'cancelled'); });
    }

    function renderSlots(){
      var date = dateInput.value;
      var type = tutorType.value;
      slotsFor.textContent = date;
      slotsContainer.innerHTML = '';
      times.forEach(function(t){
        var taken = isTaken(date,t,type);
        var div = document.createElement('div');
        div.className = 'slot' + (taken ? ' booked' : '');
        div.innerHTML = '<div class="slot-time">' + t + '</div>';
        var btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.style.fontSize = '0.95rem';
        btn.style.marginTop = '8px';
        if(taken){ btn.textContent = 'Booked'; btn.disabled = true; btn.className = 'btn-secondary'; }
        else { btn.textContent = 'Book'; btn.addEventListener('click', function(){ selectSlot(date,t,type); }); }
        div.appendChild(btn);
        slotsContainer.appendChild(div);
      });
    }

    function selectSlot(date,time,type){
      $('#b-date').value = date;
      $('#b-time').value = time;
      $('#b-type').value = type;
      // Scroll to form
      var form = $('#booking-form');
      form.scrollIntoView({behavior:'smooth', block:'center'});
      // Slight highlight
      form.style.boxShadow = '0 6px 20px rgba(2,6,23,0.08)';
      setTimeout(function(){ form.style.boxShadow = ''; }, 2000);
    }

    // Hook booking form (re-use mock handler in main.js because form has class mock-form)
    var bookingForm = $('#booking-form');
    bookingForm.addEventListener('submit', function(e){
      // main.js mock handler handles saving for forms with class mock-form
      // we also intercept to add booking-specific storage for clarity
      setTimeout(function(){
        // After main.js saved the demo submission, add booking record
        var name = $('#b-name').value || '';
        var email = $('#b-email').value || '';
        var child = $('#b-child').value || '';
        var date = $('#b-date').value || dateInput.value;
        var time = $('#b-time').value || times[0];
        var type = $('#b-type').value || tutorType.value;
        var id = 'BK-' + Date.now().toString(36).toUpperCase().slice(-8);
        var rec = { id: id, name:name, email:email, child:child, date:date, time:time, type:type, createdAt:new Date().toISOString(), status:'requested' };
        try{ var key='kidcode_bookings'; var arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push(rec); localStorage.setItem(key, JSON.stringify(arr)); }catch(err){ console.error(err); }
      }, 100);
    });

    // Shift+B quick view (also available in main.js Shift+S for submissions)
    document.addEventListener('keydown', function(e){ if(e.shiftKey && e.key.toLowerCase()==='b'){ var w = window.open('admin-bookings.html','_blank'); if(!w) alert('Popup blocked: open admin-bookings.html directly to view bookings.'); } });

    dateInput.addEventListener('change', renderSlots);
    tutorType.addEventListener('change', renderSlots);

    renderSlots();
  });
})();
